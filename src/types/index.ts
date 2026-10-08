export type Currency = 'EUR' | 'INR' | 'USD' | 'GBP';

export type AssetCategory = 'equities' | 'cash' | 'bonds' | 'pension' | 'funds' | 'other';
export type CountryExposure = 'Ireland' | 'India' | 'US' | 'Europe' | 'Other';

export interface Holding {
  id: string;
  assetName: string;
  assetType: 'ETF' | 'Share' | 'Mutual Fund' | 'Pension' | 'Cash / Deposit' | 'Bond' | 'RSU';
  ticker?: string;
  isin?: string;
  units: number;
  unitPrice: number;
  currentValue: number; // in original currency
  currency: Currency;
  country: CountryExposure;
  provider: string; // e.g., 'Davy Select', 'Zerodha', 'Charles Schwab', 'Irish Life', 'Revolut'
  purchaseValue?: number;
  notes?: string;
  updatedAt: string;
}

export interface InvestmentAccountState {
  accountValue: number; // EUR
  annualContributions: number; // EUR
  annualLimit: number; // €12,000
  taxFreeThreshold: number; // €50,000
  excessAnnualChargeRate: number; // 0.01 (1%)
  status: 'Pre-launch (1 July 2027)' | 'Active';
  history: {
    id: string;
    date: string;
    amount: number;
    provider: string;
    type: 'Contribution' | 'Dividend' | 'Growth';
  }[];
}

export interface FiscalDataResponse {
  jurisdiction: string;
  currency: string;
  lastVerifiedTimestamp: string;
  legalBasis: string;
  regime: {
    fy26: {
      budgetYear: string;
      status: string;
      exitTaxRate: number;
      deemedDisposalCycleYears: number;
      cgtRate: number;
      cgtAnnualExemption: number;
      dirtRate: number;
      personalInvestmentAccountAvailable: boolean;
      primaryLegislation: string;
    };
    fy27: {
      budgetYear: string;
      status: string;
      schemeName: string;
      launchDate: string;
      annualContributionLimit: number;
      taxFreeThreshold: number;
      annualChargeAboveThreshold: number;
      deemedDisposalApplicable: boolean;
      eligibleInvestments: string[];
      excludedInvestments: string[];
      residencyRequirement: string;
      exitTaxOutsideScheme: number;
      primaryLegislation: string;
    };
  };
  macroIndicators: {
    irelandHICPInflation: number;
    ecbRefinancingRate: number;
    irishHouseholdSavingsRate: number;
    fxRates: {
      EUR_TO_INR: number;
      EUR_TO_USD: number;
      EUR_TO_GBP: number;
      lastUpdated: string;
    };
  };
  officialSources: OfficialSource[];
}

export interface OfficialSource {
  id: string;
  agency: string;
  title: string;
  url: string;
  publicationDate: string;
  confidenceScore: number;
  status: string;
}

export interface BudgetCalculatorInputs {
  startingAmount: number;
  monthlyContribution: number;
  timeHorizonYears: number;
  annualReturnRate: number; // e.g., 0.07 for 7%
  adjustForInflation: boolean;
  assetClass: 'etf_fund' | 'individual_shares' | 'deposit';
}

export interface YearProjection {
  year: number;
  contributionsCumulative: number;
  fy26GrossValue: number;
  fy26TaxesPaid: number;
  fy26NetValue: number;
  fy27GrossValue: number;
  fy27AnnualCharge: number;
  fy27TaxesCumulative: number;
  fy27NetValue: number;
  wealthSavedUnderFY27: number;
  thresholdProgressPct: number;
}

export interface BudgetCalculatorResult {
  inputs: BudgetCalculatorInputs;
  projections: YearProjection[];
  totalContributions: number;
  fy26FinalNetValue: number;
  fy27FinalNetValue: number;
  totalTaxesFY26: number;
  totalTaxesFY27: number;
  totalWealthSaved: number;
  percentageTaxReduction: number;
  inflationAdjustedFY27Net?: number;
}

export interface FinancialXRayData {
  totalAssetsEUR: number;
  assetAllocation: { category: string; percentage: number; valueEUR: number; color: string }[];
  geographicExposure: { country: string; percentage: number; valueEUR: number; color: string }[];
  currencyExposure: { currency: Currency; percentage: number; valueEUR: number }[];
  concentration: {
    topHoldingName: string;
    topHoldingPct: number;
    top5Pct: number;
    top10Pct: number;
    isConcentrated: boolean;
  };
  liquidity: {
    cashEUR: number;
    cashPct: number;
    liquidInvestmentsEUR: number;
    pensionAndLockedEUR: number;
  };
  aiDiagnosis: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  subtitle: string;
  options: { label: string; score: number; detail: string }[];
}

export interface QuizResult {
  score: number; // 0 - 100
  title: string;
  verdict: string;
  recommendations: string[];
}

