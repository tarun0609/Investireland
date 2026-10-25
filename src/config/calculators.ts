import type { PageSeo } from './site';

export type CalculatorView =
  | 'calculators'
  | 'investment-calculator'
  | 'etf-tax-calculator'
  | 'pension-calculator'
  | 'savings-goal-calculator'
  | 'mortgage-vs-investing-calculator';

export interface CalculatorFaq {
  q: string;
  a: string;
}

export interface CalculatorPage extends PageSeo {
  view: CalculatorView;
  /** Short name used in navigation and breadcrumbs. */
  name: string;
  h1: string;
  intro: string;
  /** Plain-text bullet points used in the no-JavaScript fallback and the hub page. */
  highlights: string[];
  faqs: CalculatorFaq[];
}

const TAX_YEAR_NOTE = 'Rates used are for 2026: exit tax 38%, CGT 33% with a €1,270 annual exemption, DIRT 33%, and 8-year deemed disposal. Check Revenue.ie for the latest rules.';

export const INVESTMENT_CALCULATOR: CalculatorPage = {
  view: 'investment-calculator',
  path: '/investment-calculator',
  name: 'Investment Calculator',
  title: 'Investment Calculator Ireland – Exit Tax vs Investment Account | InvestIreland AI',
  description:
    "Free Irish investment calculator: project your monthly investing after 38% exit tax and 8-year deemed disposal, and compare with Ireland's proposed Investment Account.",
  h1: 'Investment Calculator Ireland',
  intro:
    "See how much a lump sum and regular monthly investing could grow to in Ireland after tax. Compare today's ETF exit tax and deemed disposal rules with the proposed Investment Account (€12,000 a year, 0% on the first €50,000, 1% a year above that).",
  highlights: [
    'Monthly contributions with monthly compounding',
    'Deemed disposal applied 8 years after each purchase, not just every 8 calendar years',
    'Investment Account allowance of €12,000 per year shared by your lump sum and contributions',
    'Option to show results in today’s money (2% inflation)',
  ],
  faqs: [
    {
      q: 'How is exit tax calculated on ETFs in Ireland?',
      a: 'Gains on Irish and EU-domiciled ETFs and funds are taxed at 38% exit tax (from 1 January 2026) when you sell, and every 8 years after each purchase under deemed disposal. Tax already paid at a deemed disposal is credited when you finally sell.',
    },
    {
      q: 'What is the proposed Investment Account?',
      a: 'Budget 2027 proposed a simplified Investment Account with a €12,000 annual contribution limit, no tax on the first €50,000 of value and a 1% annual charge on the balance above €50,000, with no deemed disposal. The details may change before it is legislated.',
    },
    {
      q: 'Does this calculator include fees?',
      a: 'No. Enter a return that is already net of fund and platform fees, for example 6% instead of 6.2% for a fund with a 0.2% charge.',
    },
  ],
};

export const ETF_TAX_CALCULATOR: CalculatorPage = {
  view: 'etf-tax-calculator',
  path: '/etf-tax-calculator',
  name: 'ETF Tax Calculator',
  title: 'ETF Tax Calculator Ireland – 38% Exit Tax & Deemed Disposal | InvestIreland AI',
  description:
    'Calculate Irish ETF exit tax (38%) and 8-year deemed disposal on your investments, and compare with 33% CGT on individual shares. Free, no sign-up.',
  h1: 'ETF Tax Calculator Ireland',
  intro:
    'Work out how much exit tax and deemed disposal will cost on Irish/EU ETFs, and how that compares with buying individual shares that are taxed under Capital Gains Tax.',
  highlights: [
    '38% exit tax on gains when you sell',
    'Deemed disposal every 8 years for each purchase, with credit for tax already paid',
    'Side-by-side comparison with 33% CGT and the €1,270 annual exemption',
    'Year-by-year table showing when deemed disposal tax falls due',
  ],
  faqs: [
    {
      q: 'What is deemed disposal?',
      a: 'Every 8 years after you buy units in an Irish or EU-domiciled ETF or fund, Revenue treats you as having sold and bought them back. You pay exit tax on the gain so far, even though you have not sold. The tax paid is credited against the tax due when you actually sell.',
    },
    {
      q: 'Can I use losses or the €1,270 exemption against ETF gains?',
      a: 'No. Gains on ETFs taxed under the exit tax regime cannot use the €1,270 CGT annual exemption, and losses on them cannot be offset against other gains.',
    },
    {
      q: 'Are US-domiciled ETFs taxed the same way?',
      a: 'Not always. Revenue treats many non-EU ETFs like EU funds (exit tax), while others may fall under income tax or CGT depending on how they are structured. EU rules (PRIIPs) also stop most Irish retail investors buying US-domiciled ETFs. Take professional advice for your situation.',
    },
    {
      q: 'Do I file deemed disposal myself?',
      a: 'If your broker is not Irish, generally yes: you report and pay it through your Form 11 or Form 12 tax return for the year in which the 8-year anniversary falls.',
    },
  ],
};

