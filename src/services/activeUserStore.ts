import type { AuthUser } from '../types';
import { setStorageScope } from './storageScope';

// Firebase-free view of who is signed in. authEmailService feeds it from Firebase Auth once loaded.

export const DEFAULT_DEMO_USER: AuthUser = {
  id: 'usr_demo_priya',
  name: 'Priya Sharma',
  email: 'priya.sharma@investireland.demo',
  country: 'Ireland',
  preferredCurrency: 'EUR',
  taxResidencyStatus: 'Irish Tax Resident (demo profile)',
  registeredAt: '2026-01-10T09:00:00.000Z',
  lastLoginAt: '2026-01-10T09:00:00.000Z',
  hasOverseasAssets: true,
  primaryLifeStageGoal: 'house_deposit',
  emailVerified: false,
};

export function isDemoUser(user: AuthUser | null | undefined): boolean {
  return !user || user.id === DEFAULT_DEMO_USER.id;
}

type ActiveUserListener = (user: AuthUser) => void;
const activeUserListeners = new Set<ActiveUserListener>();
let signedInProfile: AuthUser | null = null;

// Remembers that this browser had a signed-in session, so the app can restore it early on the next visit.
const SESSION_HINT_KEY = 'investireland_had_session';

export function hadSignedInSession(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function notifyActiveUser() {
  const user = getActiveUser();
  activeUserListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (err) {
      console.error('Active user listener failed', err);
    }
  });
}

export function setSignedInProfile(profile: AuthUser | null) {
  signedInProfile = profile;
  setStorageScope(profile?.id);
  try {
    if (profile) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Storage can be unavailable (private mode); the hint is only an optimisation.
  }
  notifyActiveUser();
}

/** Signed-in user's profile, or the demo persona when signed out. */
export function getActiveUser(): AuthUser {
  return signedInProfile ?? DEFAULT_DEMO_USER;
}

export function getSignedInUser(): AuthUser | null {
  return signedInProfile;
}

/** Subscribes to sign-in/sign-out/profile changes. Fires immediately with the current user. */
export function subscribeToActiveUser(listener: ActiveUserListener): () => void {
  activeUserListeners.add(listener);
  listener(getActiveUser());
  return () => {
    activeUserListeners.delete(listener);
  };
}
