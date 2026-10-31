import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { PLAN_RANK, PROMO_GLOBAL_CAP, PROMO_MONTHS, type CheckoutPlan, type PlanId } from '../config/plans';

interface PricingSectionProps {
  onOpenWaitlist: (plan?: string) => void;
  billingEnabled?: boolean;
  currentPlan?: PlanId;
  onUpgrade?: (plan: CheckoutPlan) => void;
  onOpenDashboard?: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenWaitlist, billingEnabled = false, currentPlan = 'free', onUpgrade, onOpenDashboard }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const live = billingEnabled && !!onUpgrade;
  const ctaFor = (plan: PlanId, checkout: CheckoutPlan, fallback: () => void, idle: string) => {
    if (!live) return { label: idle, onClick: fallback, disabled: false };
    if (currentPlan === plan) return { label: 'Your current plan', onClick: () => onOpenDashboard?.(), disabled: false };
    if (PLAN_RANK[currentPlan] > PLAN_RANK[plan]) return { label: 'Included in your plan', onClick: () => onOpenDashboard?.(), disabled: true };
    return { label: plan === 'family' ? 'Choose Family' : `Choose Pro ${billingCycle === 'annual' ? 'annual' : 'monthly'}`, onClick: () => onUpgrade!(checkout), disabled: false };
  };
  const proCta = ctaFor('pro', billingCycle === 'annual' ? 'pro_annual' : 'pro_monthly', () => onOpenWaitlist('Pro'), 'Join Early Beta (Pro)');
  const familyCta = ctaFor('family', 'family_annual', () => onOpenWaitlist('Family'), 'Join Family Waitlist');

  return (
    <section id="pricing" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-widest bg-slate-200/60 px-3 py-1 rounded-full">
            {live ? 'Pricing' : 'Planned Pricing'}
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Clear, honest pricing. No hidden fees.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            {live
              ? <>We don't take a cut of your assets. Start free, upgrade when you need more, and cancel any time. Early users can get Pro free for {PROMO_MONTHS} months with a promo code (first {PROMO_GLOBAL_CAP.toLocaleString('en-IE')} redemptions).</>
              : <>We don't take a cut of your assets. These are the plans we intend to offer after the beta. During early access, everything is free and no payment details are collected.</>}
          </p>

          {/* Billing Cycle Switcher */}
          <div role="group" aria-label="Billing cycle" className="mt-8 inline-flex flex-wrap justify-center items-center p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              aria-pressed={billingCycle === 'annual'}
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual Billing{' '}
              <span className={`text-[11px] font-normal ${billingCycle === 'annual' ? 'text-emerald-100' : 'text-emerald-700'}`}>(Save ~25%)</span>
            </button>
            <button
              type="button"
              aria-pressed={billingCycle === 'monthly'}
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
          </div>
        </div>

        {/* 4 Pricing Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          
          {/* FREE */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-slate-700 tracking-wider">Free</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 font-mono">€0</span>
                <span className="text-xs text-slate-700">free plan</span>
              </div>
              <p className="text-xs text-slate-700 mt-2">
                Essential tools for learning about Ireland's proposed Investment Account.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Budget 2027 Investment Account guide</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Public FY26 vs FY27 calculator</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Basic financial snapshot (up to 3 assets)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Official government sources tracker</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => (live && currentPlan !== 'free' ? onOpenDashboard?.() : onOpenWaitlist('Free'))}
              className="mt-8 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {live && currentPlan !== 'free' ? 'Open dashboard' : live ? 'Start free' : 'Join Free Early Access'}
            </button>
          </div>

          {/* PRO (Highlighted) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-emerald-500 shadow-lg flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-700 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-lg tracking-wider">
              Recommended
            </div>

            <div>
              <div className="text-xs font-bold uppercase text-emerald-800 tracking-wider pr-24">Pro Expat &amp; Investor</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 font-mono">
                  {billingCycle === 'annual' ? '€89' : '€9.99'}
                </span>
                <span className="text-xs text-slate-700">
                  {billingCycle === 'annual' ? '/year' : '/month'}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-2">
                Complete financial intelligence for investors with Irish &amp; overseas holdings.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Unlimited holdings</strong> across Ireland, India &amp; US</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Financial X-Ray</strong> &amp; single-asset concentration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>AI Plain English Assistant</strong> (fair-use limits apply)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>€12,000 allowance &amp; threshold alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>CSV statement upload &amp; exports</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={proCta.onClick}
              disabled={proCta.disabled}
              className="mt-8 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-default transition-colors shadow-sm cursor-pointer"
            >
              {proCta.label}
            </button>
          </div>

          {/* FAMILY */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-slate-700 tracking-wider">Family / Household</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 font-mono">€149</span>
                <span className="text-xs text-slate-700">/year</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Annual billing only</p>
              <p className="text-xs text-slate-700 mt-2">
                Consolidated household wealth dashboard for couples &amp; families.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Two adult individual accounts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Shared household Financial X-Ray</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Combined €24,000 joint allowances (2 × €12,000, as proposed)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Joint pension &amp; retirement scenario engine</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={familyCta.onClick}
              disabled={familyCta.disabled}
              className="mt-8 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 disabled:cursor-default transition-colors cursor-pointer"
            >
              {familyCta.label}
            </button>
          </div>

          {/* B2B / PARTNERS */}
          <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-emerald-400 tracking-wider font-mono">
                B2B &middot; Enterprise
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">Partner Pilot</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Exploratory pilots for banks, investment platforms, accountants &amp; employers.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>InvestIreland Intelligence API (planned)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Automated rules engine &amp; contribution API</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>White-label customer educational widgets</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Employee financial wellbeing modules</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onOpenWaitlist('B2B Pilot')}
              className="mt-8 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              Register Pilot Interest
            </button>
          </div>

        </div>

        <p className="mt-8 text-center text-xs text-slate-500 max-w-2xl mx-auto">
          {live
            ? 'Prices include no hidden fees. Payments are processed securely by Stripe; manage or cancel your subscription any time from Plan & billing in the dashboard.'
            : "Prices shown are planned and may change before launch. Nothing is charged during the beta, and we'll ask before you're ever billed."}
        </p>

      </div>
    </section>
  );
};
