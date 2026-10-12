import { auth } from './firebase';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * fetch() wrapper that attaches the signed-in user's Firebase ID token and
 * normalises JSON error responses into ApiError.
 */
export async function apiFetch<T = any>(
  path: string,
  init: RequestInit & { requireAuth?: boolean } = {}
): Promise<T> {
  const { requireAuth = false, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);
  if (rest.body && !finalHeaders.has('Content-Type')) finalHeaders.set('Content-Type', 'application/json');

  const user = auth.currentUser;
  if (user) {
    finalHeaders.set('Authorization', `Bearer ${await user.getIdToken()}`);
  } else if (requireAuth) {
    throw new ApiError('Please sign in to continue.', 401);
  }

  const res = await fetch(path, { ...rest, headers: finalHeaders });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new ApiError((data && typeof data.error === 'string' && data.error) || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}
