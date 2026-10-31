import type { AppView } from '../config/calculators';
import { CONTACT_EMAILS } from '../config/contact';
import {
  CGT_ANNUAL_EXEMPTION,
  CGT_RATE,
  DEEMED_DISPOSAL_YEARS,
  DIRT_RATE,
  EXIT_TAX_RATE,
  EXIT_TAX_RATE_2026,
  INVESTMENT_ACCOUNT,
  TAX_RULES_SOURCE,
  pct,
} from '../config/irishTax';
import { CHECKOUT_PLANS, FREE_HOLDINGS_LIMIT, PROMO_GLOBAL_CAP, PROMO_MONTHS } from '../config/plans';

/** A follow-up link shown under an answer. Exactly one target is set. */
export interface SupportLink {
  label: string;
  view?: AppView;
  section?: string;
  href?: string;
}

export interface SupportTopic {
  id: string;
  question: string;
  /** Lower-case words or phrases that signal this topic. */
  keywords: string[];
  answer: string;
  links?: SupportLink[];
}

const euro = (n: number) => `€${n.toLocaleString('en-IE')}`;
const IA = INVESTMENT_ACCOUNT;
const EMAIL_SUPPORT: SupportLink = { label: `Email ${CONTACT_EMAILS.support}`, href: `mailto:${CONTACT_EMAILS.support}` };

