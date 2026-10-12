import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, errorHandler, type AppDependencies } from './app';
import type { AuthenticatedUser } from './auth';
import type { Mailer } from './mailer';

const USERS: Record<string, AuthenticatedUser> = {
  'token-verified': { uid: 'user-a', email: 'a@example.com', emailVerified: true, name: 'Alice' },
  'token-unverified': { uid: 'user-b', email: 'b@example.com', emailVerified: false },
};

const servers: Server[] = [];

async function startServer(overrides: Partial<AppDependencies> = {}) {
  const mailer = vi.fn<Mailer>(async () => ({
    delivered: false,
    transport: 'APP_FALLBACK',
    messageId: 'msg-1',
    previewUrl: null,
  }));
  const app = createApp({
    verifyIdToken: async (token) => {
      const user = USERS[token];
      if (!user) throw new Error('invalid token');
      return user;
    },
    mailer,
    aiGenerator: null,
    getFxRates: async () => ({ EUR_TO_INR: 90, EUR_TO_USD: 1.1, EUR_TO_GBP: 0.85 }) as never,
    isProduction: false,
    rateLimits: false,
    ...overrides,
  });
  app.use(errorHandler);
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  servers.push(server);
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  const call = (path: string, init: RequestInit & { token?: string } = {}) => {
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
    return fetch(`${base}${path}`, { ...init, headers });
  };
  return { call, mailer };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((r) => s.close(r))));
});

describe('API security', () => {
  it('serves health checks with hardened headers', async () => {
    const { call } = await startServer();
    const res = await call('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('rejects email endpoints without a valid ID token', async () => {
    const { call, mailer } = await startServer();
    expect((await call('/api/emails/welcome', { method: 'POST', body: '{}' })).status).toBe(401);
    expect((await call('/api/emails/welcome', { method: 'POST', body: '{}', token: 'forged' })).status).toBe(401);
    expect((await call('/api/emails')).status).toBe(401);
    expect(mailer).not.toHaveBeenCalled();
  });

  it('returns 503 when authentication is not configured', async () => {
    const { call } = await startServer({ verifyIdToken: null });
    expect((await call('/api/emails', { token: 'token-verified' })).status).toBe(503);
  });

  it('sends email only to the token owner, ignoring a spoofed recipient', async () => {
    const { call, mailer } = await startServer();
    const res = await call('/api/emails/welcome', {
      method: 'POST',
      token: 'token-verified',
      body: JSON.stringify({ email: 'victim@example.com', name: '<script>alert(1)</script>' }),
    });
    expect(res.status).toBe(200);
    expect(mailer).toHaveBeenCalledTimes(1);
    const mail = mailer.mock.calls[0][0];
    expect(mail.to).toBe('a@example.com');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  it('allows only one welcome email per account', async () => {
    const { call } = await startServer();
    const first = await call('/api/emails/welcome', { method: 'POST', token: 'token-verified', body: '{}' });
    const second = await call('/api/emails/welcome', { method: 'POST', token: 'token-verified', body: '{}' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });

  it('requires a verified email for milestone emails', async () => {
    const { call, mailer } = await startServer();
    const res = await call('/api/emails/milestone', { method: 'POST', token: 'token-unverified', body: '{}' });
    expect(res.status).toBe(403);
    expect(mailer).not.toHaveBeenCalled();
  });

  it('scopes email logs to the requesting user', async () => {
    const { call } = await startServer();
    await call('/api/emails/milestone', { method: 'POST', token: 'token-verified', body: '{"goalTitle":"Home"}' });
    const own = await (await call('/api/emails', { token: 'token-verified' })).json();
    const other = await (await call('/api/emails', { token: 'token-unverified' })).json();
    expect(own.data).toHaveLength(1);
    expect(own.data[0].status).toBe('SIMULATED');
    expect(other.data).toHaveLength(0);
  });

  it('does not report undelivered mail as delivered', async () => {
    const { call } = await startServer();
    const res = await call('/api/emails/welcome', { method: 'POST', token: 'token-verified', body: '{}' });
    const body = await res.json();
    expect(body.emailDispatch.status).toBe('SIMULATED');
  });

  it('returns 502 without leaking details when the mailer fails', async () => {
    const failing = vi.fn<Mailer>(async () => {
      throw new Error('smtp password wrong for user secret@host');
    });
    const { call } = await startServer({ mailer: failing });
    const res = await call('/api/emails/welcome', { method: 'POST', token: 'token-verified', body: '{}' });
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('secret');
  });
});

describe('AI chat endpoint', () => {
  it('validates message length', async () => {
    const { call } = await startServer();
    expect((await call('/api/ai-chat', { method: 'POST', body: '{}' })).status).toBe(400);
    const long = await call('/api/ai-chat', { method: 'POST', body: JSON.stringify({ message: 'x'.repeat(2001) }) });
    expect(long.status).toBe(413);
  });

  it('rejects oversized JSON bodies', async () => {
    const { call } = await startServer();
    const res = await call('/api/ai-chat', { method: 'POST', body: JSON.stringify({ message: 'x'.repeat(40_000) }) });
    expect(res.status).toBe(413);
  });

  it('uses the local fallback for anonymous users and reports the mode', async () => {
    const aiGenerator = vi.fn(async () => 'model answer');
    const { call } = await startServer({ aiGenerator });
    const body = await (await call('/api/ai-chat', { method: 'POST', body: '{"message":"deemed disposal?"}' })).json();
    expect(body.mode).toBe('LOCAL_FALLBACK');
    expect(body.reason).toBe('SIGN_IN_REQUIRED');
    expect(aiGenerator).not.toHaveBeenCalled();
  });

  it('uses the model for signed-in users', async () => {
    const aiGenerator = vi.fn(async () => 'model answer');
    const { call } = await startServer({ aiGenerator });
    const res = await call('/api/ai-chat', { method: 'POST', token: 'token-verified', body: '{"message":"hello"}' });
    const body = await res.json();
    expect(body.mode).toBe('MODEL');
    expect(body.reply).toBe('model answer');
  });
});

describe('reference data endpoints', () => {
  it('labels market indices as sample data', async () => {
    const { call } = await startServer();
    const body = await (await call('/api/market-indices')).json();
    expect(body.isSample).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const { call } = await startServer();
    const res = await call('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});
