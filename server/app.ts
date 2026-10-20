import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import crypto from 'crypto';
import { createAuthMiddleware, type AuthedRequest, type IdTokenVerifier } from './auth';
import type { Mailer, MailTransportKind } from './mailer';
import { buildAutoResponseEmail } from './emailTemplate';
import {
  AI_MAX_MESSAGE_CHARS,
  generateLocalGroundedResponse,
  serializeContext,
  type AiGenerator,
} from './aiAssistant';
import {
  MARKET_INDICES_AS_OF,
  OFFICIAL_FISCAL_DATA,
  SAMPLE_MARKET_INDICES,
  type FxRates,
} from './fiscalData';

export interface EmailLogEntry {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  dispatchedAt: string;
  status: 'DELIVERED' | 'SENT' | 'SIMULATED';
  transport: MailTransportKind;
  previewUrl?: string | null;
  messageId: string;
  summary: string;
}

export interface AppDependencies {
  verifyIdToken: IdTokenVerifier | null;
  mailer: Mailer;
  aiGenerator: AiGenerator | null;
  getFxRates: () => Promise<FxRates>;
  isProduction: boolean;
  allowAnonymousAi?: boolean;
  appUrl?: string;
  firebaseProjectId?: string;
  firestoreDatabaseId?: string;
  /** Optionally disable rate limiting (tests). */
  rateLimits?: { ai?: number; email?: number; windowMs?: number } | false;
}

const COUNTRIES = ['Ireland', 'India', 'United States', 'United Kingdom', 'Other EU'] as const;
const CURRENCIES = ['EUR', 'INR', 'USD', 'GBP'] as const;
const MAX_EMAIL_LOGS_PER_USER = 25;

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function cleanAmount(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e10 ? n : undefined;
}

function pickEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

const GOAL_LABELS: Record<string, string> = {
  house_deposit: 'Irish Home Deposit',
  retirement: 'Retirement Fund',
  family_education: 'Family Education Fund',
  emergency_buffer: 'Emergency Buffer',
  financial_independence: 'Financial Independence',
  cross_border_repatriation: 'Cross-border Repatriation',
  entrepreneurship: 'Entrepreneurship Fund',
};

export function buildContentSecurityPolicy(isProduction: boolean) {
  return {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      formAction: ["'self'"],
      scriptSrc: ["'self'", 'https://apis.google.com', 'https://www.gstatic.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'https://data-api.ecb.europa.eu',
        'https://api.mfapi.in',
        'https://*.googleapis.com',
        'https://*.firebaseio.com',
        'wss://*.firebaseio.com',
        'https://*.firebaseapp.com',
      ],
      frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com', 'https://apis.google.com'],
      frameAncestors: ["'self'", 'https://*.run.app', 'https://*.ai.studio'],
      workerSrc: ["'self'", 'blob:'],
      ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
    },
  };
}

