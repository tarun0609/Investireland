import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSendEmail, requireAdmin } from '../src/admin';
import { handleStripeWebhook } from '../src/billing';
import { base64UrlEncode, hmacHex, randomCode, signRs256Jwt } from '../src/crypto';
import { handleUnsubscribe, unsubscribeUrl } from '../src/email';
import { computeEffectivePlan, parseEntitlement, type Entitlement } from '../src/entitlements';
import type { Env } from '../src/env';
import { FIREBASE_JWKS_URL, resetJwksCache, verifyFirebaseIdToken, type VerifiedUser } from '../src/firebaseAuth';
import { acceptHouseholdInvite, inviteHouseholdMember, leaveHousehold } from '../src/household';
import { HttpError } from '../src/http';
import { handleRequest } from '../src/index';
import { redeemPromo } from '../src/promo';
import { formEncode, verifyStripeSignature } from '../src/stripe';
import { FakeFirestoreServer } from './fakeFirestore';

const NOW = new Date('2026-10-21T12:00:00Z');
const day = 86_400_000;

const env: Env = {
  FIREBASE_PROJECT_ID: 'test',
  APP_ORIGINS: 'https://app.example',
  APP_URL: 'https://app.example',
  ADMIN_ORIGIN: 'https://admin.example',
  ADMIN_UIDS: 'admin1',
  GOOGLE_SERVICE_ACCOUNT: '',
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_PRO_MONTHLY: 'price_pm',
  STRIPE_PRICE_PRO_ANNUAL: 'price_pa',
  STRIPE_PRICE_FAMILY_ANNUAL: 'price_fa',
  BREVO_API_KEY: 'brevo',
  EMAIL_FROM: 'hello@example.com',
  EMAIL_DAILY_LIMIT: '300',
  LINK_SIGNING_SECRET: 'link-secret',
  PROMO_GLOBAL_CAP: '1000',
};

const user = (uid: string, email = `${uid}@example.com`, extra: Partial<VerifiedUser> = {}): VerifiedUser => ({
  uid,
  email,
  emailVerified: true,
  authTime: Math.floor(NOW.getTime() / 1000) - 60,
  ...extra,
});

const expectHttp = async (p: Promise<unknown>, status: number, code?: string) => {
  const err = await p.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(HttpError);
  expect((err as HttpError).status).toBe(status);
  if (code) expect((err as HttpError).code).toBe(code);
};

describe('crypto helpers', () => {
  it('generates unambiguous promo codes of the requested length', () => {
    for (let i = 0; i < 50; i++) expect(randomCode(12)).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{12}$/);
  });

  it('form-encodes nested Stripe params', () => {
    const body = formEncode({ mode: 'subscription', line_items: [{ price: 'p', quantity: 1 }], subscription_data: { metadata: { uid: 'u' } }, skip: undefined });
    expect(body.toString()).toBe('mode=subscription&line_items%5B0%5D%5Bprice%5D=p&line_items%5B0%5D%5Bquantity%5D=1&subscription_data%5Bmetadata%5D%5Buid%5D=u');
  });
});

describe('Stripe signature', () => {
  it('accepts a valid signature and rejects tampering or replay', async () => {
    const t = Math.floor(NOW.getTime() / 1000);
    const payload = '{"id":"evt_1"}';
    const sig = await hmacHex('whsec_test', `${t}.${payload}`);
    expect(await verifyStripeSignature(payload, `t=${t},v1=${sig}`, 'whsec_test', NOW.getTime())).toBe(true);
    expect(await verifyStripeSignature(payload + ' ', `t=${t},v1=${sig}`, 'whsec_test', NOW.getTime())).toBe(false);
    expect(await verifyStripeSignature(payload, `t=${t},v1=${sig}`, 'other', NOW.getTime())).toBe(false);
    expect(await verifyStripeSignature(payload, `t=${t},v1=${sig}`, 'whsec_test', NOW.getTime() + 10 * 60_000)).toBe(false);
    expect(await verifyStripeSignature(payload, null, 'whsec_test', NOW.getTime())).toBe(false);
  });
});

