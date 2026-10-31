import type { AuthUser, RegistrationCredentials, EmailDispatchLog, Currency, LifeStageCategory } from '../types';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { apiFetch } from './apiClient';
import { getActiveUser, getSignedInUser, setSignedInProfile } from './activeUserStore';

export {
  DEFAULT_DEMO_USER,
  getActiveUser,
  getSignedInUser,
  isDemoUser,
  subscribeToActiveUser,
} from './activeUserStore';

export type ResidencyCountry = AuthUser['country'];
const COUNTRIES: ResidencyCountry[] = ['Ireland', 'India', 'United States', 'United Kingdom', 'Other EU'];
const CURRENCIES: Currency[] = ['EUR', 'INR', 'USD', 'GBP'];
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Structured Firebase Auth Error Information
 * providing UI-friendly titles, messages, and actionable recovery hints.
 */
export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
  actionHint: string;
  isRecoverable: boolean;
  technicalDetails?: string;
  context?: string;
  timestamp: string;
}

// Global state and event dispatcher for OAuth errors
type AuthErrorListener = (errorInfo: AuthErrorInfo) => void;
const authErrorListeners = new Set<AuthErrorListener>();
let lastAuthError: AuthErrorInfo | null = null;

/**
 * Subscribes to global Firebase Auth error events.
 * Returns an unsubscribe callback.
 */
export function subscribeToAuthErrors(listener: AuthErrorListener): () => void {
  authErrorListeners.add(listener);
  return () => {
    authErrorListeners.delete(listener);
  };
}

/**
 * Returns the most recent Firebase Auth error recorded, or null if none.
 */
export function getLastAuthError(): AuthErrorInfo | null {
  return lastAuthError;
}

/**
 * Clears the stored last auth error.
 */
export function clearLastAuthError(): void {
  lastAuthError = null;
}

/**
 * Global Firebase Auth Error Handler.
 * Translates low-level Firebase error codes and exceptions into
 * user-friendly, actionable error structures, notifies active listeners,
 * and dispatches a browser custom event.
 */