export const PENSION_CALCULATOR: CalculatorPage = {
  view: 'pension-calculator',
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
};

export const SAVINGS_GOAL_CALCULATOR: CalculatorPage = {
  view: 'savings-goal-calculator',
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
    'Choose deposit account (33% DIRT), ETF (38% exit tax) or shares (33% CGT)',
    'Inflation-adjusted goal so your target keeps its buying power',
  ],
  faqs: [
    {
      q: 'How much tax do I pay on savings interest in Ireland?',
      a: 'Deposit interest is subject to DIRT at 33%, which your bank normally deducts automatically. This calculator takes DIRT off the interest every month.',
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
};

export const MORTGAGE_VS_INVESTING_CALCULATOR: CalculatorPage = {
  view: 'mortgage-vs-investing-calculator',
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
    'Investment growth after 38% exit tax and deemed disposal, or 33% CGT',
    'Break-even investment return needed to beat overpaying',
    'Year-by-year comparison of mortgage balance and investments',
  ],
  faqs: [
    {
      q: 'Is it better to overpay my mortgage or invest in Ireland?',
      a: 'Overpaying gives a guaranteed, tax-free return equal to your mortgage rate. Investing may earn more, but returns are not guaranteed and gains are taxed at 38% exit tax (ETFs) or 33% CGT (shares). The break-even return shows how much your investments need to earn after tax to come out ahead.',
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
};

export const CALCULATORS_HUB: CalculatorPage = {
  view: 'calculators',
  path: '/calculators',
  name: 'All Calculators',
  title: 'Free Irish Financial Calculators – Tax, Pension, Savings & Mortgage | InvestIreland AI',
  description:
    'Free calculators built for Irish tax rules: investment and ETF exit tax, pension tax relief, savings goals with DIRT, and mortgage overpayment vs investing.',
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
};

export const CALCULATOR_TOOLS: CalculatorPage[] = [
  INVESTMENT_CALCULATOR,
  ETF_TAX_CALCULATOR,
  PENSION_CALCULATOR,
  SAVINGS_GOAL_CALCULATOR,
  MORTGAGE_VS_INVESTING_CALCULATOR,
];

export const CALCULATOR_PAGES: CalculatorPage[] = [CALCULATORS_HUB, ...CALCULATOR_TOOLS];

export const CALCULATOR_TAX_NOTE = TAX_YEAR_NOTE;

/** Short and legacy URLs that permanently redirect to the canonical calculator pages. */
export const CALCULATOR_ALIASES: Record<string, string> = {
  '/calculator': '/calculators',
  '/investmentcalculator': '/investment-calculator',
  '/etfcalculator': '/etf-tax-calculator',
  '/etf-calculator': '/etf-tax-calculator',
  '/etftaxcalculator': '/etf-tax-calculator',
  '/pensioncalculator': '/pension-calculator',
  '/savingscalculator': '/savings-goal-calculator',
  '/savings-calculator': '/savings-goal-calculator',
  '/savingsgoalcalculator': '/savings-goal-calculator',
  '/mortgagecalculator': '/mortgage-vs-investing-calculator',
  '/mortgage-calculator': '/mortgage-vs-investing-calculator',
  '/mortgage-vs-investing': '/mortgage-vs-investing-calculator',
};

export const isCalculatorView = (view: string): view is CalculatorView => CALCULATOR_PAGES.some((p) => p.view === view);

/** Every top-level view the single-page app can show. */
export type AppView = 'landing' | 'app' | 'privacy' | CalculatorView;

export const calculatorPageForView = (view: CalculatorView): CalculatorPage =>
  CALCULATOR_PAGES.find((p) => p.view === view) ?? CALCULATORS_HUB;

export const calculatorViewForPath = (pathname: string): CalculatorView | null =>
  CALCULATOR_PAGES.find((p) => p.path === pathname)?.view ?? null;
