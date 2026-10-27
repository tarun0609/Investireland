/**
 * Shared month-by-month investment engine used by every calculator.
 *
 * - Annual return r becomes an equivalent monthly rate (1 + r)^(1/12) - 1.
 * - Contributions are invested at the start of each month, then that month's growth applies.
 * - Irish tax treatment (rates from Budget 2027 / Finance (No. 2) Bill 2026 for events from 2027,
 *   editable via TaxRates; see src/config/irishTax.ts):
 *   - ETFs / funds: exit tax on gains when sold, plus deemed disposal on the 8th anniversary of
 *     EACH purchase (and every 8 years after). Each month's purchase is its own lot. Tax is paid by
 *     selling units and the remaining units are re-based at market value.
 *   - Individual shares: CGT on the total gain when sold, after the annual exemption.
 *   - Deposits: DIRT deducted from interest as it is earned.
 *   - 'none': no tax (inside a pension, or the "no tax" comparison).
 */

import { CGT_ANNUAL_EXEMPTION, CGT_RATE, DEEMED_DISPOSAL_YEARS, DIRT_RATE, EXIT_TAX_RATE } from '../config/irishTax';

export type TaxTreatment = 'etf_fund' | 'individual_shares' | 'deposit' | 'none';

export interface TaxRates {
  exitTaxRate: number;
  cgtRate: number;
  cgtAnnualExemption: number;
  dirtRate: number;
  deemedDisposalYears: number;
}

/** Rates for future events (projections start now, so sales and deemed disposals fall in 2027 or later). */
export const IRISH_TAX_RATES: TaxRates = {
  exitTaxRate: EXIT_TAX_RATE,
  cgtRate: CGT_RATE,
  cgtAnnualExemption: CGT_ANNUAL_EXEMPTION,
  dirtRate: DIRT_RATE,
  deemedDisposalYears: DEEMED_DISPOSAL_YEARS,
};

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  etf_fund: 'ETF / investment fund (exit tax + deemed disposal)',
  individual_shares: 'Individual shares (CGT)',
  deposit: 'Deposit / savings account (DIRT)',
  none: 'No tax (e.g. inside a pension)',
};

export const MAX_YEARS = 60;

export const nonNegative = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

export const clampRate = (value: number, min: number, max: number, fallback = 0): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export const clampYears = (value: number, min = 1): number =>
  Math.min(MAX_YEARS, Math.max(min, Math.round(nonNegative(value)) || min));

export const monthlyRateFromAnnual = (annualRate: number): number =>
  Math.pow(1 + clampRate(annualRate, -0.99, 10), 1 / 12) - 1;

export const sanitiseRates = (rates: TaxRates = IRISH_TAX_RATES): TaxRates => ({
  exitTaxRate: clampRate(rates.exitTaxRate, 0, 1, IRISH_TAX_RATES.exitTaxRate),
  cgtRate: clampRate(rates.cgtRate, 0, 1, IRISH_TAX_RATES.cgtRate),
  cgtAnnualExemption: nonNegative(rates.cgtAnnualExemption),
  dirtRate: clampRate(rates.dirtRate, 0, 1, IRISH_TAX_RATES.dirtRate),
  deemedDisposalYears: Math.max(1, Math.round(nonNegative(rates.deemedDisposalYears)) || 8),
});

interface Lot {
  value: number;
  cost: number;
  boughtMonth: number;
}

export interface DeemedDisposalEvent {
  /** 0-based month at whose end the deemed disposal fell. */
  month: number;
  tax: number;
}

/** A taxable pot stepped one month at a time. */
export class TaxablePortfolio {
  readonly rates: TaxRates;
  private lots: Lot[] = [];
  private value = 0;
  private cost = 0;
  /** Tax charged so far (deemed disposals, DIRT). Excludes tax due on a final sale. */
  taxesPaid = 0;
  contributed = 0;
  deemedDisposals: DeemedDisposalEvent[] = [];

  constructor(readonly treatment: TaxTreatment, rates?: TaxRates) {
    this.rates = sanitiseRates(rates);
  }

  /** Invests money at the start of the given month (0-based). */
  deposit(amount: number, month: number): void {
    const a = nonNegative(amount);
    if (a === 0) return;
    this.contributed += a;
    if (this.treatment === 'etf_fund') {
      this.lots.push({ value: a, cost: a, boughtMonth: month });
    } else {
      this.value += a;
      this.cost += a;
    }
  }