export function createApp(deps: AppDependencies) {
  const app = express();
  const { requireAuth, optionalAuth } = createAuthMiddleware(deps.verifyIdToken);
  const emailLogs = new Map<string, EmailLogEntry[]>();
  const welcomeSent = new Set<string>();

  app.disable('x-powered-by');
  // Cloud Run / most PaaS put exactly one proxy in front of the container.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Vite's dev server injects inline scripts for HMR, so CSP is production-only.
      contentSecurityPolicy: deps.isProduction ? buildContentSecurityPolicy(true) : false,
      // Firebase Auth popups need to communicate back to the opener window.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      frameguard: false, // framing is governed by CSP frame-ancestors
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  app.use(express.json({ limit: '32kb' }));

  const limits = deps.rateLimits === false ? null : deps.rateLimits ?? {};
  const windowMs = limits?.windowMs ?? 15 * 60 * 1000;
  const passThrough = (_req: Request, _res: Response, next: NextFunction) => next();
  const aiLimiter = limits
    ? rateLimit({
        windowMs,
        limit: limits.ai ?? 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Too many assistant requests. Please wait a few minutes and try again.' },
      })
    : passThrough;
  const emailLimiter = limits
    ? rateLimit({
        windowMs,
        limit: limits.email ?? 5,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: (req: Request) => `uid:${(req as AuthedRequest).user?.uid ?? 'unknown'}`,
        message: { error: 'Email limit reached. Please try again later.' },
      })
    : passThrough;

  const recordEmail = (uid: string, entry: EmailLogEntry) => {
    const list = emailLogs.get(uid) ?? [];
    list.unshift(entry);
    emailLogs.set(uid, list.slice(0, MAX_EMAIL_LOGS_PER_USER));
  };

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/fiscal-data', async (_req: Request, res: Response) => {
    const fxRates = await deps.getFxRates();
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: {
        ...OFFICIAL_FISCAL_DATA,
        macroIndicators: { ...OFFICIAL_FISCAL_DATA.macroIndicators, fxRates },
      },
      fetchedAt: new Date().toISOString(),
      fxSource: fxRates.source,
      referenceDataReviewedAt: OFFICIAL_FISCAL_DATA.lastVerifiedTimestamp,
    });
  });

  app.get('/api/market-indices', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({
      success: true,
      data: SAMPLE_MARKET_INDICES,
      isSample: true,
      asOf: MARKET_INDICES_AS_OF,
      timestamp: MARKET_INDICES_AS_OF,
      source: 'Indicative sample snapshot (not a live market feed)',
    });
  });

  app.post('/api/ai-chat', aiLimiter, optionalAuth, async (req: AuthedRequest, res: Response) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (message.length > AI_MAX_MESSAGE_CHARS) {
      return res.status(413).json({ error: `Message must be ${AI_MAX_MESSAGE_CHARS} characters or fewer.` });
    }

    const fallback = (reason: string) =>
      res.json({
        reply: generateLocalGroundedResponse(message),
        source: 'InvestIreland reference knowledge base (offline answer)',
        isGrounded: false,
        mode: 'LOCAL_FALLBACK',
        reason,
      });

    const canUseModel = Boolean(deps.aiGenerator) && (Boolean(req.user) || deps.allowAnonymousAi);
    if (!canUseModel || !deps.aiGenerator) {
      return fallback(deps.aiGenerator ? 'SIGN_IN_REQUIRED' : 'MODEL_NOT_CONFIGURED');
    }

    try {
      const reply = await deps.aiGenerator({ message, context: serializeContext(req.body?.context) });
      if (!reply) return fallback('EMPTY_MODEL_RESPONSE');
      return res.json({ reply, source: 'Gemini (guided by Irish official-source rules)', isGrounded: false, mode: 'MODEL' });
    } catch (err) {
      console.error('[ai-chat] model error:', err instanceof Error ? err.message : err);
      return fallback('MODEL_ERROR');
    }
  });

  const dispatchEmail = async (
    req: AuthedRequest,
    res: Response,
    triggerType: 'WELCOME_REGISTRATION' | 'MILESTONE_UPDATE'
  ) => {
    const user = req.user!;
    if (!user.email) return res.status(400).json({ error: 'Your account has no email address.' });

    const body = req.body ?? {};
    const userName = cleanString(body.name, 80) ?? user.name ?? user.email.split('@')[0];
    const country = pickEnum(body.country, COUNTRIES, 'Ireland');
    const currency = pickEnum(body.currency ?? body.preferredCurrency, CURRENCIES, 'EUR');
    const goalKey = cleanString(body.primaryLifeStageGoal, 40);
    const primaryGoal =
      cleanString(body.goalTitle ?? body.primaryGoal, 120) ?? (goalKey && GOAL_LABELS[goalKey]) ?? undefined;
    const targetAmount = cleanAmount(body.targetAmount ?? body.targetLifeGoalAmount);

    const { html, text, subject } = buildAutoResponseEmail({
      userName,
      userEmail: user.email,
      country,
      primaryGoal,
      targetAmount,
      currency,
      triggerType,
      appUrl: deps.appUrl,
    });

    try {
      const result = await deps.mailer({ to: user.email, subject, html, text });
      const entry: EmailLogEntry = {
        id: `email_${crypto.randomUUID()}`,
        recipientEmail: user.email,
        recipientName: userName,
        subject,
        dispatchedAt: new Date().toISOString(),
        status: result.delivered ? 'DELIVERED' : result.transport === 'ETHEREAL_TEST_ACCOUNT' ? 'SENT' : 'SIMULATED',
        transport: result.transport,
        previewUrl: result.previewUrl,
        messageId: result.messageId,
        summary: result.delivered
          ? `Email sent to ${user.email}.`
          : result.transport === 'ETHEREAL_TEST_ACCOUNT'
            ? 'Sent to a test inbox (preview only, not delivered to the recipient).'
            : 'SMTP is not configured; the email was generated but not delivered.',
      };
      recordEmail(user.uid, entry);
      return res.json({ success: true, emailDispatch: entry });
    } catch (err) {
      console.error('[email] dispatch failed:', err instanceof Error ? err.message : err);
      return res.status(502).json({ error: 'The email could not be sent. Please try again later.' });
    }
  };

  app.post('/api/emails/welcome', requireAuth, emailLimiter, async (req: AuthedRequest, res: Response) => {
    const uid = req.user!.uid;
    if (welcomeSent.has(uid)) {
      return res.status(409).json({ error: 'A welcome email has already been sent for this account.' });
    }
    welcomeSent.add(uid);
    const result = await dispatchEmail(req, res, 'WELCOME_REGISTRATION');
    if (res.statusCode >= 400) welcomeSent.delete(uid);
    return result;
  });

  app.post('/api/emails/milestone', requireAuth, emailLimiter, async (req: AuthedRequest, res: Response) => {
    if (!req.user!.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email address before requesting milestone emails.' });
    }
    return dispatchEmail(req, res, 'MILESTONE_UPDATE');
  });

  app.get('/api/emails', requireAuth, (req: AuthedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: emailLogs.get(req.user!.uid) ?? [] });
  });

  app.get('/api/database/status', (_req: Request, res: Response) => {
    res.json({
      success: true,
      backendDatabase: {
        provider: 'Firebase Firestore',
        projectId: deps.firebaseProjectId ?? 'not-configured',
        databaseId: deps.firestoreDatabaseId ?? '(default)',
        status: deps.firebaseProjectId ? 'CONFIGURED' : 'NOT_CONFIGURED',
        // The browser talks to Firestore directly (guarded by firestore.rules);
        // the API server does not probe the database.
        isLive: false,
        collections: ['users', 'users/{userId}/holdings', 'users/{userId}/milestones', 'users/{userId}/accounts'],
        blueprint: 'firestore.rules (owner-only access)',
        rulesStatus: 'SEE_FIREBASE_CONSOLE',
      },
    });
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

/** Final error handler: never leak stack traces or internal messages. */
export function errorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status >= 500) console.error('[server] unhandled error:', err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : 'Bad request' });
}
