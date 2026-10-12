import type { NextFunction, Request, Response } from 'express';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  signInProvider?: string;
}

export type IdTokenVerifier = (idToken: string) => Promise<AuthenticatedUser>;

export interface AuthedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Creates a verifier backed by the Firebase Admin SDK. Verifying ID tokens only
 * needs the project ID (Google's public signing keys are fetched by the SDK),
 * so no service-account credentials are required for this feature.
 */
export async function createFirebaseAdminVerifier(projectId: string): Promise<IdTokenVerifier> {
  const { initializeApp, getApps, getApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const appName = 'investireland-api';
  const adminApp = getApps().some((a) => a.name === appName) ? getApp(appName) : initializeApp({ projectId }, appName);
  const adminAuth = getAuth(adminApp);

  return async (idToken: string) => {
    // checkRevoked requires service-account credentials, so it is opt-in.
    const decoded = await adminAuth.verifyIdToken(idToken, process.env.FIREBASE_CHECK_REVOKED === 'true');
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: Boolean(decoded.email_verified),
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
      signInProvider: decoded.firebase?.sign_in_provider,
    };
  };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1].trim();
  // Firebase ID tokens are JWTs well under 4KB; reject anything absurd early.
  return token.length > 0 && token.length < 4096 ? token : null;
}

export function createAuthMiddleware(verifier: IdTokenVerifier | null) {
  const resolveUser = async (req: AuthedRequest): Promise<AuthenticatedUser | null> => {
    if (!verifier) return null;
    const token = extractBearerToken(req);
    if (!token) return null;
    try {
      return await verifier(token);
    } catch {
      return null;
    }
  };

  const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!verifier) {
      return res.status(503).json({ error: 'Authentication is not configured on this server.' });
    }
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ error: 'A valid Firebase ID token is required.' });
    }
    req.user = user;
    return next();
  };

  const optionalAuth = async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const user = await resolveUser(req);
    if (user) req.user = user;
    next();
  };

  return { requireAuth, optionalAuth };
}