  /** Applies one month of growth and any tax due at the end of it. Returns tax charged. */
  step(month: number, monthlyRate: number): number {
    if (this.treatment === 'etf_fund') {
      const cycle = this.rates.deemedDisposalYears * 12;
      let tax = 0;
      for (const lot of this.lots) {
        lot.value *= 1 + monthlyRate;
        const age = month - lot.boughtMonth + 1;
        if (age > 0 && age % cycle === 0) {
          const due = Math.max(0, lot.value - lot.cost) * this.rates.exitTaxRate;
          lot.value -= due;
          lot.cost = lot.value;
          tax += due;
        }
      }
      if (tax > 0) this.deemedDisposals.push({ month, tax });
      this.taxesPaid += tax;
      return tax;
    }
    const growth = this.value * monthlyRate;
    if (this.treatment === 'deposit' && growth > 0) {
      const dirt = growth * this.rates.dirtRate;
      this.value += growth - dirt;
      this.taxesPaid += dirt;
      return dirt;
    }
    this.value += growth;
    return 0;
  }

  /** Removes a charge (e.g. a fee or levy) pro rata from value without changing cost basis. */
  charge(amount: number): number {
    const gross = this.gross;
    const a = Math.min(nonNegative(amount), gross);
    if (a === 0 || gross === 0) return 0;
    const factor = 1 - a / gross;
    if (this.treatment === 'etf_fund') for (const lot of this.lots) lot.value *= factor;
    else this.value *= factor;
    return a;
  }

  get gross(): number {
    if (this.treatment === 'etf_fund') return this.lots.reduce((sum, lot) => sum + lot.value, 0);
    return this.value;
  }

  get costBasis(): number {
    if (this.treatment === 'etf_fund') return this.lots.reduce((sum, lot) => sum + lot.cost, 0);
    return this.cost;
  }

  /** Tax due if everything were sold now. */
  liquidationTax(): number {
    switch (this.treatment) {
      case 'etf_fund':
        return this.lots.reduce((sum, lot) => sum + Math.max(0, lot.value - lot.cost), 0) * this.rates.exitTaxRate;
      case 'individual_shares':
        return Math.max(0, this.value - this.cost - this.rates.cgtAnnualExemption) * this.rates.cgtRate;
      default:
        return 0;
    }
  }

  netValue(): number {
    return this.gross - this.liquidationTax();
  }
}

export interface InvestmentYear {
  year: number;
  contributed: number;
  gross: number;
  taxPaidThisYear: number;
  taxPaidCumulative: number;
  /** Value after paying any tax due if sold at the end of this year. */
  netIfSold: number;
}

export interface InvestmentSimulation {
  years: InvestmentYear[];
  contributed: number;
  gross: number;
  taxPaid: number;
  taxOnSale: number;
  net: number;
  deemedDisposals: DeemedDisposalEvent[];
}

export interface InvestmentInputs {
  startingAmount: number;
  monthlyContribution: number;
  years: number;
  annualReturn: number;
  treatment: TaxTreatment;
  rates?: TaxRates;
}

export function simulateInvestment(inputs: InvestmentInputs): InvestmentSimulation {
  const years = clampYears(inputs.years);
  const monthly = nonNegative(inputs.monthlyContribution);
  const rate = monthlyRateFromAnnual(inputs.annualReturn);
  const pot = new TaxablePortfolio(inputs.treatment, inputs.rates);
  pot.deposit(nonNegative(inputs.startingAmount), 0);

  const rows: InvestmentYear[] = [];
  let taxAtYearStart = 0;
  for (let month = 0; month < years * 12; month++) {
    pot.deposit(monthly, month);
    pot.step(month, rate);
    if ((month + 1) % 12 === 0) {
      rows.push({
        year: (month + 1) / 12,
        contributed: pot.contributed,
        gross: pot.gross,
        taxPaidThisYear: pot.taxesPaid - taxAtYearStart,
        taxPaidCumulative: pot.taxesPaid,
        netIfSold: pot.netValue(),
      });
      taxAtYearStart = pot.taxesPaid;
    }
  }

  return {
    years: rows,
    contributed: pot.contributed,
    gross: pot.gross,
    taxPaid: pot.taxesPaid,
    taxOnSale: pot.liquidationTax(),
    net: pot.netValue(),
    deemedDisposals: pot.deemedDisposals,
  };
}

/** Standard annuity repayment. 0 for a zero balance; handles a 0% rate. */
export function monthlyRepayment(principal: number, annualRate: number, months: number): number {
  const p = nonNegative(principal);
  const n = Math.max(1, Math.round(nonNegative(months)));
  if (p === 0) return 0;
  const i = clampRate(annualRate, 0, 1) / 12;
  if (i === 0) return p / n;
  return (p * i) / (1 - Math.pow(1 + i, -n));
}

export const inTodaysMoney = (amount: number, inflationRate: number, years: number): number =>
  amount / Math.pow(1 + clampRate(inflationRate, -0.5, 1), Math.max(0, years));
