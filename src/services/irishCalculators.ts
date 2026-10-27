import {
  IRISH_TAX_RATES,
  InvestmentSimulation,
  TaxRates,
  TaxTreatment,
  TaxablePortfolio,
  clampRate,
  clampYears,
  inTodaysMoney,
  monthlyRateFromAnnual,
  monthlyRepayment,
  nonNegative,
  simulateInvestment,
} from './investmentEngine';
import { DEEMED_DISPOSAL_YEARS, exitTaxRateForYear } from '../config/irishTax';

/* ------------------------------------------------------------------ */
/* ETF tax calculator                                                  */
/* ------------------------------------------------------------------ */

export interface EtfTaxInputs {
  startingAmount: number;
  monthlyContribution: number;
  years: number;
  annualReturn: number;
  rates?: TaxRates;
}

export interface EtfTaxResult {
  etf: InvestmentSimulation;
  shares: InvestmentSimulation;
  noTax: InvestmentSimulation;
  /** How much less you keep with an ETF than with no tax at all. */
  etfTaxDrag: number;
  sharesTaxDrag: number;
  /** Positive when shares (CGT) leave you better off than ETFs. */
  sharesAdvantage: number;
}

export function calculateEtfTax(inputs: EtfTaxInputs): EtfTaxResult {
  const base = {
    startingAmount: inputs.startingAmount,
    monthlyContribution: inputs.monthlyContribution,
    years: inputs.years,
    annualReturn: inputs.annualReturn,
    rates: inputs.rates,
  };
  const etf = simulateInvestment({ ...base, treatment: 'etf_fund' });
  const shares = simulateInvestment({ ...base, treatment: 'individual_shares' });
  const noTax = simulateInvestment({ ...base, treatment: 'none' });
  return {
    etf,
    shares,
    noTax,
    etfTaxDrag: Math.max(0, noTax.net - etf.net),
    sharesTaxDrag: Math.max(0, noTax.net - shares.net),
    sharesAdvantage: shares.net - etf.net,
  };
}

/* ------------------------------------------------------------------ */
/* Pension calculator                                                  */
/* ------------------------------------------------------------------ */

export const PENSION_EARNINGS_CAP = 115000;
export const STANDARD_RATE_BAND_SINGLE = 44000;
export const STANDARD_TAX_RATE = 0.2;
export const HIGHER_TAX_RATE = 0.4;
export const LUMP_SUM_TAX_FREE_LIMIT = 200000;
export const LUMP_SUM_STANDARD_RATE_LIMIT = 500000;
export const DEFAULT_DRAWDOWN_RATE = 0.04;

/** Maximum % of earnings that gets tax relief on personal pension contributions, by age. */
export function ageRelatedReliefLimit(age: number): number {
  if (age < 30) return 0.15;
  if (age < 40) return 0.2;
  if (age < 50) return 0.25;
  if (age < 55) return 0.3;
  if (age < 60) return 0.35;
  return 0.4;
}

/** Standard Fund Threshold for the year you retire (€2m in 2025 rising €200k a year to €2.8m in 2029). */
export function standardFundThreshold(year: number): number {
  if (year <= 2025) return 2000000;
  if (year >= 2029) return 2800000;
  return 2000000 + (year - 2025) * 200000;
}

/** Income tax (PAYE only, before credits) for a single person. Credits cancel out when comparing. */
const incomeTax = (income: number, band: number): number =>
  Math.min(income, band) * STANDARD_TAX_RATE + Math.max(0, income - band) * HIGHER_TAX_RATE;

/** Income tax saved by a pension contribution: the relief comes off the top of your income. */
export function pensionTaxRelief(salary: number, contribution: number, band = STANDARD_RATE_BAND_SINGLE): number {
  const s = nonNegative(salary);
  const c = Math.min(nonNegative(contribution), s);
  return incomeTax(s, band) - incomeTax(s - c, band);
}

/** Tax on the retirement lump sum: first €200k tax-free, next €300k at 20%, the rest at 40%. */
export function lumpSumTax(lumpSum: number): number {
  const l = nonNegative(lumpSum);
  return (
    Math.max(0, Math.min(l, LUMP_SUM_STANDARD_RATE_LIMIT) - LUMP_SUM_TAX_FREE_LIMIT) * STANDARD_TAX_RATE +
    Math.max(0, l - LUMP_SUM_STANDARD_RATE_LIMIT) * HIGHER_TAX_RATE
  );
}