export function handleFirebaseAuthError(error: unknown, context: string = 'Firebase Auth'): AuthErrorInfo {
  const err = error as any;
  const rawCode: string = err?.code || (typeof err === 'string' ? err : 'auth/unknown');
  const rawMessage: string = err?.message || String(error || 'An unexpected authentication error occurred.');

  let title = 'Authentication Error';
  let message = 'Unable to complete authentication. Please try again.';
  let actionHint = 'Please refresh the page and try again, or sign in using email credentials.';
  let isRecoverable = true;

  // Normalized code inspection (also checks raw message for common patterns)
  const normalizedCode = rawCode.toLowerCase();
  const normalizedMsg = rawMessage.toLowerCase();

  if (
    normalizedCode === 'auth/popup-blocked' || 
    normalizedMsg.includes('popup-blocked') || 
    normalizedMsg.includes('popup was blocked') ||
    normalizedMsg.includes('window.open')
  ) {
    title = 'Sign-In Popup Blocked';
    message = 'Your browser blocked the Google Sign-In popup window.';
    actionHint = 'Click the popup icon (or shield) in your browser address bar to allow popups for this site, then click "Sign in with Google" again.';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/popup-closed-by-user' || 
    normalizedMsg.includes('popup-closed-by-user') ||
    normalizedMsg.includes('closed by user')
  ) {
    title = 'Sign-In Window Closed';
    message = 'The Google authentication window was closed before completing sign-in.';
    actionHint = 'Click "Sign in with Google" again to select your Google account and proceed.';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/cancelled-popup-request' ||
    normalizedMsg.includes('cancelled-popup-request')
  ) {
    title = 'Sign-In Interrupted';
    message = 'The authentication request was interrupted because another sign-in attempt was opened.';
    actionHint = 'Please wait a moment and try signing in again.';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/user-token-expired' ||
    normalizedCode === 'auth/id-token-expired' ||
    normalizedCode === 'auth/expired-action-code' ||
    normalizedCode === 'auth/token-expired' ||
    normalizedCode === 'auth/credential-too-old-login-again' ||
    normalizedMsg.includes('token expired') ||
    normalizedMsg.includes('credential has expired')
  ) {
    title = 'Session Expired';
    message = 'Your Google authentication session or security credential has expired.';
    actionHint = 'Please sign in again with your Google account to refresh your security credentials.';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/network-request-failed' ||
    normalizedMsg.includes('network-request-failed') ||
    normalizedMsg.includes('failed to fetch')
  ) {
    title = 'Network Connection Error';
    message = 'Unable to reach the authentication service. Please verify your internet connection.';
    actionHint = 'Check your connection or ad blocker settings, then retry.';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/unauthorized-domain' ||
    normalizedMsg.includes('unauthorized-domain')
  ) {
    title = 'Domain Not Authorized';
    message = 'This application domain is not registered on the Firebase OAuth authorized domains list.';
    actionHint = 'Add this domain to Firebase Console > Authentication > Settings > Authorized domains.';
    isRecoverable = false;
  } else if (
    normalizedCode === 'auth/operation-not-allowed' ||
    normalizedMsg.includes('operation-not-allowed')
  ) {
    title = 'Sign-In Method Disabled';
    message = 'This sign-in method is not enabled for this application.';
    actionHint = 'An administrator must enable it in Firebase Console under Authentication > Sign-in method.';
    isRecoverable = false;
  } else if (normalizedCode === 'auth/email-already-in-use') {
    title = 'Email Already Registered';
    message = 'An account with this email address already exists.';
    actionHint = 'Sign in instead, or use "Forgot password" to reset it.';
    isRecoverable = true;
  } else if (normalizedCode === 'auth/weak-password' || normalizedCode === 'auth/password-does-not-meet-requirements') {
    title = 'Password Too Weak';
    message = 'Your password does not meet the security requirements.';
    actionHint = 'Use at least 8 characters, mixing letters, numbers and symbols.';
    isRecoverable = true;
  } else if (normalizedCode === 'auth/invalid-email' || normalizedCode === 'auth/missing-email') {
    title = 'Invalid Email';
    message = 'Please enter a valid email address.';
    actionHint = 'Check the address for typos and try again.';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/wrong-password' ||
    normalizedCode === 'auth/user-not-found' ||
    normalizedCode === 'auth/invalid-login-credentials' ||
    normalizedCode === 'auth/missing-password'
  ) {
    title = 'Sign-In Failed';
    message = 'The email or password is incorrect.';
    actionHint = 'Check your details or use "Forgot password".';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/account-exists-with-different-credential' ||
    normalizedMsg.includes('account-exists-with-different-credential')
  ) {
    title = 'Account Already Exists';
    message = 'An account with this email address already exists using a different sign-in method.';
    actionHint = 'Please sign in with your email and password, or use the original sign-in method.';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/invalid-credential' ||
    normalizedCode === 'auth/user-disabled' ||
    normalizedMsg.includes('invalid-credential')
  ) {
    title = 'Sign-In Failed';
    message = 'The email or password is incorrect, or this account has been disabled.';
    actionHint = 'Check your details, use "Forgot password", or contact support.';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/too-many-requests' ||
    normalizedMsg.includes('too-many-requests')
  ) {
    title = 'Rate Limit Reached';
    message = 'Access has been temporarily throttled due to multiple consecutive sign-in attempts.';
    actionHint = 'Please wait 60 seconds before attempting to sign in again.';
    isRecoverable = true;
  } else if (
    normalizedCode === 'auth/timeout' ||
    normalizedMsg.includes('timeout')
  ) {
    title = 'Request Timed Out';
    message = 'The authentication request timed out while communicating with Google.';
    actionHint = 'Please check your network stability and try again.';
    isRecoverable = true;
  } else if (
    normalizedMsg.includes('cross-origin') ||
    normalizedMsg.includes('third-party cookie') ||
    normalizedMsg.includes('storage partition')
  ) {
    title = 'Browser Cookie Restriction';
    message = 'Browser cross-origin or third-party cookie restrictions prevented OAuth completion.';
    actionHint = 'Allow third-party cookies or open this page in a separate browser tab to complete Google authentication.';
    isRecoverable = true;
  }

  const errorInfo: AuthErrorInfo = {
    code: rawCode,
    title,
    message,
    actionHint,
    isRecoverable,
    technicalDetails: rawMessage !== message ? rawMessage : undefined,
    context,
    timestamp: new Date().toISOString()
  };

  // Update global state
  lastAuthError = errorInfo;

  // Log to console for debugging
  console.warn(`[${context}] Firebase OAuth Failure (${rawCode}):`, {
    title,
    message,
    actionHint,
    technicalDetails: rawMessage
  });

  // Notify active subscribers
  authErrorListeners.forEach((listener) => {
    try {
      listener(errorInfo);
    } catch (listenerErr) {
      console.error('Error invoking auth error listener:', listenerErr);
    }
  });

  // Dispatch browser DOM event for global listeners
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('investireland:auth-error', {
        detail: errorInfo
      }));
    } catch (e) {
      // Ignore in non-DOM environments
    }
  }

  return errorInfo;
}

