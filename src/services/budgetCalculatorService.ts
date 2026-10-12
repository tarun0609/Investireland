import { BudgetCalculatorInputs, BudgetCalculatorResult, YearProjection } from '../types';

export const FY26_EXIT_TAX_RATE = 0.41;
export const FY26_CGT_RATE = 0.33;
export const FY26_CGT_ANNUAL_EXEMPTION = 1270;
export const DEEMED_DISPOSAL_CYCLE_YEARS = 8;
export const FY27_ANNUAL_CONTRIBUTION_LIMIT = 12000;
export const FY27_TAX_FREE_THRESHOLD = 50000;
export const FY27_ANNUAL_CHARGE_RATE = 0.01;

type AssetClass = BudgetCalculatorInputs['assetClass'];

/**
 * A pot of money taxed under the current (FY26) regime.
 * ETFs/funds: 41% exit tax with 8-year deemed disposal. Shares/deposits: 33% CGT with €1,270 exemption on exit.
 * Contributions are added to the cost basis so only gains are ever taxed.
 */
class Fy26TaxablePot {
  gross: number;
  costBasis: number;
  taxesPaid = 0;

  constructor(private readonly assetClass: AssetClass, openingAmount: number) {
    this.gross = openingAmount;
    this.costBasis = openingAmount;
  }

  advanceYear(year: number, contribution: number, returnRate: number): number {
    this.gross = (this.gross + contribution) * (1 + returnRate);
    this.costBasis += contribution;

    if (this.assetClass === 'etf_fund' && year % DEEMED_DISPOSAL_CYCLE_YEARS === 0) {
      const tax = Math.max(0, this.gross - this.costBasis) * FY26_EXIT_TAX_RATE;
      this.gross -= tax;
      this.taxesPaid += tax;
      // Deemed disposal re-bases the holding at its post-tax market value
      this.costBasis = this.gross;
      return tax;
    }
    return 0;
  }

  liquidationTax(): number {
    const gain = Math.max(0, this.gross - this.costBasis);
    if (this.assetClass === 'etf_fund') return gain * FY26_EXIT_TAX_RATE;
    return Math.max(0, gain - FY26_CGT_ANNUAL_EXEMPTION) * FY26_CGT_RATE;
  }

  netValue(): number {
    return this.gross - this.liquidationTax();
  }
}

