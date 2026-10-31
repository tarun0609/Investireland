import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { CheckoutPlan } from '../config/plans';
import { API_URL, BILLING_ENABLED, BillingError, FREE_ENTITLEMENT, parseClientEntitlement, type ClientEntitlement } from './entitlementCore';
import { auth, db } from './firebase';

export * from './entitlementCore';

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

/* ---------- Billing API (Cloudflare Worker) ---------- */

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
