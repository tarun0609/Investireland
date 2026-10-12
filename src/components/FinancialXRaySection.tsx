import React, { useState } from 'react';
import { Currency, Holding } from '../types';
import { computeFinancialXRay, TOP5_CONCENTRATION_PCT } from '../services/financialXRayService';
import { formatCurrency, convertFromEUR } from '../services/fiscalDataService';
import { Layers, Sparkles, TrendingDown, Globe2, ArrowRight } from 'lucide-react';

interface FinancialXRaySectionProps {
  currentCurrency: Currency;
  holdings: Holding[];
  onOpenWaitlist: () => void;
  onOpenDashboard: () => void;
}

export const FinancialXRaySection: React.FC<FinancialXRaySectionProps> = ({
  currentCurrency,
  holdings,
  onOpenWaitlist,
  onOpenDashboard
}) => {
  const [shockScenario, setShockScenario] = useState<'normal' | 'market_drop' | 'fx_shift'>('normal');

  // If shock scenario is active, simulate modified holdings
  const activeHoldings = holdings.map(h => {
    let multiplier = 1.0;
    if (shockScenario === 'market_drop') {
      if (h.assetType === 'Share' || h.assetType === 'ETF' || h.assetType === 'Mutual Fund' || h.assetType === 'RSU') {
        multiplier = 0.80; // 20% drop
      }
    } else if (shockScenario === 'fx_shift') {
      if (h.currency === 'INR') multiplier = 0.90; // 10% INR depreciation vs EUR
      if (h.currency === 'USD') multiplier = 1.08; // 8% USD appreciation vs EUR
    }
    return {
      ...h,
      currentValue: h.currentValue * multiplier
    };
  });

  const xray = computeFinancialXRay(activeHoldings, currentCurrency);

  return (
    <section id="financial-xray" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-200">
            <Layers className="w-3.5 h-3.5" />
            <span>Signature Financial Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            The Financial X-Ray: See your complete picture in seconds.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Most people have money scattered across 3 or 4 apps in different countries. The Financial X-Ray breaks down your genuine risk, concentration, and tax exposure without the finance jargon.
          </p>
        </div>

        {/* Shock Scenario Selector */}
        <div className="mt-8 flex justify-center">
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex flex-wrap justify-center items-center gap-1 text-xs font-bold max-w-full" role="group" aria-label="Stress test scenario">
            <span className="text-slate-500 px-3 hidden sm:inline">Stress Test:</span>
            <button
              type="button"
              aria-pressed={shockScenario === 'normal'}
              onClick={() => setShockScenario('normal')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                shockScenario === 'normal'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Baseline Snapshot
            </button>
            <button
              type="button"
              aria-pressed={shockScenario === 'market_drop'}
              onClick={() => setShockScenario('market_drop')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                shockScenario === 'market_drop'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Simulate -20% Market Fall</span>
            </button>
            <button
              type="button"
              aria-pressed={shockScenario === 'fx_shift'}
              onClick={() => setShockScenario('fx_shift')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                shockScenario === 'fx_shift'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Simulate FX Shift (INR &minus;10% / USD +8%)</span>
            </button>
          </div>
        </div>

        {/* X-Ray Main Card */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200/90 shadow-md p-6 sm:p-8">
          
          {/* Top Headline Figures */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Net Tracked Financial Assets
              </span>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-950 font-mono">
                  {formatCurrency(convertFromEUR(xray.totalAssetsEUR, currentCurrency), currentCurrency)}
                </span>
                {shockScenario !== 'normal' && (
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full animate-pulse">
                    Stress-tested scenario active
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {activeHoldings.length} {activeHoldings.length === 1 ? 'position' : 'positions'} tracked
              </span>
            </div>
          </div>

          {/* 4 Multi-bar Analytics Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            
            {/* 1. Asset Allocation */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Asset Allocation
                </span>
                <span className="text-xs text-slate-500 font-mono">% of total</span>
              </div>

              {/* Stacked Bar */}
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200">
                {xray.assetAllocation.map((a) => (
                  <div
                    key={a.category}
                    style={{ width: `${a.percentage}%`, backgroundColor: a.color }}
                    title={`${a.category}: ${a.percentage}%`}
                    className="h-full transition-all"
                  />
                ))}
              </div>

              {/* Legend List */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                {xray.assetAllocation.map((a) => (
                  <div key={a.category} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="flex items-center gap-1.5 text-slate-600 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="truncate">{a.category}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">{a.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Geographic Exposure */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Geographic Exposure
                </span>
                <span className="text-xs text-slate-500 font-mono">Jurisdictions</span>
              </div>

              {/* Stacked Bar */}
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200">
                {xray.geographicExposure.map((g) => (
                  <div
                    key={g.country}
                    style={{ width: `${g.percentage}%`, backgroundColor: g.color }}
                    title={`${g.country}: ${g.percentage}%`}
                    className="h-full transition-all"
                  />
                ))}
              </div>

              {/* Legend List */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                {xray.geographicExposure.map((g) => (
                  <div key={g.country} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                      <span>{g.country}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">{g.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Concentration & Single Stock Risk */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Concentration &amp; Exposure
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  xray.concentration.isConcentrated ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {xray.concentration.isConcentrated ? 'Concentrated' : 'Well Spread'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between gap-2 text-slate-700 mb-1">
                    <span className="min-w-0 truncate" title={xray.concentration.topHoldingName}>Largest Single Holding ({xray.concentration.topHoldingName}):</span>
                    <span className="font-mono font-bold shrink-0">{xray.concentration.topHoldingPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${xray.concentration.topHoldingPct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 mb-1">
                    <span>Top 5 Holdings Combined:</span>
                    <span className="font-mono font-bold">{xray.concentration.top5Pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-2 rounded-full ${xray.concentration.top5Pct > TOP5_CONCENTRATION_PCT && activeHoldings.length > 5 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                      style={{ width: `${xray.concentration.top5Pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Currency Exposure */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Currency Exposure
                </span>
                <span className="text-xs text-slate-500 font-mono">FX Risk</span>
              </div>

              <div className="space-y-2 text-xs">
                {xray.currencyExposure.map((c) => (
                  <div key={c.currency} className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">
                      {c.currency === 'EUR' ? 'Euro (€ EUR)' : c.currency === 'INR' ? 'Indian Rupee (₹ INR)' : c.currency === 'USD' ? 'US Dollar ($ USD)' : 'British Pound (£ GBP)'}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500">{formatCurrency(convertFromEUR(c.valueEUR, currentCurrency), currentCurrency)}</span>
                      <span className="font-mono font-bold text-slate-900 w-10 text-right">{c.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Plain English AI Diagnosis Box (Spec Section 13 & 60) */}
          <div className="mt-8 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 rounded-xl p-5 border border-emerald-200 flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Automated Summary (rule-based, plain English)
              </div>
              <p className="text-sm text-slate-800 mt-1 leading-relaxed">
                {xray.aiDiagnosis}
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Uses bundled indicative FX rates. General information only, not financial advice.
              </p>
            </div>
          </div>

        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onOpenDashboard}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all cursor-pointer"
          >
            <span>Run Financial X-Ray on Your Own Holdings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
