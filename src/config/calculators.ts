import { SITE_FACTS, type PageSeo } from './site';
import {
  CGT_ANNUAL_EXEMPTION,
  CGT_RATE,
  DEEMED_DISPOSAL_YEARS,
  DIRT_RATE,
  EXIT_TAX_RATE,
  EXIT_TAX_RATE_2026,
  INVESTMENT_ACCOUNT,
  TAX_RULES_LAST_REVIEWED,
  TAX_RULES_SOURCE,
  pct,
} from './irishTax';

/** Every content page served by the single-page app outside the dashboard (calculators, guides, about). */
export type CalculatorView =
  | 'calculators'
  | 'investment-calculator'
  | 'investment-account-calculator'
  | 'etf-tax-calculator'
  | 'exit-tax-calculator'
  | 'deemed-disposal-calculator'
  | 'pension-calculator'
  | 'savings-goal-calculator'
  | 'mortgage-vs-investing-calculator'
  | 'best-investment-options-ireland'
  | 'etf-tax-ireland-beginners'
  | 'exit-tax-vs-investment-account'
  | 'about';

export type PageKind = 'hub' | 'tool' | 'guide' | 'about';

export interface CalculatorFaq {
  q: string;
  a: string;
}

export interface ContentTable {
  caption: string;
  headers: string[];
  rows: string[][];
}

