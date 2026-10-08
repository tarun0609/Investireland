import { Holding, InvestmentAccountState, QuizQuestion, QuizResult } from '../types';

export const INITIAL_HOLDINGS: Holding[] = [
  // Irish Assets
  {
    id: 'h-1',
    assetName: 'Irish Bank High Yield Savings (Bunq / Trade Republic)',
    assetType: 'Cash / Deposit',
    units: 1,
    unitPrice: 20000,
    currentValue: 20000,
    currency: 'EUR',
    country: 'Ireland',
    provider: 'Bunq / AIB',
    notes: 'Emergency fund (3.25% gross, subject to 33% DIRT)',
    updatedAt: '2026-10-01'
  },
  {
    id: 'h-2',
    assetName: 'Irish Occupational Pension / PRSA (Global Equities)',
    assetType: 'Pension',
    units: 320,
    unitPrice: 93.75,
    currentValue: 30000,
    currency: 'EUR',
    country: 'Ireland',
    provider: 'Irish Life Corporate Pension',
    purchaseValue: 24000,
    notes: 'Pre-tax payroll contributions with 40% income tax relief',
    updatedAt: '2026-10-02'
  },
  {
    id: 'h-3',
    assetName: 'iShares Core MSCI World UCITS ETF (IWDA)',
    assetType: 'ETF',
    ticker: 'IWDA.AS',
    isin: 'IE00B4L5Y983',
    units: 180,
    unitPrice: 97.2,
    currentValue: 17496,
    currency: 'EUR',
    country: 'Europe',
    provider: 'Davy Select / Degiro',
    purchaseValue: 14000,
    notes: 'Eligible for transfer to Budget 2027 Investment Account upon launch',
    updatedAt: '2026-10-03'
  },
  // Indian Assets
  {
    id: 'h-4',
    assetName: 'Parag Parikh Flexi Cap Fund (Direct Growth)',
    assetType: 'Mutual Fund',
    units: 24500,
    unitPrice: 75.5,
    currentValue: 1849750, // ₹18.50 Lakh (~€20,000)
    currency: 'INR',
    country: 'India',
    provider: 'Zerodha Coin / Groww',
    purchaseValue: 1350000,
    notes: 'Monthly SIP via NRE account in India, covered under DTAA Article 13',
    updatedAt: '2026-10-04'
  },
  {
    id: 'h-5',
    assetName: 'Tata Consultancy Services (TCS) & HDFC Bank Equities',
    assetType: 'Share',
    ticker: 'TCS.NS',
    units: 150,
    unitPrice: 3200,
    currentValue: 480000, // ₹4.80 Lakh (~€5,190)
    currency: 'INR',
    country: 'India',
    provider: 'ICICI Direct',
    purchaseValue: 380000,
    notes: 'Direct equity holdings on NSE',
    updatedAt: '2026-10-04'
  },
  // US Assets
  {
    id: 'h-6',
    assetName: 'US Employer Tech RSUs (Alphabet / Microsoft)',
    assetType: 'RSU',
    ticker: 'GOOGL',
    units: 75,
    unitPrice: 165.2,
    currentValue: 12390, // $12,390 USD (~€11,419)
    currency: 'USD',
    country: 'US',
    provider: 'Morgan Stanley at Work',
    purchaseValue: 10500,
    notes: 'Vested employee stock grants, RTSO tax settled in Ireland',
    updatedAt: '2026-10-05'
  }
];

export const INITIAL_INVESTMENT_ACCOUNT_STATE: InvestmentAccountState = {
  accountValue: 8000,
  annualContributions: 8000,
  annualLimit: 12000,
  taxFreeThreshold: 50000,
  excessAnnualChargeRate: 0.01,
  status: 'Pre-launch (1 July 2027)',
  history: [
    { id: 'tx-1', date: '2026-07-15', amount: 3000, provider: 'Early Beta Reserve', type: 'Contribution' },
    { id: 'tx-2', date: '2026-08-15', amount: 2500, provider: 'Early Beta Reserve', type: 'Contribution' },
    { id: 'tx-3', date: '2026-09-15', amount: 2500, provider: 'Early Beta Reserve', type: 'Contribution' }
  ]
};

