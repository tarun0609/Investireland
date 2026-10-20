export type PlanId = 'free' | 'pro' | 'family';
export type PlanSource = 'stripe' | 'promo' | 'admin' | 'household';
export type CheckoutPlan = 'pro_monthly' | 'pro_annual' | 'family_annual';

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Early User (Free)',
  pro: 'Pro Expat & Investor',
  family: 'Family / Household',
};

export const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, family: 2 };

export const CHECKOUT_PLANS: Record<CheckoutPlan, { plan: PlanId; label: string; price: string }> = {
  pro_monthly: { plan: 'pro', label: 'Pro monthly', price: '€9.99/month' },
  pro_annual: { plan: 'pro', label: 'Pro yearly', price: '€89/year' },
  family_annual: { plan: 'family', label: 'Family yearly', price: '€149/year' },
};

export const isCheckoutPlan = (v: unknown): v is CheckoutPlan => typeof v === 'string' && v in CHECKOUT_PLANS;

/** Free accounts can keep holdings they already saved but can't add beyond this. */
export const FREE_HOLDINGS_LIMIT = 3;

export type Feature =
  | 'unlimited_holdings'
  | 'xray'
  | 'import'
  | 'fund_price_refresh'
  | 'exports'
  | 'tax_tools'
  | 'rebalance'
  | 'dividends'
  | 'volatility'
  | 'ai_assistant'
  | 'household';

const PRO_FEATURES: Feature[] = [
  'unlimited_holdings',
  'xray',
  'import',
  'fund_price_refresh',
  'exports',
  'tax_tools',
  'rebalance',
  'dividends',
  'volatility',
  'ai_assistant',
];

export const PLAN_FEATURES: Record<PlanId, ReadonlySet<Feature>> = {
  free: new Set(),
  pro: new Set(PRO_FEATURES),
  family: new Set([...PRO_FEATURES, 'household']),
};

export const FEATURE_LABELS: Record<Feature, string> = {
  unlimited_holdings: 'Unlimited holdings',
  xray: 'Financial X-Ray',
  import: 'CAS PDF and CSV import',
  fund_price_refresh: 'Daily fund price refresh',
  exports: 'PDF and CSV exports',
  tax_tools: 'Tax estimator',
  rebalance: 'Rebalancing tool',
  dividends: 'Dividend tracker',
  volatility: 'Currency volatility heatmap',
  ai_assistant: 'AI Plain English Assistant',
  household: 'Combined household view',
};

export const requiredPlanFor = (feature: Feature): PlanId => (PLAN_FEATURES.pro.has(feature) ? 'pro' : 'family');

export const hasFeature = (plan: PlanId, feature: Feature) => PLAN_FEATURES[plan].has(feature);

/** Promo codes give Pro for this many months. */
export const PROMO_MONTHS = 12;
export const PROMO_GLOBAL_CAP = 1000;
