import type { Firestore, Write } from './firestore';
import { entitlementFields, ownerFamilyExpiry, parseEntitlement, type Entitlement } from './entitlements';

export const entitlementPath = (uid: string) => `entitlements/${uid}`;

/**
 * Reads, mutates and writes a user's entitlement in one transaction. When the user owns a household,
 * the partner's Family access is updated in the same transaction so it always follows the owner's plan.
 */
export async function updateEntitlement<T = void>(
  fs: Firestore,
  uid: string,
  mutate: (ent: Entitlement, tx: string) => Promise<{ extraWrites?: Write[]; result?: T } | void> | { extraWrites?: Write[]; result?: T } | void,
  now = new Date(),
): Promise<{ entitlement: Entitlement; result: T | undefined }> {
  return fs.runTransaction(async (tx) => {
    const doc = await fs.get(entitlementPath(uid), tx);
    const ent = parseEntitlement(doc?.data);
    const out = (await mutate(ent, tx)) || {};
    const writes: Write[] = [fs.set(entitlementPath(uid), entitlementFields(uid, ent, now), { merge: false }), ...(out.extraWrites ?? [])];

    if (ent.householdRole === 'owner' && ent.householdPartner) {
      const partnerDoc = await fs.get(entitlementPath(ent.householdPartner), tx);
      const partner = parseEntitlement(partnerDoc?.data);
      if (partner.householdPartner === uid) {
        const expiry = ownerFamilyExpiry(ent, now);
        partner.householdAccess = expiry ? { ownerUid: uid, expiresAt: expiry } : null;
        writes.push(fs.set(entitlementPath(ent.householdPartner), entitlementFields(ent.householdPartner, partner, now), { merge: false }));
      }
    }
    return { writes, result: { entitlement: ent, result: out.result as T | undefined } };
  });
}
