import React, { useEffect, useState } from 'react';
import { CreditCard, Gift, Home, Loader2, Mail, Sparkles, Users } from 'lucide-react';
import { CHECKOUT_PLANS, FREE_HOLDINGS_LIMIT, PLAN_LABELS, PLAN_RANK, type CheckoutPlan } from '../config/plans';
import {
  BillingError,
  inviteHouseholdMember,
  leaveHousehold,
  openBillingPortal,
  redeemPromoCode,
  setMarketingOptOut,
  subscribeMarketingOptOut,
  type PlanAccess,
} from '../services/entitlementService';
import { loadPartnerHoldings } from '../services/portfolioService';
import { convertFromEUR, convertToEUR, formatCurrency } from '../services/fiscalDataService';
import type { Currency, Holding } from '../types';

interface PlanBillingPanelProps {
  access: PlanAccess;
  userId: string;
  holdings: Holding[];
  currentCurrency: Currency;
  onUpgrade: (plan: CheckoutPlan) => void;
  onNotice: (message: string) => void;
  onSignIn: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  stripe: 'Paid subscription',
  promo: 'Promo code',
  admin: 'Complimentary access',
  household: 'Family household member',
};

const formatDate = (d: Date) => d.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
const errorText = (err: unknown) => (err instanceof BillingError ? err.message : 'Something went wrong. Please try again.');

