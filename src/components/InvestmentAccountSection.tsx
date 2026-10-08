import React from 'react';
import { 
  Calendar, 
  Coins, 
  ShieldCheck, 
  Percent, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  HelpCircle
} from 'lucide-react';

interface InvestmentAccountSectionProps {
  onOpenWaitlist: () => void;
  onExploreCalculator: () => void;
}

export const InvestmentAccountSection: React.FC<InvestmentAccountSectionProps> = ({
  onOpenWaitlist,
  onExploreCalculator
}) => {
  return (
    <section id="investment-account" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Historic Reform in Irish Personal Finance
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Get ready for Ireland’s new Investment Account.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            The new account is scheduled to open on <strong className="text-slate-900">1 July 2027</strong>. The announced framework includes a <strong className="text-slate-900">€12,000 annual contribution limit</strong> and a <strong className="text-slate-900">€50,000 tax-free threshold</strong>, with a <strong className="text-slate-900">1% annual charge</strong> strictly on value above that threshold.
          </p>
        </div>

        {/* 4 Core Framework Metric Cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
              €12,000
            </div>
            <div className="text-sm font-bold text-slate-800 mt-2">
              Maximum annual contribution
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-normal">
              Contribute up to €1,000 per month or lump sum annually to shelter gains.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
              €50,000
            </div>
            <div className="text-sm font-bold text-slate-800 mt-2">
              Announced tax-free threshold
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-normal">
              Capital growth and holdings up to €50k compound completely exempt from tax.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <Percent className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
              1%
            </div>
            <div className="text-sm font-bold text-slate-800 mt-2">
              Annual charge above threshold
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-normal">
              Applied exclusively to the marginal balance exceeding €50,000.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              1 July 2027
            </div>
            <div className="text-sm font-bold text-slate-800 mt-2">
              Planned launch date
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-normal">
              Subject to pre-legislative scrutiny and parliamentary enactment in the Finance Bill.
            </p>
          </div>

        </div>

        {/* Deep Dive: Clear distinctions (Spec Section 21) */}
        <div className="mt-12 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl p-6 sm:p-8 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-emerald-700 shrink-0" />
            <h3 className="text-lg font-bold text-slate-900">
              Crucial Definitions: What you must distinguish
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-emerald-700 uppercase">1. Contribution Limit</span>
              <h4 className="text-base font-bold text-slate-900 mt-1">€12,000 / tax year</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                The total amount of cash you can deposit into your account within a single tax year. Once reached, you must wait for the next tax year.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-teal-700 uppercase">2. Account Value</span>
              <h4 className="text-base font-bold text-slate-900 mt-1">Contributions + Growth</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                The total market value of your invested ETFs, stocks and cash. This can grow well past €50,000 or €100,000 without capping your contributions.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-amber-700 uppercase">3. Tax Threshold</span>
              <h4 className="text-base font-bold text-slate-900 mt-1">€50,000 Ceiling</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                The threshold before any tax charge applies. If your balance is €60,000, the 1% annual fee only applies to €10,000 (€100/year).
              </p>
            </div>
          </div>

          {/* Legislative Disclaimer (Spec Section 8) */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-start gap-3 text-xs text-slate-700">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Official Disclaimer:</strong> These figures reflect the Budget 2027 framework announced by the Department of Finance and the Irish Government. Detailed legislation, administrative rules, and eligible provider specifications are subject to parliamentary debate and final enactment.
            </p>
          </div>
        </div>

        {/* Section CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onExploreCalculator}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all cursor-pointer"
          >
            <span>Simulate your savings in the Calculator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenWaitlist}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-all cursor-pointer"
          >
            <span>Reserve Early Access</span>
          </button>
        </div>

      </div>
    </section>
  );
};
