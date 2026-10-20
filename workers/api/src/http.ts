export class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
    this.name = 'HttpError';
  }
}

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
  new Headers(extra).forEach((v, k) => headers.set(k, v));
  return new Response(JSON.stringify(data), { status, headers });
}

export function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
      ...SECURITY_HEADERS,
    },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
  console.error('Unhandled error', err instanceof Error ? err.message : err);
  return json({ error: 'Something went wrong. Please try again.' }, 500);
}

export const MAX_JSON_BYTES = 16 * 1024;

export async function readText(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > maxBytes) throw new HttpError(413, 'Request is too large.');
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new HttpError(413, 'Request is too large.');
  return text;
}

export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = MAX_JSON_BYTES): Promise<T> {
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    throw new HttpError(415, 'Expected a JSON body.');
  }
  const text = await readText(request, maxBytes);
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    return value as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON body.');
  }
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export function withHeaders(response: Response, headers: Record<string, string>): Response {
  const res = new Response(response.body, response);
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Best-effort per-isolate limiter. Pair with a Cloudflare WAF rate-limit rule for real protection. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  check(key: string, now = Date.now()) {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) throw new HttpError(429, 'Too many requests. Please wait a minute and try again.');
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) this.hits.clear();
  }
}
