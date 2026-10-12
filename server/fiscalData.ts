/**
 * Reference fiscal data for Ireland. Values are curated from the cited official
 * sources and must be reviewed manually whenever legislation changes; they are
 * NOT fetched live. Only FX rates are refreshed from a public feed.
 */
export const FISCAL_DATA_LAST_REVIEWED = '2026-10-15';

export interface FxRates {
  EUR_TO_INR: number;
  EUR_TO_USD: number;
  EUR_TO_GBP: number;
  lastUpdated: string;
  source: 'LIVE_FEED' | 'STATIC_FALLBACK';
}

const FALLBACK_FX: FxRates = {
  EUR_TO_INR: 92.45,
  EUR_TO_USD: 1.085,
  EUR_TO_GBP: 0.855,
  lastUpdated: FISCAL_DATA_LAST_REVIEWED,
  source: 'STATIC_FALLBACK',
};

export const OFFICIAL_FISCAL_DATA = {
  jurisdiction: 'Ireland (Éire)',
  currency: 'EUR',
  lastVerifiedTimestamp: FISCAL_DATA_LAST_REVIEWED,
  legalBasis: 'Budget 2027 Policy Framework & Taxes Consolidation Act 1997',
  regime: {
    fy26: {
      budgetYear: 'FY2026',
      status: 'Current Enacted Law',
      exitTaxRate: 0.41,
      deemedDisposalCycleYears: 8,
      cgtRate: 0.33,
      cgtAnnualExemption: 1270,
      dirtRate: 0.33,
      personalInvestmentAccountAvailable: false,
      annualShelterLimit: 0,
      taxFreeThreshold: 0,
      annualExcessCharge: 0,
      primaryLegislation: 'Taxes Consolidation Act 1997, Part 27, Chapter 4 (s.739D)',
    },
    fy27: {
      budgetYear: 'FY2027',
      status: 'Announced Government Framework (Scheduled Commencement: 1 July 2027)',
      schemeName: 'Personal Savings & Investment Account (PSIA)',
      launchDate: '2027-07-01',
      annualContributionLimit: 12000,
      taxFreeThreshold: 50000,
      annualChargeAboveThreshold: 0.01,
      deemedDisposalApplicable: false,
      eligibleInvestments: ['UCITS ETFs', 'Listed Equities', 'Government & Corporate Bonds', 'Regulated Investment Funds', 'Cash Deposits'],
      excludedInvestments: ['Crypto-assets', 'Unlisted speculative derivatives', 'Direct residential property'],
      residencyRequirement: 'Irish Tax Resident (PPSN required, aged 18+)',
      exitTaxOutsideScheme: 0.41,
      primaryLegislation: 'General Scheme of the Investment Accounts Bill 2026/27 (Dept of Finance)',
    },
  },
  macroIndicators: {
    irelandHICPInflation: 2.2,
    ecbRefinancingRate: 3.15,
    irishHouseholdSavingsRate: 14.8,
    fxRates: { ...FALLBACK_FX } as FxRates,
  },
  officialSources: [
    {
      id: 'gov-finance',
      agency: 'Department of Finance (An Roinn Airgeadais)',
      title: 'Funds Sector 2030 Report & Budget 2027 Investment Scheme Whitepaper',
      url: 'https://www.gov.ie/en/organisation/department-of-finance/',
      publicationDate: '2026-09-30',
      confidenceScore: 0.98,
      status: 'Official Policy Framework',
    },
    {
      id: 'revenue-ie',
      agency: 'Office of the Revenue Commissioners (Na Coimisinéirí Ioncaim)',
      title: 'Tax and Duty Manual Part 27-01a: Taxation of Collective Investment Undertakings',
      url: 'https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/index.aspx',
      publicationDate: '2026-01-15',
      confidenceScore: 1.0,
      status: 'Statutory Guidance (TCA 1997)',
    },
    {
      id: 'central-bank-ie',
      agency: 'Central Bank of Ireland (Banc Ceannais na hÉireann)',
      title: 'Macro-Financial Review & Retail Investment Investor Protection Standards',
      url: 'https://www.centralbank.ie/financial-system/financial-stability/macro-financial-review',
      publicationDate: '2026-06-20',
      confidenceScore: 0.99,
      status: 'Supervisory Directive',
    },
    {
      id: 'oireachtas-bill',
      agency: 'Houses of the Oireachtas (Tithe an Oireachtais)',
      title: 'General Scheme of the Finance (Investment Accounts) Bill 2026/2027',
      url: 'https://www.oireachtas.ie/en/bills/',
      publicationDate: '2026-10-02',
      confidenceScore: 0.95,
      status: 'Pre-Legislative Scrutiny',
    },
    {
      id: 'cso-stats',
      agency: 'Central Statistics Office (Príomh-Oifig Staidrimh)',
      title: 'Consumer Price Index (HICP) & Household Net Wealth Statistics',
      url: 'https://www.cso.ie/',
      publicationDate: '2026-09-15',
      confidenceScore: 1.0,
      status: 'Official Statistics',
    },
  ],
};