/**
 * Returns a UI-friendly string message for a Firebase Auth error.
 */
export function getFriendlyAuthErrorMessage(error: unknown, context?: string): string {
  const info = handleFirebaseAuthError(error, context);
  return `${info.message} ${info.actionHint}`;
}

// ---------------------------------------------------------------------------
// Auth state (single source of truth: Firebase Auth + users/{uid} profile doc)
// ---------------------------------------------------------------------------

let authResolved = false;
let resolveAuthReady: () => void = () => {};
const authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve;
});

function pickCountry(value: unknown): ResidencyCountry {
  return COUNTRIES.includes(value as ResidencyCountry) ? (value as ResidencyCountry) : 'Ireland';
}

function pickCurrency(value: unknown): Currency {
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : 'EUR';
}

function profileFromFirebase(fbUser: FirebaseUser, data?: Record<string, any> | null): AuthUser {
  const email = (fbUser.email || data?.email || '').toLowerCase();
  const country = pickCountry(data?.country);
  return {
    id: fbUser.uid,
    name: (typeof data?.name === 'string' && data.name) || fbUser.displayName || email.split('@')[0] || 'Investor',
    email,
    country,
    preferredCurrency: pickCurrency(data?.preferredCurrency),
    taxResidencyStatus: `${country} tax resident (self-declared)`,
    registeredAt: data?.registeredAt || fbUser.metadata.creationTime || new Date().toISOString(),
    lastLoginAt: fbUser.metadata.lastSignInTime || new Date().toISOString(),
    hasOverseasAssets: Boolean(data?.hasOverseasAssets),
    primaryLifeStageGoal: data?.primaryLifeStageGoal as LifeStageCategory | undefined,
    emailVerified: fbUser.emailVerified,
  };
}

async function loadProfileDoc(uid: string): Promise<Record<string, any> | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('Could not load user profile from Firestore', err);
    return null;
  }
}

onAuthStateChanged(auth, async (fbUser) => {
  if (!fbUser) {
    setSignedInProfile(null);
  } else {
    const data = await loadProfileDoc(fbUser.uid);
    // Ignore stale results if the user changed while the profile was loading.
    if (auth.currentUser?.uid === fbUser.uid) setSignedInProfile(profileFromFirebase(fbUser, data));
  }
  if (!authResolved) {
    authResolved = true;
    resolveAuthReady();
  }
});

/** Resolves once Firebase has restored (or ruled out) a persisted session. */
export function waitForAuthReady(): Promise<void> {
  return authReady;
}

export { getStorageScope, scopedStorageKey } from './storageScope';


// ---------------------------------------------------------------------------
// Profile persistence
// ---------------------------------------------------------------------------

interface ProfileFields {
  name: string;
  country: ResidencyCountry;
  preferredCurrency: Currency;
  primaryLifeStageGoal?: LifeStageCategory;
  targetLifeGoalAmount?: number;
  hasOverseasAssets?: boolean;
  provider: string;
}