export const EDUCATIONAL_ARTICLES = [
  {
    slug: 'what-is-ireland-new-investment-account',
    title: "What is Ireland's New Investment Account (Budget 2027)?",
    summary: 'A plain-English breakdown of the €12,000 contribution cap, the €50,000 tax-free growth ceiling, and how it transforms Irish retail investing.',
    lastUpdated: 'October 2026',
    source: 'Department of Finance & Budget 2027 White Paper',
    sourceUrl: 'https://www.gov.ie/en/organisation/department-of-finance/',
    reviewer: 'Reviewed by Irish Financial Practice Group',
    readTime: '4 min read',
    category: 'Investment Account'
  },
  {
    slug: 'etf-exit-tax-vs-new-scheme',
    title: '41% Exit Tax & Deemed Disposal vs The New Scheme',
    summary: 'Why Ireland has had the harshest ETF tax regime in Europe for two decades and how the 2027 account finally changes the math.',
    lastUpdated: 'October 2026',
    source: 'Revenue Commissioners (TCA 1997 s.739D)',
    sourceUrl: 'https://www.revenue.ie/',
    reviewer: 'Irish Tax Institute Fellow Contributor',
    readTime: '6 min read',
    category: 'Taxation'
  },
  {
    slug: 'cross-border-india-ireland-investments',
    title: 'Investing from Ireland with Indian Assets (Mutual Funds, NRE, DTAA)',
    summary: 'How Indian tech and medical professionals living in Dublin, Cork, and Galway navigate dual-country tax treaties, remittances, and currency exposure.',
    lastUpdated: 'October 2026',
    source: 'Ireland-India Double Taxation Avoidance Agreement (Article 13)',
    sourceUrl: 'https://www.revenue.ie/en/tax-professionals/tax-agreements/double-taxation-treaties/i/india.aspx',
    reviewer: 'Cross-Border Wealth Advisory',
    readTime: '5 min read',
    category: 'International'
  },
  {
    slug: 'us-tech-rsus-in-ireland',
    title: 'US Tech RSUs & Shares: Managing Currency and Concentration Risk',
    summary: 'For tech workers in Dublin: understanding RTSO taxes, foreign currency USD/EUR swings, and how to diversify into European and Irish tax-sheltered accounts.',
    lastUpdated: 'September 2026',
    source: 'Revenue Commissioners Share Schemes Manual',
    sourceUrl: 'https://www.revenue.ie/',
    reviewer: 'Fintech Advisory Board',
    readTime: '5 min read',
    category: 'Portfolio'
  }
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'How do you currently hold your primary savings?',
    subtitle: 'Understanding your cash baseline',
    options: [
      { label: 'Mostly in standard Irish bank accounts (AIB, BOI, PTSB)', score: 10, detail: 'Low risk, but currently losing purchasing power to inflation and 33% DIRT.' },
      { label: 'Mix of bank deposits and high-yield fintech accounts (Bunq, Trade Republic)', score: 20, detail: 'Good initial yield awareness, earning 2.5–3.5% gross.' },
      { label: 'Diversified across bank savings, pensions, and stock/ETF portfolios', score: 30, detail: 'Proactive capital allocation structure.' }
    ]
  },
  {
    id: 2,
    question: 'Do you currently hold cross-border assets outside Ireland?',
    subtitle: 'Capturing India, US, or European assets',
    options: [
      { label: 'Only Irish assets (cash and standard Irish bank account)', score: 15, detail: 'Straightforward local jurisdiction.' },
      { label: 'Yes, Indian mutual funds, shares, or NRE/FCNR deposits', score: 25, detail: 'High opportunity for DTAA cross-border optimization.' },
      { label: 'Yes, US company shares/RSUs or EU broker accounts (Degiro, Interactive Brokers)', score: 25, detail: 'Multi-currency exposure requiring tax drag monitoring.' },
      { label: 'Multiple global jurisdictions (Ireland + India + US/EU)', score: 30, detail: 'Significant cross-border complexity that benefits greatly from a unified Financial X-Ray.' }
    ]
  },
  {
    id: 3,
    question: 'What is your plan for the €12,000/year Irish Investment Account in 2027?',
    subtitle: 'Preparing for the new tax-advantaged scheme',
    options: [
      { label: 'I was not aware of it until recently', score: 10, detail: 'Great timing to learn before the July 2027 rollout.' },
      { label: 'I want to max out the €12,000 annual contribution from day one', score: 30, detail: 'Ideal strategy to capture the €50,000 tax-free compounding threshold.' },
      { label: 'I plan to contribute €200–€500 per month progressively', score: 25, detail: 'Sensible disciplined dollar/euro-cost averaging.' }
    ]
  },
  {
    id: 4,
    question: 'How do you react when global stock markets fall by 15% to 20%?',
    subtitle: 'Assessing your behavioural risk posture',
    options: [
      { label: 'I feel anxious and consider moving everything back to cash', score: 10, detail: 'Higher risk sensitivity; prioritize larger cash buffers.' },
      { label: 'I stay calm and continue long-term monthly contributions', score: 30, detail: 'Disciplined compounding mindset suited for equity wealth building.' },
      { label: 'I look to invest extra surplus cash at lower valuations', score: 30, detail: 'High long-term investment conviction.' }
    ]
  }
];

export function calculateQuizScore(answers: Record<number, number>): QuizResult {
  let totalScore = 0;
  for (const qId in answers) {
    totalScore += answers[qId] || 0;
  }
  
  // Normalize to 100 scale (max is 120 points from 4 questions)
  const normalized = Math.min(100, Math.round((totalScore / 120) * 100));

  if (normalized >= 75) {
    return {
      score: normalized,
      title: 'High Investment Readiness (Advanced)',
      verdict: 'You have strong asset allocation and awareness. You are ideally positioned to benefit immediately from Ireland’s Budget 2027 Investment Account and global portfolio tracking.',
      recommendations: [
        'Model your €12,000 annual allowance in our FY26 vs FY27 calculator.',
        'Review your top 5 holdings concentration in the Financial X-Ray.',
        'Prepare your contribution allocation ahead of the 1 July 2027 opening.'
      ]
    };
  } else if (normalized >= 50) {
    return {
      score: normalized,
      title: 'Moderate Readiness (Building Momentum)',
      verdict: 'You have solid financial fundamentals with meaningful savings or pensions. Your biggest leap forward will be organizing your cross-border assets and eliminating unnecessary tax drag.',
      recommendations: [
        'Explore how the €50,000 tax-free threshold saves you from Ireland’s 41% exit tax.',
        'Consolidate your Indian/US holdings into a single dashboard view.',
        'Use our Scenario Planner to simulate a 10-year monthly investment roadmap.'
      ]
    };
  } else {
    return {
      score: normalized,
      title: 'Early Stage (Opportunity Ahead)',
      verdict: 'You have savings that can work much harder for you. Moving from standard deposit accounts to tax-sheltered investment accounts can transform your long-term wealth.',
      recommendations: [
        'Read our primer: "What is Ireland’s New Investment Account?".',
        'Experiment with our public Investment Calculator without signing up.',
        'Join the Early Access waitlist for guided financial education.'
      ]
    };
  }
}
