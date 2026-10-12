import React from 'react';
import { Currency } from '../types';
import { formatCurrency, convertFromEUR } from '../services/fiscalDataService';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Coins, 
  Lock
} from 'lucide-react';

interface HeroSectionProps {
  currentCurrency: Currency;
  onOpenWaitlist: () => void;
  onExploreCalculator: () => void;
  onOpenDashboard: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  currentCurrency,
  onOpenWaitlist,
  onExploreCalculator,
  onOpenDashboard
}) => {
  // Demo figures in EUR
  const totalAssetsEUR = 82450;
  const cashEUR = 30000;
  const investmentsEUR = 27450;
  const pensionEUR = 25000;
  const investmentAccountUsedEUR = 8000;
  const investmentAccountLimitEUR = 12000;

  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200/60">
      {/* Background Subtle Irish Clover / Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Announcement Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex flex-wrap items-center justify-center text-center gap-x-2 gap-y-0.5 px-3.5 py-1.5 rounded-2xl sm:rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs sm:text-sm font-medium shadow-xs max-w-full">
            <span className="flex h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
            <span className="font-semibold text-emerald-800">Proposed Budget 2027 account:</span>
            <span>€12,000 annual allowance &middot; €50,000 tax-free threshold</span>
          </div>
        </div>

        {/* Headline & Subheadline */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.12]">
            Your money.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900">
              Finally made easier to understand.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
            Ireland’s new Investment Account is due to launch in 2027, subject to final legislation. InvestIreland AI helps you understand your investments, track your contribution allowance, and see your cross-border financial picture—across Ireland, India, and the US—in one simple place.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpenWaitlist}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all cursor-pointer group"
            >
              <span>Join Early Access</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onExploreCalculator}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs hover:border-slate-400 transition-all cursor-pointer"
            >
              <span>Explore the FY26/FY27 Calculator</span>
            </button>
          </div>

          {/* Trust Statement */}
          <p className="mt-4 text-xs sm:text-sm text-slate-700 font-medium flex items-center justify-center gap-2 text-left sm:text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Educational tools, not financial advice. No trading. No promises of returns.</span>
          </p>
        </div>

        {/* Hero Product Demo Mockup (Section 7 of Spec) */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
            
            {/* Mockup Window Chrome Header */}
            <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-slate-400 ml-3 hidden sm:inline">
                  investireland.ai &middot; Unified Financial Snapshot
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="hidden sm:inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Illustrative sample data
                </span>
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-emerald-300 transition-colors cursor-pointer"
                >
                  Try the app &rarr;
                </button>
              </div>
            </div>

            {/* Dashboard Content Inside Mockup */}
            <div className="p-6 sm:p-8 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Example Financial Snapshot
                  </span>
                  <div className="flex flex-wrap items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                      {formatCurrency(convertFromEUR(totalAssetsEUR, currentCurrency), currentCurrency)}
                    </span>
                    <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Sample portfolio
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">
                    Example mix of Irish assets, Indian mutual funds &amp; US equity grants
                  </p>
                </div>

                {/* Diversification Score Card */}
                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-4 sm:min-w-[190px]">
                  <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base font-mono border border-emerald-100">
                    78<span className="text-[10px] text-slate-600 font-normal">/100</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Portfolio Diversification</div>
                    <div className="text-[11px] text-emerald-800 font-medium">Strong resilience</div>
                  </div>
                </div>
              </div>

              {/* Asset Allocation Tiles */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
                
                {/* Cash Tile */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-medium mb-1">
                    <span>Cash Reserves</span>
                    <Coins className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900">
                    {formatCurrency(convertFromEUR(cashEUR, currentCurrency), currentCurrency)}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1">
                    Emergency buffer (36%)
                  </div>
                </div>

                {/* Investments Tile */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-medium mb-1">
                    <span>Investments (IE/IN/US)</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900">
                    {formatCurrency(convertFromEUR(investmentsEUR, currentCurrency), currentCurrency)}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1">
                    ETFs, ₹ Funds &amp; RSUs (33%)
                  </div>
                </div>

                {/* Pension Tile */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-medium mb-1">
                    <span>Irish Pension / PRSA</span>
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900">
                    {formatCurrency(convertFromEUR(pensionEUR, currentCurrency), currentCurrency)}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1">
                    Tax-relieved long-term (30%)
                  </div>
                </div>

                {/* Budget 2027 Investment Account Tile */}
                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-emerald-950 font-semibold mb-1">
                    <span>Investment Account</span>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-950">
                    {formatCurrency(convertFromEUR(investmentAccountUsedEUR, currentCurrency), currentCurrency)}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-medium mt-1">
                    €4,000 remaining of €12k limit
                  </div>
                </div>

              </div>

              {/* Progress bar towards €12,000 annual allowance */}
              <div className="mt-5 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold text-slate-700 mb-1.5">
                  <span>2027 Investment Account allowance</span>
                  <span className="text-emerald-700 font-bold">
                    €8,000 of €12,000 (66.7% Planned)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2.5 rounded-full w-[66.7%]" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-600 mt-1.5 font-medium">
                  <span>€42,000 left before the €50,000 threshold (1% annual charge above it)</span>
                  <span>No 8-year deemed disposal (as proposed)</span>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