export interface PensionInputs {
  currentAge: number;
  retirementAge: number;
  salary: number;
  salaryGrowth: number;
  currentPot: number;
  /** % of salary you pay in, e.g. 0.1. */
  employeeRate: number;
  /** % of salary your employer pays in. */
  employerRate: number;
  annualReturn: number;
  /** Annual management charge, e.g. 0.01. */
  annualCharge: number;
  inflation: number;
  drawdownRate?: number;
  /** Calendar year the projection starts. */
  startYear?: number;
}

export interface PensionYear {
  age: number;
  salary: number;
  employeeContribution: number;
  employerContribution: number;
  taxRelief: number;
  potValue: number;
}

export interface PensionResult {
  years: PensionYear[];
  /** Retirement age actually used (at least one year after the current age). */
  retirementAge: number;
  yearsToRetirement: number;
  finalPot: number;
  finalPotTodaysMoney: number;
  totalEmployee: number;
  totalEmployer: number;
  totalTaxRelief: number;
  /** What your own contributions actually cost after tax relief. */
  netCostToYou: number;
  lumpSum: number;
  lumpSumTax: number;
  remainingPot: number;
  annualDrawdownIncome: number;
  annualDrawdownIncomeTodaysMoney: number;
  /** True if part of your first-year contribution is above the age-related limit. */
  exceedsReliefLimit: boolean;
  reliefLimitPct: number;
  standardFundThreshold: number;
  exceedsStandardFundThreshold: boolean;
}

export function calculatePension(inputs: PensionInputs): PensionResult {
  const currentAge = Math.min(80, Math.max(16, Math.round(nonNegative(inputs.currentAge)) || 30));
  const retirementAge = Math.min(80, Math.max(currentAge + 1, Math.round(nonNegative(inputs.retirementAge)) || 66));
  const yearsToRetirement = retirementAge - currentAge;
  const employeeRate = clampRate(inputs.employeeRate, 0, 1);
  const employerRate = clampRate(inputs.employerRate, 0, 1);
  const salaryGrowth = clampRate(inputs.salaryGrowth, -0.2, 0.5);
  const netAnnualReturn = (1 + clampRate(inputs.annualReturn, -0.99, 1)) * (1 - clampRate(inputs.annualCharge, 0, 0.1)) - 1;
  const monthlyRate = monthlyRateFromAnnual(netAnnualReturn);
  const inflation = clampRate(inputs.inflation, -0.05, 0.2);
  const startYear = inputs.startYear ?? new Date().getFullYear();

  const pot = new TaxablePortfolio('none');
  pot.deposit(nonNegative(inputs.currentPot), 0);

  let salary = nonNegative(inputs.salary);
  let totalEmployee = 0;
  let totalEmployer = 0;
  let totalTaxRelief = 0;
  let exceedsReliefLimit = false;
  const rows: PensionYear[] = [];

  for (let y = 0; y < yearsToRetirement; y++) {
    const age = currentAge + y;
    const employee = salary * employeeRate;
    const employer = salary * employerRate;
    const relievable = Math.min(employee, ageRelatedReliefLimit(age) * Math.min(salary, PENSION_EARNINGS_CAP));
    if (y === 0 && employee > relievable + 0.5) exceedsReliefLimit = true;
    const relief = pensionTaxRelief(salary, relievable);

    for (let m = 0; m < 12; m++) {
      const month = y * 12 + m;
      pot.deposit((employee + employer) / 12, month);
      pot.step(month, monthlyRate);
    }

    totalEmployee += employee;
    totalEmployer += employer;
    totalTaxRelief += relief;
    rows.push({ age: age + 1, salary, employeeContribution: employee, employerContribution: employer, taxRelief: relief, potValue: pot.gross });
    salary *= 1 + salaryGrowth;
  }

  const finalPot = pot.gross;
  const lumpSum = finalPot * 0.25;
  const lsTax = lumpSumTax(lumpSum);
  const remainingPot = finalPot - lumpSum;
  const drawdownRate = clampRate(inputs.drawdownRate ?? DEFAULT_DRAWDOWN_RATE, 0, 0.2);
  const annualDrawdownIncome = remainingPot * drawdownRate;
  const sft = standardFundThreshold(startYear + yearsToRetirement);

  return {
    years: rows,
    retirementAge,
    yearsToRetirement,
    finalPot,
    finalPotTodaysMoney: inTodaysMoney(finalPot, inflation, yearsToRetirement),
    totalEmployee,
    totalEmployer,
    totalTaxRelief,
    netCostToYou: totalEmployee - totalTaxRelief,
    lumpSum,
    lumpSumTax: lsTax,
    remainingPot,
    annualDrawdownIncome,
    annualDrawdownIncomeTodaysMoney: inTodaysMoney(annualDrawdownIncome, inflation, yearsToRetirement),
    exceedsReliefLimit,
    reliefLimitPct: ageRelatedReliefLimit(currentAge),
    standardFundThreshold: sft,
    exceedsStandardFundThreshold: finalPot > sft,
  };
}

