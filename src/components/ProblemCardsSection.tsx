import React from 'react';
import { 
  Layers, 
  PieChart, 
  Receipt, 
  TrendingDown, 
  MessageSquareQuote,
  Scale
} from 'lucide-react';

export const ProblemCardsSection: React.FC = () => {
  const problems = [
    {
      icon: <Layers className="w-5 h-5 text-emerald-700" />,
      title: 'How much have I invested?',
      description: 'Track ongoing contributions, deposits, and allowances across multiple providers in Ireland and overseas without messy spreadsheets.'
    },
    {
      icon: <PieChart className="w-5 h-5 text-teal-700" />,
      title: 'What do I actually own?',
      description: 'See your real portfolio of ETFs, shares, Indian mutual funds, pensions, and cash pooled cleanly in one transparent place.'
    },
    {
      icon: <Scale className="w-5 h-5 text-indigo-700" />,
      title: 'Am I diversified?',
      description: 'Understand single-stock concentration, US equity exposure, and how much of your total net worth remains locked in cash.'
    },
    {
      icon: <Receipt className="w-5 h-5 text-amber-700" />,
      title: 'How much am I paying in tax & fees?',
      description: 'See the compounding drag of exit tax and 8-year deemed disposal on Irish funds, compared with the proposed €50,000 Investment Account framework.'
    },
    {
      icon: <TrendingDown className="w-5 h-5 text-rose-700" />,
      title: 'What happens if markets fall?',
      description: 'Stress-test your portfolio against hypothetical -20% market corrections, currency shifts, or inflationary spikes.'
    },
    {
      icon: <MessageSquareQuote className="w-5 h-5 text-blue-700" />,
      title: 'What does all this mean?',
      description: 'Ask our AI assistant in plain English, without confusing acronyms or aggressive sales pitches.'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
            The Investor Dilemma
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Investing shouldn’t require a finance degree.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Most people in Ireland know they shouldn't leave all their savings losing value in low-interest accounts, but complex taxes and fragmented assets create paralysis.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((p, idx) => (
            <div 
              key={idx}
              className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-slate-50 transition-all shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-xs">
                {p.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {p.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