export const SUPPORT_TOPICS: SupportTopic[] = [
  {
    id: 'what-is',
    question: 'What is InvestIreland AI?',
    keywords: ['what is investireland', 'investireland', 'what is this', 'about you', 'about us', 'who are you', 'what do you do', 'company', 'website'],
    answer:
      'InvestIreland AI is a free, Ireland-first website that helps you understand Irish investment tax and track your investments in Ireland, India, the US and elsewhere in one place. It offers free calculators, plain-English guides and a portfolio tracker. We never hold your money or place trades, and we are an educational tool, not a regulated financial adviser.',
    links: [
      { label: 'About us', view: 'about' },
      { label: 'All calculators', view: 'calculators' },
    ],
  },
  {
    id: 'plans',
    question: 'What plans and prices are there?',
    keywords: ['plan', 'plans', 'price', 'pricing', 'cost', 'how much', 'subscriptions', 'pro', 'family', 'free plan', 'early user', 'upgrade', 'paid'],
    answer: `There are three plans:\n• Early User (free): the calculators, guides and up to ${FREE_HOLDINGS_LIMIT} holdings in the tracker.\n• Pro Expat & Investor: ${CHECKOUT_PLANS.pro_monthly.price} or ${CHECKOUT_PLANS.pro_annual.price}. Unlimited holdings, CAS PDF and CSV import, daily fund prices, Financial X-Ray, exports, tax estimator, rebalancing, dividends and the AI assistant.\n• Family / Household: ${CHECKOUT_PLANS.family_annual.price}. Everything in Pro plus a combined view for two adults.\nAll calculators and guides stay free for everyone.`,
    links: [{ label: 'See plans', section: 'pricing' }],
  },
  {
    id: 'promo',
    question: 'How do promo codes work?',
    keywords: ['promo', 'promo code', 'coupon', 'discount', 'voucher', 'code', 'free pro', 'redeem'],
    answer: `A promo code gives you the Pro plan free for ${PROMO_MONTHS} months. Codes are limited to the first ${PROMO_GLOBAL_CAP.toLocaleString('en-IE')} redemptions. Sign in, verify your email address, then enter the code in Plan & billing (or when you sign up). If a code is rejected, check it hasn't expired or already been used on your account.`,
    links: [{ label: 'Open my dashboard', view: 'app' }],
  },
  {
    id: 'cancel',
    question: 'How do I cancel or change my subscription?',
    keywords: ['cancel', 'cancellation', 'cancel my subscription', 'cancel subscription', 'my subscription', 'unsubscribe plan', 'stop subscription', 'downgrade', 'change plan', 'billing', 'invoice', 'receipt', 'card', 'payment'],
    answer:
      'Open your dashboard, go to Plan & billing and choose "Manage billing". That opens Stripe\'s secure billing page, where you can cancel, switch plan, update your card or download invoices. If you cancel, you keep paid features until the end of the period you paid for. Card details are handled by Stripe and never reach us.',
    links: [{ label: 'Open my dashboard', view: 'app' }, EMAIL_SUPPORT],
  },
  {
    id: 'refund',
    question: 'Can I get a refund?',
    keywords: ['refund', 'money back', 'charged', 'double charged', 'charge'],
    answer: `Please email ${CONTACT_EMAILS.support} from the address on your account with the date and amount of the payment, and we'll look into it. EU consumers also have their statutory rights.`,
    links: [EMAIL_SUPPORT],
  },
  {
    id: 'account',
    question: 'How do I sign in or reset my password?',
    keywords: ['sign in', 'signin', 'log in', 'login', 'password', 'reset', 'forgot', 'account', 'sign up', 'register', 'verify email', 'verification'],
    answer:
      'Use the Sign in button at the top of the page. You can sign in with Google or with email and password. If you forgot your password, choose "Forgot password?" in the sign-in window and we\'ll email you a reset link (check spam too). Some features, such as promo codes, need a verified email address.',
    links: [{ label: 'Open my dashboard', view: 'app' }],
  },
  {
    id: 'delete-data',
    question: 'How do I delete my account or data?',
    keywords: ['delete', 'deletion', 'remove my data', 'erase', 'close account', 'gdpr', 'export my data', 'my data'],
    answer: `Email ${CONTACT_EMAILS.support} from the address linked to your account and ask for your account and data to be deleted or exported. We reply within one month, as GDPR requires. Guest data only lives in your own browser, so clearing this site's data removes it.`,
    links: [{ label: 'Privacy policy', view: 'privacy' }, EMAIL_SUPPORT],
  },
  {
    id: 'privacy',
    question: 'Is my data safe?',
    keywords: ['safe', 'secure', 'security', 'privacy', 'private', 'sell my data', 'store', 'stored', 'encryption', 'cookies'],
    answer:
      'Your holdings are stored in Google Firebase and can only be read by your own account. CSV files and CAS PDFs are read in your browser and never uploaded; only the holdings you confirm are saved. We never ask for bank or broker passwords, never sell your data and don\'t use advertising trackers.',
    links: [{ label: 'Privacy policy', view: 'privacy' }],
  },
  {
    id: 'import',
    question: 'How do I import my holdings?',
    keywords: ['import', 'upload', 'csv', 'cas', 'pdf', 'statement', 'degiro', 'trading 212', 'trading212', 'zerodha', 'groww', 'upstox', 'nsdl', 'cdsl', 'cams', 'kfintech', 'demat', 'automatic', 'sync', 'connect broker', 'broker'],
    answer:
      'In your dashboard, open "Import Statement". You can import:\n• A CAS PDF from NSDL or CDSL (all Indian demat accounts such as Zerodha, Groww or Upstox, plus mutual funds) or from CAMS/KFintech (mutual funds). NSDL/CDSL passwords are your PAN in capitals.\n• A DEGIRO or Trading 212 CSV export, or our template CSV for anything else.\nFiles are read on your device and never uploaded. Direct broker connections are not available yet. Import is part of the Pro plan.',
    links: [{ label: 'Open my dashboard', view: 'app' }],
  },
  {
    id: 'holdings',
    question: 'How do I add or edit a holding?',
    keywords: ['add holding', 'edit holding', 'holding', 'holdings', 'units', 'price per', 'rsu', 'shares', 'portfolio', 'tracker', 'dashboard', 'ticker', 'isin'],
    answer: `In your dashboard, choose "Add Holding" and enter the units and price per unit; the total value is worked out for you and converted to euro at the latest European Central Bank rate. Use the Edit button on any row to change it. Free accounts can track up to ${FREE_HOLDINGS_LIMIT} holdings; Pro is unlimited.`,
    links: [{ label: 'Open my dashboard', view: 'app' }],
  },
  {
    id: 'prices',
    question: 'Where do prices and exchange rates come from?',
    keywords: ['exchange rate', 'fx', 'currency', 'ecb', 'nav', 'live price', 'prices', 'update price', 'refresh', 'inr', 'usd', 'rupee', 'dollar'],
    answer:
      'Exchange rates are the official European Central Bank euro reference rates, refreshed every few hours. Indian mutual fund prices (NAVs) come from the free mfapi.in service once a day on Pro. Share prices are not refreshed automatically yet, so update the price per unit yourself when you need to.',
  },
  {
    id: 'investment-account',
    question: 'What is the new Investment Account?',
    keywords: ['investment account', 'savings and investment account', 'psia', 'new account', '50,000', '50000', '50k', '12,000', '12000', '12k', 'budget 2027', 'july 2027', 'threshold'],
    answer: `Budget 2027 announced a new Personal Savings and Investment Account from 1 July 2027. You can pay in up to ${euro(IA.annualContributionLimit)} a year, there is no exit tax or ${DEEMED_DISPOSAL_YEARS}-year deemed disposal inside it, the first ${euro(IA.taxFreeThreshold)} is tax-free, and a ${pct(IA.annualTaxAboveThreshold)} annual charge applies only to the value above ${euro(IA.taxFreeThreshold)}. Final rules depend on legislation.`,
    links: [
      { label: 'Investment Account calculator', view: 'investment-account-calculator' },
      { label: 'Exit tax vs Investment Account', view: 'exit-tax-vs-investment-account' },
    ],
  },
  {
    id: 'exit-tax',
    question: 'How are ETFs taxed in Ireland?',
    keywords: ['etf', 'etfs', 'exit tax', 'fund', 'funds', 'ucits', 'index fund', '38%', '35%', '41%'],
    answer: `Irish and EU-domiciled ETFs and funds pay exit tax rather than CGT: ${pct(EXIT_TAX_RATE_2026)} in 2026, falling to ${pct(EXIT_TAX_RATE)} from 1 January 2027. Losses can't be offset and there's no annual exemption. Every ${DEEMED_DISPOSAL_YEARS} years you are taxed as if you sold (deemed disposal).`,
    links: [
      { label: 'Exit tax calculator', view: 'exit-tax-calculator' },
      { label: 'ETF tax for beginners', view: 'etf-tax-ireland-beginners' },
    ],
  },
  {
    id: 'deemed-disposal',
    question: 'What is deemed disposal?',
    keywords: ['deemed disposal', '8 year', '8-year', 'eight year', 'deemed'],
    answer: `Deemed disposal means Irish and EU funds and ETFs are treated as sold every ${DEEMED_DISPOSAL_YEARS} years after you buy them, so you pay exit tax on the gain even if you didn't sell. Tax paid is credited against tax on the final sale. Each purchase has its own ${DEEMED_DISPOSAL_YEARS}-year clock.`,
    links: [{ label: 'Deemed disposal calculator', view: 'deemed-disposal-calculator' }],
  },
  {
    id: 'cgt',
    question: 'How are shares taxed (CGT)?',
    keywords: ['cgt', 'capital gains', 'shares', 'stocks', 'stock', 'sell shares', '31%', '33%', 'exemption', '1,270', '1270'],
    answer: `Gains on individual shares (including US shares and vested RSUs you later sell) pay Capital Gains Tax at ${pct(CGT_RATE)} following Budget 2027, after an annual exemption of ${euro(CGT_ANNUAL_EXEMPTION)}. Losses can be offset against gains. Check Revenue for the exact start date of the new rate.`,
    links: [{ label: 'Best investment options in Ireland', view: 'best-investment-options-ireland' }],
  },
  {
    id: 'dirt',
    question: 'How is deposit interest taxed?',
    keywords: ['dirt', 'deposit', 'savings account', 'interest', 'bank', 'prize bond', 'prize bonds', 'state savings'],
    answer: `Interest on Irish deposit accounts pays DIRT at ${pct(DIRT_RATE)}, taken by the bank. Prize Bond wins and most State Savings products are tax-free.`,
    links: [
      { label: 'Savings goal calculator', view: 'savings-goal-calculator' },
      { label: 'Best investment options in Ireland', view: 'best-investment-options-ireland' },
    ],
  },
  {
    id: 'pension',
    question: 'How does pension tax relief work?',
    keywords: ['pension', 'prsa', 'retirement', 'tax relief', 'avc', 'lump sum'],
    answer:
      'Pension contributions get income tax relief at your marginal rate (20% or 40%), within age-related limits on a salary capped at €115,000. Growth inside the pension is tax-free and you can usually take part of it as a tax-free lump sum at retirement.',
    links: [{ label: 'Pension calculator', view: 'pension-calculator' }],
  },
  {
    id: 'india-us',
    question: 'How are Indian or US investments taxed in Ireland?',
    keywords: ['india', 'indian', 'mutual fund', 'sip', 'nre', 'nro', 'fcnr', 'dtaa', 'double tax', 'us shares', 'us stocks', 'us tax', 'united states', 'usa', 'american', 'rsu', 'espp', '401k', 'abroad', 'foreign', 'offshore'],
    answer:
      'If you are Irish tax resident, Ireland generally taxes your worldwide income and gains, including Indian mutual funds, shares and deposits and US shares or RSUs. Double taxation agreements usually let you credit tax paid abroad. RSUs are taxed through payroll when they vest; later gains pay CGT. Non-EU funds can fall under the complex offshore fund rules, so check with Revenue or a tax adviser.',
  },
  {
    id: 'xray',
    question: 'How diversified is my portfolio?',
    keywords: ['diversify', 'diversified', 'diversification', 'x-ray', 'xray', 'concentration', 'exposure', 'risk', 'portfolio mix', 'allocation', 'rebalance'],
    answer:
      'The Financial X-Ray breaks your holdings down by asset type, currency (EUR, INR, USD) and country. If more than about 30% sits in one currency or one company, such as employer RSUs or Indian funds, you carry concentration risk. Spreading money across an Irish Investment Account, global funds and a cash reserve makes a portfolio more resilient.',
    links: [{ label: 'Financial X-Ray', section: 'financial-xray' }],
  },
  {
    id: 'calculators',
    question: 'Which calculators do you have?',
    keywords: ['calculator', 'calculators', 'tool', 'tools', 'calculate', 'mortgage', 'savings goal', 'compare'],
    answer:
      'All free, no sign-up: investment calculator, Investment Account calculator, ETF tax calculator, exit tax calculator, deemed disposal calculator, pension calculator, savings goal calculator and mortgage vs investing calculator.',
    links: [{ label: 'All calculators', view: 'calculators' }],
  },
  {
    id: 'advice',
    question: 'Can you tell me what to invest in?',
    keywords: ['advice', 'adviser', 'advisor', 'should i', 'recommend', 'what to buy', 'best fund', 'best etf', 'which etf', 'buy', 'sell', 'invest in'],
    answer:
      'We can\'t give personal financial advice or recommend specific products. Our guides and calculators explain how the options are taxed so you can compare them. For advice on your situation, speak to a Qualified Financial Adviser (QFA) or a tax adviser.',
    links: [{ label: 'Best investment options in Ireland', view: 'best-investment-options-ireland' }],
  },
  {
    id: 'contact',
    question: 'How do I contact a person?',
    keywords: ['contact', 'human', 'person', 'support', 'help', 'email', 'complaint', 'bug', 'problem', 'not working', 'error', 'issue', 'feedback'],
    answer: `Email ${CONTACT_EMAILS.support} for account, billing and data questions, or ${CONTACT_EMAILS.enquiries} for anything else. Include what you were doing and any error message, and we'll get back to you as soon as we can.`,
    links: [EMAIL_SUPPORT],
  },
];

