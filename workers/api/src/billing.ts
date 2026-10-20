import { isCheckoutPlan } from '../../../src/config/plans';
import type { Env } from './env';
import { updateEntitlement, entitlementPath } from './entitlementStore';
import { parseEntitlement, type StripeState } from './entitlements';
import type { VerifiedUser } from './firebaseAuth';
import type { Firestore } from './firestore';
import { HttpError, json, readText } from './http';
import { createCheckoutSession, createPortalSession, stripeRequest, subscriptionState, verifyStripeSignature, type StripeSubscription } from './stripe';

const ACTIVE = new Set(['active', 'trialing', 'past_due']);
const isLive = (s: StripeState | null | undefined, now: Date) => !!s && ACTIVE.has(s.status) && s.currentPeriodEnd > now;

export async function handleCheckout(env: Env, fs: Firestore, user: VerifiedUser, body: Record<string, unknown>, fetchFn: typeof fetch = fetch) {
  if (!isCheckoutPlan(body.plan)) throw new HttpError(400, 'Please choose a plan.');
  const doc = await fs.get(entitlementPath(user.uid));
  const ent = parseEntitlement(doc?.data);
  if (isLive(ent.stripe, new Date())) {
    throw new HttpError(409, 'You already have a subscription. Use "Manage billing" to change or cancel it.', 'has_subscription');
  }
  const url = await createCheckoutSession(env, { uid: user.uid, email: user.email, plan: body.plan, customerId: ent.stripeCustomerId }, fetchFn);
  return json({ url });
}

export async function handlePortal(env: Env, fs: Firestore, user: VerifiedUser, fetchFn: typeof fetch = fetch) {
  const doc = await fs.get(entitlementPath(user.uid));
  const customerId = parseEntitlement(doc?.data).stripeCustomerId;
  if (!customerId) throw new HttpError(404, 'There is no billing account for this user yet.');
  return json({ url: await createPortalSession(env, customerId, fetchFn) });
}

const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
]);

export async function handleStripeWebhook(env: Env, fs: Firestore, request: Request, fetchFn: typeof fetch = fetch, now = new Date()) {
  const payload = await readText(request, 512 * 1024);
  if (!(await verifyStripeSignature(payload, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET, now.getTime()))) {
    throw new HttpError(400, 'Invalid signature.');
  }
  const event = JSON.parse(payload) as { type: string; data: { object: Record<string, any> } };
  const obj = event.data?.object ?? {};

  let subscriptionId: string | null = null;
  let fallbackUid: string | null = null;
  if (event.type === 'checkout.session.completed' && obj.mode === 'subscription') {
    subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id ?? null;
    fallbackUid = typeof obj.client_reference_id === 'string' ? obj.client_reference_id : null;
  } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
    subscriptionId = typeof obj.id === 'string' ? obj.id : null;
  }
  if (!subscriptionId) return json({ received: true, ignored: event.type });

  // Always re-read the subscription so out-of-order or repeated events converge on Stripe's current state.
  const sub = await stripeRequest<StripeSubscription>(env, 'GET', `/subscriptions/${encodeURIComponent(subscriptionId)}`, {}, fetchFn);
  const uid = sub.metadata?.uid || fallbackUid;
  const state = subscriptionState(env, sub);
  if (!uid || !/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !state) {
    console.warn('Stripe event without a usable uid or price', event.type, subscriptionId);
    return json({ received: true, ignored: 'unmapped' });
  }

  await updateEntitlement(fs, uid, (ent) => {
    // A second, inactive subscription must not overwrite the one that is live.
    if (ent.stripe && ent.stripe.subscriptionId !== state.subscriptionId && isLive(ent.stripe, now) && !isLive(state, now)) return;
    ent.stripe = state;
    ent.stripeCustomerId = state.customerId;
  }, now);
  return json({ received: true });
}
