import { describe, it, expect } from 'vitest';
import { calculateBudgetProjections } from './budgetCalculatorService';
import { BudgetCalculatorInputs } from '../types';

const makeInputs = (overrides: Partial<BudgetCalculatorInputs> = {}): BudgetCalculatorInputs => ({
  startingAmount: 0,
  monthlyContribution: 0,
  timeHorizonYears: 10,
  annualReturnRate: 0,
  adjustForInflation: false,
  assetClass: 'etf_fund',
  ...overrides,
});

const monthly = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;

/** Reference: contributions at the start of each month, monthly compounding, no tax. */
const noTaxGross = (inputs: BudgetCalculatorInputs): number => {
  const r = monthly(inputs.annualReturnRate);
  let value = inputs.startingAmount;
  for (let m = 0; m < inputs.timeHorizonYears * 12; m++) value = (value + inputs.monthlyContribution) * (1 + r);
  return value;
};

describe('calculateBudgetProjections - FY26 regime', () => {
  it('charges no tax when returns are zero (contributions are cost basis, not gains)', () => {
    const oneYear = calculateBudgetProjections(makeInputs({ monthlyContribution: 100, timeHorizonYears: 1 }));
    expect(oneYear.fy26FinalNetValue).toBe(1200);
    expect(oneYear.totalTaxesFY26).toBe(0);

    const tenYears = calculateBudgetProjections(makeInputs({ startingAmount: 5000, monthlyContribution: 100, timeHorizonYears: 10 }));
    expect(tenYears.fy26FinalNetValue).toBe(17000);
    expect(tenYears.totalTaxesFY26).toBe(0);
    expect(tenYears.projections.every(p => p.fy26TaxesPaid === 0)).toBe(true);
    expect(tenYears.totalContributions).toBe(17000);
  });

  it('compounds monthly, so 10% a year on a lump sum gives exactly 10% after one year', () => {
    const result = calculateBudgetProjections(makeInputs({ startingAmount: 10000, annualReturnRate: 0.1, timeHorizonYears: 1, assetClass: 'individual_shares' }));
    expect(result.projections[0].fy26GrossValue).toBe(11000);
  });

  it('does not treat monthly contributions as invested on 1 January', () => {
    // €1,000/month at 10%: the old annual model gave 13,200; monthly is about 12,600.
    const result = calculateBudgetProjections(makeInputs({ monthlyContribution: 1000, annualReturnRate: 0.1, timeHorizonYears: 1, assetClass: 'individual_shares' }));
    expect(result.projections[0].fy26GrossValue).toBe(Math.round(noTaxGross(makeInputs({ monthlyContribution: 1000, annualReturnRate: 0.1, timeHorizonYears: 1 }))));
    expect(result.projections[0].fy26GrossValue).toBeLessThan(13200);
    expect(result.projections[0].fy26GrossValue).toBeGreaterThan(12000);
  });

  it('applies the 38% deemed disposal to a lump sum on its 8th anniversary and re-bases afterwards', () => {
    const result = calculateBudgetProjections(makeInputs({ startingAmount: 10000, annualReturnRate: 0.1, timeHorizonYears: 9 }));
    const grossY8 = 10000 * Math.pow(1.1, 8);
    const deemedTax = (grossY8 - 10000) * 0.38;
    const postTaxY8 = grossY8 - deemedTax;

    expect(result.projections[6].fy26TaxesPaid).toBe(0);
    expect(result.projections[7].fy26TaxesPaid).toBe(Math.round(deemedTax));
    expect(result.projections[7].fy26GrossValue).toBe(Math.round(postTaxY8));
    expect(result.projections[7].fy26NetValue).toBe(Math.round(postTaxY8));

    const grossY9 = postTaxY8 * 1.1;
    expect(result.fy26FinalNetValue).toBe(Math.round(grossY9 - (grossY9 - postTaxY8) * 0.38));
  });

  it('applies deemed disposal to each monthly purchase on its own 8th anniversary', () => {
    // After exactly 8 years only the very first purchase is 8 years old.
    const result = calculateBudgetProjections(makeInputs({ monthlyContribution: 1000, annualReturnRate: 0.05, timeHorizonYears: 8 }));
    const firstLotGross = 1000 * Math.pow(1.05, 8);
    const firstLotTax = (firstLotGross - 1000) * 0.38;
    expect(result.projections[7].fy26TaxesPaid).toBe(Math.round(firstLotTax));

    // By year 9 the first 12 purchases have each hit their anniversary.
    const nine = calculateBudgetProjections(makeInputs({ monthlyContribution: 1000, annualReturnRate: 0.05, timeHorizonYears: 9 }));
    expect(nine.projections[8].fy26TaxesPaid).toBeGreaterThan(11 * firstLotTax);
  });

  it('applies 33% CGT above the €1,270 exemption for individual shares with no deemed disposal', () => {
    const inputs = makeInputs({ startingAmount: 10000, annualReturnRate: 0.07, timeHorizonYears: 10, assetClass: 'individual_shares' });
    const result = calculateBudgetProjections(inputs);
    const gross = noTaxGross(inputs);
    expect(result.projections.every(p => p.fy26TaxesPaid === 0)).toBe(true);
    expect(result.fy26FinalNetValue).toBe(Math.round(gross - (gross - 10000 - 1270) * 0.33));
  });

  it('deducts 33% DIRT from deposit interest as it is earned', () => {
    const result = calculateBudgetProjections(makeInputs({ startingAmount: 10000, annualReturnRate: 0.03, timeHorizonYears: 1, assetClass: 'deposit' }));
    const netMonthly = monthly(0.03) * (1 - 0.33);
    expect(result.fy26FinalNetValue).toBe(Math.round(10000 * Math.pow(1 + netMonthly, 12)));
    expect(result.projections[0].fy26TaxesPaid).toBeGreaterThan(0);
  });

  it('keeps totals consistent: net + tax drag == no-tax gross value for both regimes', () => {
    const scenarios: BudgetCalculatorInputs[] = [
      makeInputs({ startingAmount: 10000, monthlyContribution: 1000, annualReturnRate: 0.07, timeHorizonYears: 25 }),
      makeInputs({ startingAmount: 0, monthlyContribution: 500, annualReturnRate: 0.04, timeHorizonYears: 16 }),
      makeInputs({ startingAmount: 30000, monthlyContribution: 2000, annualReturnRate: 0.09, timeHorizonYears: 20 }),
      makeInputs({ startingAmount: 5000, monthlyContribution: 250, annualReturnRate: 0.06, timeHorizonYears: 12, assetClass: 'individual_shares' }),
    ];

    for (const inputs of scenarios) {
      const result = calculateBudgetProjections(inputs);
      const expectedGross = noTaxGross(inputs);
      expect(Math.abs(result.fy26FinalNetValue + result.totalTaxesFY26 - expectedGross)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.fy27FinalNetValue + result.totalTaxesFY27 - expectedGross)).toBeLessThanOrEqual(1);
      expect(result.totalWealthSaved).toBe(result.fy27FinalNetValue - result.fy26FinalNetValue);
      expect(result.totalTaxesFY26).toBeGreaterThanOrEqual(0);
      expect(result.totalTaxesFY27).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('calculateBudgetProjections - FY27 PSIA regime', () => {
  it('charges 1% only on the value above the €50,000 threshold', () => {
    const result = calculateBudgetProjections(makeInputs({ monthlyContribution: 1000, timeHorizonYears: 5 }));
    const y4 = result.projections[3];
    const y5 = result.projections[4];

    expect(y4.fy27NetValue).toBe(48000);
    expect(y4.fy27AnnualCharge).toBe(0);
    expect(y4.thresholdProgressPct).toBe(96);

    expect(y5.fy27GrossValue).toBe(60000);
    expect(y5.fy27AnnualCharge).toBe(100);
    expect(y5.fy27NetValue).toBe(59900);
    expect(result.totalTaxesFY27).toBe(100);
    expect(y5.thresholdProgressPct).toBe(100);
  });

  it('never applies deemed disposal or exit tax inside the PSIA', () => {
    const inputs = makeInputs({ startingAmount: 10000, annualReturnRate: 0.1, timeHorizonYears: 8 });
    const result = calculateBudgetProjections(inputs);
    expect(result.fy27FinalNetValue).toBe(Math.round(noTaxGross(inputs)));
    expect(result.totalTaxesFY27).toBe(0);
  });

  it('routes contributions above the €12,000 annual cap into a taxable account', () => {
    const zeroReturn = calculateBudgetProjections(makeInputs({ monthlyContribution: 2000, timeHorizonYears: 3 }));
    expect(zeroReturn.totalContributions).toBe(72000);
    expect(zeroReturn.fy27FinalNetValue).toBe(72000);
    expect(zeroReturn.projections[2].thresholdProgressPct).toBe(72);

    const overCap = calculateBudgetProjections(makeInputs({ annualReturnRate: 0.07, timeHorizonYears: 15, monthlyContribution: 2000 }));
    const atCap = calculateBudgetProjections(makeInputs({ annualReturnRate: 0.07, timeHorizonYears: 15, monthlyContribution: 1000 }));
    expect(overCap.fy27FinalNetValue).toBeLessThan(2 * atCap.fy27FinalNetValue);
  });

  it('shares one €12,000 allowance between the opening lump sum and year-1 contributions', () => {
    // €10k lump + €1k/month in year 1 = €22k; only €12k may enter the PSIA.
    const result = calculateBudgetProjections(makeInputs({ startingAmount: 10000, monthlyContribution: 1000, timeHorizonYears: 1 }));
    expect(result.projections[0].thresholdProgressPct).toBe(24);
    // Year 2 gets a fresh €12k allowance.
    const two = calculateBudgetProjections(makeInputs({ startingAmount: 10000, monthlyContribution: 1000, timeHorizonYears: 2 }));
    expect(two.projections[1].thresholdProgressPct).toBe(48);
  });

  it('caps an opening lump sum at €12,000 inside the PSIA', () => {
    const result = calculateBudgetProjections(makeInputs({ startingAmount: 20000, timeHorizonYears: 1 }));
    expect(result.fy27FinalNetValue).toBe(20000);
    expect(result.projections[0].thresholdProgressPct).toBe(24);
  });

  it('sanitises NaN, negative and zero-length inputs instead of returning NaN or an empty projection', () => {
    const result = calculateBudgetProjections(makeInputs({
      startingAmount: Number.NaN,
      monthlyContribution: -500,
      timeHorizonYears: 0,
      annualReturnRate: Number.NaN,
    }));
    expect(result.projections).toHaveLength(1);
    expect(result.totalContributions).toBe(0);
    expect(result.fy26FinalNetValue).toBe(0);
    expect(result.fy27FinalNetValue).toBe(0);
    expect(result.totalWealthSaved).toBe(0);
    expect(Number.isNaN(result.percentageTaxReduction)).toBe(false);
  });

  it('discounts FY27 net value for inflation when requested', () => {
    const result = calculateBudgetProjections(makeInputs({ startingAmount: 10000, timeHorizonYears: 10, adjustForInflation: true }));
    expect(result.inflationAdjustedFY27Net).toBe(Math.round(10000 / Math.pow(1.022, 10)));
  });
});
