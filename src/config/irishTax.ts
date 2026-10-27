/**
 * Single source of truth for the Irish tax rates used across the site.
 *
 * Source: Budget 2027 and Finance (No. 2) Bill 2026 (published October 2026, subject to enactment).
 * - CGT cut from 33% to 31% for disposals from Budget 2027 day (October 2026).
 * - Exit tax on Irish/EU funds and ETFs: 41% until 2025, 38% in 2026, 35% from 1 January 2027.
 * - The 8-year deemed disposal rule is retained (pending a wider review).
 * - DIRT is unchanged at 33%.
 * - Investment Account (Individual Investment Account): from 1 July 2027, €12,000 a year,
 *   no tax up to €50,000, 1% a year on value above €50,000, no CGT, deemed disposal or DWT inside it.
 */

export const TAX_RULES_LAST_REVIEWED = '2026-10-27';
export const TAX_RULES_SOURCE = 'Budget 2027 and Finance (No. 2) Bill 2026';

export const CGT_RATE = 0.31;
export const CGT_RATE_BEFORE_BUDGET_2027 = 0.33;
export const CGT_ANNUAL_EXEMPTION = 1270;
export const DIRT_RATE = 0.33;
export const DEEMED_DISPOSAL_YEARS = 8;

/** Exit tax rate from 1 January 2027. */
export const EXIT_TAX_RATE = 0.35;
export const EXIT_TAX_RATE_2026 = 0.38;

/** Exit tax rate for chargeable events (sales or deemed disposals) in a given calendar year. */
export const exitTaxRateForYear = (year: number): number => {
  if (year <= 2025) return 0.41;
  if (year === 2026) return EXIT_TAX_RATE_2026;
  return EXIT_TAX_RATE;
};

export const INVESTMENT_ACCOUNT = {
  launchDate: '2027-07-01',
  annualContributionLimit: 12000,
  taxFreeThreshold: 50000,
  annualTaxAboveThreshold: 0.01,
} as const;

/** Formats a rate such as 0.35 as "35%". */
export const pct = (rate: number): string => `${Math.round(rate * 1000) / 10}%`;
