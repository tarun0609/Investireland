import { doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore';
import { hasFeature, type CheckoutPlan, type Feature, type PlanId, type PlanSource } from '../config/plans';
import { auth, db } from './firebase';

/** The billing Worker URL. When it isn't configured, billing is off and every feature stays unlocked. */
export const API_URL = String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const BILLING_ENABLED = /^https:\/\//.test(API_URL) || /^http:\/\/localhost(:\d+)?$/.test(API_URL);

export interface ClientEntitlement {
  plan: PlanId;
  planSource: PlanSource | null;
  planExpiresAt: Date | null;
  stripeStatus: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
  promoCode: string | null;
  householdRole: 'owner' | 'member' | null;
  householdPartner: string | null;
  householdPartnerEmail: string | null;
}

export const FREE_ENTITLEMENT: ClientEntitlement = {
  plan: 'free',
  planSource: null,
  planExpiresAt: null,
  stripeStatus: null,
  cancelAtPeriodEnd: false,
  hasBillingAccount: false,
  promoCode: null,
  householdRole: null,
  householdPartner: null,
  householdPartnerEmail: null,
};

const toDate = (v: unknown): Date | null => (v && typeof (v as Timestamp).toDate === 'function' ? (v as Timestamp).toDate() : null);

export function parseClientEntitlement(data: Record<string, any> | undefined, now = new Date()): ClientEntitlement {
  if (!data) return FREE_ENTITLEMENT;
  const expiresAt = toDate(data.planExpiresAt);
  const plan: PlanId = data.plan === 'pro' || data.plan === 'family' ? data.plan : 'free';
  // The stored plan is computed when the doc is written, so treat it as free once it has lapsed.
  const active = plan !== 'free' && !!expiresAt && expiresAt > now;
  return {
    plan: active ? plan : 'free',
    planSource: active ? (data.planSource ?? null) : null,
    planExpiresAt: active ? expiresAt : null,
    stripeStatus: typeof data.stripe?.status === 'string' ? data.stripe.status : null,
    cancelAtPeriodEnd: data.stripe?.cancelAtPeriodEnd === true,
    hasBillingAccount: typeof data.stripeCustomerId === 'string' && data.stripeCustomerId.length > 0,
    promoCode: typeof data.promo?.code === 'string' ? data.promo.code : null,
    householdRole: data.householdRole === 'owner' || data.householdRole === 'member' ? data.householdRole : null,
    householdPartner: typeof data.householdPartner === 'string' ? data.householdPartner : null,
    householdPartnerEmail: typeof data.householdPartnerEmail === 'string' ? data.householdPartnerEmail : null,
  };
}

export function subscribeEntitlement(uid: string, onChange: (ent: ClientEntitlement) => void): () => void {
  return onSnapshot(
    doc(db, 'entitlements', uid),
    (snap) => onChange(parseClientEntitlement(snap.exists() ? snap.data() : undefined)),
    (err) => {
      console.warn('Could not load plan details', err.code);
      onChange(FREE_ENTITLEMENT);
    },
  );
}

/** What the current visitor may use. Guests see a full preview with sample data; signed-in users follow their plan. */
export interface PlanAccess {
  billingEnabled: boolean;
  signedIn: boolean;
  entitlement: ClientEntitlement;
  plan: PlanId;
  canUse: (feature: Feature) => boolean;
}

export function planAccess(entitlement: ClientEntitlement, signedIn: boolean, billingEnabled = BILLING_ENABLED): PlanAccess {
  const plan = entitlement.plan;
  return {
    billingEnabled,
    signedIn,
    entitlement,
    plan,
    canUse: (feature) => {
      if (feature === 'household') return billingEnabled && signedIn && hasFeature(plan, 'household');
      if (!billingEnabled || !signedIn) return true;
      return hasFeature(plan, feature);
    },
  };
}

/* ---------- Billing API (Cloudflare Worker) ---------- */

export class BillingError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'BillingError';
  }
}

async function callApi<T>(path: string, body: Record<string, unknown> = {}, freshToken = false): Promise<T> {
  if (!BILLING_ENABLED) throw new BillingError('Billing is not available yet.', 503);
  const user = auth.currentUser;
  if (!user) throw new BillingError('Please sign in first.', 401);
  let res: Response;
  try {
    // A fresh token carries email_verified=true straight after the user clicks the verification link.
    if (freshToken) await user.reload().catch(() => undefined);
    const token = await user.getIdToken(freshToken);
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new BillingError('We couldn\u2019t reach the billing service. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new BillingError(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`, res.status, data.code);
  return data as T;
}

const redirectTo = (url: unknown) => {
  if (typeof url !== 'string' || !/^https:\/\/(checkout|billing)\.stripe\.com\//.test(url)) throw new BillingError('Unexpected payment page address.', 502);
  window.location.assign(url);
};

export async function startCheckout(plan: CheckoutPlan): Promise<void> {
  redirectTo((await callApi<{ url: string }>('/billing/checkout', { plan })).url);
}

export async function openBillingPortal(): Promise<void> {
  redirectTo((await callApi<{ url: string }>('/billing/portal')).url);
}

export const redeemPromoCode = (code: string) => callApi<{ plan: 'pro'; expiresAt: string }>('/promo/redeem', { code }, true);
export const inviteHouseholdMember = (email: string) => callApi<{ invited: string; expiresAt: string }>('/household/invite', { email }, true);
export const acceptHouseholdInvite = (invite: string) => callApi<{ joined: string }>('/household/accept', { invite }, true);
export const leaveHousehold = () => callApi<{ left: true }>('/household/leave');

const PENDING_INVITE_KEY = 'investireland_pending_household_invite';
export const getPendingInvite = () => sessionStorage.getItem(PENDING_INVITE_KEY);
export const setPendingInvite = (invite: string | null) =>
  invite ? sessionStorage.setItem(PENDING_INVITE_KEY, invite.slice(0, 200)) : sessionStorage.removeItem(PENDING_INVITE_KEY);

export function subscribeMarketingOptOut(uid: string, onChange: (optedOut: boolean) => void): () => void {
  return onSnapshot(
    doc(db, 'emailOptOuts', uid),
    (snap) => onChange(snap.exists() && snap.data().optedOut === true),
    () => onChange(false),
  );
}

export async function setMarketingOptOut(uid: string, optedOut: boolean): Promise<void> {
  await setDoc(doc(db, 'emailOptOuts', uid), { uid, optedOut, updatedAt: serverTimestamp() });
}

/* ---------- Choices made before sign-up / email verification ---------- */

const PENDING_PROMO_KEY = 'investireland_pending_promo';
const PENDING_PLAN_KEY = 'investireland_pending_plan';

export const getPendingPromo = () => localStorage.getItem(PENDING_PROMO_KEY);
export const setPendingPromo = (code: string | null) =>
  code ? localStorage.setItem(PENDING_PROMO_KEY, code.trim().toUpperCase().slice(0, 32)) : localStorage.removeItem(PENDING_PROMO_KEY);

export const getPendingPlan = (): CheckoutPlan | null => {
  const v = sessionStorage.getItem(PENDING_PLAN_KEY);
  return v === 'pro_monthly' || v === 'pro_annual' || v === 'family_annual' ? v : null;
};
export const setPendingPlan = (plan: CheckoutPlan | null) =>
  plan ? sessionStorage.setItem(PENDING_PLAN_KEY, plan) : sessionStorage.removeItem(PENDING_PLAN_KEY);
