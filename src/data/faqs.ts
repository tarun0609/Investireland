export interface Faq {
  q: string;
  a: string;
}

/** Single source for the on-page FAQ and the FAQPage structured data injected at build time. */
export const FAQS: Faq[] = [
  {
    q: 'What is InvestIreland AI?',
    a: 'InvestIreland AI is an independent educational and analytical tool designed to help ordinary people understand, monitor, and organise their investments. The initial product is built around Ireland’s proposed Investment Account announced in Budget 2027 and cross-border asset tracking across Ireland, India, and the US.'
  },
  {
    q: 'Does InvestIreland AI manage my money or execute trades?',
    a: 'No. InvestIreland AI is strictly an educational and analytical platform. We are NOT a broker, bank, wealth manager, or custodian. We do not hold client funds, manage portfolios, or execute trade orders.'
  },
  {
    q: 'Does InvestIreland AI provide regulated financial advice?',
    a: 'No. InvestIreland AI is not regulated by the Central Bank of Ireland and does not give personal investment, tax or financial advice. We provide illustrative calculators, summaries of official sources, and scenario planning tools so you can make informed decisions or consult a Qualified Financial Adviser (QFA).'
  },
  {
    q: 'What is Ireland’s new Investment Account?',
    a: 'Announced in Budget 2027, the Investment Account is a new personal account designed to encourage retail investing, launching on 1 July 2027. Outside it, gains on many funds and ETFs are subject to exit tax of 38% in 2026, falling to 35% from 1 January 2027, and the 8-year deemed disposal rule remains. Inside the account there is no CGT, deemed disposal or DWT: you can contribute up to €12,000 a year, growth is tax-free up to €50,000, and a 1% annual charge applies to value above that.'
  },
  {
    q: 'When does the new account open?',
    a: 'The announced target commencement date is 1 July 2027. Before then, the detailed legislation must be scrutinised by the Oireachtas as part of the Finance Bill, so dates and details may change.'
  },
  {
    q: 'What is the annual contribution limit?',
    a: 'The announced annual contribution limit is €12,000 per tax year. Once reached in a given tax year, you would need to wait until the following tax year to contribute further. Check the final legislation for how the limit is applied.'
  },
  {
    q: 'What is the €50,000 tax-free threshold?',
    a: 'As announced, investment growth inside the account on balances up to €50,000 would not be taxed. If your account balance exceeds €50,000, an annual charge of 1.0% would apply to the amount over €50,000. These figures are subject to final legislation.'
  },
  {
    q: 'How does it capture Indian mutual funds and US RSUs?',
    a: 'InvestIreland AI allows international professionals (particularly Indian expats and US tech employees living in Ireland) to track their overseas mutual funds in Rupees (₹) and US stocks in Dollars ($) alongside their Irish pensions and savings. Our models use indicative reference exchange rates and general Ireland-India DTAA double-taxation principles; they are not a substitute for professional tax advice.'
  },
  {
    q: 'Are the Budget 2027 figures final statutory law?',
    a: 'No. These figures reflect the policy framework announced by the Department of Finance. Detailed legislation and provider rules are subject to final enactment by the Oireachtas. We update the site manually, so always check the official sources linked in our guides for the latest position.'
  }
];
