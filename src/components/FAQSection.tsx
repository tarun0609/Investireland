import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
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
      a: 'As announced in Budget 2027, it is a proposed personal investment account designed to encourage retail investing. Under current rules, gains on many funds and ETFs are subject to exit tax (38% from 1 January 2026) and the 8-year deemed disposal rule; the proposed account would replace these with simpler treatment up to the announced limits.'
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
      a: 'InvestIreland AI allows international professionals (particularly Indian expats and US tech employees living in Ireland) to track their overseas mutual funds in Rupees (₹) and US stocks in Dollars ($) alongside their Irish pensions and savings.       Our models use indicative reference exchange rates and general Ireland-India DTAA double-taxation principles; they are not a substitute for professional tax advice.'
    },
    {
      q: 'Are the Budget 2027 figures final statutory law?',
            a: 'No. These figures reflect the policy framework announced by the Department of Finance. Detailed legislation and provider rules are subject to final enactment by the Oireachtas. We update the site manually, so always check the official sources linked in our guides for the latest position.'
    }
  ];

  return (
    <section id="faq" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Clear answers to common questions.
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Everything you need to know about the app, what it is (and isn’t), and Ireland’s proposed investment reforms.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            const buttonId = `faq-question-${idx}`;
            const panelId = `faq-answer-${idx}`;
            return (
              <div
                key={idx}
                className="bg-slate-50/70 rounded-xl border border-slate-200 overflow-hidden transition-all"
              >
                <h3 className="m-0">
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer text-sm sm:text-base"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown aria-hidden="true" className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-emerald-700' : 'text-slate-500'}`} />
                  </button>
                </h3>
                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