describe('effective plan', () => {
  const base: Entitlement = parseEntitlement({});
  it('defaults to free', () => expect(computeEffectivePlan(base, NOW).plan).toBe('free'));
  it('prefers the highest valid plan and ignores expired or cancelled sources', () => {
    const ent: Entitlement = {
      ...base,
      promo: { code: 'X', expiresAt: new Date(NOW.getTime() + 300 * day) },
      grant: { plan: 'family', expiresAt: new Date(NOW.getTime() - day) },
      stripe: { customerId: 'c', subscriptionId: 's', priceId: 'p', plan: 'family', status: 'canceled', currentPeriodEnd: new Date(NOW.getTime() + day), cancelAtPeriodEnd: false },
    };
    expect(computeEffectivePlan(ent, NOW)).toMatchObject({ plan: 'pro', planSource: 'promo' });
    ent.stripe!.status = 'active';
    expect(computeEffectivePlan(ent, NOW)).toMatchObject({ plan: 'family', planSource: 'stripe' });
  });
});

describe('Firebase ID token verification', () => {
  let keys: CryptoKeyPair;
  let jwk: JsonWebKey;
  beforeAll(async () => {
    keys = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
  });
  beforeEach(() => resetJwksCache());

  const jwks = (async (url: RequestInfo | URL) => {
    expect(String(url)).toBe(FIREBASE_JWKS_URL);
    return new Response(JSON.stringify({ keys: [{ ...jwk, kid: 'k1' }] }), { headers: { 'Cache-Control': 'max-age=100' } });
  }) as typeof fetch;
  const nowS = Math.floor(NOW.getTime() / 1000);
  const claims = { aud: 'test', iss: 'https://securetoken.google.com/test', sub: 'u1', iat: nowS - 10, exp: nowS + 3000, auth_time: nowS - 10, email: 'A@Example.com', email_verified: true };

  it('accepts a valid token', async () => {
    const token = await signRs256Jwt(claims, keys.privateKey, 'k1');
    expect(await verifyFirebaseIdToken(token, 'test', jwks, NOW.getTime())).toEqual({ uid: 'u1', email: 'a@example.com', emailVerified: true, authTime: nowS - 10 });
  });

  it('rejects wrong audience, expiry, unknown key and forged signatures', async () => {
    await expectHttp(verifyFirebaseIdToken(await signRs256Jwt({ ...claims, aud: 'other' }, keys.privateKey, 'k1'), 'test', jwks, NOW.getTime()), 401);
    await expectHttp(verifyFirebaseIdToken(await signRs256Jwt({ ...claims, exp: nowS - 1 }, keys.privateKey, 'k1'), 'test', jwks, NOW.getTime()), 401);
    await expectHttp(verifyFirebaseIdToken(await signRs256Jwt(claims, keys.privateKey, 'nope'), 'test', jwks, NOW.getTime()), 401);
    const [h, , s] = (await signRs256Jwt(claims, keys.privateKey, 'k1')).split('.');
    const forged = `${h}.${base64UrlEncode(JSON.stringify({ ...claims, sub: 'admin1' }))}.${s}`;
    await expectHttp(verifyFirebaseIdToken(forged, 'test', jwks, NOW.getTime()), 401);
    const none = `${base64UrlEncode(JSON.stringify({ alg: 'none', kid: 'k1' }))}.${base64UrlEncode(JSON.stringify(claims))}.`;
    await expectHttp(verifyFirebaseIdToken(none, 'test', jwks, NOW.getTime()), 401);
  });
});

