import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Building2, 
  Users
} from 'lucide-react';

interface PricingSectionProps {
  onOpenWaitlist: (plan?: string) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenWaitlist }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <section id="pricing" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-200/60 px-3 py-1 rounded-full">
            Transparent Subscription
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Clear, honest pricing. No hidden fees.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            We don't take a cut of your assets under management. We provide pure financial intelligence and portfolio analytics.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="mt-8 inline-flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual Billing <span className="text-[11px] font-normal text-emerald-200">(Save 25%)</span>
            </button>
            <button
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
                <span className="text-xs text-slate-700">forever</span>
              </div>
              <p className="text-xs text-slate-700 mt-2">
                Essential tools for learning about Ireland's new Investment Account.
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
              onClick={() => onOpenWaitlist('Free')}
              className="mt-8 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Get Started Free
            </button>
          </div>

          {/* PRO (Highlighted) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-emerald-500 shadow-lg flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-lg tracking-wider">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-bold uppercase text-emerald-800 tracking-wider">Pro Expat &amp; Investor</div>
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
                  <span><strong>AI Plain English Assistant</strong> (unlimited inquiries)</span>
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
              onClick={() => onOpenWaitlist('Pro')}
              className="mt-8 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer"
            >
              Join Early Beta (Pro)
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
                  <span>Combined €24,000 joint 2027 allowances</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Joint pension &amp; retirement scenario engine</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenWaitlist('Family')}
              className="mt-8 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Join Family Waitlist
            </button>
          </div>

          {/* B2B / PARTNERS */}
          <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-emerald-400 tracking-wider font-mono">
                B2B &middot; Enterprise
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">API / Partner</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                For banks, investment platforms, accountants &amp; employers.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>InvestIreland Intelligence API</span>
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
              onClick={() => onOpenWaitlist('B2B Pilot')}
              className="mt-8 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              Contact for Enterprise Pilot
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
