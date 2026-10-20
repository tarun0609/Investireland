import { PLAN_RANK, type PlanId, type PlanSource } from '../../../src/config/plans';
import type { Plain } from './firestore';

export interface StripeState {
  customerId: string;
  subscriptionId: string;
  priceId: string;
  plan: PlanId;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface Entitlement {
  plan: PlanId;
  planSource: PlanSource | null;
  planExpiresAt: Date | null;
  stripe?: StripeState | null;
  stripeCustomerId?: string | null;
  promo?: { code: string; expiresAt: Date } | null;
  grant?: { plan: PlanId; expiresAt: Date; note?: string } | null;
  /** Household members get Family access that follows the owner's plan. */
  householdAccess?: { ownerUid: string; expiresAt: Date } | null;
  householdRole?: 'owner' | 'member' | null;
  /** The other adult in the household; Firestore rules let each read the other's holdings. */
  householdPartner?: string | null;
  householdPartnerEmail?: string | null;
}

const ACTIVE_STRIPE_STATUSES = new Set(['active', 'trialing', 'past_due']);

const asDate = (v: unknown) => (v instanceof Date && !Number.isNaN(v.getTime()) ? v : null);
const asString = (v: unknown) => (typeof v === 'string' ? v : null);
const asPlan = (v: unknown): PlanId | null => (v === 'free' || v === 'pro' || v === 'family' ? v : null);

/** Parses a raw Firestore entitlement document defensively. */
export function parseEntitlement(data: Record<string, Plain> | undefined | null): Entitlement {
  const d = (data ?? {}) as Record<string, any>;
  const stripe = d.stripe && typeof d.stripe === 'object' && asDate(d.stripe.currentPeriodEnd) && asPlan(d.stripe.plan)
    ? {
        customerId: String(d.stripe.customerId ?? ''),
        subscriptionId: String(d.stripe.subscriptionId ?? ''),
        priceId: String(d.stripe.priceId ?? ''),
        plan: asPlan(d.stripe.plan)!,
        status: String(d.stripe.status ?? ''),
        currentPeriodEnd: asDate(d.stripe.currentPeriodEnd)!,
        cancelAtPeriodEnd: d.stripe.cancelAtPeriodEnd === true,
      }
    : null;
  const promo = d.promo && asDate(d.promo.expiresAt) ? { code: String(d.promo.code ?? ''), expiresAt: asDate(d.promo.expiresAt)! } : null;
  const grant = d.grant && asDate(d.grant.expiresAt) && asPlan(d.grant.plan)
    ? { plan: asPlan(d.grant.plan)!, expiresAt: asDate(d.grant.expiresAt)!, note: asString(d.grant.note) ?? undefined }
    : null;
  const householdAccess = d.householdAccess && asDate(d.householdAccess.expiresAt) && asString(d.householdAccess.ownerUid)
    ? { ownerUid: d.householdAccess.ownerUid as string, expiresAt: asDate(d.householdAccess.expiresAt)! }
    : null;
  return {
    plan: asPlan(d.plan) ?? 'free',
    planSource: (asString(d.planSource) as PlanSource | null) ?? null,
    planExpiresAt: asDate(d.planExpiresAt),
    stripe,
    stripeCustomerId: asString(d.stripeCustomerId),
    promo,
    grant,
    householdAccess,
    householdRole: d.householdRole === 'owner' || d.householdRole === 'member' ? d.householdRole : null,
    householdPartner: asString(d.householdPartner),
    householdPartnerEmail: asString(d.householdPartnerEmail),
  };
}

/** Picks the best currently valid source: highest plan, then latest expiry. */
export function computeEffectivePlan(ent: Entitlement, now = new Date()): { plan: PlanId; planSource: PlanSource | null; planExpiresAt: Date | null } {
  const candidates: { plan: PlanId; source: PlanSource; expiresAt: Date }[] = [];
  if (ent.stripe && ACTIVE_STRIPE_STATUSES.has(ent.stripe.status) && ent.stripe.currentPeriodEnd > now) {
    candidates.push({ plan: ent.stripe.plan, source: 'stripe', expiresAt: ent.stripe.currentPeriodEnd });
  }
  if (ent.promo && ent.promo.expiresAt > now) candidates.push({ plan: 'pro', source: 'promo', expiresAt: ent.promo.expiresAt });
  if (ent.grant && ent.grant.expiresAt > now && ent.grant.plan !== 'free') {
    candidates.push({ plan: ent.grant.plan, source: 'admin', expiresAt: ent.grant.expiresAt });
  }
  if (ent.householdAccess && ent.householdAccess.expiresAt > now) {
    candidates.push({ plan: 'family', source: 'household', expiresAt: ent.householdAccess.expiresAt });
  }
  candidates.sort((a, b) => PLAN_RANK[b.plan] - PLAN_RANK[a.plan] || b.expiresAt.getTime() - a.expiresAt.getTime());
  const best = candidates[0];
  return best ? { plan: best.plan, planSource: best.source, planExpiresAt: best.expiresAt } : { plan: 'free', planSource: null, planExpiresAt: null };
}

/** Serialises an entitlement (with recomputed effective plan) for a Firestore write. */
export function entitlementFields(uid: string, ent: Entitlement, now = new Date()): Record<string, Plain> {
  const effective = computeEffectivePlan(ent, now);
  return {
    uid,
    plan: effective.plan,
    planSource: effective.planSource,
    planExpiresAt: effective.planExpiresAt,
    stripe: ent.stripe ? { ...ent.stripe } : null,
    stripeCustomerId: ent.stripeCustomerId ?? ent.stripe?.customerId ?? null,
    promo: ent.promo ? { ...ent.promo } : null,
    grant: ent.grant ? { plan: ent.grant.plan, expiresAt: ent.grant.expiresAt, note: ent.grant.note ?? null } : null,
    householdAccess: ent.householdAccess ? { ...ent.householdAccess } : null,
    householdRole: ent.householdRole ?? null,
    householdPartner: ent.householdPartner ?? null,
    householdPartnerEmail: ent.householdPartnerEmail ?? null,
    updatedAt: now,
  };
}

export const addMonths = (date: Date, months: number) => {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
};

/** Family access a household owner can share right now (null when they have no active Family plan of their own). */
export function ownerFamilyExpiry(owner: Entitlement, now = new Date()): Date | null {
  const own = computeEffectivePlan({ ...owner, householdAccess: null }, now);
  return own.plan === 'family' ? own.planExpiresAt : null;
}