describe('promo redemption', () => {
  let server: FakeFirestoreServer;
  beforeEach(() => {
    server = new FakeFirestoreServer();
    server.seed('promoCodes/EARLY-1', { plan: 'pro', months: 12, maxRedemptions: 2, redemptions: 0, active: true, createdAt: NOW });
  });

  it('grants 12 months of Pro once per user and counts redemptions', async () => {
    const fs = server.client();
    const result = await redeemPromo(env, fs, user('u1'), ' early-1 ', NOW);
    expect(result).toEqual({ plan: 'pro', expiresAt: '2027-10-21T12:00:00.000Z' });
    expect(server.data('entitlements/u1')).toMatchObject({ plan: 'pro', planSource: 'promo' });
    expect(server.data('promoCodes/EARLY-1')?.redemptions).toBe(1);
    expect(server.data('counters/promo')?.redeemed).toBe(1);
    await expectHttp(redeemPromo(env, fs, user('u1'), 'EARLY-1', NOW), 409, 'already_redeemed');
  });

  it('enforces the per-code limit, the global cap, expiry and verification', async () => {
    const fs = server.client();
    await redeemPromo(env, fs, user('u1'), 'EARLY-1', NOW);
    await redeemPromo(env, fs, user('u2'), 'EARLY-1', NOW);
    await expectHttp(redeemPromo(env, fs, user('u3'), 'EARLY-1', NOW), 410, 'code_used_up');

    server.seed('promoCodes/BIGCODE', { plan: 'pro', months: 12, maxRedemptions: 1000, redemptions: 0, active: true });
    await expectHttp(redeemPromo({ ...env, PROMO_GLOBAL_CAP: '2' }, fs, user('u3'), 'BIGCODE', NOW), 410, 'cap_reached');

    server.seed('promoCodes/OLDCODE', { plan: 'pro', months: 12, maxRedemptions: 5, redemptions: 0, active: true, expiresAt: new Date(NOW.getTime() - 1) });
    await expectHttp(redeemPromo(env, fs, user('u4'), 'OLDCODE', NOW), 410, 'expired');
    await expectHttp(redeemPromo(env, fs, user('u4'), 'NOPE', NOW), 404, 'invalid_code');
    await expectHttp(redeemPromo(env, fs, user('u5', 'x@example.com', { emailVerified: false }), 'BIGCODE', NOW), 403, 'email_unverified');
  });
});

