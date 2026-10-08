import { DividendRecord, DividendAnalytics, CumulativeDividendPoint, Holding, Currency, CountryExposure } from '../types';
import { FALLBACK_FISCAL_DATA, convertToEUR, convertFromEUR } from './fiscalDataService';

const STORAGE_KEY = 'investireland_dividend_records_v1';

// Rich historical cross-border dividend dataset across user's holdings
export const DEFAULT_HISTORICAL_DIVIDENDS: DividendRecord[] = [
  // 2024 Q1
  {
    id: 'div-2024-q1-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2024-03-28',
    grossAmount: 162.50,
    withholdingTax: 53.63, // 33% DIRT
    netAmount: 108.87,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Quarterly interest deposit. 33% Irish DIRT withheld at source by financial institution.'
  },
  {
    id: 'div-2024-q1-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'TCS.NS',
    country: 'India',
    paymentDate: '2024-03-15',
    grossAmount: 12500, // INR
    withholdingTax: 2500, // 20% Indian TDS
    netAmount: 10000,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Q4 Interim Dividend. 20% Indian TDS deducted under s.195; eligible for Irish Revenue DTAA foreign credit.'
  },
  // 2024 Q2
  {
    id: 'div-2024-q2-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'MSFT',
    country: 'US',
    paymentDate: '2024-06-12',
    grossAmount: 145.00, // USD
    withholdingTax: 21.75, // 15% W-8BEN WHT
    netAmount: 123.25,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Quarterly cash dividend. Reduced from 30% to 15% via Form W-8BEN under US-Ireland Double Tax Treaty.'
  },
  {
    id: 'div-2024-q2-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'HDFCBANK.NS',
    country: 'India',
    paymentDate: '2024-06-25',
    grossAmount: 14200,
    withholdingTax: 2840,
    netAmount: 11360,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Annual equity dividend. TDS certificate Form 16A issued by depository.'
  },
  {
    id: 'div-2024-q2-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2024-06-28',
    grossAmount: 162.50,
    withholdingTax: 53.63,
    netAmount: 108.87,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Q2 savings interest yield.'
  },
  // 2024 Q3
  {
    id: 'div-2024-q3-h4',
    holdingId: 'h-4',
    holdingName: 'Parag Parikh Flexi Cap Fund (Direct Growth)',
    country: 'India',
    paymentDate: '2024-09-10',
    grossAmount: 13500,
    withholdingTax: 2700,
    netAmount: 10800,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Fund IDCW',
    broker: 'Zerodha Coin',
    notes: 'Income Distribution cum Capital Withdrawal (IDCW) payout into NRE account.'
  },
  {
    id: 'div-2024-q3-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'MSFT',
    country: 'US',
    paymentDate: '2024-09-14',
    grossAmount: 152.00,
    withholdingTax: 22.80,
    netAmount: 129.20,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Quarterly dividend on vested RSUs.'
  },
  {
    id: 'div-2024-q3-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2024-09-28',
    grossAmount: 162.50,
    withholdingTax: 53.63,
    netAmount: 108.87,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Q3 interest yield payout.'
  },
  // 2024 Q4
  {
    id: 'div-2024-q4-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'TCS.NS',
    country: 'India',
    paymentDate: '2024-11-20',
    grossAmount: 18000, // Special dividend
    withholdingTax: 3600,
    netAmount: 14400,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Special interim dividend announcement. Retained in NRE savings account.'
  },
  {
    id: 'div-2024-q4-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'MSFT',
    country: 'US',
    paymentDate: '2024-12-10',
    grossAmount: 165.00,
    withholdingTax: 24.75,
    netAmount: 140.25,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Q4 dividend credited directly to brokerage cash sweep.'
  },
  {
    id: 'div-2024-q4-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2024-12-30',
    grossAmount: 162.50,
    withholdingTax: 53.63,
    netAmount: 108.87,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Year-end interest accumulation.'
  },

  // 2025 Q1
  {
    id: 'div-2025-q1-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'TCS.NS',
    country: 'India',
    paymentDate: '2025-02-18',
    grossAmount: 15500,
    withholdingTax: 3100,
    netAmount: 12400,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Q3 Interim Dividend. 20% Indian TDS deducted under s.195.'
  },
  {
    id: 'div-2025-q1-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'GOOGL',
    country: 'US',
    paymentDate: '2025-03-12',
    grossAmount: 172.00,
    withholdingTax: 25.80,
    netAmount: 146.20,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Regular dividend with 15% US withholding tax applied.'
  },
  {
    id: 'div-2025-q1-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2025-03-29',
    grossAmount: 165.00,
    withholdingTax: 54.45,
    netAmount: 110.55,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Q1 2025 interest yield deposit.'
  },

  // 2025 Q2
  {
    id: 'div-2025-q2-h4',
    holdingId: 'h-4',
    holdingName: 'Parag Parikh Flexi Cap Fund (Direct Growth)',
    country: 'India',
    paymentDate: '2025-05-15',
    grossAmount: 15000,
    withholdingTax: 3000,
    netAmount: 12000,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Fund IDCW',
    broker: 'Zerodha Coin',
    notes: 'Annual mutual fund dividend distribution.'
  },
  {
    id: 'div-2025-q2-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'MSFT',
    country: 'US',
    paymentDate: '2025-06-11',
    grossAmount: 175.00,
    withholdingTax: 26.25,
    netAmount: 148.75,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Quarterly payout after additional RSU vest.'
  },
  {
    id: 'div-2025-q2-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'HDFCBANK.NS',
    country: 'India',
    paymentDate: '2025-06-22',
    grossAmount: 16800,
    withholdingTax: 3360,
    netAmount: 13440,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Final dividend for FY24-25.'
  },
  {
    id: 'div-2025-q2-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2025-06-30',
    grossAmount: 165.00,
    withholdingTax: 54.45,
    netAmount: 110.55,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Q2 savings interest.'
  },

  // 2025 Q3
  {
    id: 'div-2025-q3-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'MSFT',
    country: 'US',
    paymentDate: '2025-09-12',
    grossAmount: 182.00,
    withholdingTax: 27.30,
    netAmount: 154.70,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Quarterly dividend with 15% treaty withholding.'
  },
  {
    id: 'div-2025-q3-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'TCS.NS',
    country: 'India',
    paymentDate: '2025-09-20',
    grossAmount: 17200,
    withholdingTax: 3440,
    netAmount: 13760,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Q2 interim dividend payment.'
  },
  {
    id: 'div-2025-q3-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2025-09-29',
    grossAmount: 165.00,
    withholdingTax: 54.45,
    netAmount: 110.55,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Q3 interest deposit.'
  },

  // 2025 Q4
  {
    id: 'div-2025-q4-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'MSFT',
    country: 'US',
    paymentDate: '2025-12-10',
    grossAmount: 185.00,
    withholdingTax: 27.75,
    netAmount: 157.25,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Q4 dividend credited to account.'
  },
  {
    id: 'div-2025-q4-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'TCS.NS',
    country: 'India',
    paymentDate: '2025-12-18',
    grossAmount: 19800,
    withholdingTax: 3960,
    netAmount: 15840,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Special year-end dividend.'
  },
  {
    id: 'div-2025-q4-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2025-12-31',
    grossAmount: 165.00,
    withholdingTax: 54.45,
    netAmount: 110.55,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Year-end interest payout.'
  },

  // 2026 Q1
  {
    id: 'div-2026-q1-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'TCS.NS',
    country: 'India',
    paymentDate: '2026-02-14',
    grossAmount: 18500,
    withholdingTax: 3700,
    netAmount: 14800,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Q3 interim dividend. Indian TDS certificate available on TRACES portal.'
  },
  {
    id: 'div-2026-q1-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'GOOGL',
    country: 'US',
    paymentDate: '2026-03-12',
    grossAmount: 195.00,
    withholdingTax: 29.25,
    netAmount: 165.75,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Quarterly dividend payment with 15% WHT.'
  },
  {
    id: 'div-2026-q1-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2026-03-30',
    grossAmount: 168.00,
    withholdingTax: 55.44,
    netAmount: 112.56,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Q1 2026 interest deposit.'
  },

  // 2026 Q2
  {
    id: 'div-2026-q2-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'MSFT',
    country: 'US',
    paymentDate: '2026-06-11',
    grossAmount: 198.00,
    withholdingTax: 29.70,
    netAmount: 168.30,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Quarterly dividend on increased share count.'
  },
  {
    id: 'div-2026-q2-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'HDFCBANK.NS',
    country: 'India',
    paymentDate: '2026-06-24',
    grossAmount: 19200,
    withholdingTax: 3840,
    netAmount: 15360,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Annual equity dividend. Full TDS receipt issued.'
  },
  {
    id: 'div-2026-q2-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2026-06-30',
    grossAmount: 168.00,
    withholdingTax: 55.44,
    netAmount: 112.56,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Q2 savings interest.'
  },

  // 2026 Q3 (Recent)
  {
    id: 'div-2026-q3-h6',
    holdingId: 'h-6',
    holdingName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    ticker: 'MSFT',
    country: 'US',
    paymentDate: '2026-09-15',
    grossAmount: 205.00,
    withholdingTax: 30.75,
    netAmount: 174.25,
    currency: 'USD',
    withholdingRatePct: 15,
    taxCategory: 'US WHT (W-8BEN)',
    payoutType: 'Cash Payout',
    broker: 'Morgan Stanley at Work',
    notes: 'Most recent quarterly dividend payout.'
  },
  {
    id: 'div-2026-q3-h5',
    holdingId: 'h-5',
    holdingName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    ticker: 'TCS.NS',
    country: 'India',
    paymentDate: '2026-09-22',
    grossAmount: 19500,
    withholdingTax: 3900,
    netAmount: 15600,
    currency: 'INR',
    withholdingRatePct: 20,
    taxCategory: 'India TDS (DTAA Art 12)',
    payoutType: 'Cash Payout',
    broker: 'ICICI Direct',
    notes: 'Q2 interim payout received.'
  },
  {
    id: 'div-2026-q3-h1',
    holdingId: 'h-1',
    holdingName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    country: 'Ireland',
    paymentDate: '2026-09-30',
    grossAmount: 168.00,
    withholdingTax: 55.44,
    netAmount: 112.56,
    currency: 'EUR',
    withholdingRatePct: 33,
    taxCategory: 'Irish DIRT / Income Tax',
    payoutType: 'Cash Payout',
    broker: 'Bunq / AIB',
    notes: 'Q3 interest yield credit.'
  }
];