const card = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs';
const input = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500';
const primaryBtn = 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
const secondaryBtn = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export const PlanBillingPanel: React.FC<PlanBillingPanelProps> = ({ access, userId, holdings, currentCurrency, onUpgrade, onNotice, onSignIn }) => {
  const { entitlement: ent, plan, billingEnabled, signedIn } = access;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promo, setPromo] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [optedOut, setOptedOut] = useState(false);
  const [partnerHoldings, setPartnerHoldings] = useState<Holding[] | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    return subscribeMarketingOptOut(userId, setOptedOut);
  }, [signedIn, userId]);

  const partnerUid = plan === 'family' ? ent.householdPartner : null;
  useEffect(() => {
    setPartnerHoldings(null);
    if (!partnerUid) return;
    let cancelled = false;
    loadPartnerHoldings(partnerUid)
      .then((h) => !cancelled && setPartnerHoldings(h))
      .catch(() => !cancelled && setPartnerHoldings([]));
    return () => {
      cancelled = true;
    };
  }, [partnerUid]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  if (!billingEnabled) {
    return (
      <div className={`mt-6 ${card}`}>
        <h2 className="text-lg font-extrabold text-slate-900">Plan &amp; billing</h2>
        <p className="mt-1 text-sm text-slate-600">
          Paid plans haven&apos;t launched yet, so every feature is unlocked during the beta. Nothing is charged and no payment details are needed.
        </p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className={`mt-6 ${card} text-center`}>
        <h2 className="text-lg font-extrabold text-slate-900">Plan &amp; billing</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          You&apos;re previewing the dashboard with sample data. Sign in or create a free account to choose a plan, redeem a promo code and save your own portfolio.
        </p>
        <button type="button" onClick={onSignIn} className={`${primaryBtn} mt-4`}>Sign in / Register</button>
      </div>
    );
  }

  const totalEUR = (list: Holding[]) => list.reduce((sum, h) => sum + convertToEUR(h.currentValue, h.currency), 0);
  const money = (eur: number) => formatCurrency(convertFromEUR(eur, currentCurrency), currentCurrency);
  const upgrades = (Object.keys(CHECKOUT_PLANS) as CheckoutPlan[]).filter((id) => PLAN_RANK[CHECKOUT_PLANS[id].plan] > PLAN_RANK[plan]);
  const isOwner = plan === 'family' && ent.planSource !== 'household';

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {error && (
        <div role="alert" className="lg:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      )}

      <section className={card} aria-labelledby="plan-current">
        <div className="flex items-center gap-2 text-emerald-800">
          <CreditCard className="h-5 w-5" aria-hidden="true" />
          <h2 id="plan-current" className="text-lg font-extrabold text-slate-900">Your plan: {PLAN_LABELS[plan]}</h2>
        </div>
        {plan === 'free' ? (
          <p className="mt-2 text-sm text-slate-600">
            Track up to {FREE_HOLDINGS_LIMIT} holdings with the snapshot, calculators and guides. You have {holdings.length}.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {ent.planSource && <li>Source: <strong className="text-slate-800">{SOURCE_LABELS[ent.planSource] ?? ent.planSource}</strong>{ent.promoCode && ent.planSource === 'promo' ? ` (${ent.promoCode})` : ''}</li>}
            {ent.planExpiresAt && (
              <li>
                {ent.planSource === 'stripe' && !ent.cancelAtPeriodEnd ? 'Renews on ' : 'Active until '}
                <strong className="text-slate-800">{formatDate(ent.planExpiresAt)}</strong>
              </li>
            )}
          </ul>
        )}
        {ent.cancelAtPeriodEnd && ent.planSource === 'stripe' && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Your subscription is cancelled and won&apos;t renew. You can resume it from Manage billing.</p>
        )}
        {ent.stripeStatus === 'past_due' && (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">Your last payment failed. Please update your card in Manage billing to keep your plan.</p>
        )}

        {upgrades.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {upgrades.map((id, i) => (
              <button key={id} type="button" onClick={() => onUpgrade(id)} className={i === 0 ? primaryBtn : secondaryBtn}>
                {i === 0 && <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                {CHECKOUT_PLANS[id].label} &middot; {CHECKOUT_PLANS[id].price}
              </button>
            ))}
          </div>
        )}
        {ent.hasBillingAccount && (
          <button type="button" disabled={busy === 'portal'} onClick={() => run('portal', openBillingPortal)} className={`${secondaryBtn} mt-3`}>
            {busy === 'portal' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Manage billing, invoices &amp; cancellation
          </button>
        )}
        <p className="mt-3 text-[11px] text-slate-500">Payments are handled securely by Stripe. We never see or store your card details.</p>
      </section>

      {plan === 'free' && (
        <section className={card} aria-labelledby="plan-promo">
          <div className="flex items-center gap-2 text-emerald-800">
            <Gift className="h-5 w-5" aria-hidden="true" />
            <h2 id="plan-promo" className="text-lg font-extrabold text-slate-900">Redeem a promo code</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">Early-user codes unlock Pro free for 12 months. One code per account; requires a verified email.</p>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const code = promo.trim();
              if (!code) return;
              void run('promo', async () => {
                const res = await redeemPromoCode(code);
                setPromo('');
                onNotice(`Promo code applied: Pro is unlocked until ${formatDate(new Date(res.expiresAt))}.`);
              });
            }}
          >
            <label htmlFor="promo-code" className="sr-only">Promo code</label>
            <input
              id="promo-code"
              value={promo}
              onChange={(e) => setPromo(e.target.value.toUpperCase())}
              maxLength={32}
              autoComplete="off"
              placeholder="EARLY-XXXXXXXX"
              className={`${input} font-mono uppercase`}
            />
            <button type="submit" disabled={!promo.trim() || busy === 'promo'} className={primaryBtn}>
              {busy === 'promo' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Redeem
            </button>
          </form>
        </section>
      )}

      {plan === 'family' && (
        <section className={`${card} lg:col-span-2`} aria-labelledby="plan-household">
          <div className="flex items-center gap-2 text-emerald-800">
            <Home className="h-5 w-5" aria-hidden="true" />
            <h2 id="plan-household" className="text-lg font-extrabold text-slate-900">Household</h2>
          </div>
          {ent.householdPartner ? (
            <>
              <p className="mt-1 text-sm text-slate-600">
                <Users className="mr-1 inline h-4 w-4 text-emerald-700" aria-hidden="true" />
                Shared with <strong className="text-slate-800 break-all">{ent.householdPartnerEmail ?? 'your partner'}</strong>. You can each see the other&apos;s holdings (read-only).
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[11px] font-bold uppercase text-slate-500">You</div>
                  <div className="font-mono text-lg font-extrabold text-slate-900">{money(totalEUR(holdings))}</div>
                  <div className="text-[11px] text-slate-500">{holdings.length} holdings</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[11px] font-bold uppercase text-slate-500">Partner</div>
                  <div className="font-mono text-lg font-extrabold text-slate-900">{partnerHoldings ? money(totalEUR(partnerHoldings)) : '…'}</div>
                  <div className="text-[11px] text-slate-500">{partnerHoldings ? `${partnerHoldings.length} holdings` : 'Loading'}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-[11px] font-bold uppercase text-emerald-800">Household total</div>
                  <div className="font-mono text-lg font-extrabold text-emerald-900">{partnerHoldings ? money(totalEUR(holdings) + totalEUR(partnerHoldings)) : '…'}</div>
                  <div className="text-[11px] text-emerald-800">Combined €24,000 proposed allowance</div>
                </div>
              </div>
              {partnerHoldings && partnerHoldings.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">Partner holdings</caption>
                    <thead className="text-slate-500">
                      <tr><th className="py-1.5 pr-3 font-semibold">Partner&apos;s asset</th><th className="py-1.5 pr-3 font-semibold">Type</th><th className="py-1.5 text-right font-semibold">Value</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {partnerHoldings.map((h) => (
                        <tr key={h.id}>
                          <td className="py-1.5 pr-3 font-medium text-slate-800">{h.assetName}</td>
                          <td className="py-1.5 pr-3 text-slate-600">{h.assetType}</td>
                          <td className="py-1.5 text-right font-mono">{money(convertToEUR(h.currentValue, h.currency))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                type="button"
                disabled={busy === 'leave'}
                onClick={() => {
                  if (!window.confirm(isOwner ? 'Remove your partner from the household? They will lose Family access.' : 'Leave this household? You will lose Family access.')) return;
                  void run('leave', async () => {
                    await leaveHousehold();
                    onNotice(isOwner ? 'Your partner has been removed from the household.' : 'You have left the household.');
                  });
                }}
                className={`${secondaryBtn} mt-4`}
              >
                {busy === 'leave' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isOwner ? 'Remove partner' : 'Leave household'}
              </button>
            </>
          ) : isOwner ? (
            <form
              className="mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                const email = inviteEmail.trim();
                if (!email) return;
                void run('invite', async () => {
                  const res = await inviteHouseholdMember(email);
                  setInviteEmail('');
                  onNotice(`Invitation sent to ${res.invited}. The link is valid until ${formatDate(new Date(res.expiresAt))}.`);
                });
              }}
            >
              <p className="text-sm text-slate-600">Invite the second adult in your household. They get their own private account plus Family features, and you can each view the other&apos;s holdings.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label htmlFor="household-email" className="sr-only">Partner&apos;s email</label>
                <input id="household-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="partner@example.com" autoComplete="email" className={input} />
                <button type="submit" disabled={!inviteEmail.trim() || busy === 'invite'} className={primaryBtn}>
                  {busy === 'invite' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" aria-hidden="true" />}
                  Send invite
                </button>
              </div>
            </form>
          ) : null}
        </section>
      )}

      <section className={`${card} lg:col-span-2`} aria-labelledby="plan-email">
        <h2 id="plan-email" className="text-base font-extrabold text-slate-900">Email preferences</h2>
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={!optedOut}
            disabled={busy === 'optout'}
            onChange={(e) => {
              const next = !e.target.checked;
              void run('optout', () => setMarketingOptOut(userId, next));
            }}
            className="mt-1 accent-emerald-600"
          />
          <span>Send me product news and early-access updates. Account and billing emails are always sent.</span>
        </label>
      </section>
    </div>
  );
};
