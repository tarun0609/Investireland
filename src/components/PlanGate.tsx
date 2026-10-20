import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { CHECKOUT_PLANS, FEATURE_LABELS, PLAN_LABELS, requiredPlanFor, type CheckoutPlan, type Feature } from '../config/plans';

interface LockedFeatureCardProps {
  feature: Feature;
  onUpgrade: (plan: CheckoutPlan) => void;
  onShowPlans?: () => void;
  compact?: boolean;
}

/** Shown in place of a feature the current plan doesn't include. */
export const LockedFeatureCard: React.FC<LockedFeatureCardProps> = ({ feature, onUpgrade, onShowPlans, compact }) => {
  const needed = requiredPlanFor(feature);
  const options: CheckoutPlan[] = needed === 'family' ? ['family_annual'] : ['pro_annual', 'pro_monthly'];
  return (
    <div className={`${compact ? '' : 'mt-6'} rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 sm:p-8 text-center shadow-xs`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Lock className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-3 text-lg font-extrabold text-slate-900">{FEATURE_LABELS[feature]} is part of {PLAN_LABELS[needed]}</h2>
      <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-slate-600">
        Upgrade to unlock it. You can cancel any time from Plan &amp; billing, and you keep everything you&apos;ve saved.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {options.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => onUpgrade(id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              i === 0 ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            {i === 0 && <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
            {CHECKOUT_PLANS[id].label} &middot; {CHECKOUT_PLANS[id].price}
          </button>
        ))}
      </div>
      {onShowPlans && (
        <button type="button" onClick={onShowPlans} className="mt-3 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950 cursor-pointer">
          Have a promo code? Redeem it in Plan &amp; billing
        </button>
      )}
    </div>
  );
};
