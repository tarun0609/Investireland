import { hasFeature, type CheckoutPlan, type Feature, type PlanId, type PlanSource } from '../config/plans';

// Firebase-free plan helpers, so public pages can use them without loading the Firebase SDK.

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

const toDate = (v: unknown): Date | null =>
  v && typeof (v as { toDate?: unknown }).toDate === 'function' ? (v as { toDate: () => Date }).toDate() : null;

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

export class BillingError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'BillingError';
  }
}

/* ---------- Choices made before sign-up / email verification ---------- */

const PENDING_INVITE_KEY = 'investireland_pending_household_invite';
export const getPendingInvite = () => sessionStorage.getItem(PENDING_INVITE_KEY);
export const setPendingInvite = (invite: string | null) =>
  invite ? sessionStorage.setItem(PENDING_INVITE_KEY, invite.slice(0, 200)) : sessionStorage.removeItem(PENDING_INVITE_KEY);

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