/* ------------------------------------------------------------------ */
/* Savings goal calculator                                             */
/* ------------------------------------------------------------------ */

export interface SavingsGoalInputs {
  /** Goal in today's money. */
  goal: number;
  years: number;
  startingAmount: number;
  annualReturn: number;
  treatment: TaxTreatment;
  inflation: number;
  /** Grow the goal with inflation so it buys the same in the future. */
  adjustForInflation: boolean;
  rates?: TaxRates;
}

export interface SavingsGoalResult {
  /** Goal in money of the target year. */
  targetFuture: number;
  requiredMonthly: number;
  simulation: InvestmentSimulation;
  totalContributed: number;
  growth: number;
  /** True if the starting amount alone already reaches the goal. */
  alreadyOnTrack: boolean;
}

const netAfter = (inputs: SavingsGoalInputs, monthly: number): number =>
  simulateInvestment({
    startingAmount: inputs.startingAmount,
    monthlyContribution: monthly,
    years: inputs.years,
    annualReturn: inputs.annualReturn,
    treatment: inputs.treatment,
    rates: inputs.rates,
  }).net;

export function calculateSavingsGoal(inputs: SavingsGoalInputs): SavingsGoalResult {
  const years = clampYears(inputs.years);
  const goal = nonNegative(inputs.goal);
  const inflation = clampRate(inputs.inflation, -0.05, 0.2);
  const targetFuture = inputs.adjustForInflation ? goal * Math.pow(1 + inflation, years) : goal;
  const normalised = { ...inputs, years };

  let requiredMonthly = 0;
  const alreadyOnTrack = netAfter(normalised, 0) >= targetFuture;
  if (!alreadyOnTrack) {
    let lo = 0;
    let hi = Math.max(1, targetFuture / (years * 12));
    while (netAfter(normalised, hi) < targetFuture && hi < 1e9) hi *= 2;
    for (let i = 0; i < 60 && hi - lo > 0.005; i++) {
      const mid = (lo + hi) / 2;
      if (netAfter(normalised, mid) >= targetFuture) hi = mid;
      else lo = mid;
    }
    requiredMonthly = Math.ceil(hi * 100) / 100;
  }

  const simulation = simulateInvestment({
    startingAmount: inputs.startingAmount,
    monthlyContribution: requiredMonthly,
    years,
    annualReturn: inputs.annualReturn,
    treatment: inputs.treatment,
    rates: inputs.rates,
  });

  return {
    targetFuture,
    requiredMonthly,
    simulation,
    totalContributed: simulation.contributed,
    growth: simulation.net - simulation.contributed,
    alreadyOnTrack,
  };
}

export interface TimeToGoalInputs {
  goal: number;
  startingAmount: number;
  monthlyContribution: number;
  annualReturn: number;
  treatment: TaxTreatment;
  inflation: number;
  adjustForInflation: boolean;
  rates?: TaxRates;
}

