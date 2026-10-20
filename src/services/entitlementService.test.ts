import { describe, expect, it, vi } from 'vitest';

vi.mock('./firebase', () => ({ auth: { currentUser: null }, db: {} }));

import { FREE_ENTITLEMENT, parseClientEntitlement, planAccess } from './entitlementService';

const ts = (d: Date) => ({ toDate: () => d });
const now = new Date('2026-11-01T12:00:00Z');
const future = new Date('2027-11-01T00:00:00Z');
const past = new Date('2026-10-01T00:00:00Z');

describe('parseClientEntitlement', () => {
  it('returns free when there is no document', () => {
    expect(parseClientEntitlement(undefined, now)).toEqual(FREE_ENTITLEMENT);
  });

  it('keeps an active paid plan and its billing details', () => {
    const ent = parseClientEntitlement(
      {
        plan: 'pro',
        planSource: 'stripe',
        planExpiresAt: ts(future),
        stripeCustomerId: 'cus_123',
        stripe: { status: 'active', cancelAtPeriodEnd: true },
      },
      now,
    );
    expect(ent.plan).toBe('pro');
    expect(ent.planSource).toBe('stripe');
    expect(ent.planExpiresAt).toEqual(future);
    expect(ent.hasBillingAccount).toBe(true);
    expect(ent.cancelAtPeriodEnd).toBe(true);
    expect(ent.stripeStatus).toBe('active');
  });

  it('treats a lapsed plan as free', () => {
    const ent = parseClientEntitlement({ plan: 'family', planSource: 'promo', planExpiresAt: ts(past) }, now);
    expect(ent.plan).toBe('free');
    expect(ent.planExpiresAt).toBeNull();
  });

  it('ignores unknown plan values', () => {
    expect(parseClientEntitlement({ plan: 'enterprise', planExpiresAt: ts(future) }, now).plan).toBe('free');
  });
});

describe('planAccess', () => {
  const pro = { ...FREE_ENTITLEMENT, plan: 'pro' as const };
  const family = { ...FREE_ENTITLEMENT, plan: 'family' as const };

  it('unlocks everything except household when billing is off', () => {
    const a = planAccess(FREE_ENTITLEMENT, true, false);
    expect(a.canUse('xray')).toBe(true);
    expect(a.canUse('unlimited_holdings')).toBe(true);
    expect(a.canUse('household')).toBe(false);
  });

  it('gives guests a full preview but no household', () => {
    const a = planAccess(FREE_ENTITLEMENT, false, true);
    expect(a.canUse('import')).toBe(true);
    expect(a.canUse('household')).toBe(false);
  });

  it('gates signed-in users by plan', () => {
    const free = planAccess(FREE_ENTITLEMENT, true, true);
    expect(free.canUse('xray')).toBe(false);
    expect(free.canUse('unlimited_holdings')).toBe(false);
    expect(planAccess(pro, true, true).canUse('xray')).toBe(true);
    expect(planAccess(pro, true, true).canUse('household')).toBe(false);
    expect(planAccess(family, true, true).canUse('household')).toBe(true);
    expect(planAccess(family, true, true).canUse('import')).toBe(true);
  });
});
