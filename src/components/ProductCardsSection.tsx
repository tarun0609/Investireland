import React from 'react';
import { 
  Coins, 
  PieChart, 
  Layers, 
  Bot, 
  ArrowRight,
  Check
} from 'lucide-react';

interface ProductCardsSectionProps {
  onOpenDashboard: () => void;
  onOpenWaitlist: () => void;
}

export const ProductCardsSection: React.FC<ProductCardsSectionProps> = ({
  onOpenDashboard,
  onOpenWaitlist
}) => {
  const features = [
    {
      badge: 'Account Tracking',
      title: 'Investment Account Tracker',
      desc: 'Get ready for the proposed 1 July 2027 launch with a contribution tracker for your planned account.',
      points: [
        'Track annual contributions towards the €12,000 cap',
        'Monitor remaining headroom in the current tax year',
        'Visualise distance to the €50,000 threshold',
        'Estimate the proposed 1% charge on any excess'
      ],
      icon: <Coins className="w-5 h-5 text-emerald-700" />,
      accent: 'border-emerald-200 bg-emerald-50/30'
    },
    {
      badge: 'Unified Holdings',
      title: 'Multi-Country Portfolio View',
      desc: 'All your assets—Irish pensions, European UCITS ETFs, Indian mutual funds, and US RSUs—in one unified ledger.',
      points: [
        'Supports EUR (€), INR (₹), USD ($) and GBP (£)',
        'Converts using indicative reference exchange rates',
        'Distinguish liquid funds from locked pensions',
        'Manual entry or CSV import'
      ],
      icon: <PieChart className="w-5 h-5 text-teal-700" />,
      accent: 'border-teal-200 bg-teal-50/30'
    },
    {
      badge: 'Signature Analytics',
      title: 'The Financial X-Ray',
      desc: 'Strip away the fog and see your true geographic, single-stock, and currency exposures.',
      points: [
        'Geographic breakdown (Ireland, India, US, EU)',
        'Top 5 holdings concentration analysis',
        'Currency exposure breakdown against the Euro',
        'Hypothetical -20% market correction stress test'
      ],
      icon: <Layers className="w-5 h-5 text-indigo-700" />,
      accent: 'border-indigo-200 bg-indigo-50/30'
    },
    {
      badge: 'Plain English Intelligence',
      title: 'Plain English AI Assistant',
      desc: 'Ask your questions in normal everyday language without worrying about finance jargon.',
      points: [
        'Prompted to draw on Revenue and Department of Finance publications',
        'Points you to sources so you can check answers',
        'Separates general rules from hypothetical scenarios',
        'No buy/sell recommendations or sales pressure'
      ],
      icon: <Bot className="w-5 h-5 text-blue-700" />,
      accent: 'border-blue-200 bg-blue-50/30'
    }
  ];

  return (
    <section id="product-cards" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest bg-emerald-100/70 px-3 py-1 rounded-full">
            Core Architecture
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            One simple view of your financial life.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            InvestIreland AI brings together education, analytics, and tracking so you can make informed decisions with calm clarity.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((f, idx) => (
            <div
              key={idx}
              className={`p-5 sm:p-7 rounded-2xl border ${f.accent} bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    {f.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono text-right">
                    {f.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                  {f.desc}
                </p>

                <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                  {f.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Try it in the app</span>
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
