import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is InvestIreland AI?',
      a: 'InvestIreland AI is an educational, analytical, and financial intelligence platform designed to help ordinary people understand, monitor, and organise their investments. The initial product is built around Ireland’s new Personal Savings & Investment Account announced in Budget 2027 and cross-border asset tracking across Ireland, India, and the US.'
    },
    {
      q: 'Does InvestIreland AI manage my money or execute trades?',
      a: 'No. InvestIreland AI is strictly an educational and analytical platform. We are NOT a broker, bank, wealth manager, or custodian. We do not hold client funds, manage portfolios, or execute trade orders.'
    },
    {
      q: 'Does InvestIreland AI provide regulated financial advice?',
      a: 'No. The platform is designed for educational and analytical purposes rather than personal regulated investment advice. We provide objective mathematical models, official statutory information, and scenario planning tools so you can make informed decisions or consult a Qualified Financial Adviser (QFA).'
    },
    {
      q: 'What is Ireland’s new Investment Account?',
      a: 'Announced in the Budget 2027 policy framework, it is a personal investment account designed to encourage retail investing by removing the punitive 41% exit tax and 8-year deemed disposal rules for retail accounts up to the announced limits.'
    },
    {
      q: 'When does the new account open?',
      a: 'The announced commencement date is 1 July 2027. Ahead of this date, draft legislation will be scrutinized by the Oireachtas in the Finance Bill.'
    },
    {
      q: 'What is the annual contribution limit?',
      a: 'The announced annual contribution limit is €12,000 per tax year (or up to €1,000 per month). Once reached in a given calendar year, you must wait until the following tax year to contribute further.'
    },
    {
      q: 'What is the €50,000 tax-free threshold?',
      a: 'All investment growth and capital inside the account up to €50,000 is 100% tax-free. If and when your account balance exceeds €50,000, an annual charge of 1.0% is applied strictly to the amount over €50,000.'
    },
    {
      q: 'How does it capture Indian mutual funds and US RSUs?',
      a: 'InvestIreland AI allows international professionals (particularly Indian expats and US tech employees living in Ireland) to track their overseas mutual funds in Rupees (₹) and US stocks in Dollars ($) alongside their Irish pensions and savings. Our models incorporate currency conversions and general Ireland-India DTAA double-taxation principles.'
    },
    {
      q: 'Are the Budget 2027 figures final statutory law?',
      a: 'These figures reflect the policy framework announced by the Department of Finance. Detailed statutory legislation and operational provider rules are subject to final enactment by the Oireachtas. Our platform pulls live status updates from official legislative trackers.'
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
            Everything you need to know about our platform, regulatory positioning, and Ireland’s upcoming investment reforms.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-slate-50/70 rounded-xl border border-slate-200 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer text-sm sm:text-base"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-emerald-700' : 'text-slate-400'}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
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
