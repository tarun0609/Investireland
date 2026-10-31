import { adminCreatePromo, adminGrant, adminListCampaigns, adminListPromos, adminListUsers, adminOverview, adminSendEmail, adminSetPromoActive, requireAdmin } from './admin';
import { handleChat } from './chat';
import { handleCheckout, handlePortal, handleStripeWebhook } from './billing';
import { handleUnsubscribe } from './email';
import { splitList, type Env } from './env';
import { requireUser, type VerifiedUser } from './firebaseAuth';
import { firestoreFor, type Firestore } from './firestore';
import { acceptHouseholdInvite, inviteHouseholdMember, leaveHousehold } from './household';
import { HttpError, RateLimiter, corsHeaders, errorResponse, json, readJson, withHeaders } from './http';
import { redeemPromo } from './promo';

const ipLimiter = new RateLimiter(120, 60_000);
const sensitiveLimiter = new RateLimiter(10, 10 * 60_000);
const emailLimiter = new RateLimiter(10, 60 * 60_000);

type Ctx = { env: Env; request: Request; url: URL; fs: Firestore; user: () => Promise<VerifiedUser>; body: () => Promise<Record<string, unknown>> };
type Handler = (ctx: Ctx) => Promise<Response>;

const userRoutes: Record<string, Handler> = {
  'POST /billing/checkout': async (c) => handleCheckout(c.env, c.fs, await c.user(), await c.body()),
  'POST /billing/portal': async (c) => handlePortal(c.env, c.fs, await c.user()),
  'POST /promo/redeem': async (c) => {
    const user = await c.user();
    sensitiveLimiter.check(`promo:${user.uid}`);
    return json(await redeemPromo(c.env, c.fs, user, (await c.body()).code));
  },
  'POST /household/invite': async (c) => {
    const user = await c.user();
    sensitiveLimiter.check(`invite:${user.uid}`);
    return inviteHouseholdMember(c.env, c.fs, user, await c.body());
  },
  'POST /household/accept': async (c) => {
    const user = await c.user();
    sensitiveLimiter.check(`accept:${user.uid}`);
    return json(await acceptHouseholdInvite(c.fs, user, await c.body()));
  },
  'POST /household/leave': async (c) => json(await leaveHousehold(c.fs, await c.user())),
};

const adminRoutes: Record<string, (c: Ctx, admin: VerifiedUser) => Promise<Response>> = {
  'GET /admin/overview': (c) => adminOverview(c.env, c.fs),
  'GET /admin/users': (c) => adminListUsers(c.fs, c.url),
  'GET /admin/promos': (c) => adminListPromos(c.env, c.fs),
  'POST /admin/promos': async (c, a) => adminCreatePromo(c.env, c.fs, a, await c.body()),
  'POST /admin/promos/active': async (c) => adminSetPromoActive(c.fs, await c.body()),
  'POST /admin/grant': async (c, a) => adminGrant(c.fs, a, await c.body()),
  'GET /admin/campaigns': (c) => adminListCampaigns(c.fs),
  'POST /admin/email': async (c, a) => {
    emailLimiter.check(`email:${a.uid}`);
    return adminSendEmail(c.env, c.fs, a, await c.body(), c.url.origin);
  },
};

function requireConfig(env: Env, keys: (keyof Env)[]) {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length) {
    console.error('Missing Worker configuration', missing.join(', '));
    throw new HttpError(503, 'This feature is not configured yet.');
  }
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const isAdmin = path.startsWith('/admin/');
  const origin = request.headers.get('Origin');
  const allowedOrigins = isAdmin ? splitList(env.ADMIN_ORIGIN) : splitList(env.APP_ORIGINS);
  const cors = origin && allowedOrigins.includes(origin) ? corsHeaders(origin) : null;

  try {
    ipLimiter.check(`ip:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`);

    if (path === '/health' && request.method === 'GET') return json({ ok: true });
    if (path === '/stripe/webhook' && request.method === 'POST') {
      requireConfig(env, ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'GOOGLE_SERVICE_ACCOUNT']);
      return await handleStripeWebhook(env, firestoreFor(env), request);
    }
    if (path === '/email/unsubscribe' && (request.method === 'GET' || request.method === 'POST')) {
      return await handleUnsubscribe(env, firestoreFor(env), request);
    }

    // Public support chat: no sign-in, but only our own site may call it.
    if (path === '/chat') {
      if (!cors) throw new HttpError(403, 'Origin not allowed.');
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
      return withHeaders(await handleChat(env, request, await readJson(request)), cors);
    }

    const key = `${request.method} ${path}`;
    const userHandler = userRoutes[key];
    const adminHandler = adminRoutes[key];
    const knownPath = Object.keys({ ...userRoutes, ...adminRoutes }).some((k) => k.endsWith(` ${path}`));

    if (request.method === 'OPTIONS' && knownPath) {
      if (!cors) throw new HttpError(403, 'Origin not allowed.');
      return new Response(null, { status: 204, headers: cors });
    }
    if (!userHandler && !adminHandler) throw new HttpError(knownPath ? 405 : 404, knownPath ? 'Method not allowed.' : 'Not found.');
    // Browser-only API: requests must come from one of our own sites.
    if (!cors) throw new HttpError(403, 'Origin not allowed.');

    requireConfig(env, ['FIREBASE_PROJECT_ID', 'GOOGLE_SERVICE_ACCOUNT']);
    let cachedUser: Promise<VerifiedUser> | null = null;
    const ctx: Ctx = {
      env,
      request,
      url,
      fs: firestoreFor(env),
      user: () => (cachedUser ??= requireUser(request, env.FIREBASE_PROJECT_ID)),
      body: () => readJson(request),
    };
    let response: Response;
    if (adminHandler) {
      const admin = await ctx.user();
      requireAdmin(env, admin);
      response = await adminHandler(ctx, admin);
    } else {
      response = await userHandler!(ctx);
    }
    return withHeaders(response, cors);
  } catch (err) {
    const res = errorResponse(err);
    return cors ? withHeaders(res, cors) : res;
  }
}

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
};
