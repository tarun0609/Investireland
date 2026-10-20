const encoder = new TextEncoder();

export function base64UrlEncode(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function decodeJwtPart<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(part))) as T;
}

export async function importPkcs8Pem(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

export async function signRs256Jwt(payload: Record<string, unknown>, key: CryptoKey, kid?: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT', ...(kid ? { kid } : {}) }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(`${header}.${body}`));
  return `${header}.${body}.${base64UrlEncode(sig)}`;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacBase64Url(secret: string, message: string): Promise<string> {
  return base64UrlEncode(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(message)));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 24): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Readable promo codes without easily confused characters (no 0/O, 1/I/L). */
export function randomCode(length = 10): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  // Rejection sampling avoids modulo bias: only bytes below the largest multiple of the alphabet size are used.
  const limit = 256 - (256 % alphabet.length);
  let out = '';
  while (out.length < length) {
    for (const v of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (v < limit && out.length < length) out += alphabet[v % alphabet.length];
    }
  }
  return out;
}