export function getStoredDividends(): DividendRecord[] {
  if (typeof window === 'undefined') return DEFAULT_HISTORICAL_DIVIDENDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HISTORICAL_DIVIDENDS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse stored dividends:', err);
  }
  return DEFAULT_HISTORICAL_DIVIDENDS;
}

export function saveStoredDividends(dividends: DividendRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dividends));
  } catch (err) {
    console.error('Failed to store dividends in localStorage:', err);
  }
}

export function calculateDividendAnalytics(
  dividends: DividendRecord[],
  holdings: Holding[],
  fxRates = FALLBACK_FISCAL_DATA.macroIndicators.fxRates
): DividendAnalytics {
  // Sort chronologically ascending
  const sorted = [...dividends].sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );

  let totalGrossEUR = 0;
  let totalNetEUR = 0;
  let totalWithholdingTaxEUR = 0;
  let foreignTaxCreditAvailableEUR = 0;

  // Running cumulative counters
  let runningCumulativeEUR = 0;
  let runningCumulativeNetEUR = 0;
  let runningIrelandEUR = 0;
  let runningIndiaEUR = 0;
  let runningUsEUR = 0;
  let runningWhtEUR = 0;

  const timeline: CumulativeDividendPoint[] = [];

  // Group by periods (e.g. month or quarter for smooth timeline curve)
  for (const div of sorted) {
    const grossEUR = convertToEUR(div.grossAmount, div.currency, fxRates);
    const whtEUR = convertToEUR(div.withholdingTax, div.currency, fxRates);
    const netEUR = convertToEUR(div.netAmount, div.currency, fxRates);

    totalGrossEUR += grossEUR;
    totalNetEUR += netEUR;
    totalWithholdingTaxEUR += whtEUR;

    // Foreign tax credit is for India (TDS) and US (WHT)
    if (div.country === 'India' || div.country === 'US') {
      foreignTaxCreditAvailableEUR += whtEUR;
    }

    runningCumulativeEUR += grossEUR;
    runningCumulativeNetEUR += netEUR;
    runningWhtEUR += whtEUR;

    if (div.country === 'Ireland') runningIrelandEUR += grossEUR;
    else if (div.country === 'India') runningIndiaEUR += grossEUR;
    else if (div.country === 'US') runningUsEUR += grossEUR;

    const dateObj = new Date(div.paymentDate);
    const periodLabel = `${dateObj.getFullYear()} ${dateObj.toLocaleString('en-US', { month: 'short' })}`;

    timeline.push({
      date: div.paymentDate,
      periodLabel,
      payoutEUR: Math.round(grossEUR * 100) / 100,
      cumulativeEUR: Math.round(runningCumulativeEUR * 100) / 100,
      cumulativeNetEUR: Math.round(runningCumulativeNetEUR * 100) / 100,
      irelandEUR: Math.round(runningIrelandEUR * 100) / 100,
      indiaEUR: Math.round(runningIndiaEUR * 100) / 100,
      usEUR: Math.round(runningUsEUR * 100) / 100,
      whtEUR: Math.round(runningWhtEUR * 100) / 100
    });
  }

  // TTM (Trailing 12 months)
  // Let's take the last 12 months up to current / latest date in dataset
  const latestDate = sorted.length > 0 ? new Date(sorted[sorted.length - 1].paymentDate) : new Date();
  const oneYearPrior = new Date(latestDate);
  oneYearPrior.setFullYear(oneYearPrior.getFullYear() - 1);

  const ttmDividends = sorted.filter(d => new Date(d.paymentDate) >= oneYearPrior);
  const ttmDividendsEUR = ttmDividends.reduce(
    (sum, d) => sum + convertToEUR(d.grossAmount, d.currency, fxRates),
    0
  );

  // Portfolio total value in EUR to calculate yield
  const totalPortfolioEUR = holdings.reduce(
    (sum, h) => sum + convertToEUR(h.currentValue, h.currency, fxRates),
    0
  );
  const annualizedYieldPct = totalPortfolioEUR > 0 ? (ttmDividendsEUR / totalPortfolioEUR) * 100 : 0;
  const monthlyAverageEUR = ttmDividendsEUR / 12;

  const effectiveTaxRatePct = totalGrossEUR > 0 ? (totalWithholdingTaxEUR / totalGrossEUR) * 100 : 0;

  // Breakdown by Country
  const countryMap = new Map<CountryExposure, {
    grossEUR: number;
    netEUR: number;
    whtEUR: number;
    count: number;
    originalGross: number;
    currency: Currency;
  }>();

  // Initialize
  (['Ireland', 'India', 'US'] as CountryExposure[]).forEach(c => {
    countryMap.set(c, {
      grossEUR: 0,
      netEUR: 0,
      whtEUR: 0,
      count: 0,
      originalGross: 0,
      currency: c === 'Ireland' ? 'EUR' : c === 'India' ? 'INR' : 'USD'
    });
  });

  for (const div of sorted) {
    const entry = countryMap.get(div.country) || {
      grossEUR: 0,
      netEUR: 0,
      whtEUR: 0,
      count: 0,
      originalGross: 0,
      currency: div.currency
    };
    const grossEUR = convertToEUR(div.grossAmount, div.currency, fxRates);
    const whtEUR = convertToEUR(div.withholdingTax, div.currency, fxRates);
    const netEUR = convertToEUR(div.netAmount, div.currency, fxRates);

    entry.grossEUR += grossEUR;
    entry.whtEUR += whtEUR;
    entry.netEUR += netEUR;
    entry.count += 1;
    entry.originalGross += div.grossAmount;
    countryMap.set(div.country, entry);
  }

  const byCountry = Array.from(countryMap.entries()).map(([country, data]) => {
    let taxNotes = '';
    let label: string = country;
    if (country === 'Ireland') {
      label = 'Ireland (Domestic)';
      taxNotes = 'Subject to 33% DIRT or marginal income tax (20%/40% + PRSI + USC). Sheltered in 2027 PSIA.';
    } else if (country === 'India') {
      label = 'India (Overseas Equities)';
      taxNotes = '20% Indian TDS deducted at source under s.195. 100% claimable as Foreign Tax Credit under DTAA Art 23.';
    } else if (country === 'US') {
      label = 'United States (RSUs & Tech)';
      taxNotes = '15% US Withholding Tax applied via Form W-8BEN. Offsettable against Irish Revenue Form 11 liability.';
    }

    return {
      country,
      label,
      grossEUR: data.grossEUR,
      netEUR: data.netEUR,
      whtEUR: data.whtEUR,
      pctOfTotal: totalGrossEUR > 0 ? (data.grossEUR / totalGrossEUR) * 100 : 0,
      count: data.count,
      currency: data.currency,
      originalGross: data.originalGross,
      taxNotes
    };
  });

  // Breakdown by Holding
  const holdingMap = new Map<string, {
    holdingId: string;
    holdingName: string;
    ticker?: string;
    country: CountryExposure;
    totalGrossEUR: number;
    totalNetEUR: number;
    totalWhtEUR: number;
    count: number;
    lastPaymentDate: string;
  }>();

  for (const div of sorted) {
    const entry = holdingMap.get(div.holdingId) || {
      holdingId: div.holdingId,
      holdingName: div.holdingName,
      ticker: div.ticker,
      country: div.country,
      totalGrossEUR: 0,
      totalNetEUR: 0,
      totalWhtEUR: 0,
      count: 0,
      lastPaymentDate: div.paymentDate
    };

    const grossEUR = convertToEUR(div.grossAmount, div.currency, fxRates);
    const whtEUR = convertToEUR(div.withholdingTax, div.currency, fxRates);
    const netEUR = convertToEUR(div.netAmount, div.currency, fxRates);

    entry.totalGrossEUR += grossEUR;
    entry.totalWhtEUR += whtEUR;
    entry.totalNetEUR += netEUR;
    entry.count += 1;
    if (new Date(div.paymentDate) > new Date(entry.lastPaymentDate)) {
      entry.lastPaymentDate = div.paymentDate;
    }
    holdingMap.set(div.holdingId, entry);
  }

  const byHolding = Array.from(holdingMap.values()).map(h => {
    const parentHolding = holdings.find(item => item.id === h.holdingId);
    let yieldOnCostPct = 0;
    if (parentHolding && parentHolding.purchaseValue) {
      const purchaseEUR = convertToEUR(parentHolding.purchaseValue, parentHolding.currency, fxRates);
      if (purchaseEUR > 0) {
        yieldOnCostPct = (h.totalGrossEUR / purchaseEUR) * 100;
      }
    }
    return {
      ...h,
      yieldOnCostPct
    };
  });

  // Yearly Breakdown
  const yearMap = new Map<number, { grossEUR: number; netEUR: number; whtEUR: number; count: number }>();
  for (const div of sorted) {
    const yr = new Date(div.paymentDate).getFullYear();
    const entry = yearMap.get(yr) || { grossEUR: 0, netEUR: 0, whtEUR: 0, count: 0 };
    const grossEUR = convertToEUR(div.grossAmount, div.currency, fxRates);
    const whtEUR = convertToEUR(div.withholdingTax, div.currency, fxRates);
    const netEUR = convertToEUR(div.netAmount, div.currency, fxRates);

    entry.grossEUR += grossEUR;
    entry.netEUR += netEUR;
    entry.whtEUR += whtEUR;
    entry.count += 1;
    yearMap.set(yr, entry);
  }

  const yearlyBreakdown = Array.from(yearMap.entries())
    .map(([year, d]) => ({ year, ...d }))
    .sort((a, b) => a.year - b.year);

  return {
    totalGrossEUR,
    totalNetEUR,
    totalWithholdingTaxEUR,
    effectiveTaxRatePct,
    foreignTaxCreditAvailableEUR,
    ttmDividendsEUR,
    annualizedYieldPct,
    monthlyAverageEUR,
    byCountry,
    byHolding,
    yearlyBreakdown,
    timeline
  };
}
