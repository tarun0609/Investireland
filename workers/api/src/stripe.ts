import { CHECKOUT_PLANS, type CheckoutPlan, type PlanId } from '../../../src/config/plans';
import { hmacHex, timingSafeEqual } from './crypto';
import type { Env } from './env';
import type { StripeState } from './entitlements';
import { HttpError } from './http';

const STRIPE_API = 'https://api.stripe.com/v1';
export const STRIPE_SIGNATURE_TOLERANCE_S = 300;

type Params = Record<string, unknown>;

/** Encodes nested params the way Stripe expects: a[b][0][c]=v */
export function formEncode(params: Params, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) value.forEach((v, i) => (typeof v === 'object' ? formEncode(v as Params, `${name}[${i}]`, out) : out.append(`${name}[${i}]`, String(v))));
    else if (typeof value === 'object') formEncode(value as Params, name, out);
    else out.append(name, String(value));
  }
  return out;
}

export async function stripeRequest<T>(env: Env, method: 'GET' | 'POST', path: string, params: Params = {}, fetchFn: typeof fetch = fetch): Promise<T> {
  const body = formEncode(params);
  const url = method === 'GET' && [...body.keys()].length ? `${STRIPE_API}${path}?${body}` : `${STRIPE_API}${path}`;
  const res = await fetchFn(url, {
    method,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' ? body : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) {
    console.error('Stripe error', res.status, data.error?.message);
    throw new HttpError(502, 'The payment provider is unavailable right now. Please try again.');
  }
  return data as T;
}

export function priceIdFor(env: Env, plan: CheckoutPlan): string {
  const id = { pro_monthly: env.STRIPE_PRICE_PRO_MONTHLY, pro_annual: env.STRIPE_PRICE_PRO_ANNUAL, family_annual: env.STRIPE_PRICE_FAMILY_ANNUAL }[plan];
  if (!id) throw new HttpError(503, 'This plan is not available yet.');
  return id;
}

export function planForPrice(env: Env, priceId: string): PlanId | null {
  if (priceId && (priceId === env.STRIPE_PRICE_PRO_MONTHLY || priceId === env.STRIPE_PRICE_PRO_ANNUAL)) return CHECKOUT_PLANS.pro_monthly.plan;
  if (priceId && priceId === env.STRIPE_PRICE_FAMILY_ANNUAL) return CHECKOUT_PLANS.family_annual.plan;
  return null;
}

export async function createCheckoutSession(
  env: Env,
  args: { uid: string; email: string; plan: CheckoutPlan; customerId?: string | null },
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const session = await stripeRequest<{ url: string }>(
    env,
    'POST',
    '/checkout/sessions',
    {
      mode: 'subscription',
      line_items: [{ price: priceIdFor(env, args.plan), quantity: 1 }],
      client_reference_id: args.uid,
      metadata: { uid: args.uid, plan: args.plan },
      subscription_data: { metadata: { uid: args.uid } },
      ...(args.customerId ? { customer: args.customerId } : { customer_email: args.email || undefined }),
      success_url: `${env.APP_URL}/?billing=success`,
      cancel_url: `${env.APP_URL}/?billing=cancelled`,
    },
    fetchFn,
  );
  return session.url;
}

export async function createPortalSession(env: Env, customerId: string, fetchFn: typeof fetch = fetch): Promise<string> {
  const session = await stripeRequest<{ url: string }>(env, 'POST', '/billing_portal/sessions', { customer: customerId, return_url: `${env.APP_URL}/?billing=portal` }, fetchFn);
  return session.url;
}

/** Verifies the Stripe-Signature header (HMAC-SHA256 of "timestamp.payload"). */
export async function verifyStripeSignature(payload: string, header: string | null, secret: string, nowMs = Date.now()): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!Number.isFinite(t) || signatures.length === 0) return false;
  if (Math.abs(nowMs / 1000 - t) > STRIPE_SIGNATURE_TOLERANCE_S) return false;
  const expected = await hmacHex(secret, `${t}.${payload}`);
  return signatures.some((s) => timingSafeEqual(s, expected));
}

export interface StripeSubscription {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items: { data: { price: { id: string }; current_period_end?: number }[] };
}

export function subscriptionState(env: Env, sub: StripeSubscription): StripeState | null {
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? '';
  const plan = planForPrice(env, priceId);
  // Newer Stripe API versions moved current_period_end onto subscription items.
  const periodEnd = sub.current_period_end ?? item?.current_period_end;
  if (!plan || !periodEnd) return null;
  return {
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    subscriptionId: sub.id,
    priceId,
    plan,
    status: sub.status,
    currentPeriodEnd: new Date(periodEnd * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
  };
}
