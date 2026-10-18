import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createApp, errorHandler } from './server/app';
import { createFirebaseAdminVerifier, type IdTokenVerifier } from './server/auth';
import { createMailer } from './server/mailer';
import { createGeminiGenerator } from './server/aiAssistant';
import { createFxCache, fetchLiveFxRates } from './server/fiscalData';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.K_SERVICE) ||
  process.env.npm_lifecycle_event === 'start';

function readFirebaseConfig(): { projectId?: string; firestoreDatabaseId?: string } {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function startServer() {
  const firebaseConfig = readFirebaseConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;

  let verifyIdToken: IdTokenVerifier | null = null;
  if (projectId) {
    try {
      verifyIdToken = await createFirebaseAdminVerifier(projectId);
    } catch (err) {
      console.error('[auth] Firebase Admin initialisation failed; authenticated routes are disabled.', err);
    }
  } else {
    console.warn('[auth] No Firebase project ID configured; authenticated routes are disabled.');
  }

  const fxCache = createFxCache(fetchLiveFxRates);
  const app = createApp({
    verifyIdToken,
    mailer: createMailer(process.env, isProduction),
    aiGenerator: createGeminiGenerator(process.env.GEMINI_API_KEY),
    getFxRates: () => fxCache.get(),
    isProduction,
    allowAnonymousAi: process.env.ALLOW_ANONYMOUS_AI === 'true',
    appUrl: process.env.APP_URL,
    firebaseProjectId: projectId,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.resolve(distPath, 'index.html');
    const notFoundPath = path.resolve(distPath, '404.html');
    // Mirror staticwebapp.config.json ("trailingSlash": "never"): one canonical URL per page.
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path === '/404' || req.path === '/404.html') return res.status(404).sendFile(notFoundPath);
      const query = req.originalUrl.slice(req.path.length);
      let canonicalPath = req.path;
      if (canonicalPath.length > 1 && canonicalPath.endsWith('/')) canonicalPath = canonicalPath.replace(/\/+$/, '') || '/';
      if (canonicalPath.endsWith('.html')) canonicalPath = canonicalPath.replace(/(?:index)?\.html$/, '') || '/';
      if (canonicalPath !== req.path) return res.redirect(301, canonicalPath + query);
      return next();
    });
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false })
    );
    app.use(
      express.static(distPath, {
        index: false,
        maxAge: '1h',
        extensions: ['html'],
        setHeaders: (res, filePath) => {
          // HTML references hashed bundles, so it must be revalidated after every deploy.
          if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      })
    );
    app.get('*', (req: Request, res: Response) => {
      if (!fs.existsSync(indexPath)) return res.status(404).send('Application build not found.');
      res.setHeader('Cache-Control', 'no-cache');
      if (req.path === '/') return res.sendFile(indexPath);
      // Unknown URLs get a real 404 (not the SPA shell) so they never become soft-404 duplicates.
      return fs.existsSync(notFoundPath) ? res.status(404).sendFile(notFoundPath) : res.sendStatus(404);
    });
  }

  app.use(errorHandler);

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`InvestIreland AI server listening on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, shutting down.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
