import { describe, it, expect } from 'vitest';
import { monthlyRepayment, simulateInvestment, inTodaysMoney } from './investmentEngine';
import {
  ageRelatedReliefLimit,
  calculateEtfTax,
  calculatePension,
  calculateSavingsGoal,
  compareMortgageVsInvesting,
  lumpSumTax,
  pensionTaxRelief,
  standardFundThreshold,
  yearsToReachGoal,
} from './irishCalculators';

describe('investment engine', () => {
  it('matches the closed-form future value for a lump sum with no tax', () => {
    const sim = simulateInvestment({ startingAmount: 10000, monthlyContribution: 0, years: 20, annualReturn: 0.07, treatment: 'none' });
    expect(sim.net).toBeCloseTo(10000 * Math.pow(1.07, 20), 4);
  });

  it('matches the annuity-due formula for monthly contributions', () => {
    const r = Math.pow(1.06, 1 / 12) - 1;
    const n = 15 * 12;
    const expected = 500 * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const sim = simulateInvestment({ startingAmount: 0, monthlyContribution: 500, years: 15, annualReturn: 0.06, treatment: 'none' });
    expect(sim.net).toBeCloseTo(expected, 4);
    expect(sim.contributed).toBe(90000);
  });

  it('re-applies deemed disposal every 8 years per lot', () => {
    const sim = simulateInvestment({ startingAmount: 10000, monthlyContribution: 0, years: 16, annualReturn: 0.1, treatment: 'etf_fund' });
    expect(sim.deemedDisposals.map(e => e.month)).toEqual([95, 191]);
    const y8 = 10000 * Math.pow(1.1, 8);
    const after8 = y8 - (y8 - 10000) * 0.38;
    const y16 = after8 * Math.pow(1.1, 8);
    const after16 = y16 - (y16 - after8) * 0.38;
    expect(sim.net).toBeCloseTo(after16, 4);
    expect(sim.taxOnSale).toBeCloseTo(0, 6);
  });

  it('never taxes losses', () => {
    const sim = simulateInvestment({ startingAmount: 10000, monthlyContribution: 100, years: 10, annualReturn: -0.05, treatment: 'etf_fund' });
    expect(sim.taxPaid).toBe(0);
    expect(sim.taxOnSale).toBe(0);
  });

  it('computes standard mortgage repayments', () => {
    expect(monthlyRepayment(300000, 0.04, 300)).toBeCloseTo(1583.51, 2);
    expect(monthlyRepayment(12000, 0, 12)).toBe(1000);
    expect(monthlyRepayment(0, 0.04, 300)).toBe(0);
  });

  it('discounts to today\'s money', () => {
    expect(inTodaysMoney(1102.5, 0.05, 2)).toBeCloseTo(1000, 6);
  });
});

describe('ETF tax calculator', () => {
  it('has no tax when there is no growth', () => {
    const r = calculateEtfTax({ startingAmount: 10000, monthlyContribution: 200, years: 10, annualReturn: 0 });
    expect(r.etfTaxDrag).toBe(0);
    expect(r.sharesTaxDrag).toBe(0);
    expect(r.etf.net).toBeCloseTo(34000, 6);
  });

  it('ranks no-tax >= shares >= ETF for a long, growing plan', () => {
    const r = calculateEtfTax({ startingAmount: 20000, monthlyContribution: 500, years: 25, annualReturn: 0.07 });
    expect(r.noTax.net).toBeGreaterThan(r.shares.net);
    expect(r.shares.net).toBeGreaterThan(r.etf.net);
    expect(r.sharesAdvantage).toBeCloseTo(r.shares.net - r.etf.net, 6);
    expect(r.etf.deemedDisposals.length).toBeGreaterThan(0);
  });

  it('respects edited tax rates', () => {
    const zero = calculateEtfTax({
      startingAmount: 10000, monthlyContribution: 0, years: 10, annualReturn: 0.07,
      rates: { exitTaxRate: 0, cgtRate: 0, cgtAnnualExemption: 0, dirtRate: 0, deemedDisposalYears: 8 },
    });
    expect(zero.etf.net).toBeCloseTo(zero.noTax.net, 6);
  });
});

