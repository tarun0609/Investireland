import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const adminDir = import.meta.dirname;
const repoRoot = path.resolve(adminDir, '..');

const FIREBASE_CONNECT = 'https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com';

// Injected only into production builds: the dev server needs inline scripts for React Fast Refresh.
const buildCsp = (apiOrigin: string) => [
  "default-src 'self'",
  "script-src 'self' https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} ${FIREBASE_CONNECT}`,
  "frame-src https://*.firebaseapp.com https://accounts.google.com https://apis.google.com",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

function cspPlugin(apiOrigin: string): Plugin {
  return {
    name: 'admin-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: buildCsp(apiOrigin) }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const apiUrl = loadEnv(mode, repoRoot, 'VITE_').VITE_API_URL ?? '';
  let apiOrigin = 'https://api.investirelandai.ie';
  try {
    if (apiUrl) apiOrigin = new URL(apiUrl).origin;
  } catch {
    throw new Error(`VITE_API_URL is not a valid URL: ${apiUrl}`);
  }
  return {
  root: adminDir,
  envDir: repoRoot,
  plugins: [react(), tailwindcss(), cspPlugin(apiOrigin)],
  build: {
    outDir: path.resolve(adminDir, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
  };
});
