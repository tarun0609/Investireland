import { EXPRESS_API_AVAILABLE } from '../config/runtime';
import { FiscalDataResponse, Currency } from '../types';
import { getFxRates } from './fxRateService';
import {
  CGT_ANNUAL_EXEMPTION,
  CGT_RATE,
  DEEMED_DISPOSAL_YEARS,
  DIRT_RATE,
  EXIT_TAX_RATE,
  EXIT_TAX_RATE_2026,
  TAX_RULES_LAST_REVIEWED,
} from '../config/irishTax';

/** Date the bundled reference figures were last manually reviewed against official sources. */
export const FISCAL_DATA_LAST_REVIEWED = TAX_RULES_LAST_REVIEWED;

export const FALLBACK_FISCAL_DATA: FiscalDataResponse = {
  jurisdiction: 'Ireland (Éire)',
  currency: 'EUR',
  lastVerifiedTimestamp: FISCAL_DATA_LAST_REVIEWED,
  legalBasis: 'Budget 2027 Policy Framework & Taxes Consolidation Act 1997',
  regime: {
    fy26: {
      budgetYear: 'FY2026',
      status: 'Current Enacted Law',
      exitTaxRate: EXIT_TAX_RATE_2026,
      deemedDisposalCycleYears: DEEMED_DISPOSAL_YEARS,
      cgtRate: CGT_RATE,
      cgtAnnualExemption: CGT_ANNUAL_EXEMPTION,
      dirtRate: DIRT_RATE,
      personalInvestmentAccountAvailable: false,
      primaryLegislation: 'Taxes Consolidation Act 1997 (s.739D)'
    },
    fy27: {
      budgetYear: 'FY2027',
      status: 'Announced Government Framework (Scheduled: 1 July 2027)',
      schemeName: 'Personal Savings & Investment Account (PSIA)',
      launchDate: '2027-07-01',
      annualContributionLimit: 12000,
      taxFreeThreshold: 50000,
      annualChargeAboveThreshold: 0.01,
      deemedDisposalApplicable: false,
      eligibleInvestments: ['UCITS ETFs', 'Listed Equities', 'Government & Corporate Bonds', 'Regulated Investment Funds', 'Cash Deposits'],
      excludedInvestments: ['Crypto-assets', 'Unlisted speculative derivatives', 'Direct residential property'],
      residencyRequirement: 'Irish Tax Resident (PPSN required, aged 18+)',
      exitTaxOutsideScheme: EXIT_TAX_RATE,
      primaryLegislation: 'General Scheme of the Investment Accounts Bill 2026/27 (Dept of Finance)'
    }
  },
  macroIndicators: {
    irelandHICPInflation: 2.2,
    ecbRefinancingRate: 3.15,
    irishHouseholdSavingsRate: 14.8,
    // Always the latest ECB reference rates (live when reachable, otherwise the bundled copy).
    get fxRates() {
      return getFxRates();
    }
  },
  officialSources: [
    {
      id: 'gov-finance',
      agency: 'Department of Finance (An Roinn Airgeadais)',
      title: 'Funds Sector 2030 Report & Budget 2027 Investment Scheme Whitepaper',
      url: 'https://www.gov.ie/en/organisation/department-of-finance/',
      publicationDate: '2026-09-30',
      confidenceScore: 0.98,
      status: 'Official Policy Framework'
    },
    {
      id: 'revenue-ie',
      agency: 'Office of the Revenue Commissioners (Na Coimisinéirí Ioncaim)',
      title: 'Tax and Duty Manual Part 27-01a: Collective Investment Undertakings (Exit Tax)',
      url: 'https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/index.aspx',
      publicationDate: '2026-01-15',
      confidenceScore: 1.0,
      status: 'Statutory Guidance (TCA 1997)'
    },
    {
      id: 'central-bank-ie',
      agency: 'Central Bank of Ireland (Banc Ceannais na hÉireann)',
      title: 'Macro-Financial Review & Retail Investment Investor Protection Standards',
      url: 'https://www.centralbank.ie/financial-system/financial-stability/macro-financial-review',
      publicationDate: '2026-06-20',
      confidenceScore: 0.99,
      status: 'Supervisory Directive'
    },
    {
      id: 'oireachtas-bill',
      agency: 'Houses of the Oireachtas (Tithe an Oireachtais)',
      title: 'General Scheme of the Finance (Investment Accounts) Bill 2026/2027',
      url: 'https://www.oireachtas.ie/en/bills/',
      publicationDate: '2026-10-02',
      confidenceScore: 0.95,
      status: 'Pre-Legislative Scrutiny'
    },
    {
      id: 'cso-stats',
      agency: 'Central Statistics Office (Príomh-Oifig Staidrimh)',
      title: 'Consumer Price Index (HICP) & Household Net Wealth Statistics',
      url: 'https://www.cso.ie/',
      publicationDate: '2026-09-15',
      confidenceScore: 1.0,
      status: 'Official Statistics'
    }
  ]
};