describe('pension calculator', () => {
  it('uses the Irish age-related relief bands', () => {
    expect(ageRelatedReliefLimit(29)).toBe(0.15);
    expect(ageRelatedReliefLimit(30)).toBe(0.2);
    expect(ageRelatedReliefLimit(45)).toBe(0.25);
    expect(ageRelatedReliefLimit(52)).toBe(0.3);
    expect(ageRelatedReliefLimit(55)).toBe(0.35);
    expect(ageRelatedReliefLimit(60)).toBe(0.4);
  });

  it('gives relief at the marginal rate, split across the band', () => {
    expect(pensionTaxRelief(60000, 6000)).toBeCloseTo(2400, 6);
    expect(pensionTaxRelief(40000, 4000)).toBeCloseTo(800, 6);
    expect(pensionTaxRelief(46000, 4000)).toBeCloseTo(1200, 6);
  });

  it('taxes the lump sum in the right bands', () => {
    expect(lumpSumTax(200000)).toBe(0);
    expect(lumpSumTax(300000)).toBeCloseTo(20000, 6);
    expect(lumpSumTax(600000)).toBeCloseTo(100000, 6);
  });

  it('phases the Standard Fund Threshold up to €2.8m', () => {
    expect(standardFundThreshold(2025)).toBe(2000000);
    expect(standardFundThreshold(2026)).toBe(2200000);
    expect(standardFundThreshold(2029)).toBe(2800000);
    expect(standardFundThreshold(2040)).toBe(2800000);
  });

  it('adds contributions exactly when returns are zero', () => {
    const r = calculatePension({
      currentAge: 30, retirementAge: 40, salary: 50000, salaryGrowth: 0, currentPot: 0,
      employeeRate: 0.1, employerRate: 0.05, annualReturn: 0, annualCharge: 0, inflation: 0, startYear: 2026,
    });
    expect(r.yearsToRetirement).toBe(10);
    expect(r.finalPot).toBeCloseTo(75000, 6);
    expect(r.totalTaxRelief).toBeCloseTo(20000, 6);
    expect(r.netCostToYou).toBeCloseTo(30000, 6);
    expect(r.lumpSum).toBeCloseTo(18750, 6);
    expect(r.lumpSumTax).toBe(0);
    expect(r.annualDrawdownIncome).toBeCloseTo(56250 * 0.04, 6);
    expect(r.exceedsReliefLimit).toBe(false);
  });

  it('limits relief to the age band and the €115,000 earnings cap', () => {
    const young = calculatePension({
      currentAge: 25, retirementAge: 26, salary: 50000, salaryGrowth: 0, currentPot: 0,
      employeeRate: 0.2, employerRate: 0, annualReturn: 0, annualCharge: 0, inflation: 0,
    });
    expect(young.exceedsReliefLimit).toBe(true);
    expect(young.totalTaxRelief).toBeCloseTo(pensionTaxRelief(50000, 7500), 6);
    expect(young.finalPot).toBeCloseTo(10000, 6);

    const highEarner = calculatePension({
      currentAge: 60, retirementAge: 61, salary: 200000, salaryGrowth: 0, currentPot: 0,
      employeeRate: 0.4, employerRate: 0, annualReturn: 0, annualCharge: 0, inflation: 0,
    });
    expect(highEarner.totalTaxRelief).toBeCloseTo(46000 * 0.4, 6);
  });

  it('reduces growth by the management charge', () => {
    const base = {
      currentAge: 40, retirementAge: 65, salary: 60000, salaryGrowth: 0.02, currentPot: 50000,
      employeeRate: 0.08, employerRate: 0.05, annualReturn: 0.06, inflation: 0.02,
    };
    const cheap = calculatePension({ ...base, annualCharge: 0.002 });
    const dear = calculatePension({ ...base, annualCharge: 0.015 });
    expect(cheap.finalPot).toBeGreaterThan(dear.finalPot);
    expect(cheap.finalPotTodaysMoney).toBeLessThan(cheap.finalPot);
  });

  it('reports the retirement age it actually used when the input is not after the current age', () => {
    const r = calculatePension({
      currentAge: 70, retirementAge: 66, salary: 50000, salaryGrowth: 0, currentPot: 0,
      employeeRate: 0.1, employerRate: 0, annualReturn: 0, annualCharge: 0, inflation: 0,
    });
    expect(r.retirementAge).toBe(71);
    expect(r.yearsToRetirement).toBe(1);
  });
});

