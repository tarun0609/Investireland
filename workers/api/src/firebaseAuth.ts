import { base64UrlDecode, decodeJwtPart } from './crypto';
import { HttpError } from './http';

export const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_S = 300;

export interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  authTime: number;
}

interface Jwk extends JsonWebKey {
  kid: string;
}

let jwksCache: { keys: Map<string, CryptoKey>; expiresAt: number } | null = null;

export function resetJwksCache() {
  jwksCache = null;
}

async function getSigningKey(kid: string, fetchFn: typeof fetch, now: number): Promise<CryptoKey | undefined> {
  if (!jwksCache || jwksCache.expiresAt <= now || !jwksCache.keys.has(kid)) {
    const res = await fetchFn(FIREBASE_JWKS_URL);
    if (!res.ok) throw new HttpError(503, 'Sign-in could not be verified right now. Please try again.');
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('Cache-Control') ?? '')?.[1] ?? 3600);
    const { keys } = (await res.json()) as { keys: Jwk[] };
    const map = new Map<string, CryptoKey>();
    for (const jwk of keys) {
      if (jwk.kty !== 'RSA' || !jwk.kid) continue;
      map.set(jwk.kid, await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
    }
    jwksCache = { keys: map, expiresAt: now + Math.min(maxAge, 6 * 3600) * 1000 };
  }
  return jwksCache.keys.get(kid);
}

/** Verifies a Firebase Auth ID token as described in the Firebase "verify ID tokens using a third-party JWT library" guide. */
export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
  fetchFn: typeof fetch = fetch,
  now = Date.now(),
): Promise<VerifiedUser> {
  const unauthorized = new HttpError(401, 'Please sign in again.');
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 4096) throw unauthorized;

  let header: { alg?: string; kid?: string };
  let payload: Record<string, unknown>;
  try {
    header = decodeJwtPart(parts[0]);
    payload = decodeJwtPart(parts[1]);
  } catch {
    throw unauthorized;
  }
  if (header.alg !== 'RS256' || !header.kid) throw unauthorized;

  const key = await getSigningKey(header.kid, fetchFn, now);
  if (!key) throw unauthorized;
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlDecode(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw unauthorized;

  const nowS = Math.floor(now / 1000);
  const { aud, iss, sub, exp, iat, auth_time: authTime, email, email_verified: emailVerified } = payload;
  if (aud !== projectId || iss !== `https://securetoken.google.com/${projectId}`) throw unauthorized;
  if (typeof sub !== 'string' || !sub || sub.length > 128) throw unauthorized;
  if (typeof exp !== 'number' || exp <= nowS) throw unauthorized;
  if (typeof iat !== 'number' || iat > nowS + CLOCK_SKEW_S) throw unauthorized;
  if (typeof authTime !== 'number' || authTime > nowS + CLOCK_SKEW_S) throw unauthorized;

  return {
    uid: sub,
    email: typeof email === 'string' ? email.toLowerCase() : '',
    emailVerified: emailVerified === true,
    authTime,
  };
}

export async function requireUser(request: Request, projectId: string, fetchFn: typeof fetch = fetch): Promise<VerifiedUser> {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new HttpError(401, 'Please sign in to continue.');
  return verifyFirebaseIdToken(match[1].trim(), projectId, fetchFn);
}