/** Whole years until the after-tax value first reaches the goal, or null if not within 60 years. */
export function yearsToReachGoal(inputs: TimeToGoalInputs): number | null {
  const goal = nonNegative(inputs.goal);
  if (goal === 0 || nonNegative(inputs.startingAmount) >= goal) return 0;
  const inflation = clampRate(inputs.inflation, -0.05, 0.2);
  const sim = simulateInvestment({
    startingAmount: inputs.startingAmount,
    monthlyContribution: inputs.monthlyContribution,
    years: 60,
    annualReturn: inputs.annualReturn,
    treatment: inputs.treatment,
    rates: inputs.rates,
  });
  for (const row of sim.years) {
    const target = inputs.adjustForInflation ? goal * Math.pow(1 + inflation, row.year) : goal;
    if (row.netIfSold >= target) return row.year;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Mortgage overpayment vs investing                                   */
/* ------------------------------------------------------------------ */

export interface MortgageVsInvestInputs {
  balance: number;
  mortgageRate: number;
  remainingYears: number;
  extraMonthly: number;
  investReturn: number;
  treatment: TaxTreatment;
  rates?: TaxRates;
}

export interface MortgageVsInvestPathYear {
  year: number;
  overpayBalance: number;
  overpayInvestments: number;
  investBalance: number;
  investInvestments: number;
}

export interface MortgageVsInvestResult {
  monthlyPayment: number;
  termMonths: number;
  /** Interest paid on the normal schedule. */
  baselineInterest: number;
  overpayInterest: number;
  interestSaved: number;
  overpayPayoffMonth: number;
  monthsSaved: number;
  /** After-tax value of investments at the original term end if you overpay first, then invest the freed-up payment. */
  overpayWealth: number;
  /** After-tax value of investments at the original term end if you invest the extra from day one. */
  investWealth: number;
  /** Positive when investing beats overpaying. */
  investAdvantage: number;
  /** Investment return at which both choices end equal; null if none below 30%. */
  breakEvenReturn: number | null;
  years: MortgageVsInvestPathYear[];
}

interface PathOutcome {
  wealth: number;
  interest: number;
  payoffMonth: number;
  years: { balance: number; investments: number }[];
}

function runPath(
  balance: number,
  mortgageMonthlyRate: number,
  payment: number,
  termMonths: number,
  overpay: number,
  investFromStart: number,
  investReturn: number,
  treatment: TaxTreatment,
  rates?: TaxRates,
): PathOutcome {
  const invRate = monthlyRateFromAnnual(investReturn);
  const pot = new TaxablePortfolio(treatment, rates);
  let owed = balance;
  let interest = 0;
  let payoffMonth = termMonths;
  const years: PathOutcome['years'] = [];

  for (let month = 0; month < termMonths; month++) {
    let investable = investFromStart;
    if (owed > 0.005) {
      const monthInterest = owed * mortgageMonthlyRate;
      interest += monthInterest;
      const due = owed + monthInterest;
      const paid = Math.min(due, payment + overpay);
      owed = due - paid;
      // Whatever wasn't needed this month (final payment) is invested.
      investable += payment + overpay - paid;
      if (owed <= 0.005) {
        owed = 0;
        payoffMonth = month + 1;
      }
    } else {
      investable += payment + overpay;
    }
    pot.deposit(investable, month);
    pot.step(month, invRate);
    if ((month + 1) % 12 === 0) years.push({ balance: owed, investments: pot.netValue() });
  }

  return { wealth: pot.netValue(), interest, payoffMonth, years };
}

export function compareMortgageVsInvesting(inputs: MortgageVsInvestInputs): MortgageVsInvestResult {
  const balance = nonNegative(inputs.balance);
  const mortgageRate = clampRate(inputs.mortgageRate, 0, 0.3);
  const termMonths = clampYears(inputs.remainingYears) * 12;
  const extra = nonNegative(inputs.extraMonthly);
  const payment = monthlyRepayment(balance, mortgageRate, termMonths);
  const i = mortgageRate / 12;

  const run = (overpay: number, investExtra: number, ret: number) =>
    runPath(balance, i, payment, termMonths, overpay, investExtra, ret, inputs.treatment, inputs.rates);

  const baseline = run(0, 0, 0);
  const overpay = run(extra, 0, inputs.investReturn);
  const invest = run(0, extra, inputs.investReturn);

  const diff = (r: number) => run(0, extra, r).wealth - run(extra, 0, r).wealth;
  let breakEvenReturn: number | null = null;
  if (extra > 0 && balance > 0) {
    let lo = 0;
    let hi = 0.3;
    if (diff(lo) >= 0) breakEvenReturn = 0;
    else if (diff(hi) >= 0) {
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (diff(mid) >= 0) hi = mid;
        else lo = mid;
      }
      breakEvenReturn = hi;
    }
  }

  return {
    monthlyPayment: payment,
    termMonths,
    baselineInterest: baseline.interest,
    overpayInterest: overpay.interest,
    interestSaved: Math.max(0, baseline.interest - overpay.interest),
    overpayPayoffMonth: overpay.payoffMonth,
    monthsSaved: Math.max(0, termMonths - overpay.payoffMonth),
    overpayWealth: overpay.wealth,
    investWealth: invest.wealth,
    investAdvantage: invest.wealth - overpay.wealth,
    breakEvenReturn,
    years: overpay.years.map((row, idx) => ({
      year: idx + 1,
      overpayBalance: row.balance,
      overpayInvestments: row.investments,
      investBalance: invest.years[idx]?.balance ?? 0,
      investInvestments: invest.years[idx]?.investments ?? 0,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Exit tax on selling an ETF / fund holding                            */
/* ------------------------------------------------------------------ */

export interface ExitTaxInputs {
  /** What you originally paid for the units, including purchase costs. */
  purchaseCost: number;
  /** What you sell them for. */
  saleValue: number;
  /** Calendar year of the sale; sets the exit tax rate. */
  saleYear: number;
  /** Exit tax already paid on these units at earlier deemed disposals. */
  deemedDisposalTaxPaid: number;
}

export interface ExitTaxResult {
  gain: number;
  rate: number;
  /** Exit tax on the whole gain since purchase, before any credit. */
  taxOnGain: number;
  /** Deemed disposal tax credited against taxOnGain. */
  credit: number;
  /** Tax to pay on this sale. */
  taxDue: number;
  /** Deemed disposal tax that can be reclaimed because it exceeds the tax on the actual gain. */
  refund: number;
  /** Sale value less tax due (any refund is paid separately). */
  netProceeds: number;
}

/**
 * Exit tax on an actual disposal. The gain is measured from the original cost, taxed at the rate for
 * the year of sale, and any tax paid at earlier deemed disposals is credited. If that credit is more
 * than the tax on the final gain (for example because the value fell), the excess is refundable.
 */
export function calculateExitTax(inputs: ExitTaxInputs): ExitTaxResult {
  const cost = nonNegative(inputs.purchaseCost);
  const sale = nonNegative(inputs.saleValue);
  const paid = nonNegative(inputs.deemedDisposalTaxPaid);
  const year = Number.isFinite(inputs.saleYear) ? Math.round(inputs.saleYear) : new Date().getFullYear();
  const rate = exitTaxRateForYear(year);
  const gain = sale - cost;
  const taxOnGain = Math.max(0, gain) * rate;
  const credit = Math.min(paid, taxOnGain);
  const taxDue = taxOnGain - credit;
  const refund = paid - credit;
  return { gain, rate, taxOnGain, credit, taxDue, refund, netProceeds: sale - taxDue };
}

/* ------------------------------------------------------------------ */
/* Deemed disposal schedule                                             */
/* ------------------------------------------------------------------ */

export interface DeemedDisposalLot {
  purchaseYear: number;
  amount: number;
}

export interface DeemedDisposalScheduleInputs {
  lots: DeemedDisposalLot[];
  annualReturn: number;
  /** Last calendar year to include. */
  untilYear: number;
}

export interface DeemedDisposalEventRow {
  /** 0-based index of the lot in the input list. */
  lot: number;
  purchaseYear: number;
  year: number;
  value: number;
  gain: number;
  rate: number;
  tax: number;
}

export interface DeemedDisposalScheduleResult {
  events: DeemedDisposalEventRow[];
  totalTax: number;
  byYear: { year: number; tax: number }[];
}

export const MAX_DEEMED_DISPOSAL_LOTS = 20;
const MIN_PURCHASE_YEAR = 1990;
const MAX_SCHEDULE_YEAR = 2100;

/**
 * Every 8 years after each purchase, the units are treated as sold and bought back at market value.
 * Exit tax for that year is charged on the gain since the purchase (or the previous deemed disposal),
 * and the cost is re-based to the market value. Assumes the tax is paid from other money, so the
 * holding keeps compounding untouched.
 */
export function deemedDisposalSchedule(inputs: DeemedDisposalScheduleInputs): DeemedDisposalScheduleResult {
  const growth = 1 + clampRate(inputs.annualReturn, -0.99, 10);
  const until = Math.min(MAX_SCHEDULE_YEAR, Math.round(Number.isFinite(inputs.untilYear) ? inputs.untilYear : MAX_SCHEDULE_YEAR));
  const events: DeemedDisposalEventRow[] = [];

  inputs.lots.slice(0, MAX_DEEMED_DISPOSAL_LOTS).forEach((lot, index) => {
    const amount = nonNegative(lot.amount);
    const purchaseYear = Math.round(lot.purchaseYear);
    if (amount === 0 || !Number.isFinite(purchaseYear) || purchaseYear < MIN_PURCHASE_YEAR) return;
    let value = amount;
    let cost = amount;
    for (let year = purchaseYear + DEEMED_DISPOSAL_YEARS; year <= until; year += DEEMED_DISPOSAL_YEARS) {
      value *= Math.pow(growth, DEEMED_DISPOSAL_YEARS);
      const gain = Math.max(0, value - cost);
      const rate = exitTaxRateForYear(year);
      events.push({ lot: index, purchaseYear, year, value, gain, rate, tax: gain * rate });
      cost = value;
    }
  });

  events.sort((a, b) => a.year - b.year || a.lot - b.lot);
  const totals = new Map<number, number>();
  for (const e of events) totals.set(e.year, (totals.get(e.year) ?? 0) + e.tax);
  return {
    events,
    totalTax: events.reduce((sum, e) => sum + e.tax, 0),
    byYear: [...totals].map(([year, tax]) => ({ year, tax })),
  };
}

export { IRISH_TAX_RATES };