export function calculateBudgetProjections(inputs: BudgetCalculatorInputs): BudgetCalculatorResult {
  const {
    startingAmount,
    monthlyContribution,
    timeHorizonYears,
    annualReturnRate,
    adjustForInflation,
    assetClass
  } = inputs;

  const annualContribution = monthlyContribution * 12;
  const inflationRate = 0.022; // 2.2% official Irish CSO HICP rate

  const projections: YearProjection[] = [];

  // No-tax counterfactual with identical contributions/returns; tax drag = noTaxGross - net value
  let noTaxGross = startingAmount;

  // FY26 (Old Regime)
  const fy26Pot = new Fy26TaxablePot(assetClass, startingAmount);

  // FY27 (Personal Savings & Investment Account). Subscriptions above the €12,000 annual cap
  // (including an opening lump sum above the cap) cannot enter the PSIA, so they overflow into
  // a standard taxable account under FY26 rules for the same asset class.
  const fy27OpeningSubscription = Math.min(startingAmount, FY27_ANNUAL_CONTRIBUTION_LIMIT);
  const fy27AnnualSubscription = Math.min(annualContribution, FY27_ANNUAL_CONTRIBUTION_LIMIT);
  const fy27AnnualOverflow = annualContribution - fy27AnnualSubscription;
  let psiaBalance = fy27OpeningSubscription;
  const fy27OverflowPot = new Fy26TaxablePot(assetClass, startingAmount - fy27OpeningSubscription);
  let totalContributions = startingAmount;
  let fy27TotalAnnualCharges = 0;

  for (let year = 1; year <= timeHorizonYears; year++) {
    totalContributions += annualContribution;
    noTaxGross = (noTaxGross + annualContribution) * (1 + annualReturnRate);

    fy26Pot.advanceYear(year, annualContribution, annualReturnRate);

    psiaBalance = (psiaBalance + fy27AnnualSubscription) * (1 + annualReturnRate);
    const fy27GrossBeforeCharge = psiaBalance;
    // 1% annual charge applies only to the portion of the PSIA value above €50,000
    const yearFY27Charge = Math.max(0, psiaBalance - FY27_TAX_FREE_THRESHOLD) * FY27_ANNUAL_CHARGE_RATE;
    psiaBalance -= yearFY27Charge;
    fy27TotalAnnualCharges += yearFY27Charge;

    fy27OverflowPot.advanceYear(year, fy27AnnualOverflow, annualReturnRate);

    const fy26NetCurrent = fy26Pot.netValue();
    // Inside the PSIA, no exit tax on withdrawal; overflow pot is valued net of FY26 taxes
    const fy27NetCurrent = psiaBalance + fy27OverflowPot.netValue();
    const wealthSaved = Math.max(0, fy27NetCurrent - fy26NetCurrent);
    const thresholdProgress = Math.min(100, Math.round((psiaBalance / FY27_TAX_FREE_THRESHOLD) * 100));

    projections.push({
      year,
      contributionsCumulative: Math.round(totalContributions),
      fy26GrossValue: Math.round(fy26Pot.gross),
      fy26TaxesPaid: Math.round(fy26Pot.taxesPaid),
      fy26NetValue: Math.round(fy26NetCurrent),
      fy27GrossValue: Math.round(fy27GrossBeforeCharge + fy27OverflowPot.gross),
      fy27AnnualCharge: Math.round(yearFY27Charge),
      fy27TaxesCumulative: Math.round(fy27TotalAnnualCharges + fy27OverflowPot.taxesPaid),
      fy27NetValue: Math.round(fy27NetCurrent),
      wealthSavedUnderFY27: Math.round(wealthSaved),
      thresholdProgressPct: thresholdProgress
    });
  }

  const lastProj = projections[projections.length - 1];
  const finalTotalContributions = lastProj ? lastProj.contributionsCumulative : Math.round(startingAmount);
  const fy26FinalNetValue = lastProj ? lastProj.fy26NetValue : Math.round(startingAmount);
  const fy27FinalNetValue = lastProj ? lastProj.fy27NetValue : Math.round(startingAmount);
  const noTaxFinalGross = Math.round(noTaxGross);

  // Effective tax drag vs. the no-tax counterfactual: includes tax actually charged
  // (deemed disposals, PSIA charges), tax due on exit, and growth forgone on tax paid early.
  const fy26TotalEffectiveTax = Math.max(0, noTaxFinalGross - fy26FinalNetValue);
  const fy27TotalEffectiveTax = Math.max(0, noTaxFinalGross - fy27FinalNetValue);

  const totalWealthSaved = fy27FinalNetValue - fy26FinalNetValue;
  const percentageTaxReduction = fy26TotalEffectiveTax > 0
    ? Math.min(100, Math.round(((fy26TotalEffectiveTax - fy27TotalEffectiveTax) / fy26TotalEffectiveTax) * 100))
    : 0;

  // Optional inflation discounting
  let inflationAdjustedFY27Net = fy27FinalNetValue;
  if (adjustForInflation) {
    inflationAdjustedFY27Net = Math.round(fy27FinalNetValue / Math.pow(1 + inflationRate, timeHorizonYears));
  }

  return {
    inputs,
    projections,
    totalContributions: finalTotalContributions,
    fy26FinalNetValue,
    fy27FinalNetValue,
    totalTaxesFY26: fy26TotalEffectiveTax,
    totalTaxesFY27: fy27TotalEffectiveTax,
    totalWealthSaved: Math.round(totalWealthSaved),
    percentageTaxReduction,
    inflationAdjustedFY27Net
  };
}
