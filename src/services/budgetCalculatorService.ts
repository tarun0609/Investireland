import { BudgetCalculatorInputs, BudgetCalculatorResult, YearProjection } from '../types';
import {
  IRISH_TAX_RATES,
  MAX_YEARS,
  TaxablePortfolio,
  TaxTreatment,
  clampYears,
  monthlyRateFromAnnual,
  nonNegative,
} from './investmentEngine';

/** Rates applied to projected (2027+) sales and deemed disposals outside the Investment Account. */
export const FY26_EXIT_TAX_RATE = IRISH_TAX_RATES.exitTaxRate;
export const FY26_CGT_RATE = IRISH_TAX_RATES.cgtRate;
export const FY26_CGT_ANNUAL_EXEMPTION = IRISH_TAX_RATES.cgtAnnualExemption;
export const FY26_DIRT_RATE = IRISH_TAX_RATES.dirtRate;
export const DEEMED_DISPOSAL_CYCLE_YEARS = IRISH_TAX_RATES.deemedDisposalYears;
export const FY27_ANNUAL_CONTRIBUTION_LIMIT = 12000;
export const FY27_TAX_FREE_THRESHOLD = 50000;
export const FY27_ANNUAL_CHARGE_RATE = 0.01;
/** Illustrative inflation assumption (Irish HICP reference figure) used for "today's money" values. */
export const ILLUSTRATIVE_INFLATION_RATE = 0.022;
/** Upper bound on the projection horizon to keep the loop bounded for bad inputs. */
export const MAX_TIME_HORIZON_YEARS = MAX_YEARS;

const treatmentFor = (assetClass: BudgetCalculatorInputs['assetClass']): TaxTreatment =>
  assetClass === 'etf_fund' || assetClass === 'individual_shares' || assetClass === 'deposit' ? assetClass : 'etf_fund';

/**
 * Compares today's rules (FY26) with the proposed Personal Savings & Investment Account (FY27).
 *
 * Month-by-month: contributions go in at the start of each month and grow at the monthly
 * equivalent of the annual return. Under FY26, ETF deemed disposal falls 8 years after each
 * purchase. Under FY27, up to €12,000 per calendar year (opening lump sum included) goes into the
 * PSIA; anything above that overflows into a normal taxable account. The 1% PSIA charge applies at
 * each year end to the balance above €50,000.
 */
export function calculateBudgetProjections(inputs: BudgetCalculatorInputs): BudgetCalculatorResult {
  const { adjustForInflation } = inputs;
  const startingAmount = nonNegative(inputs.startingAmount);
  const monthlyContribution = nonNegative(inputs.monthlyContribution);
  const timeHorizonYears = clampYears(inputs.timeHorizonYears);
  const annualReturnRate = Number.isFinite(inputs.annualReturnRate) ? Math.max(-0.99, inputs.annualReturnRate) : 0;
  const monthlyRate = monthlyRateFromAnnual(annualReturnRate);
  const treatment = treatmentFor(inputs.assetClass);

  const noTax = new TaxablePortfolio('none');
  const fy26 = new TaxablePortfolio(treatment);
  const psia = new TaxablePortfolio('none');
  const overflow = new TaxablePortfolio(treatment);
  let psiaCharges = 0;
  let allowanceLeft = 0;

  const invest = (amount: number, month: number) => {
    noTax.deposit(amount, month);
    fy26.deposit(amount, month);
    const intoPsia = Math.min(amount, allowanceLeft);
    allowanceLeft -= intoPsia;
    psia.deposit(intoPsia, month);
    overflow.deposit(amount - intoPsia, month);
  };

  const projections: YearProjection[] = [];
  for (let month = 0; month < timeHorizonYears * 12; month++) {
    if (month % 12 === 0) allowanceLeft = FY27_ANNUAL_CONTRIBUTION_LIMIT;
    if (month === 0) invest(startingAmount, 0);
    invest(monthlyContribution, month);

    noTax.step(month, monthlyRate);
    fy26.step(month, monthlyRate);
    psia.step(month, monthlyRate);
    overflow.step(month, monthlyRate);

    if ((month + 1) % 12 === 0) {
      const year = (month + 1) / 12;
      const psiaGrossBeforeCharge = psia.gross;
      const yearCharge = psia.charge(Math.max(0, psia.gross - FY27_TAX_FREE_THRESHOLD) * FY27_ANNUAL_CHARGE_RATE);
      psiaCharges += yearCharge;

      const fy26Net = fy26.netValue();
      const fy27Net = psia.gross + overflow.netValue();
      projections.push({
        year,
        contributionsCumulative: Math.round(noTax.contributed),
        fy26GrossValue: Math.round(fy26.gross),
        fy26TaxesPaid: Math.round(fy26.taxesPaid),
        fy26NetValue: Math.round(fy26Net),
        fy27GrossValue: Math.round(psiaGrossBeforeCharge + overflow.gross),
        fy27AnnualCharge: Math.round(yearCharge),
        fy27TaxesCumulative: Math.round(psiaCharges + overflow.taxesPaid),
        fy27NetValue: Math.round(fy27Net),
        wealthSavedUnderFY27: Math.round(Math.max(0, fy27Net - fy26Net)),
        thresholdProgressPct: Math.min(100, Math.round((psia.gross / FY27_TAX_FREE_THRESHOLD) * 100)),
      });
    }
  }

  const last = projections[projections.length - 1];
  const totalContributions = last.contributionsCumulative;
  const fy26FinalNetValue = last.fy26NetValue;
  const fy27FinalNetValue = last.fy27NetValue;
  const noTaxFinalGross = Math.round(noTax.gross);

  // Effective tax drag vs. the no-tax counterfactual: tax charged along the way, tax due on exit
  // and the growth lost on tax paid early.
  const totalTaxesFY26 = Math.max(0, noTaxFinalGross - fy26FinalNetValue);
  const totalTaxesFY27 = Math.max(0, noTaxFinalGross - fy27FinalNetValue);
  const percentageTaxReduction = totalTaxesFY26 > 0
    ? Math.min(100, Math.round(((totalTaxesFY26 - totalTaxesFY27) / totalTaxesFY26) * 100))
    : 0;

  const inflationAdjustedFY27Net = adjustForInflation
    ? Math.round(fy27FinalNetValue / Math.pow(1 + ILLUSTRATIVE_INFLATION_RATE, timeHorizonYears))
    : fy27FinalNetValue;

  return {
    inputs: { ...inputs, assetClass: treatment as BudgetCalculatorInputs['assetClass'], startingAmount, monthlyContribution, timeHorizonYears, annualReturnRate },
    projections,
    totalContributions,
    fy26FinalNetValue,
    fy27FinalNetValue,
    totalTaxesFY26,
    totalTaxesFY27,
    totalWealthSaved: fy27FinalNetValue - fy26FinalNetValue,
    percentageTaxReduction,
    inflationAdjustedFY27Net,
  };
}
