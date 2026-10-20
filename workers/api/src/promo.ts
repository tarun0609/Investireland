import { PROMO_GLOBAL_CAP, PROMO_MONTHS } from '../../../src/config/plans';
import type { Env } from './env';
import { entitlementPath } from './entitlementStore';
import { addMonths, computeEffectivePlan, entitlementFields, parseEntitlement } from './entitlements';
import type { VerifiedUser } from './firebaseAuth';
import type { Firestore } from './firestore';
import { HttpError } from './http';

export const PROMO_COUNTER_PATH = 'counters/promo';

export function normalizePromoCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9-]{4,32}$/.test(code) ? code : null;
}

export const globalPromoCap = (env: Pick<Env, 'PROMO_GLOBAL_CAP'>) => {
  const n = Number(env.PROMO_GLOBAL_CAP);
  return Number.isInteger(n) && n > 0 ? n : PROMO_GLOBAL_CAP;
};

/** Redeems a promo code for 12 months of Pro. Every limit is checked inside one Firestore transaction. */
export async function redeemPromo(env: Env, fs: Firestore, user: VerifiedUser, rawCode: unknown, now = new Date()) {
  const code = normalizePromoCode(rawCode);
  if (!code) throw new HttpError(400, 'Please enter a valid promo code.');
  if (!user.emailVerified) throw new HttpError(403, 'Please verify your email address before redeeming a code.', 'email_unverified');
  const cap = globalPromoCap(env);

  return fs.runTransaction(async (tx) => {
    const docs = await fs.batchGet([`promoCodes/${code}`, PROMO_COUNTER_PATH, `promoRedemptions/${user.uid}`, entitlementPath(user.uid)], tx);
    const promo = docs.get(`promoCodes/${code}`)?.data as Record<string, any> | undefined;
    if (!promo || promo.active !== true) throw new HttpError(404, 'That promo code isn\u2019t valid.', 'invalid_code');
    if (promo.expiresAt instanceof Date && promo.expiresAt <= now) throw new HttpError(410, 'That promo code has expired.', 'expired');
    if (Number(promo.redemptions ?? 0) >= Number(promo.maxRedemptions ?? 0)) throw new HttpError(410, 'That promo code has been fully used.', 'code_used_up');

    const redeemed = Number(docs.get(PROMO_COUNTER_PATH)?.data.redeemed ?? 0);
    if (redeemed >= cap) throw new HttpError(410, `All ${cap.toLocaleString('en-IE')} free early-access places have been claimed.`, 'cap_reached');
    if (docs.has(`promoRedemptions/${user.uid}`)) throw new HttpError(409, 'You have already redeemed a promo code.', 'already_redeemed');

    const ent = parseEntitlement(docs.get(entitlementPath(user.uid))?.data);
    const current = computeEffectivePlan(ent, now);
    if (current.plan !== 'free') throw new HttpError(409, 'You already have a paid plan, so this code isn\u2019t needed.', 'already_paid');

    const expiresAt = addMonths(now, Number(promo.months) > 0 ? Number(promo.months) : PROMO_MONTHS);
    ent.promo = { code, expiresAt };
    return {
      writes: [
        fs.increment(`promoCodes/${code}`, 'redemptions', 1, { lastRedeemedAt: now }),
        fs.increment(PROMO_COUNTER_PATH, 'redeemed', 1, { cap, updatedAt: now }),
        fs.set(`promoRedemptions/${user.uid}`, { uid: user.uid, email: user.email, code, redeemedAt: now, expiresAt }, { merge: false, exists: false }),
        fs.set(entitlementPath(user.uid), entitlementFields(user.uid, ent, now), { merge: false }),
      ],
      result: { plan: 'pro' as const, expiresAt: expiresAt.toISOString() },
    };
  });
}