export type FxFetcher = () => Promise<FxRates | null>;

const FX_FEED_URL = 'https://open.er-api.com/v6/latest/EUR';

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export const fetchLiveFxRates: FxFetcher = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(FX_FEED_URL, { signal: controller.signal });
    if (!res.ok) return null;
    const data: any = await res.json();
    const inr = positiveNumber(data?.rates?.INR);
    const usd = positiveNumber(data?.rates?.USD);
    const gbp = positiveNumber(data?.rates?.GBP);
    if (!inr || !usd || !gbp) return null;
    return {
      EUR_TO_INR: Number(inr.toFixed(2)),
      EUR_TO_USD: Number(usd.toFixed(4)),
      EUR_TO_GBP: Number(gbp.toFixed(4)),
      lastUpdated: new Date().toISOString(),
      source: 'LIVE_FEED',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Caches FX rates for `ttlMs`; concurrent callers share one in-flight fetch. */
export function createFxCache(fetcher: FxFetcher, ttlMs = 5 * 60 * 1000) {
  let rates: FxRates = { ...FALLBACK_FX };
  let lastAttempt = 0;
  let inFlight: Promise<void> | null = null;

  const refresh = async () => {
    if (Date.now() - lastAttempt < ttlMs) return;
    if (!inFlight) {
      lastAttempt = Date.now();
      inFlight = fetcher()
        .then((live) => {
          if (live) rates = live;
        })
        .finally(() => {
          inFlight = null;
        });
    }
    await inFlight;
  };

  return {
    async get(): Promise<FxRates> {
      await refresh();
      return rates;
    },
  };
}

export const MARKET_INDICES_AS_OF = '2026-10-14';

/**
 * Indicative index snapshot. These are static sample figures for illustration,
 * not a live market data feed; the API marks them with `isSample: true`.
 */
export const SAMPLE_MARKET_INDICES = [
  {
    id: 'iseq',
    symbol: '^ISEQ',
    name: 'ISEQ Overall Index',
    region: 'Ireland',
    exchange: 'Euronext Dublin',
    flag: '🇮🇪',
    currency: 'EUR',
    price: 9842.5,
    change: 44.1,
    changePercent: 0.45,
    timeframePerformance: { '1D': 0.45, '1W': 1.82, '1M': 3.4, YTD: 12.6, '1Y': 18.25 },
    dayLow: 9788.1,
    dayHigh: 9865.3,
    yearLow: 8120.0,
    yearHigh: 10020.0,
    marketStatus: 'Sample snapshot',
    portfolioContext: 'Direct benchmark for Irish equity pensions, Davy Select holdings, and domestic companies.',
    sparkline: [9680, 9710, 9745, 9720, 9790, 9820, 9842.5],
  },
  {
    id: 'nifty50',
    symbol: 'NIFTY 50',
    name: 'NIFTY 50',
    region: 'India',
    exchange: 'NSE (National Stock Exchange)',
    flag: '🇮🇳',
    currency: 'INR',
    price: 25285.3,
    change: 171.2,
    changePercent: 0.68,
    timeframePerformance: { '1D': 0.68, '1W': 1.25, '1M': 2.9, YTD: 16.4, '1Y': 28.5 },
    dayLow: 25110.4,
    dayHigh: 25340.8,
    yearLow: 19250.0,
    yearHigh: 26277.0,
    marketStatus: 'Sample snapshot',
    portfolioContext: 'Directly influences Indian mutual fund SIPs (Parag Parikh, HDFC) and NSE direct equities under DTAA.',
    sparkline: [24800, 24920, 25050, 24980, 25150, 25210, 25285.3],
  },
  {
    id: 'sp500',
    symbol: '^GSPC',
    name: 'S&P 500 Index',
    region: 'United States',
    exchange: 'NYSE / NASDAQ',
    flag: '🇺🇸',
    currency: 'USD',
    price: 5782.4,
    change: 18.45,
    changePercent: 0.32,
    timeframePerformance: { '1D': 0.32, '1W': 0.95, '1M': 4.1, YTD: 21.5, '1Y': 31.8 },
    dayLow: 5752.1,
    dayHigh: 5795.6,
    yearLow: 4210.0,
    yearHigh: 5820.0,
    marketStatus: 'Sample snapshot',
    portfolioContext: 'Primary driver of US employer tech RSUs (Alphabet, Microsoft) and European UCITS World ETFs.',
    sparkline: [5620, 5660, 5710, 5690, 5740, 5765, 5782.4],
  },
];