export const SUPPORT_SUGGESTIONS = [
  'How does exit tax work?',
  'Investment Account explained',
  'Pension tax relief',
  'What plans and prices are there?',
];

export const SUPPORT_FALLBACK_ANSWER = `Sorry, I don't have an answer for that yet. I can help with plans and billing, promo codes, your account and data, importing holdings, our calculators and Irish investment tax basics. For anything else, email ${CONTACT_EMAILS.support}.`;

export const SUPPORT_DISCLAIMER = `Educational information only, not financial advice. Tax rates follow ${TAX_RULES_SOURCE}.`;

const normalise = (text: string) =>
  ` ${text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9€%.,'\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function scoreTopic(query: string, topic: SupportTopic): number {
  let score = 0;
  for (const keyword of topic.keywords) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}(?=$|[^a-z0-9])`);
    if (pattern.test(query)) score += keyword.includes(' ') ? 3 : 2;
  }
  return score;
}

export interface SupportMatch {
  topic: SupportTopic;
  score: number;
}

/** Returns the best-matching topics, strongest first. */
export function matchSupportTopics(query: string, limit = 2): SupportMatch[] {
  const q = normalise(query);
  if (!q.trim()) return [];
  return SUPPORT_TOPICS.map((topic) => ({ topic, score: scoreTopic(q, topic) }))
    .filter((m) => m.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface SupportAnswer {
  text: string;
  links: SupportLink[];
  topicId: string | null;
}

/** Answers from the built-in knowledge base. Never throws. */
export function answerFromKnowledgeBase(query: string): SupportAnswer {
  const [best, second] = matchSupportTopics(query, 2);
  if (!best) return { text: SUPPORT_FALLBACK_ANSWER, links: [EMAIL_SUPPORT], topicId: null };
  const links = [...(best.topic.links ?? [])];
  let text = best.topic.answer;
  // When two topics tie, the question likely spans both (e.g. "cancel and refund").
  if (second && second.score === best.score) {
    text += `\n\n${second.topic.answer}`;
    for (const l of second.topic.links ?? []) if (!links.some((x) => x.label === l.label)) links.push(l);
  }
  return { text, links: links.slice(0, 3), topicId: best.topic.id };
}

/** Plain-text knowledge base for the AI model's instructions. */
export function supportKnowledgeAsText(): string {
  return SUPPORT_TOPICS.map((t) => `Q: ${t.question}\nA: ${t.answer}`).join('\n\n');
}