async function signedEvent(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({ id: 'evt', type, data: { object } });
  const t = Math.floor(NOW.getTime() / 1000);
  const sig = await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${t}.${payload}`);
  return new Request('https://api.example/stripe/webhook', { method: 'POST', body: payload, headers: { 'Stripe-Signature': `t=${t},v1=${sig}` } });
}

describe('Stripe webhook', () => {
  it('activates and ends a Family plan and keeps the household partner in sync', async () => {
    const server = new FakeFirestoreServer();
    server.seed('entitlements/owner', { uid: 'owner', plan: 'free', householdRole: 'owner', householdPartner: 'member' });
    server.seed('entitlements/member', { uid: 'member', plan: 'free', householdRole: 'member', householdPartner: 'owner' });
    const periodEnd = Math.floor(NOW.getTime() / 1000) + 365 * 86400;
    let status = 'active';
    const stripeFetch = (async (url: RequestInfo | URL) => {
      expect(String(url)).toBe('https://api.stripe.com/v1/subscriptions/sub_1');
      return new Response(JSON.stringify({ id: 'sub_1', customer: 'cus_1', status, metadata: { uid: 'owner' }, items: { data: [{ price: { id: 'price_fa' }, current_period_end: periodEnd }] } }));
    }) as typeof fetch;

    const res = await handleStripeWebhook(env, server.client(), await signedEvent('checkout.session.completed', { mode: 'subscription', subscription: 'sub_1', client_reference_id: 'owner' }), stripeFetch, NOW);
    expect(res.status).toBe(200);
    expect(server.data('entitlements/owner')).toMatchObject({ plan: 'family', planSource: 'stripe', stripeCustomerId: 'cus_1' });
    expect(server.data('entitlements/member')).toMatchObject({ plan: 'family', planSource: 'household' });

    status = 'canceled';
    await handleStripeWebhook(env, server.client(), await signedEvent('customer.subscription.deleted', { id: 'sub_1' }), stripeFetch, NOW);
    expect(server.data('entitlements/owner')?.plan).toBe('free');
    expect(server.data('entitlements/member')?.plan).toBe('free');
  });

  it('rejects unsigned events', async () => {
    const req = new Request('https://api.example/stripe/webhook', { method: 'POST', body: '{}', headers: { 'Stripe-Signature': 't=1,v1=00' } });
    await expectHttp(handleStripeWebhook(env, new FakeFirestoreServer().client(), req, fetch, NOW), 400);
  });
});

describe('household', () => {
  it('invites, accepts with the invited email only, and leaves', async () => {
    const server = new FakeFirestoreServer();
    server.seed('entitlements/owner', { uid: 'owner', plan: 'family', grant: { plan: 'family', expiresAt: new Date(NOW.getTime() + 100 * day) } });
    const sent: any[] = [];
    const brevo = (async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).startsWith('https://api.brevo.com')) {
        sent.push(JSON.parse(String(init!.body)));
        return new Response('{}', { status: 201 });
      }
      return server.fetch(url, init);
    }) as typeof fetch;
    const fs = server.client();

    await inviteHouseholdMember(env, fs, user('owner'), { email: 'Partner@Example.com' }, brevo, NOW);
    expect(sent).toHaveLength(1);
    const invite = decodeURIComponent(/household=([^"&]+)/.exec(sent[0].htmlContent)![1]);
    expect(server.data('households/owner')?.inviteTokenHash).not.toContain(invite.split('.')[1]);

    await expectHttp(acceptHouseholdInvite(fs, user('intruder', 'intruder@example.com'), { invite }, NOW), 403, 'wrong_email');
    await expectHttp(acceptHouseholdInvite(fs, user('partner', 'partner@example.com'), { invite: invite.replace(/.$/, 'x') }, NOW), 404);
    await acceptHouseholdInvite(fs, user('partner', 'partner@example.com'), { invite }, NOW);
    expect(server.data('entitlements/partner')).toMatchObject({ plan: 'family', householdRole: 'member', householdPartner: 'owner' });
    expect(server.data('entitlements/owner')).toMatchObject({ householdRole: 'owner', householdPartner: 'partner' });
    await expectHttp(acceptHouseholdInvite(fs, user('partner', 'partner@example.com'), { invite }, NOW), 404);

    await leaveHousehold(fs, user('partner', 'partner@example.com'), NOW);
    expect(server.data('entitlements/partner')).toMatchObject({ plan: 'free', householdPartner: null });
    expect(server.data('entitlements/owner')).toMatchObject({ plan: 'family', householdPartner: null });
    expect(server.data('households/owner')).toBeUndefined();
  });

  it('requires an active Family plan to invite', async () => {
    const server = new FakeFirestoreServer();
    await expectHttp(inviteHouseholdMember(env, server.client(), user('u1'), { email: 'p@example.com' }, server.fetch, NOW), 402, 'needs_family');
  });
});

describe('admin and email', () => {
  it('only allows listed, verified, recently signed-in admins', () => {
    expect(() => requireAdmin(env, user('admin1'), NOW.getTime())).not.toThrow();
    expect(() => requireAdmin(env, user('someone'), NOW.getTime())).toThrow(HttpError);
    expect(() => requireAdmin(env, user('admin1', 'a@x.com', { emailVerified: false }), NOW.getTime())).toThrow(HttpError);
    expect(() => requireAdmin(env, user('admin1', 'a@x.com', { authTime: NOW.getTime() / 1000 - 13 * 3600 }), NOW.getTime())).toThrow(/sign in again/);
  });

  it('emails an audience, skips opt-outs and enforces the daily limit', async () => {
    const server = new FakeFirestoreServer();
    for (const [uid, plan] of [['a', 'free'], ['b', 'free'], ['c', 'pro']] as const) {
      server.seed(`users/${uid}`, { uid, name: uid.toUpperCase(), email: `${uid}@example.com`, country: 'Ireland', registeredAt: `2026-10-0${uid.charCodeAt(0) - 96}T00:00:00Z` });
      if (plan === 'pro') server.seed(`entitlements/${uid}`, { uid, promo: { code: 'X', expiresAt: new Date(NOW.getTime() + day) } });
    }
    server.seed('emailOptOuts/b', { uid: 'b', optedOut: true });
    const sent: any[] = [];
    const fetchFn = (async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).startsWith('https://api.brevo.com')) {
        sent.push(JSON.parse(String(init!.body)));
        return new Response('{}', { status: 201 });
      }
      return server.fetch(url, init);
    }) as typeof fetch;
    const fs = server.client();
    const res = await adminSendEmail(env, fs, user('admin1'), { audience: 'free', subject: 'Hello there', body: 'A message <b>with</b> markup' }, 'https://api.example', fetchFn, NOW);
    expect(await res.json()).toMatchObject({ requested: 1, sent: 1 });
    expect(sent[0].to).toEqual([{ email: 'a@example.com', name: 'A' }]);
    expect(sent[0].htmlContent).toContain('&lt;b&gt;with&lt;/b&gt;');
    expect(sent[0].headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(server.data('counters/email-2026-10-21')?.sent).toBe(1);

    await expectHttp(adminSendEmail({ ...env, EMAIL_DAILY_LIMIT: '2' }, fs, user('admin1'), { audience: 'all', subject: 'Hello there', body: 'Another message' }, 'https://api.example', fetchFn, NOW), 429, 'email_quota');
  });

  it('unsubscribes only with a valid signed link and only on POST', async () => {
    const server = new FakeFirestoreServer();
    const link = await unsubscribeUrl(env, 'https://api.example', 'a');
    const get = await handleUnsubscribe(env, server.client(), new Request(link), NOW);
    expect(await get.text()).toContain('<form method="post"');
    expect(server.data('emailOptOuts/a')).toBeUndefined();
    await handleUnsubscribe(env, server.client(), new Request(link, { method: 'POST' }), NOW);
    expect(server.data('emailOptOuts/a')?.optedOut).toBe(true);
    const bad = await handleUnsubscribe(env, server.client(), new Request(link.replace('u=a', 'u=b'), { method: 'POST' }), NOW);
    expect(await bad.text()).toContain('not valid');
    expect(server.data('emailOptOuts/b')).toBeUndefined();
  });
});

describe('router', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('answers health checks and rejects unknown origins and non-admins', async () => {
    expect((await handleRequest(new Request('https://api.example/health'), env)).status).toBe(200);
    expect((await handleRequest(new Request('https://api.example/nope'), env)).status).toBe(404);

    const preflight = await handleRequest(new Request('https://api.example/promo/redeem', { method: 'OPTIONS', headers: { Origin: 'https://app.example' } }), env);
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');

    const evil = await handleRequest(new Request('https://api.example/promo/redeem', { method: 'POST', headers: { Origin: 'https://evil.example' } }), env);
    expect(evil.status).toBe(403);
    // The admin API only accepts the admin site's origin.
    const wrongSite = await handleRequest(new Request('https://api.example/admin/overview', { headers: { Origin: 'https://app.example' } }), env);
    expect(wrongSite.status).toBe(403);
  });

  it('requires a bearer token for user and admin endpoints', async () => {
    const cfg = { ...env, GOOGLE_SERVICE_ACCOUNT: '{}' };
    const res = await handleRequest(new Request('https://api.example/admin/overview', { headers: { Origin: 'https://admin.example' } }), cfg);
    expect(res.status).toBe(401);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://admin.example');
  });
});