export async function fetchOfficialFiscalData(): Promise<FiscalDataResponse> {
  if (!EXPRESS_API_AVAILABLE) return FALLBACK_FISCAL_DATA;
  try {
    const res = await fetch('/api/fiscal-data');
    if (!res.ok) {
      throw new Error(`Fiscal data HTTP ${res.status}`);
    }
    const json = await res.json();
    const data = json?.data;
    // Only accept a payload with the shape the UI relies on; otherwise use the bundled dataset
    if (data && data.regime?.fy26 && data.regime?.fy27 && Array.isArray(data.officialSources) && data.macroIndicators?.fxRates) {
      // FX always comes from the ECB feed so every screen converts with the same rates.
      return { ...data, macroIndicators: { ...data.macroIndicators, fxRates: getFxRates() } } as FiscalDataResponse;
    }
    return FALLBACK_FISCAL_DATA;
  } catch (err) {
    console.warn('Using bundled reference fiscal dataset:', err);
    return FALLBACK_FISCAL_DATA;
  }
}

// Convert amount from any source currency to EUR
export function convertToEUR(amount: number, fromCurrency: Currency, fxRates = FALLBACK_FISCAL_DATA.macroIndicators.fxRates): number {
  if (fromCurrency === 'EUR') return amount;
  if (fromCurrency === 'INR') return amount / fxRates.EUR_TO_INR;
  if (fromCurrency === 'USD') return amount / fxRates.EUR_TO_USD;
  if (fromCurrency === 'GBP') return amount / fxRates.EUR_TO_GBP;
  return amount;
}

// Convert amount from EUR to any target currency
export function convertFromEUR(amountEUR: number, targetCurrency: Currency, fxRates = FALLBACK_FISCAL_DATA.macroIndicators.fxRates): number {
  if (targetCurrency === 'EUR') return amountEUR;
  if (targetCurrency === 'INR') return amountEUR * fxRates.EUR_TO_INR;
  if (targetCurrency === 'USD') return amountEUR * fxRates.EUR_TO_USD;
  if (targetCurrency === 'GBP') return amountEUR * fxRates.EUR_TO_GBP;
  return amountEUR;
}

// Format currency display with proper symbols
export function formatCurrency(amount: number, currency: Currency = 'EUR', maximumFractionDigits = 0): string {
  const symbolMap: Record<Currency, string> = {
    EUR: '€',
    INR: '₹',
    USD: '$',
    GBP: '£'
  };

  const symbol = symbolMap[currency] || '€';
  if (!Number.isFinite(amount)) amount = 0;
  // Put the sign before the symbol ("-€500", not "€-500")
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (currency === 'INR' && abs >= 100000) {
    // Show in Lakhs or Crores for Indian format if large
    const lakhs = abs / 100000;
    if (lakhs >= 100) {
      const crores = lakhs / 100;
      return `${sign}${symbol}${crores.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
    }
    return `${sign}${symbol}${lakhs.toFixed(2)} Lakh`;
  }

  const factor = Math.pow(10, Math.max(0, maximumFractionDigits));
  const rounded = Math.round(abs * factor) / factor;
  if (rounded === 0) return `${symbol}0`;
  return `${sign}${symbol}${rounded.toLocaleString('en-IE', { maximumFractionDigits })}`;
}