async function saveProfileDoc(fbUser: FirebaseUser, fields: ProfileFields, registeredAt: string) {
  await setDoc(
    doc(db, 'users', fbUser.uid),
    {
      uid: fbUser.uid,
      email: (fbUser.email || '').toLowerCase(),
      name: fields.name.slice(0, 120),
      country: fields.country,
      preferredCurrency: fields.preferredCurrency,
      // Optional fields are only written when provided so partial updates never erase them.
      ...(fields.primaryLifeStageGoal !== undefined ? { primaryLifeStageGoal: fields.primaryLifeStageGoal } : {}),
      ...(fields.targetLifeGoalAmount !== undefined ? { targetLifeGoalAmount: fields.targetLifeGoalAmount } : {}),
      ...(fields.hasOverseasAssets !== undefined ? { hasOverseasAssets: Boolean(fields.hasOverseasAssets) } : {}),
      provider: fields.provider,
      registeredAt,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/** Updates editable fields on the signed-in user's profile. */
export async function updateActiveUserProfile(updates: Partial<Pick<AuthUser, 'name' | 'country' | 'preferredCurrency'>>): Promise<boolean> {
  const fbUser = auth.currentUser;
  const current = getSignedInUser();
  if (!fbUser || !current) return false;
  const next: AuthUser = { ...current, ...updates };
  try {
    await saveProfileDoc(
      fbUser,
      {
        name: next.name,
        country: next.country,
        preferredCurrency: next.preferredCurrency,
        primaryLifeStageGoal: next.primaryLifeStageGoal,
        hasOverseasAssets: next.hasOverseasAssets,
        provider: fbUser.providerData[0]?.providerId || 'password',
      },
      next.registeredAt
    );
    if (updates.name && updates.name !== fbUser.displayName) await updateProfile(fbUser, { displayName: updates.name });
    setSignedInProfile(next);
    return true;
  } catch (err) {
    console.error('Failed to update profile', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sign-up / sign-in / sign-out
// ---------------------------------------------------------------------------

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  emailDispatch?: EmailDispatchLog | null;
  verificationEmailSent?: boolean;
  error?: string;
  errorDetails?: AuthErrorInfo;
}

function authFailure(error: unknown, context: string): AuthResult {
  const info = handleFirebaseAuthError(error, context);
  return { success: false, error: `${info.message} ${info.actionHint}`, errorDetails: info };
}

export async function registerWithCredentials(credentials: RegistrationCredentials): Promise<AuthResult> {
  const name = credentials.name?.trim();
  const email = credentials.email?.trim().toLowerCase();
  const password = credentials.password ?? '';
  if (!name || !email) return { success: false, error: 'Please enter your name and email address.' };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  let fbUser: FirebaseUser;
  try {
    fbUser = (await createUserWithEmailAndPassword(auth, email, password)).user;
    await updateProfile(fbUser, { displayName: name });
  } catch (err) {
    return authFailure(err, 'Email Registration');
  }

  const fields: ProfileFields = {
    name,
    country: pickCountry(credentials.country),
    preferredCurrency: pickCurrency(credentials.preferredCurrency),
    primaryLifeStageGoal: credentials.primaryLifeStageGoal,
    targetLifeGoalAmount: credentials.targetLifeGoalAmount,
    hasOverseasAssets: credentials.hasOverseasAssets,
    provider: 'password',
  };
  const registeredAt = new Date().toISOString();
  try {
    await saveProfileDoc(fbUser, fields, registeredAt);
  } catch (err) {
    console.error('Account created but profile could not be saved', err);
  }

  let verificationEmailSent = false;
  try {
    await sendEmailVerification(fbUser);
    verificationEmailSent = true;
  } catch (err) {
    console.warn('Could not send verification email', err);
  }

  const user = profileFromFirebase(fbUser, { ...fields, registeredAt });
  setSignedInProfile(user);
  const emailDispatch = await sendWelcomeEmail(fields).catch(() => null);
  return { success: true, user, emailDispatch, verificationEmailSent };
}

export async function signInWithCredentials(email: string, password: string): Promise<AuthResult> {
  if (!email.trim() || !password) return { success: false, error: 'Please enter your email and password.' };
  try {
    const { user: fbUser } = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const user = profileFromFirebase(fbUser, await loadProfileDoc(fbUser.uid));
    setSignedInProfile(user);
    return { success: true, user };
  } catch (err) {
    return authFailure(err, 'Email Sign-In');
  }
}

export async function signInWithGoogleOAuth(): Promise<AuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const { user: fbUser } = await signInWithPopup(auth, provider);
    if (!fbUser.email) throw new Error('Google did not return an email address.');

    const existing = await loadProfileDoc(fbUser.uid);
    const fields: ProfileFields = {
      name: (existing?.name as string) || fbUser.displayName?.trim() || fbUser.email.split('@')[0],
      country: pickCountry(existing?.country),
      preferredCurrency: pickCurrency(existing?.preferredCurrency),
      primaryLifeStageGoal: existing?.primaryLifeStageGoal ?? 'house_deposit',
      targetLifeGoalAmount: existing?.targetLifeGoalAmount ?? undefined,
      hasOverseasAssets: existing?.hasOverseasAssets ?? false,
      provider: 'google.com',
    };
    const registeredAt = (existing?.registeredAt as string) || new Date().toISOString();
    try {
      await saveProfileDoc(fbUser, fields, registeredAt);
    } catch (err) {
      console.warn('Could not save Google profile', err);
    }

    const user = profileFromFirebase(fbUser, { ...existing, ...fields, registeredAt });
    setSignedInProfile(user);
    const emailDispatch = existing ? null : await sendWelcomeEmail(fields).catch(() => null);
    return { success: true, user, emailDispatch };
  } catch (err) {
    return authFailure(err, 'Google Sign-In');
  }
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
  setSignedInProfile(null);
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  if (!email.trim()) return { success: false, error: 'Enter your email address first.' };
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return { success: true };
  } catch (err) {
    const info = handleFirebaseAuthError(err, 'Password Reset');
    return { success: false, error: `${info.message} ${info.actionHint}` };
  }
}

export async function resendVerificationEmail(): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    await sendEmailVerification(auth.currentUser);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Transactional email (server API, authenticated with the Firebase ID token)
// ---------------------------------------------------------------------------

async function sendWelcomeEmail(fields: ProfileFields): Promise<EmailDispatchLog | null> {
  const data = await apiFetch<{ emailDispatch: EmailDispatchLog }>('/api/emails/welcome', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({
      name: fields.name,
      country: fields.country,
      preferredCurrency: fields.preferredCurrency,
      primaryLifeStageGoal: fields.primaryLifeStageGoal,
      targetLifeGoalAmount: fields.targetLifeGoalAmount,
    }),
  });
  return data.emailDispatch ?? null;
}

/** Sends a milestone summary to the signed-in user's own (verified) email address. */
export async function sendMilestoneAutoEmail(params: {
  goalTitle: string;
  targetAmount: number;
  currency?: Currency;
}): Promise<{ success: boolean; emailDispatch?: EmailDispatchLog; error?: string }> {
  try {
    const data = await apiFetch<{ emailDispatch: EmailDispatchLog }>('/api/emails/milestone', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        goalTitle: params.goalTitle,
        targetAmount: params.targetAmount,
        currency: params.currency ?? getActiveUser().preferredCurrency,
        country: getActiveUser().country,
      }),
    });
    return { success: true, emailDispatch: data.emailDispatch };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

/** Emails sent to the signed-in user by this server instance (recent, in-memory). */
export async function fetchSentEmailLogs(): Promise<EmailDispatchLog[]> {
  if (!auth.currentUser) return [];
  try {
    const data = await apiFetch<{ data: EmailDispatchLog[] }>('/api/emails', { requireAuth: true });
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn('Could not fetch email history', err);
    return [];
  }
}

/** Persists a milestone to users/{uid}/milestones (owner-only Firestore rules). */
export async function syncMilestoneToBackend(payload: {
  milestoneId: string;
  title: string;
  category: string;
  targetAmountEUR: number;
  currentAmountEUR?: number;
}): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const milestoneId = payload.milestoneId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  try {
    await setDoc(
      doc(db, 'users', uid, 'milestones', milestoneId),
      {
        milestoneId,
        userId: uid,
        title: payload.title.slice(0, 200),
        category: payload.category,
        targetAmountEUR: Number(payload.targetAmountEUR) || 0,
        currentAmountEUR: Number(payload.currentAmountEUR) || 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('Failed to sync milestone to Firestore', err);
    return false;
  }
}
