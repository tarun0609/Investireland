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

const noTaxGross = (inputs: BudgetCalculatorInputs): number => {
  let value = inputs.startingAmount;
  for (let y = 1; y <= inputs.timeHorizonYears; y++) {
    value = (value + inputs.monthlyContribution * 12) * (1 + inputs.annualReturnRate);
  }
  return value;
};

describe('calculateBudgetProjections - FY26 regime', () => {
  it('charges no tax when returns are zero (contributions are cost basis, not gains)', () => {
    const oneYear = calculateBudgetProjections(makeInputs({ monthlyContribution: 100, timeHorizonYears: 1 }));
    expect(oneYear.fy26FinalNetValue).toBe(1200);
    expect(oneYear.totalTaxesFY26).toBe(0);

    // Spans a deemed disposal year (8) and beyond
    const tenYears = calculateBudgetProjections(makeInputs({ startingAmount: 5000, monthlyContribution: 100, timeHorizonYears: 10 }));
    expect(tenYears.fy26FinalNetValue).toBe(17000);
    expect(tenYears.totalTaxesFY26).toBe(0);
    expect(tenYears.projections.every(p => p.fy26TaxesPaid === 0)).toBe(true);
    expect(tenYears.totalContributions).toBe(17000);
  });

  it('applies the 41% deemed disposal on gains only at year 8 and re-bases afterwards', () => {
    const result = calculateBudgetProjections(makeInputs({ startingAmount: 10000, annualReturnRate: 0.1, timeHorizonYears: 9 }));
    const grossY8 = 10000 * Math.pow(1.1, 8);
    const deemedTax = (grossY8 - 10000) * 0.41;
    const postTaxY8 = grossY8 - deemedTax;

    expect(result.projections[6].fy26TaxesPaid).toBe(0);
    expect(result.projections[7].fy26TaxesPaid).toBe(Math.round(deemedTax));
    expect(result.projections[7].fy26GrossValue).toBe(Math.round(postTaxY8));
    // Immediately after the deemed disposal there is no remaining unrealised gain
    expect(result.projections[7].fy26NetValue).toBe(Math.round(postTaxY8));

    // Year 9: only growth since the year-8 re-basing is taxable on exit
    const grossY9 = postTaxY8 * 1.1;
    expect(result.fy26FinalNetValue).toBe(Math.round(grossY9 - (grossY9 - postTaxY8) * 0.41));
  });

  it('adds each year of contributions to the cost basis before the deemed disposal', () => {
    const inputs = makeInputs({ monthlyContribution: 1000, annualReturnRate: 0.05, timeHorizonYears: 8 });
    const result = calculateBudgetProjections(inputs);
    const gross = noTaxGross(inputs);
    const contributed = 96000;
    const expectedTax = (gross - contributed) * 0.41;

    expect(result.projections[7].fy26TaxesPaid).toBe(Math.round(expectedTax));
    expect(result.fy26FinalNetValue).toBe(Math.round(gross - expectedTax));
    expect(result.fy26FinalNetValue).toBeGreaterThan(contributed);
  });

  it('applies 33% CGT above the €1,270 exemption for individual shares with no deemed disposal', () => {
    const inputs = makeInputs({ startingAmount: 10000, annualReturnRate: 0.07, timeHorizonYears: 10, assetClass: 'individual_shares' });
    const result = calculateBudgetProjections(inputs);
    const gross = noTaxGross(inputs);
    expect(result.projections.every(p => p.fy26TaxesPaid === 0)).toBe(true);
    expect(result.fy26FinalNetValue).toBe(Math.round(gross - (gross - 10000 - 1270) * 0.33));
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
    expect(y5.fy27AnnualCharge).toBe(100); // 1% of (60,000 - 50,000)
    expect(y5.fy27NetValue).toBe(59900);
    expect(result.totalTaxesFY27).toBe(100);
    expect(y5.thresholdProgressPct).toBe(100);
  });

  it('never applies deemed disposal or exit tax inside the PSIA', () => {
    const inputs = makeInputs({ startingAmount: 10000, annualReturnRate: 0.1, timeHorizonYears: 8 });
    const result = calculateBudgetProjections(inputs);
    // Balance stays below €50k so there is no charge either
    expect(result.fy27FinalNetValue).toBe(Math.round(noTaxGross(inputs)));
    expect(result.totalTaxesFY27).toBe(0);
  });

  it('routes contributions above the €12,000 annual cap into a taxable FY26-rules account', () => {
    const zeroReturn = calculateBudgetProjections(makeInputs({ monthlyContribution: 2000, timeHorizonYears: 3 }));
    expect(zeroReturn.totalContributions).toBe(72000);
    expect(zeroReturn.fy27FinalNetValue).toBe(72000);
    // Only €36,000 actually sits inside the PSIA
    expect(zeroReturn.projections[2].thresholdProgressPct).toBe(72);

    const base = { annualReturnRate: 0.07, timeHorizonYears: 15 };
    const overCap = calculateBudgetProjections(makeInputs({ ...base, monthlyContribution: 2000 }));
    const atCap = calculateBudgetProjections(makeInputs({ ...base, monthlyContribution: 1000 }));
    // Over-cap result = €12k/yr in PSIA + €12k/yr in an FY26-taxed account
    expect(Math.abs(overCap.fy27FinalNetValue - (atCap.fy27FinalNetValue + atCap.fy26FinalNetValue))).toBeLessThanOrEqual(2);
    expect(overCap.fy27FinalNetValue).toBeLessThan(2 * atCap.fy27FinalNetValue);
  });

  it('caps an opening lump sum at €12,000 inside the PSIA', () => {
    const result = calculateBudgetProjections(makeInputs({ startingAmount: 20000, timeHorizonYears: 1 }));
    expect(result.fy27FinalNetValue).toBe(20000);
    expect(result.projections[0].thresholdProgressPct).toBe(24);
  });

  it('discounts FY27 net value for inflation when requested', () => {
    const result = calculateBudgetProjections(makeInputs({ startingAmount: 10000, timeHorizonYears: 10, adjustForInflation: true }));
    expect(result.inflationAdjustedFY27Net).toBe(Math.round(10000 / Math.pow(1.022, 10)));
  });
});