/** Plain-text content block, rendered both by React and in the static no-JavaScript HTML. */
export interface ContentSection {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: ContentTable;
  /** Related pages linked after the section. */
  links?: CalculatorView[];
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface CalculatorPage extends PageSeo {
  view: CalculatorView;
  kind: PageKind;
  /** Short name used in navigation and breadcrumbs. */
  name: string;
  h1: string;
  intro: string;
  /** Plain-text bullet points used in the no-JavaScript fallback and the hub page. */
  highlights: string[];
  faqs: CalculatorFaq[];
  /** ISO date the content was last reviewed. */
  updated: string;
  sections?: ContentSection[];
  sources?: SourceLink[];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-10-27" -> "27 October 2026" (no locale or time-zone dependence). */
export const formatIsoDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const euro = (n: number) => `€${Math.round(n).toLocaleString('en-IE')}`;

export const CONTENT_LAST_UPDATED = TAX_RULES_LAST_REVIEWED;

const EXIT = pct(EXIT_TAX_RATE);
const EXIT_2026 = pct(EXIT_TAX_RATE_2026);
const CGT = pct(CGT_RATE);
const DIRT = pct(DIRT_RATE);
const CGT_EXEMPTION = euro(CGT_ANNUAL_EXEMPTION);
const IA_LIMIT = euro(INVESTMENT_ACCOUNT.annualContributionLimit);
const IA_FREE = euro(INVESTMENT_ACCOUNT.taxFreeThreshold);
const IA_CHARGE = pct(INVESTMENT_ACCOUNT.annualTaxAboveThreshold);
const IA_LAUNCH = formatIsoDate(INVESTMENT_ACCOUNT.launchDate);

const TAX_YEAR_NOTE = `Rates used: exit tax ${EXIT} on sales and deemed disposals from 1 January 2027 (${EXIT_2026} in 2026), CGT ${CGT} with a ${CGT_EXEMPTION} annual exemption, DIRT ${DIRT} and ${DEEMED_DISPOSAL_YEARS}-year deemed disposal, based on ${TAX_RULES_SOURCE} (subject to enactment). Last reviewed ${formatIsoDate(TAX_RULES_LAST_REVIEWED)}. Check Revenue.ie for the latest rules.`;

/* Official sources (checked October 2026). */
const SOURCE_FUNDS: SourceLink = {
  label: 'Revenue Tax and Duty Manual, Part 27: investment funds and offshore funds (exit tax and deemed disposal)',
  url: 'https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/index.aspx',
};
const SOURCE_CGT: SourceLink = {
  label: 'Revenue: How to calculate Capital Gains Tax',
  url: 'https://www.revenue.ie/en/gains-gifts-and-inheritance/transfering-an-asset/how-to-calculate-cgt.aspx',
};
const SOURCE_DIRT: SourceLink = {
  label: 'Revenue: What DIRT rate is applicable?',
  url: 'https://www.revenue.ie/en/additional-incomes/dirt/what-dirt-rate-is-applicable.aspx',
};
const SOURCE_PENSION: SourceLink = {
  label: 'Revenue: Tax relief on pension contributions',
  url: 'https://www.revenue.ie/en/jobs-and-pensions/pensions/tax-relief-for-pension-contributions.aspx',
};
const SOURCE_DOF: SourceLink = {
  label: 'Department of Finance: Budget 2027 and the Finance (No. 2) Bill 2026',
  url: 'https://www.gov.ie/en/organisation/department-of-finance/',
};
const SOURCE_STATE_SAVINGS: SourceLink = { label: 'State Savings: Prize Bonds and State savings products', url: 'https://www.statesavings.ie/' };
const SOURCE_CENTRAL_BANK: SourceLink = { label: 'Central Bank of Ireland: Consumer Hub', url: 'https://www.centralbank.ie/consumer-hub' };
const SOURCE_CCPC: SourceLink = { label: 'Competition and Consumer Protection Commission: money guides', url: 'https://www.ccpc.ie/consumers/money/' };

/* ------------------------------------------------------------------ */
/* Calculators                                                         */
/* ------------------------------------------------------------------ */

export const INVESTMENT_CALCULATOR: CalculatorPage = {
  view: 'investment-calculator',
  kind: 'tool',
  path: '/investment-calculator',
  name: 'Investment Calculator',
  title: 'Investment Calculator Ireland – Lump Sum & Monthly Investing After Tax | InvestIreland AI',
  description: `Free Irish investment calculator: project a lump sum and monthly investing after ${EXIT} exit tax and 8-year deemed disposal, and compare with the new Investment Account.`,
  h1: 'Investment Calculator Ireland',
  intro: `See how much a lump sum and regular monthly investing could grow to in Ireland after tax. Compare today's ETF exit tax and deemed disposal rules with the new Investment Account from ${IA_LAUNCH} (${IA_LIMIT} a year, 0% on the first ${IA_FREE}, ${IA_CHARGE} a year above that).`,
  highlights: [
    'Monthly contributions with monthly compounding',
    'Deemed disposal applied 8 years after each purchase, not just every 8 calendar years',
    `Investment Account allowance of ${IA_LIMIT} per year shared by your lump sum and contributions`,
    'Option to show results in today’s money (2% inflation)',
  ],
  faqs: [
    {
      q: 'How is exit tax calculated on ETFs in Ireland?',
      a: `Gains on Irish and EU-domiciled ETFs and funds are taxed under exit tax when you sell, and every 8 years after each purchase under deemed disposal. The rate is ${EXIT_2026} in 2026 and ${EXIT} from 1 January 2027 (Budget 2027). Tax already paid at a deemed disposal is credited when you finally sell.`,
    },
    {
      q: 'What is the Investment Account?',
      a: `Budget 2027 announced a new Investment Account from ${IA_LAUNCH}: up to ${IA_LIMIT} a year, no tax on the first ${IA_FREE} of value and a ${IA_CHARGE} yearly charge on the value above ${IA_FREE}, with no CGT or deemed disposal inside it. It is in the Finance (No. 2) Bill 2026, so details may change before it becomes law.`,
    },
    {
      q: 'Does this calculator include fees?',
      a: 'No. Enter a return that is already net of fund and platform fees, for example 6% instead of 6.2% for a fund with a 0.2% charge.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_FUNDS, SOURCE_CGT, SOURCE_DOF],
};

export const INVESTMENT_ACCOUNT_CALCULATOR: CalculatorPage = {
  view: 'investment-account-calculator',
  kind: 'tool',
  path: '/investment-account-calculator',
  name: 'Investment Account Calculator',
  title: 'Ireland Investment Account Calculator – €50k Tax-Free, 1% Above | InvestIreland AI',
  description: `Free Ireland Investment Account calculator: see how ${IA_LIMIT} a year could grow with no tax up to ${IA_FREE}, what the ${IA_CHARGE} yearly charge costs, and how it compares with ${EXIT} exit tax.`,
  h1: 'Ireland Investment Account Calculator',
  intro: `Ireland's new Investment Account opens on ${IA_LAUNCH}. Use this Investment Account calculator to see how a lump sum and monthly investing could grow inside the account, when you would pass the ${IA_FREE} tax-free threshold, what the ${IA_CHARGE} yearly charge above it costs, and how much more you could keep than in an ETF taxed at ${EXIT} exit tax.`,
  highlights: [
    `${IA_LIMIT} yearly limit shared by your lump sum and monthly amounts; anything above it is invested outside the account`,
    `No tax up to ${IA_FREE} and a ${IA_CHARGE} yearly charge on the value above it`,
    'No deemed disposal, CGT or exit tax inside the account',
    `The year you pass ${IA_FREE} and the total ${IA_CHARGE} charges paid`,
  ],
  sections: [
    {
      id: 'how-it-works',
      heading: 'How the Investment Account works',
      paragraphs: [
        `Budget 2027 announced a simpler way to invest in Ireland. From ${IA_LAUNCH}, you can put up to ${IA_LIMIT} a year into an Investment Account with an authorised provider. While the account is worth ${IA_FREE} or less, there is no tax on its growth. Above ${IA_FREE}, a ${IA_CHARGE} charge applies each year to the value above the threshold, collected by the provider. There is no Capital Gains Tax, exit tax or deemed disposal inside the account.`,
        `Outside the account, ETFs and funds are taxed at ${EXIT} exit tax on gains (${EXIT_2026} in 2026), with deemed disposal every ${DEEMED_DISPOSAL_YEARS} years. That is the comparison this calculator shows.`,
      ],
      links: ['exit-tax-vs-investment-account', 'etf-tax-calculator', 'best-investment-options-ireland'],
    },
    {
      id: 'worth-it',
      heading: 'Is the Investment Account worth it?',
      paragraphs: [
        `For most long-term investors, yes, on these rules. Below ${IA_FREE} the account is tax-free. Above it, a ${IA_CHARGE} yearly charge on the excess usually costs less than ${EXIT} of the growth, unless returns are very low (roughly below ${pct(INVESTMENT_ACCOUNT.annualTaxAboveThreshold / EXIT_TAX_RATE)} a year). The final rules on withdrawals, providers and what you can hold are still to be confirmed.`,
      ],
    },
  ],
  faqs: [
    {
      q: 'When does the Investment Account start?',
      a: `Budget 2027 says it opens on ${IA_LAUNCH}, through authorised providers such as banks, stockbrokers and investment platforms. It is in the Finance (No. 2) Bill 2026, so the details could change before it becomes law.`,
    },
    {
      q: 'How is the Investment Account taxed?',
      a: `There is no tax on the first ${IA_FREE} of value. Above that, a ${IA_CHARGE} charge applies each year to the value above ${IA_FREE}, collected by the provider. There is no CGT, exit tax, deemed disposal or dividend withholding tax inside the account.`,
    },
    {
      q: 'How much can I put into the Investment Account?',
      a: `Up to ${IA_LIMIT} a year. In this calculator your lump sum counts towards the first year's ${IA_LIMIT}, and anything above the limit is invested in a normal ETF taxed under the exit tax rules.`,
    },
    {
      q: `Is the ${IA_FREE} threshold based on what I put in or what the account is worth?`,
      a: `This calculator applies it to the account value, as announced in Budget 2027. Check the final legislation, as this could change.`,
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_DOF, SOURCE_FUNDS],
};

export const ETF_TAX_CALCULATOR: CalculatorPage = {
  view: 'etf-tax-calculator',
  kind: 'tool',
  path: '/etf-tax-calculator',
  name: 'ETF Tax Calculator',
  title: `ETF Tax Calculator Ireland – ${EXIT} Exit Tax & Deemed Disposal | InvestIreland AI`,
  description: `Calculate Irish ETF exit tax (${EXIT} from 2027) and 8-year deemed disposal on regular investing, and compare with ${CGT} CGT on individual shares. Free, no sign-up.`,
  h1: 'ETF Tax Calculator Ireland',
  intro:
    'Work out how much exit tax and deemed disposal will cost on Irish/EU ETFs you invest in over time, and how that compares with buying individual shares that are taxed under Capital Gains Tax.',
  highlights: [
    `${EXIT} exit tax on gains when you sell (${EXIT_2026} in 2026)`,
    'Deemed disposal every 8 years for each purchase, with credit for tax already paid',
    `Side-by-side comparison with ${CGT} CGT and the ${CGT_EXEMPTION} annual exemption`,
    'Year-by-year table showing when deemed disposal tax falls due',
  ],
  faqs: [
    {
      q: 'What is deemed disposal?',
      a: 'Every 8 years after you buy units in an Irish or EU-domiciled ETF or fund, Revenue treats you as having sold and bought them back. You pay exit tax on the gain so far, even though you have not sold. The tax paid is credited against the tax due when you actually sell.',
    },
    {
      q: `Can I use losses or the ${CGT_EXEMPTION} exemption against ETF gains?`,
      a: `No. Gains on ETFs taxed under the exit tax regime cannot use the ${CGT_EXEMPTION} CGT annual exemption, and losses on them cannot be offset against other gains.`,
    },
    {
      q: 'Are US-domiciled ETFs taxed the same way?',
      a: 'Not always. Revenue treats many non-EU ETFs like EU funds (exit tax), while others may fall under income tax or CGT depending on how they are structured. EU rules (PRIIPs) also stop most Irish retail investors buying US-domiciled ETFs. Take professional advice for your situation.',
    },
    {
      q: 'Do I file deemed disposal myself?',
      a: 'If your broker is not Irish, generally yes: you report and pay it through your income tax return for the year in which the 8-year anniversary falls.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_FUNDS, SOURCE_CGT],
};

const exampleGain = 6000;
const exampleTax = exampleGain * EXIT_TAX_RATE;

export const EXIT_TAX_CALCULATOR: CalculatorPage = {
  view: 'exit-tax-calculator',
  kind: 'tool',
  path: '/exit-tax-calculator',
  name: 'Exit Tax Calculator',
  title: 'Exit Tax Calculator Ireland – Tax on Selling ETFs & Funds | InvestIreland AI',
  description: `Free exit tax calculator for Ireland: work out the tax due when you sell an ETF or fund (${EXIT} from 2027, ${EXIT_2026} in 2026), with credit for deemed disposal tax already paid.`,
  h1: 'Exit Tax Calculator Ireland',
  intro: `Selling an Irish or EU ETF or investment fund? This exit tax calculator works out the tax due on your gain at ${EXIT} for sales from 1 January 2027 (${EXIT_2026} in 2026), and credits any tax you already paid at a deemed disposal.`,
  highlights: [
    'Exit tax rate set by the year you sell',
    'Credit for deemed disposal tax already paid, with any excess shown as a refund',
    'Money you keep after tax',
    'Losses: no tax, but they cannot be used against other gains',
  ],
  sections: [
    {
      id: 'what-is-exit-tax',
      heading: 'What is exit tax?',
      paragraphs: [
        `Exit tax is the tax Ireland charges on gains from Irish and EU-domiciled investment funds, including most ETFs Irish investors can buy. It is charged instead of Capital Gains Tax. The rate is ${EXIT_2026} in 2026 and ${EXIT} from 1 January 2027 under Budget 2027. Individual shares are taxed under CGT at ${CGT} instead.`,
        `Unlike CGT, you cannot use the ${CGT_EXEMPTION} annual exemption against exit tax, and losses on funds cannot be offset against other gains.`,
      ],
      links: ['etf-tax-ireland-beginners', 'deemed-disposal-calculator'],
    },
    {
      id: 'how-to-calculate',
      heading: 'How to calculate exit tax',
      bullets: [
        'Gain = sale value minus what you paid (including purchase costs).',
        `Exit tax = gain × the rate for the year you sell (${EXIT} from 2027).`,
        'Subtract any exit tax you already paid on the same units at a deemed disposal.',
        'If that credit is more than the tax on the final gain, you can claim the difference back from Revenue.',
      ],
    },
    {
      id: 'example',
      heading: 'Worked example',
      paragraphs: [
        `You bought ETF units for €10,000 and sell them in 2028 for €16,000. The gain is ${euro(exampleGain)}, so exit tax at ${EXIT} is ${euro(exampleTax)} and you keep ${euro(16000 - exampleTax)}. If you had already paid €700 at a deemed disposal, you would pay the remaining ${euro(exampleTax - 700)}.`,
      ],
      links: ['exit-tax-vs-investment-account'],
    },
  ],
  faqs: [
    {
      q: 'Is exit tax 35% or 38%?',
      a: `${EXIT_2026} applies to sales and deemed disposals in 2026. Budget 2027 cuts it to ${EXIT} from 1 January 2027. Before 2026 the rate was 41%.`,
    },
    {
      q: 'How do I pay exit tax?',
      a: 'If your broker or fund is Irish, it usually deducts exit tax for you. With a non-Irish broker, you generally report and pay it yourself through your income tax return for the year you sell. Check Revenue for the filing deadline.',
    },
    {
      q: 'Can I use losses against exit tax?',
      a: 'No. A loss on a fund means no exit tax on that sale, but the loss cannot be used against gains on other funds or shares.',
    },
    {
      q: 'Why can I get a refund after a deemed disposal?',
      a: 'If your units fall in value after a deemed disposal, the tax you paid then can be more than the tax on your real gain when you sell. The difference can be reclaimed from Revenue.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_FUNDS, SOURCE_DOF],
};

export const DEEMED_DISPOSAL_CALCULATOR: CalculatorPage = {
  view: 'deemed-disposal-calculator',
  kind: 'tool',
  path: '/deemed-disposal-calculator',
  name: 'Deemed Disposal Calculator',
  title: 'Deemed Disposal Calculator Ireland – 8-Year ETF Tax Dates | InvestIreland AI',
  description: `Free deemed disposal calculator: enter when you bought each ETF or fund and see every 8-year deemed disposal date and the estimated exit tax due (${EXIT} from 2027).`,
  h1: 'Deemed Disposal Calculator Ireland',
  intro:
    'Every 8 years after you buy units in an Irish or EU ETF or fund, you pay exit tax as if you had sold them. This deemed disposal calculator lists the date for each purchase, an estimate of the tax due and which years will be busiest.',
  highlights: [
    'Up to 20 separate purchases, each with its own 8-year clock',
    `Estimated tax at the exit tax rate for each year (${EXIT_2026} in 2026, ${EXIT} from 2027)`,
    'Year-by-year totals so you can set money aside for tax bills',
    'Cost re-based to market value after each deemed disposal',
  ],
  sections: [
    {
      id: 'what-is-deemed-disposal',
      heading: 'What is deemed disposal?',
      paragraphs: [
        `Deemed disposal is an Irish rule for funds and ETFs. On the 8th anniversary of each purchase (and every 8 years after), you are treated as selling and buying back the units. You pay exit tax on the gain since you bought them, or since the last deemed disposal, even though you have not sold anything. Budget 2027 kept the rule, although the Investment Account from ${IA_LAUNCH} has no deemed disposal.`,
        'The tax is not lost: it is credited against the tax due when you finally sell, and refunded if it turns out to be more than the tax on your real gain.',
      ],
      links: ['exit-tax-calculator', 'investment-account-calculator'],
    },
    {
      id: 'planning',
      heading: 'How to plan for deemed disposal',
      bullets: [
        'Keep a record of the date and cost of every purchase. Each one has its own 8-year clock.',
        'Set aside cash for the years with large deemed disposal bills, so you do not have to sell at a bad time.',
        'If you invest monthly, deemed disposals will also fall monthly, 8 years later.',
        `From ${IA_LAUNCH}, new money in the Investment Account (up to ${IA_LIMIT} a year) is not subject to deemed disposal.`,
      ],
      links: ['etf-tax-ireland-beginners'],
    },
  ],
  faqs: [
    {
      q: 'Is deemed disposal being abolished?',
      a: `Not yet. Budget 2027 kept the 8-year rule while fund taxation is reviewed. The new Investment Account from ${IA_LAUNCH} has no deemed disposal.`,
    },
    {
      q: 'Do I have to sell units to pay deemed disposal tax?',
      a: 'No. You can pay it from other money. This calculator assumes you do, so your investment keeps growing untouched.',
    },
    {
      q: 'What if my ETF has fallen in value at the 8-year date?',
      a: 'There is no tax if there is no gain. The units are treated as bought back at their current value, which becomes the starting point for the next deemed disposal.',
    },
    {
      q: 'Which rate applies to a deemed disposal?',
      a: `The exit tax rate for the year the deemed disposal happens: ${EXIT_2026} in 2026 and ${EXIT} from 2027.`,
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_FUNDS, SOURCE_DOF],
};

export const PENSION_CALCULATOR: CalculatorPage = {
  view: 'pension-calculator',
  kind: 'tool',
  path: '/pension-calculator',
  name: 'Pension Calculator',
  title: 'Pension Calculator Ireland – Tax Relief, Pot & Retirement Income | InvestIreland AI',
  description:
    'Free Irish pension calculator: estimate your pension pot, income tax relief at 20%/40%, employer contributions, tax-free lump sum and retirement income.',
  h1: 'Pension Calculator Ireland',
  intro:
    'Estimate what your pension could be worth at retirement, how much income tax relief you get, and what your tax-free lump sum and yearly income might be.',
  highlights: [
    'Age-related tax relief limits (15% to 40% of earnings, earnings cap €115,000)',
    'Tax relief at your marginal rate of 20% or 40%',
    'Employer contributions, salary growth and fund charges',
    '25% retirement lump sum: first €200,000 tax-free, next €300,000 at 20%',
    'Standard Fund Threshold check (€2m in 2025 rising to €2.8m by 2029)',
  ],
  faqs: [
    {
      q: 'How much tax relief do I get on pension contributions in Ireland?',
      a: 'You get income tax relief at your highest rate (20% or 40%) on personal contributions up to an age-related limit: 15% of earnings under 30, 20% at 30–39, 25% at 40–49, 30% at 50–54, 35% at 55–59 and 40% from 60, on earnings up to €115,000.',
    },
    {
      q: 'How much of my pension can I take tax-free?',
      a: 'Usually up to 25% of your pension pot as a lump sum. The first €200,000 is tax-free over your lifetime, the next €300,000 is taxed at 20%, and anything above €500,000 is taxed as income.',
    },
    {
      q: 'Are employer contributions taxed?',
      a: 'Employer contributions to a pension are not a benefit-in-kind for you, so they are effectively free money. This calculator adds them to your pot without tax.',
    },
    {
      q: 'Does this include the State Pension?',
      a: 'No. The State Pension (Contributory) is paid on top of your private pension if you qualify. Check gov.ie for the current weekly rate.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_PENSION],
};

export const SAVINGS_GOAL_CALCULATOR: CalculatorPage = {
  view: 'savings-goal-calculator',
  kind: 'tool',
  path: '/savings-goal-calculator',
  name: 'Savings Goal Calculator',
  title: 'Savings Goal Calculator Ireland – How Much to Save Each Month | InvestIreland AI',
  description:
    'Find out how much you need to save or invest each month in Ireland to reach a goal, after DIRT, exit tax or CGT and inflation. Free savings calculator.',
  h1: 'Savings Goal Calculator Ireland',
  intro:
    'Set a goal like a house deposit, wedding or emergency fund, and see how much you need to put away each month. The calculator includes Irish tax on interest and investment growth, and inflation.',
  highlights: [
    'Required monthly saving to hit your goal by a date',
    'Or: how long it will take at your current monthly saving',
    `Choose deposit account (${DIRT} DIRT), ETF (${EXIT} exit tax) or shares (${CGT} CGT)`,
    'Inflation-adjusted goal so your target keeps its buying power',
  ],
  faqs: [
    {
      q: 'How much tax do I pay on savings interest in Ireland?',
      a: `Deposit interest is subject to DIRT at ${DIRT}, which your bank normally deducts automatically. This calculator takes DIRT off the interest every month.`,
    },
    {
      q: 'Should I save or invest for a goal?',
      a: 'For goals less than about 3–5 years away, a deposit account is usually safer because investments can fall in value. For longer goals, investing has historically grown more, but returns are not guaranteed.',
    },
    {
      q: 'Why adjust my goal for inflation?',
      a: 'Prices rise over time, so €30,000 in 5 years will buy less than €30,000 today. Adjusting for inflation tells you how much you need in future euros to buy the same thing.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_DIRT, SOURCE_FUNDS, SOURCE_CGT],
};

export const MORTGAGE_VS_INVESTING_CALCULATOR: CalculatorPage = {
  view: 'mortgage-vs-investing-calculator',
  kind: 'tool',
  path: '/mortgage-vs-investing-calculator',
  name: 'Mortgage vs Investing Calculator',
  title: 'Mortgage Overpayment vs Investing Calculator Ireland | InvestIreland AI',
  description:
    'Should you overpay your mortgage or invest? Compare interest saved with investment growth after Irish exit tax or CGT, and find your break-even return.',
  h1: 'Mortgage Overpayment vs Investing Calculator Ireland',
  intro:
    'Compare putting extra money into your mortgage with investing it instead. Once the mortgage is paid off early, the calculator invests the full repayment for the rest of the original term so both options are compared fairly.',
  highlights: [
    'Interest saved and years knocked off your mortgage',
    `Investment growth after ${EXIT} exit tax and deemed disposal, or ${CGT} CGT`,
    'Break-even investment return needed to beat overpaying',
    'Year-by-year comparison of mortgage balance and investments',
  ],
  faqs: [
    {
      q: 'Is it better to overpay my mortgage or invest in Ireland?',
      a: `Overpaying gives a guaranteed, tax-free return equal to your mortgage rate. Investing may earn more, but returns are not guaranteed and gains are taxed at ${EXIT} exit tax (ETFs, from 2027) or ${CGT} CGT (shares). The break-even return shows how much your investments need to earn to come out ahead.`,
    },
    {
      q: 'Can I overpay my Irish mortgage without penalty?',
      a: 'Variable-rate mortgages can usually be overpaid without penalty. Fixed-rate mortgages may charge an early repayment (breakage) fee, although many lenders allow a limited overpayment each year. Check with your lender.',
    },
    {
      q: 'What does this calculator not include?',
      a: 'It does not include mortgage interest relief, fees, changes in interest rates, or the value of having cash available in an emergency. Keep an emergency fund before overpaying or investing.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_FUNDS, SOURCE_CGT, SOURCE_CCPC],
};

export const CALCULATORS_HUB: CalculatorPage = {
  view: 'calculators',
  kind: 'hub',
  path: '/calculators',
  name: 'All Calculators',
  title: 'Free Irish Financial Calculators – Tax, Pension, Savings & Mortgage | InvestIreland AI',
  description:
    'Free calculators built for Irish tax rules: investment, Investment Account, ETF exit tax and deemed disposal, pension tax relief, savings goals and mortgage vs investing.',
  h1: 'Free Irish Financial Calculators',
  intro: 'Simple, free calculators that use Irish tax rules. No sign-up needed, and nothing you type is stored.',
  highlights: [],
  faqs: [
    {
      q: 'Are these calculators financial advice?',
      a: 'No. They are educational estimates based on the assumptions shown on each page. Speak to a qualified financial adviser before making decisions.',
    },
    {
      q: 'Is my data saved?',
      a: 'No. Calculations run in your browser and nothing you type into these calculators is sent to or stored on our servers.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
};

/* ------------------------------------------------------------------ */
/* Guides                                                              */
/* ------------------------------------------------------------------ */

export const BEST_INVESTMENT_OPTIONS_GUIDE: CalculatorPage = {
  view: 'best-investment-options-ireland',
  kind: 'guide',
  path: '/best-investment-options-ireland',
  name: 'Best Investment Options in Ireland',
  title: 'Best Investment Options in Ireland (2026): Compared After Tax | InvestIreland AI',
  description:
    'The best investment options in Ireland compared after tax: deposits, Prize Bonds, State Savings, ETFs, the new Investment Account, pensions, property and shares.',
  h1: 'Best Investment Options in Ireland, Compared After Tax',
  intro: `Looking for the best investment option in Ireland? There is no single best choice for everyone. It depends on when you need the money, how much risk you can take and, in Ireland especially, how each option is taxed. This guide compares the main investment options in Ireland side by side (deposit accounts, Prize Bonds, State Savings, ETFs, the new Investment Account, pensions, property and individual shares) with the Irish tax rules for each, updated for Budget 2027.`,
  highlights: [
    'Comparison table of 8 investment options with Irish tax treatment, risk and access',
    '"Best for" breakdown by goal',
    'After-tax calculator comparing deposits, ETFs, shares and the Investment Account',
    'Frequently asked questions with sources from Revenue and the Department of Finance',
  ],
  sections: [
    {
      id: 'comparison',
      heading: 'Investment options in Ireland compared',
      table: {
        caption: 'Main investment options in Ireland and how they are taxed (2026 and 2027 rules)',
        headers: ['Option', 'How returns are taxed', 'Risk', 'Access to your money', 'Best for'],
        rows: [
          ['Deposit / savings account', `DIRT ${DIRT} on interest, deducted by the bank`, 'Very low (deposits up to €100,000 per person per bank are protected)', 'Instant to fixed term', 'Emergency fund and short-term goals'],
          ['Prize Bonds', 'Prizes are tax-free; no interest is paid', 'Very low (State-backed)', 'Can be cashed in at any time', 'Money you are happy to hold without interest for a chance of a prize'],
          ['State Savings bonds and certificates', 'Tax-free fixed return (no DIRT)', 'Very low (State-backed)', 'Fixed terms; cashing in early earns less', 'Medium-term savings with a guaranteed return'],
          ['ETFs and investment funds', `Exit tax ${EXIT} from 2027 (${EXIT_2026} in 2026), plus deemed disposal every 8 years`, 'Medium to high (value can fall)', 'Usually sell within days', 'Long-term growth outside a pension'],
          [`Investment Account (from ${IA_LAUNCH})`, `No tax up to ${IA_FREE}; ${IA_CHARGE} a year on value above it; no deemed disposal`, 'Depends on what you hold in it', 'To be confirmed in the final rules', `Long-term investing up to ${IA_LIMIT} a year`],
          ['Pension (PRSA or workplace pension)', 'Income tax relief at 20% or 40% on contributions, tax-free growth, taxed as income when drawn (part of the lump sum is tax-free)', 'Depends on the funds chosen', 'Usually locked until age 60 or later', 'Retirement saving, especially for higher-rate taxpayers'],
          ['Individual shares', `CGT ${CGT} on gains above ${CGT_EXEMPTION} a year; dividends taxed as income`, 'High (single-company risk)', 'Usually sell within days', 'Experienced investors who want to pick companies'],
          ['Property (buy-to-let)', `Rental profit taxed as income (up to about 52% with USC and PRSI); CGT ${CGT} when sold; stamp duty when bought`, 'Medium to high, concentrated and often borrowed money', 'Slow to sell (months)', 'Investors with large capital who want to be landlords'],
        ],
      },
    },
    {
      id: 'deposits',
      heading: 'Deposit and savings accounts',
      paragraphs: [
        `Deposit accounts are the safest place for money you might need soon. Interest is taxed at ${DIRT} DIRT, which the bank deducts for you, and deposits of up to €100,000 per person per bank are protected by the Deposit Guarantee Scheme. The main risk is inflation: if prices rise faster than your interest after DIRT, your savings lose buying power.`,
      ],
      links: ['savings-goal-calculator'],
    },
    {
      id: 'prize-bonds-state-savings',
      heading: 'Prize Bonds and State Savings',
      paragraphs: [
        'Prize Bonds and State Savings products are run by the National Treasury Management Agency and backed by the State. Prize Bonds pay no interest; instead, each bond is entered into weekly draws and prizes are tax-free. State Savings bonds and certificates pay a fixed, tax-free return if you hold them for the full term. Both suit cautious savers, but returns are usually low.',
      ],
    },
    {
      id: 'etfs',
      heading: 'ETFs and investment funds',
      paragraphs: [
        `ETFs are a low-cost way to invest in hundreds of companies at once. In Ireland, gains on Irish and EU-domiciled ETFs are taxed under exit tax rather than CGT: ${EXIT_2026} in 2026 and ${EXIT} from 1 January 2027. Every 8 years you also pay tax on the gain so far under deemed disposal, even if you do not sell. You cannot use the ${CGT_EXEMPTION} CGT exemption or offset losses.`,
      ],
      links: ['etf-tax-ireland-beginners', 'etf-tax-calculator', 'exit-tax-calculator', 'deemed-disposal-calculator'],
    },
    {
      id: 'investment-account',
      heading: `The new Investment Account (from ${IA_LAUNCH})`,
      paragraphs: [
        `Budget 2027 announced an Investment Account for individuals. You can invest up to ${IA_LIMIT} a year. There is no tax while the account is worth up to ${IA_FREE}, and a ${IA_CHARGE} yearly charge on the value above that. There is no exit tax, CGT or deemed disposal inside it. For many long-term investors it is likely to be more tax-efficient than holding ETFs directly, but the final rules are still going through the Oireachtas.`,
      ],
      links: ['investment-account-calculator', 'exit-tax-vs-investment-account'],
    },
    {
      id: 'pensions',
      heading: 'Pensions',
      paragraphs: [
        'A pension is usually the most tax-efficient way to save for retirement in Ireland. Contributions get income tax relief at your highest rate (20% or 40%) within age-related limits, growth is tax-free, and up to €200,000 of your retirement lump sum is tax-free. The trade-off is that the money is usually locked away until at least age 60. If your employer matches contributions, that is extra money you would otherwise miss.',
      ],
      links: ['pension-calculator'],
    },
    {
      id: 'property',
      heading: 'Property',
      paragraphs: [
        `Buy-to-let property can produce rent and long-term growth, but it needs a large deposit, often uses borrowed money and is slow to sell. Rental profit is taxed as income, which can mean up to about 52% with USC and PRSI, and gains on sale are taxed at ${CGT} CGT. For many people, paying down their own mortgage is the simplest property "investment".`,
      ],
      links: ['mortgage-vs-investing-calculator'],
    },
    {
      id: 'shares',
      heading: 'Individual shares',
      paragraphs: [
        `Buying shares in individual companies is taxed under Capital Gains Tax at ${CGT}, after a ${CGT_EXEMPTION} yearly exemption, and losses can be used against other gains. Dividends are taxed as income. Shares avoid deemed disposal, but holding a few companies is riskier than a broad ETF.`,
      ],
      links: ['etf-tax-calculator'],
    },
    {
      id: 'best-for',
      heading: 'Which investment option is best for you?',
      bullets: [
        'Emergency fund (3 to 6 months of spending): a deposit account you can access quickly.',
        'A goal within 3 to 5 years, such as a house deposit: deposit accounts or State Savings, because investments can fall just before you need the money.',
        'Retirement: a pension first, especially if you pay tax at 40% or your employer matches contributions.',
        `Long-term growth outside a pension: from ${IA_LAUNCH}, the Investment Account for up to ${IA_LIMIT} a year, then ETFs or shares above that.`,
        'Expensive debt: paying off credit cards and personal loans usually beats any investment.',
        'Mortgage holders: compare overpaying with investing before deciding.',
      ],
      links: ['savings-goal-calculator', 'pension-calculator', 'mortgage-vs-investing-calculator'],
    },
    {
      id: 'method',
      heading: 'How we compared the options',
      paragraphs: [
        '"Best" in this guide means the best fit for a particular goal, not a recommendation for you. We compare options on tax, risk and access using official sources. We do not recommend specific products or providers and we are not paid by any of them. Your own circumstances matter, so consider speaking to a qualified financial adviser authorised by the Central Bank of Ireland.',
      ],
      links: ['about'],
    },
  ],
  faqs: [
    {
      q: 'What is the best investment option in Ireland?',
      a: `There is no single best option. Many people keep an emergency fund in a deposit account, use a pension for retirement because of the tax relief, and invest for long-term goals through ETFs or, from ${IA_LAUNCH}, the Investment Account. The right mix depends on your goals, timeline and attitude to risk.`,
    },
    {
      q: 'What is the most tax-efficient way to invest in Ireland?',
      a: `For retirement, a pension, because of income tax relief and tax-free growth. Outside a pension, from ${IA_LAUNCH} the Investment Account has no tax up to ${IA_FREE} and ${IA_CHARGE} a year above it. Individual shares (${CGT} CGT with a ${CGT_EXEMPTION} exemption) are often taxed less than ETFs (${EXIT} exit tax plus deemed disposal), but carry more risk.`,
    },
    {
      q: 'How much tax do I pay on investments in Ireland?',
      a: `Deposit interest: ${DIRT} DIRT. ETFs and funds: ${EXIT} exit tax from 2027 (${EXIT_2026} in 2026). Shares: ${CGT} CGT above ${CGT_EXEMPTION} a year. Prize Bond prizes and State Savings returns are tax-free. Pension growth is tax-free, but pension income is taxed when you draw it.`,
    },
    {
      q: 'Is it better to invest in ETFs or shares in Ireland?',
      a: `Shares have a lower tax rate (${CGT} vs ${EXIT}), a yearly exemption and no deemed disposal, but a few shares are riskier than a broad ETF. Many investors accept the higher ETF tax for diversification. Our ETF tax calculator compares the two.`,
    },
    {
      q: 'Is my money protected?',
      a: 'Bank deposits are protected up to €100,000 per person per bank by the Deposit Guarantee Scheme. Investments are not protected against market falls. If an investment firm fails, the Investor Compensation Scheme may cover 90% of your loss up to €20,000.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_DOF, SOURCE_FUNDS, SOURCE_CGT, SOURCE_DIRT, SOURCE_PENSION, SOURCE_STATE_SAVINGS, SOURCE_CENTRAL_BANK, SOURCE_CCPC],
};

const DD_EXAMPLE_VALUE = 10000 * Math.pow(1.06, 8);
const DD_EXAMPLE_TAX = (DD_EXAMPLE_VALUE - 10000) * EXIT_TAX_RATE;

export const ETF_TAX_BEGINNERS_GUIDE: CalculatorPage = {
  view: 'etf-tax-ireland-beginners',
  kind: 'guide',
  path: '/etf-tax-ireland-beginners',
  name: 'ETF Tax in Ireland for Beginners',
  title: 'ETF Tax Ireland for Beginners: Exit Tax & Deemed Disposal Explained | InvestIreland AI',
  description: `ETF tax in Ireland explained for beginners: how ${EXIT} exit tax and 8-year deemed disposal work, how to pay it, and a free calculator to estimate your tax.`,
  h1: 'ETF Tax in Ireland for Beginners',
  intro: `New to ETFs? ETF tax in Ireland works differently from most countries. Gains on Irish and EU ETFs are not taxed under Capital Gains Tax but under a separate exit tax of ${EXIT} from 2027 (${EXIT_2026} in 2026), and you pay it every 8 years even if you do not sell. This beginner's guide explains the rules in plain English, with examples and a calculator to try your own numbers.`,
  highlights: [
    'ETF tax in Ireland in 60 seconds',
    'Exit tax and deemed disposal explained with worked examples',
    'How to report and pay ETF tax',
    'Common beginner mistakes',
  ],
  sections: [
    {
      id: 'summary',
      heading: 'ETF tax in Ireland in 60 seconds',
      bullets: [
        `Irish and EU-domiciled ETFs: exit tax of ${EXIT} on gains from 1 January 2027 (${EXIT_2026} in 2026).`,
        'Deemed disposal: every 8 years after each purchase you pay exit tax on the gain so far, even if you have not sold.',
        `No ${CGT_EXEMPTION} annual exemption, and losses cannot be used against other gains.`,
        'Distributions (dividends) from these ETFs are also taxed under the exit tax rules, not as normal income.',
        `Individual shares use Capital Gains Tax at ${CGT} instead.`,
        `From ${IA_LAUNCH}, the Investment Account lets you invest up to ${IA_LIMIT} a year without exit tax or deemed disposal.`,
      ],
    },
    {
      id: 'exit-tax',
      heading: 'What is exit tax?',
      paragraphs: [
        `Exit tax is the tax on gains from investment funds, including ETFs. When you sell, you pay ${EXIT} (from 2027) of the difference between what you sold for and what you paid. For example, if you invest €10,000 and later sell for €16,000, the gain is ${euro(exampleGain)} and the tax is ${euro(exampleTax)}.`,
      ],
      links: ['exit-tax-calculator'],
    },
    {
      id: 'deemed-disposal',
      heading: 'What is deemed disposal?',
      paragraphs: [
        `Deemed disposal means you are treated as selling your ETF units every 8 years, so you pay exit tax on the gain without selling. Say you invest €10,000 in 2027 and it grows 6% a year. In 2035 it is worth about ${euro(DD_EXAMPLE_VALUE)}, so you pay about ${euro(DD_EXAMPLE_TAX)} in tax, even though you still hold the units. That tax is credited when you finally sell.`,
      ],
      links: ['deemed-disposal-calculator'],
    },
    {
      id: 'acc-vs-dist',
      heading: 'Accumulating vs distributing ETFs',
      paragraphs: [
        'Accumulating ETFs reinvest dividends inside the fund, so you are taxed only when you sell or at a deemed disposal. Distributing ETFs pay dividends out to you, and each payment is taxed under the exit tax rules in the year you receive it. Both types are subject to deemed disposal.',
      ],
    },
    {
      id: 'paying',
      heading: 'How do I pay ETF tax in Ireland?',
      bullets: [
        'If your broker or fund is Irish, it may deduct exit tax for you. Check with your broker.',
        'With a non-Irish broker, you usually report and pay it yourself through an income tax return (often a Form 11) by the self-assessment deadline the following year.',
        'Keep a record of the date and cost of every purchase, sale and distribution.',
        'Revenue myAccount or ROS is where you file. Speak to a tax adviser if you are unsure.',
      ],
    },
    {
      id: 'mistakes',
      heading: 'Common beginner mistakes',
      bullets: [
        'Forgetting deemed disposal on the 8th anniversary of each purchase.',
        `Trying to use the ${CGT_EXEMPTION} CGT exemption or losses against ETF gains.`,
        'Not keeping records of each monthly purchase.',
        'Assuming US-domiciled ETFs are available: EU rules (PRIIPs) stop most Irish retail investors buying them.',
      ],
      links: ['etf-tax-calculator', 'best-investment-options-ireland'],
    },
  ],
  faqs: [
    {
      q: "Do I pay tax on ETFs in Ireland if I don't sell?",
      a: 'Yes, under deemed disposal. Every 8 years after each purchase you pay exit tax on the gain so far. You also pay tax on any distributions in the year you receive them.',
    },
    {
      q: 'What is the ETF tax rate in Ireland?',
      a: `${EXIT_2026} in 2026, falling to ${EXIT} from 1 January 2027 under Budget 2027. It was 41% before 2026.`,
    },
    {
      q: 'Do I need to file a tax return for ETFs?',
      a: 'If your broker does not deduct the tax for you, yes. You report sales, distributions and deemed disposals in your income tax return for the year they happen.',
    },
    {
      q: 'Are ETFs still worth it in Ireland?',
      a: 'They can be. ETFs give cheap, diversified exposure, and the tax is the price of that. From July 2027 the Investment Account may be a better home for up to €12,000 a year. Compare the options with our calculators.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_FUNDS, SOURCE_CGT, SOURCE_DOF],
};

export const EXIT_TAX_VS_INVESTMENT_ACCOUNT_GUIDE: CalculatorPage = {
  view: 'exit-tax-vs-investment-account',
  kind: 'guide',
  path: '/exit-tax-vs-investment-account',
  name: 'Exit Tax vs Investment Account',
  title: 'Exit Tax vs Investment Account Ireland: Which Keeps More? | InvestIreland AI',
  description: `Exit tax vs the new Investment Account in Ireland: compare ${EXIT} exit tax and deemed disposal with no tax up to ${IA_FREE} and ${IA_CHARGE} a year above it.`,
  h1: 'Exit Tax vs Investment Account in Ireland',
  intro: `Should you keep investing in ETFs taxed under exit tax, or use the new Investment Account when it opens on ${IA_LAUNCH}? This guide compares exit tax vs the Investment Account in Ireland side by side, shows when each comes out ahead, and lets you test your own numbers.`,
  highlights: [
    'Side-by-side comparison table',
    'Calculator comparing the two over your own timeline',
    `Rule of thumb: when the ${IA_CHARGE} charge beats ${EXIT} exit tax`,
  ],
  sections: [
    {
      id: 'comparison',
      heading: 'Exit tax vs Investment Account: side by side',
      table: {
        caption: 'ETFs held directly compared with the Investment Account',
        headers: ['', 'ETF held directly (exit tax)', 'Investment Account'],
        rows: [
          ['Tax on growth', `${EXIT} of the gain (${EXIT_2026} in 2026)`, `None up to ${IA_FREE}; ${IA_CHARGE} a year on value above ${IA_FREE}`],
          ['Deemed disposal', `Every ${DEEMED_DISPOSAL_YEARS} years after each purchase`, 'None'],
          ['Yearly limit', 'None', `${IA_LIMIT} a year`],
          ['Losses', 'Cannot be used against other gains', 'Not relevant: no tax on gains'],
          ['Who handles the tax', 'Usually you, through your tax return', 'The provider'],
          ['Available', 'Now', `From ${IA_LAUNCH} (subject to legislation)`],
        ],
      },
    },
    {
      id: 'when-it-wins',
      heading: 'When does the Investment Account come out ahead?',
      paragraphs: [
        `Up to ${IA_FREE}, the Investment Account is simply tax-free, so it wins. Above ${IA_FREE}, compare ${IA_CHARGE} of the excess each year with ${EXIT} of the growth. If your investments grow by more than about ${pct(INVESTMENT_ACCOUNT.annualTaxAboveThreshold / EXIT_TAX_RATE)} a year, ${EXIT} of the growth is more than ${IA_CHARGE} of the value, so the account usually keeps more. Deemed disposal makes exit tax even more expensive, because tax is taken early and stops compounding.`,
        `The exit tax route can be better if returns are very low or negative, because the ${IA_CHARGE} charge is due even when the account falls in value.`,
      ],
      links: ['investment-account-calculator', 'deemed-disposal-calculator'],
    },
    {
      id: 'unknowns',
      heading: 'What is still to be confirmed',
      bullets: [
        'Which investments you can hold in the account and which providers will offer it.',
        'Withdrawal rules and whether existing holdings can be transferred in.',
        'Provider fees, which could reduce the advantage.',
        'Final details in the Finance Act, which may differ from the Budget announcement.',
      ],
      links: ['best-investment-options-ireland', 'etf-tax-ireland-beginners'],
    },
  ],
  faqs: [
    {
      q: 'Is the Investment Account better than buying ETFs directly?',
      a: `For most long-term investors, yes on the announced rules: no tax up to ${IA_FREE}, ${IA_CHARGE} a year above it and no deemed disposal, compared with ${EXIT} exit tax and deemed disposal every 8 years. It may not be better if returns are very low.`,
    },
    {
      q: 'Can I move my existing ETFs into the Investment Account?',
      a: `This has not been confirmed. The announced limit is ${IA_LIMIT} of contributions a year. Check the final legislation and your provider.`,
    },
    {
      q: `What happens to money above ${IA_LIMIT} a year?`,
      a: 'It is invested outside the account and taxed under the normal rules: exit tax and deemed disposal for ETFs and funds, or CGT for shares.',
    },
    {
      q: 'Will deemed disposal be abolished?',
      a: 'Budget 2027 kept the 8-year rule while fund taxation is reviewed. Investments inside the Investment Account are not subject to it.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_DOF, SOURCE_FUNDS],
};

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

export const ABOUT_PAGE: CalculatorPage = {
  view: 'about',
  kind: 'about',
  path: '/about',
  name: 'About',
  title: 'About InvestIreland AI – Independent Irish Investment Calculators',
  description:
    'Who builds InvestIreland AI, how our Irish tax calculators work, the official sources we use, and why our content is educational, not financial advice.',
  h1: 'About InvestIreland AI',
  intro:
    'InvestIreland AI is a free, independent website that helps people in Ireland understand how their savings and investments are taxed. It is a personal, self-funded project: we do not sell financial products, we are not paid by providers, and nothing on the site is a recommendation to buy or sell anything.',
  highlights: [],
  sections: [
    {
      id: 'who',
      heading: 'Who is behind InvestIreland AI',
      paragraphs: [
        'InvestIreland AI is built and maintained by an independent software developer with an interest in personal finance in Ireland. It is not affiliated with Revenue, the Department of Finance, the Central Bank of Ireland or any bank, broker or fund provider.',
      ],
    },
    {
      id: 'method',
      heading: 'How our calculators work',
      bullets: [
        'Investments are simulated month by month, and each purchase is tracked separately so deemed disposal falls on its own 8-year anniversary.',
        'All tax rates come from one place in our code and show the date they were last reviewed.',
        'The calculations are covered by automated tests, including worked examples checked by hand.',
        'Calculators run in your browser. Nothing you type into them is sent to or stored on our servers.',
      ],
      links: ['calculators'],
    },
    {
      id: 'standards',
      heading: 'Our editorial standards',
      bullets: [
        'We cite official sources such as Revenue, the Department of Finance, State Savings and the Central Bank of Ireland.',
        'Every guide and calculator shows when it was last reviewed, and we update them after each Budget and Finance Act.',
        'We do not use affiliate links or accept payment to feature products.',
        `If you spot a mistake, email ${SITE_FACTS.contactEmail} and we will correct it.`,
      ],
    },
    {
      id: 'disclaimer',
      heading: 'Educational, not financial advice',
      paragraphs: [
        'InvestIreland AI is not regulated by the Central Bank of Ireland and does not give financial, investment or tax advice. Our content and calculators are general information and estimates based on stated assumptions; they do not take your personal circumstances into account. Tax rules can change, and proposals such as the Investment Account may change before they become law. Before making decisions, speak to a qualified financial adviser or tax adviser. You can check whether a firm is authorised on the Central Bank of Ireland register.',
      ],
      links: ['best-investment-options-ireland'],
    },
  ],
  faqs: [
    {
      q: 'Is InvestIreland AI free?',
      a: 'Yes. The calculators and guides are free and need no sign-up. Optional portfolio-tracking features are available with an account.',
    },
    {
      q: 'How often are the tax rules checked?',
      a: `After every Budget and Finance Act, and whenever we are told about a change. They were last reviewed on ${formatIsoDate(TAX_RULES_LAST_REVIEWED)}.`,
    },
    {
      q: 'Is InvestIreland AI a regulated financial adviser?',
      a: 'No. It is an educational tool. For personal advice, use an adviser authorised by the Central Bank of Ireland.',
    },
  ],
  updated: CONTENT_LAST_UPDATED,
  sources: [SOURCE_DOF, SOURCE_FUNDS, SOURCE_CGT, SOURCE_DIRT, SOURCE_PENSION, SOURCE_STATE_SAVINGS, SOURCE_CENTRAL_BANK, SOURCE_CCPC],
};

export const CALCULATOR_TOOLS: CalculatorPage[] = [
  INVESTMENT_CALCULATOR,
  INVESTMENT_ACCOUNT_CALCULATOR,
  ETF_TAX_CALCULATOR,
  EXIT_TAX_CALCULATOR,
  DEEMED_DISPOSAL_CALCULATOR,
  PENSION_CALCULATOR,
  SAVINGS_GOAL_CALCULATOR,
  MORTGAGE_VS_INVESTING_CALCULATOR,
];

export const GUIDE_PAGES: CalculatorPage[] = [
  BEST_INVESTMENT_OPTIONS_GUIDE,
  ETF_TAX_BEGINNERS_GUIDE,
  EXIT_TAX_VS_INVESTMENT_ACCOUNT_GUIDE,
];

/** Every indexable content page: calculators hub, calculators, guides and about. */
export const CALCULATOR_PAGES: CalculatorPage[] = [CALCULATORS_HUB, ...CALCULATOR_TOOLS, ...GUIDE_PAGES, ABOUT_PAGE];

export const CALCULATOR_TAX_NOTE = TAX_YEAR_NOTE;

/** Short and legacy URLs that permanently redirect to the canonical pages. */
export const CALCULATOR_ALIASES: Record<string, string> = {
  '/calculator': '/calculators',
  '/investmentcalculator': '/investment-calculator',
  '/investmentaccountcalculator': '/investment-account-calculator',
  '/investment-account': '/investment-account-calculator',
  '/etfcalculator': '/etf-tax-calculator',
  '/etf-calculator': '/etf-tax-calculator',
  '/etftaxcalculator': '/etf-tax-calculator',
  '/exittaxcalculator': '/exit-tax-calculator',
  '/exit-tax': '/exit-tax-calculator',
  '/deemeddisposalcalculator': '/deemed-disposal-calculator',
  '/deemed-disposal': '/deemed-disposal-calculator',
  '/pensioncalculator': '/pension-calculator',
  '/savingscalculator': '/savings-goal-calculator',
  '/savings-calculator': '/savings-goal-calculator',
  '/savingsgoalcalculator': '/savings-goal-calculator',
  '/mortgagecalculator': '/mortgage-vs-investing-calculator',
  '/mortgage-calculator': '/mortgage-vs-investing-calculator',
  '/mortgage-vs-investing': '/mortgage-vs-investing-calculator',
  '/best-investment-options': '/best-investment-options-ireland',
  '/etf-tax-ireland': '/etf-tax-ireland-beginners',
  '/about-us': '/about',
};

export const isCalculatorView = (view: string): view is CalculatorView => CALCULATOR_PAGES.some((p) => p.view === view);

/** Every top-level view the single-page app can show. */
export type AppView = 'landing' | 'app' | 'privacy' | CalculatorView;

export const calculatorPageForView = (view: CalculatorView): CalculatorPage =>
  CALCULATOR_PAGES.find((p) => p.view === view) ?? CALCULATORS_HUB;

export const calculatorViewForPath = (pathname: string): CalculatorView | null =>
  CALCULATOR_PAGES.find((p) => p.path === pathname)?.view ?? null;