export interface MarketIndex {
  id: string;
  symbol: string;
  name: string;
  region: string;
  exchange: string;
  flag: string;
  currency: Currency;
  price: number;
  change: number;
  changePercent: number;
  timeframePerformance: {
    '1D': number;
    '1W': number;
    '1M': number;
    'YTD': number;
    '1Y': number;
  };
  dayLow: number;
  dayHigh: number;
  yearLow: number;
  yearHigh: number;
  marketStatus: string;
  portfolioContext: string;
  sparkline: number[];
}

export interface DividendRecord {
  id: string;
  holdingId: string;
  holdingName: string;
  ticker?: string;
  country: CountryExposure;
  paymentDate: string; // 'YYYY-MM-DD'
  grossAmount: number; // in original currency
  withholdingTax: number; // in original currency
  netAmount: number; // grossAmount - withholdingTax
  currency: Currency;
  withholdingRatePct: number; // e.g. 15 for US, 20 for India, 33 for Ireland DIRT
  taxCategory: 'US WHT (W-8BEN)' | 'India TDS (DTAA Art 12)' | 'Irish DIRT / Income Tax' | 'UCITS Fund Distribution';
  payoutType: 'Cash Payout' | 'Reinvested (DRIP)' | 'Fund IDCW';
  broker: string;
  notes?: string;
}

export interface CumulativeDividendPoint {
  date: string;
  periodLabel: string;
  payoutEUR: number;
  cumulativeEUR: number;
  irelandEUR: number;
  indiaEUR: number;
  usEUR: number;
  whtEUR: number;
  cumulativeNetEUR: number;
}

export interface DividendAnalytics {
  totalGrossEUR: number;
  totalNetEUR: number;
  totalWithholdingTaxEUR: number;
  effectiveTaxRatePct: number;
  foreignTaxCreditAvailableEUR: number;
  ttmDividendsEUR: number; // Trailing 12 months
  annualizedYieldPct: number;
  monthlyAverageEUR: number;
  byCountry: {
    country: CountryExposure;
    label: string;
    grossEUR: number;
    netEUR: number;
    whtEUR: number;
    pctOfTotal: number;
    count: number;
    currency: Currency;
    originalGross: number;
    taxNotes: string;
  }[];
  byHolding: {
    holdingId: string;
    holdingName: string;
    ticker?: string;
    country: CountryExposure;
    totalGrossEUR: number;
    totalNetEUR: number;
    totalWhtEUR: number;
    count: number;
    lastPaymentDate: string;
    yieldOnCostPct: number;
  }[];
  yearlyBreakdown: {
    year: number;
    grossEUR: number;
    netEUR: number;
    whtEUR: number;
    count: number;
  }[];
  timeline: CumulativeDividendPoint[];
}

export type LifeStageCategory = 
  | 'house_deposit' 
  | 'retirement' 
  | 'family_education' 
  | 'emergency_buffer' 
  | 'financial_independence' 
  | 'cross_border_repatriation' 
  | 'entrepreneurship';

export interface FinancialGoalMilestone {
  id: string;
  title: string;
  description: string;
  category: LifeStageCategory;
  categoryLabel: string;
  targetAmount: number; // in targetCurrency
  targetCurrency: Currency;
  targetAmountEUR: number;
  targetYear: number;
  currentAllocatedEUR: number; // calculated from portfolio or manually pegged
  monthlyContributionEUR: number;
  priority: 'High' | 'Medium' | 'Flexible';
  isCompleted?: boolean;
  notes?: string;
  iconName?: string;
}

export interface GoalMilestoneSummary {
  totalGoalsCount: number;
  completedGoalsCount: number;
  totalTargetEUR: number;
  totalFundedEUR: number;
  overallProgressPct: number;
  projectedFullFundingYear: number;
  monthlySavingsRequiredTotal: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  country: 'Ireland' | 'India' | 'United States' | 'United Kingdom' | 'Other EU';
  preferredCurrency: Currency;
  taxResidencyStatus: string;
  registeredAt: string;
  lastLoginAt: string;
  hasOverseasAssets: boolean;
  primaryLifeStageGoal?: LifeStageCategory;
  emailVerified: boolean;
}

export interface RegistrationCredentials {
  name: string;
  email: string;
  password?: string;
  country?: 'Ireland' | 'India' | 'United States' | 'United Kingdom' | 'Other EU';
  preferredCurrency?: Currency;
  primaryLifeStageGoal?: LifeStageCategory;
  targetLifeGoalAmount?: number;
  hasOverseasAssets?: boolean;
}

export interface EmailDispatchLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  dispatchedAt: string;
  status: 'DELIVERED' | 'SENT' | 'SIMULATED';
  transport: 'SMTP_CONFIGURED' | 'ETHEREAL_TEST_ACCOUNT' | 'APP_FALLBACK';
  previewUrl?: string | null;
  messageId: string;
  summary: string;
  htmlContent?: string;
}
