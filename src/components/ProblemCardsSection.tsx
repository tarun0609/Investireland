import React from 'react';
import { 
  HelpCircle, 
  Layers, 
  PieChart, 
  Receipt, 
  TrendingDown, 
  MessageSquareQuote,
  ArrowRight
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
      icon: <Layers className="w-5 h-5 text-indigo-700" />,
      title: 'Am I diversified?',
      description: 'Understand single-stock concentration, US equity exposure, and how much of your total net worth remains locked in cash.'
    },
    {
      icon: <Receipt className="w-5 h-5 text-amber-700" />,
      title: 'How much am I paying in tax & fees?',
      description: 'Expose the hidden compounding drag of Ireland’s 41% deemed disposal vs the new €50,000 tax-free framework.'
    },
    {
      icon: <TrendingDown className="w-5 h-5 text-rose-700" />,
      title: 'What happens if markets fall?',
      description: 'Stress-test your portfolio against real-world -20% market corrections, currency shifts, or inflationary spikes.'
    },
    {
      icon: <MessageSquareQuote className="w-5 h-5 text-blue-700" />,
      title: 'What does all this mean?',
      description: 'Ask our financial intelligence assistant in plain English, without confusing acronyms or aggressive sales pitches.'
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

export const ProductCardsSection: React.FC<{ onExploreFeature: (feature: string) => void }> = ({ onExploreFeature }) => {
  const features = [
    {
      id: 'investment-account',
      title: 'Investment Account',
      tag: 'Budget 2027 Core',
      description: 'Track your annual contributions, remaining allowance against the €12,000 limit, cumulative account growth, and distance to the €50,000 threshold.',
      bullets: ['Contribution allowance tracker', 'Remaining annual allowance', 'Account market value', 'Threshold progress alerts']
    },
    {
      id: 'portfolio',
      title: 'Unified Portfolio',
      tag: 'Multi-Currency',
      description: 'Consolidate everything you own into a clean financial ledger: shares, ETFs, mutual funds, bonds, cash, and pension assets across Ireland, India, and the US.',
      bullets: ['Shares & UCITS ETFs', 'Indian Mutual Funds (₹ Lakhs)', 'US Tech RSUs & ESPP', 'Irish PRSA & Pensions']
    },
    {
      id: 'financial-xray',
      title: 'Financial X-Ray',
      tag: 'Signature Tool',
      description: 'Understand your true exposure at a glance: asset allocation, geography, concentration, currency exposure, and liquidity buffers.',
      bullets: ['Asset class breakdown', 'Geographic exposure', 'Top 5 concentration test', 'Currency risk (EUR/INR/USD)']
    },
    {
      id: 'ai-assistant',
      title: 'AI Assistant',
      tag: 'Plain English',
      description: 'Ask complex money and tax questions using ordinary conversational language, backed by Revenue.ie and Department of Finance official data.',
      bullets: ['Section 25 safety guardrails', 'Clear statutory citations', 'Zero pushy sales advice', 'Hypothetical scenario testing']
    }
  ];

  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
            One Comprehensive System
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            One simple view of your financial life.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Everything ordinary investors need to organize, monitor, and optimize their capital from Ireland.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {f.description}
                </p>
                <ul className="space-y-1.5 border-t border-slate-100 pt-3">
                  {f.bullets.map((b, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-600" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100">
                <button
                  onClick={() => onExploreFeature(f.id)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