describe('savings goal calculator', () => {
  it('finds the exact monthly amount with no growth', () => {
    const r = calculateSavingsGoal({ goal: 12000, years: 1, startingAmount: 0, annualReturn: 0, treatment: 'none', inflation: 0, adjustForInflation: false });
    expect(r.requiredMonthly).toBeCloseTo(1000, 1);
  });

  it('reaches the goal after tax without overshooting by much', () => {
    const r = calculateSavingsGoal({ goal: 50000, years: 10, startingAmount: 5000, annualReturn: 0.06, treatment: 'etf_fund', inflation: 0.02, adjustForInflation: true });
    expect(r.targetFuture).toBeCloseTo(50000 * Math.pow(1.02, 10), 6);
    expect(r.simulation.net).toBeGreaterThanOrEqual(r.targetFuture);
    expect(r.simulation.net - r.targetFuture).toBeLessThan(5);
  });

  it('needs more each month when gains are taxed', () => {
    const base = { goal: 100000, years: 15, startingAmount: 0, annualReturn: 0.07, inflation: 0, adjustForInflation: false };
    const untaxed = calculateSavingsGoal({ ...base, treatment: 'none' });
    const etf = calculateSavingsGoal({ ...base, treatment: 'etf_fund' });
    expect(etf.requiredMonthly).toBeGreaterThan(untaxed.requiredMonthly);
  });

  it('reports when the starting amount is already enough', () => {
    const r = calculateSavingsGoal({ goal: 10000, years: 5, startingAmount: 20000, annualReturn: 0, treatment: 'none', inflation: 0, adjustForInflation: false });
    expect(r.alreadyOnTrack).toBe(true);
    expect(r.requiredMonthly).toBe(0);
  });

  it('works out how many years a fixed saving takes', () => {
    expect(yearsToReachGoal({ goal: 24000, startingAmount: 0, monthlyContribution: 1000, annualReturn: 0, treatment: 'none', inflation: 0, adjustForInflation: false })).toBe(2);
    expect(yearsToReachGoal({ goal: 1e9, startingAmount: 0, monthlyContribution: 10, annualReturn: 0, treatment: 'none', inflation: 0, adjustForInflation: false })).toBeNull();
  });

  it('reports 0 years when the amount already saved covers the goal', () => {
    expect(yearsToReachGoal({ goal: 10000, startingAmount: 12000, monthlyContribution: 0, annualReturn: -0.05, treatment: 'none', inflation: 0.02, adjustForInflation: true })).toBe(0);
  });
});

describe('mortgage vs investing calculator', () => {
  const base = { balance: 300000, mortgageRate: 0.04, remainingYears: 25, investReturn: 0.06, treatment: 'etf_fund' as const };

  it('matches the normal schedule when there is no overpayment', () => {
    const r = compareMortgageVsInvesting({ ...base, extraMonthly: 0 });
    expect(r.monthlyPayment).toBeCloseTo(1583.51, 2);
    expect(r.baselineInterest).toBeCloseTo(1583.51 * 300 - 300000, -1);
    expect(r.interestSaved).toBe(0);
    expect(r.monthsSaved).toBe(0);
    expect(r.overpayWealth).toBe(0);
    expect(r.investWealth).toBe(0);
  });

  it('saves interest and clears the mortgage early when overpaying', () => {
    const r = compareMortgageVsInvesting({ ...base, extraMonthly: 300 });
    expect(r.interestSaved).toBeGreaterThan(20000);
    expect(r.monthsSaved).toBeGreaterThan(36);
    expect(r.overpayInterest).toBeLessThan(r.baselineInterest);
  });

  it('prefers overpaying when investments return nothing', () => {
    const r = compareMortgageVsInvesting({ ...base, extraMonthly: 300, investReturn: 0 });
    expect(r.investAdvantage).toBeLessThan(0);
  });

  it('puts the untaxed break-even return at the mortgage rate', () => {
    const r = compareMortgageVsInvesting({ ...base, extraMonthly: 300, treatment: 'none' });
    const effectiveMortgageRate = Math.pow(1 + 0.04 / 12, 12) - 1;
    expect(r.breakEvenReturn).not.toBeNull();
    expect(r.breakEvenReturn!).toBeCloseTo(effectiveMortgageRate, 3);
  });

  it('needs a higher return to beat the mortgage once ETF tax applies', () => {
    const untaxed = compareMortgageVsInvesting({ ...base, extraMonthly: 300, treatment: 'none' });
    const etf = compareMortgageVsInvesting({ ...base, extraMonthly: 300, treatment: 'etf_fund' });
    expect(etf.breakEvenReturn!).toBeGreaterThan(untaxed.breakEvenReturn!);
  });
});
