import React, { useState, useMemo } from 'react';
import { Holding, Currency } from '../types';
import { convertToEUR, convertFromEUR, formatCurrency, FALLBACK_FISCAL_DATA } from '../services/fiscalDataService';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Globe, 
  Info, 
  Flame, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  Sparkles,
  Shield,
  Layers,
  Calendar,
  HelpCircle
} from 'lucide-react';

interface CurrencyVolatilityHeatmapProps {
  holdings: Holding[];
  currentCurrency: Currency;
  onNavigateTab?: (tab: string) => void;
}

// 30-day realistic historical volatility data relative to EUR
// Pairs tracked: EUR/USD, EUR/INR, EUR/GBP
interface VolatilitySnapshot {
  pair: 'EUR/USD' | 'EUR/INR' | 'EUR/GBP';
  code: 'USD' | 'INR' | 'GBP';
  flag: string;
  name: string;
  currentRate: number;
  rate30dAgo: number;
  minRate30d: number;
  maxRate30d: number;
  pctChange30d: number;
  volatilityStdDevPct: number; // 30-day annualized or standard dev percentage
  riskLevel: 'Low' | 'Moderate' | 'High';
  heatIntensity: number; // 0 to 100 for color mapping
  dailyTrend: number[]; // 30 points of historical rate trajectory
}

const HISTORICAL_30D_CURRENCIES: VolatilitySnapshot[] = [
  {
    pair: 'EUR/INR',
    code: 'INR',
    flag: '🇮🇳',
    name: 'Indian Rupee',
    currentRate: 91.24,
    rate30dAgo: 89.15,
    minRate30d: 88.92,
    maxRate30d: 91.48,
    pctChange30d: 2.34, // EUR gained ~2.34% vs INR (INR depreciated against Euro)
    volatilityStdDevPct: 6.42,
    riskLevel: 'Moderate',
    heatIntensity: 68,
    dailyTrend: [
      89.15, 89.20, 89.12, 89.35, 89.50, 89.42, 89.65, 89.80, 89.72, 89.95,
      90.10, 90.05, 90.22, 90.35, 90.28, 90.50, 90.45, 90.62, 90.75, 90.70,
      90.85, 90.95, 90.88, 91.02, 91.15, 91.08, 91.20, 91.18, 91.22, 91.24
    ]
  },
  {
    pair: 'EUR/USD',
    code: 'USD',
    flag: '🇺🇸',
    name: 'US Dollar',
    currentRate: 1.085,
    rate30dAgo: 1.069,
    minRate30d: 1.065,
    maxRate30d: 1.092,
    pctChange30d: 1.50, // EUR gained 1.5% vs USD
    volatilityStdDevPct: 5.18,
    riskLevel: 'Moderate',
    heatIntensity: 52,
    dailyTrend: [
      1.069, 1.068, 1.070, 1.067, 1.065, 1.068, 1.072, 1.074, 1.071, 1.073,
      1.076, 1.078, 1.075, 1.079, 1.082, 1.080, 1.084, 1.087, 1.085, 1.088,
      1.090, 1.092, 1.089, 1.087, 1.085, 1.086, 1.084, 1.085, 1.086, 1.085
    ]
  },
  {
    pair: 'EUR/GBP',
    code: 'GBP',
    flag: '🇬🇧',
    name: 'British Pound',
    currentRate: 0.856,
    rate30dAgo: 0.862,
    minRate30d: 0.852,
    maxRate30d: 0.865,
    pctChange30d: -0.70, // EUR dipped -0.7% vs GBP (GBP strengthened)
    volatilityStdDevPct: 3.85,
    riskLevel: 'Low',
    heatIntensity: 34,
    dailyTrend: [
      0.862, 0.863, 0.861, 0.864, 0.865, 0.862, 0.860, 0.859, 0.861, 0.858,
      0.857, 0.859, 0.856, 0.858, 0.855, 0.856, 0.854, 0.855, 0.853, 0.854,
      0.852, 0.853, 0.855, 0.856, 0.854, 0.855, 0.857, 0.856, 0.855, 0.856
    ]
  }
];

export const CurrencyVolatilityHeatmap: React.FC<CurrencyVolatilityHeatmapProps> = ({
  holdings,
  currentCurrency,
  onNavigateTab
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | 'INR' | 'USD' | 'GBP'>('ALL');
  const [showFxGuide, setShowFxGuide] = useState(false);

  // Group user holdings by foreign currency denominations
  const foreignHoldingsSummary = useMemo(() => {
    const totalAssetsEUR = holdings.reduce((sum, h) => sum + convertToEUR(h.currentValue, h.currency), 0);

    const currencyMap: Record<string, {
      code: 'INR' | 'USD' | 'GBP' | 'EUR';
      holdings: Holding[];
      totalInNative: number;
      totalInEUR: number;
      shareOfPortfolioPct: number;
    }> = {
      INR: { code: 'INR', holdings: [], totalInNative: 0, totalInEUR: 0, shareOfPortfolioPct: 0 },
      USD: { code: 'USD', holdings: [], totalInNative: 0, totalInEUR: 0, shareOfPortfolioPct: 0 },
      GBP: { code: 'GBP', holdings: [], totalInNative: 0, totalInEUR: 0, shareOfPortfolioPct: 0 },
      EUR: { code: 'EUR', holdings: [], totalInNative: 0, totalInEUR: 0, shareOfPortfolioPct: 0 }
    };

    holdings.forEach(h => {
      const cur = h.currency as 'INR' | 'USD' | 'GBP' | 'EUR';
      if (currencyMap[cur]) {
        currencyMap[cur].holdings.push(h);
        currencyMap[cur].totalInNative += h.currentValue;
        currencyMap[cur].totalInEUR += convertToEUR(h.currentValue, h.currency);
      }
    });

    // Calculate share
    Object.keys(currencyMap).forEach(key => {
      const item = currencyMap[key];
      item.shareOfPortfolioPct = totalAssetsEUR > 0 ? (item.totalInEUR / totalAssetsEUR) * 100 : 0;
    });

    return {
      totalAssetsEUR,
      currencyMap,
      totalForeignEUR: currencyMap.INR.totalInEUR + currencyMap.USD.totalInEUR + currencyMap.GBP.totalInEUR,
      totalForeignPct: totalAssetsEUR > 0 
        ? ((currencyMap.INR.totalInEUR + currencyMap.USD.totalInEUR + currencyMap.GBP.totalInEUR) / totalAssetsEUR) * 100 
        : 0
    };
  }, [holdings]);

  // Compute calculated 30-day FX impact on the user's foreign holdings
  const fxExposureImpact = useMemo(() => {
    return HISTORICAL_30D_CURRENCIES.map(snap => {
      const userSummary = foreignHoldingsSummary.currencyMap[snap.code];
      const nativeHolding = userSummary.totalInNative;
      const eurHolding = userSummary.totalInEUR;

      // In EUR terms, if EUR/INR rose 2.34%, the value of INR holding in EUR reduced by ~2.28%
      // 30d EUR value estimated = nativeHolding / snap.rate30dAgo
      const eurValue30dAgo = snap.rate30dAgo > 0 ? nativeHolding / snap.rate30dAgo : eurHolding;
      const currencyPnlEUR = eurHolding - eurValue30dAgo;

      return {
        ...snap,
        userHoldingsCount: userSummary.holdings.length,
        userNativeHolding: nativeHolding,
        userEURHolding: eurHolding,
        portfolioSharePct: userSummary.shareOfPortfolioPct,
        currencyPnlEUR,
        eurValue30dAgo
      };
    });
  }, [foreignHoldingsSummary]);

  const totalCalculatedFxPnlEUR = fxExposureImpact.reduce((sum, item) => sum + item.currencyPnlEUR, 0);

  // Helper function to return heat map color class
  const getHeatmapColor = (intensity: number) => {
    if (intensity >= 65) return 'from-amber-500/20 to-red-500/30 text-red-700 border-red-300';
    if (intensity >= 45) return 'from-blue-500/20 to-amber-500/20 text-amber-700 border-amber-300';
    return 'from-emerald-500/15 to-blue-500/15 text-emerald-700 border-emerald-300';
  };

  const getDayBarColor = (rate: number, min: number, max: number, isGain: boolean) => {
    const ratio = max > min ? (rate - min) / (max - min) : 0.5;
    if (isGain) {
      if (ratio > 0.66) return 'bg-amber-500';
      if (ratio > 0.33) return 'bg-amber-400';
      return 'bg-amber-300';
    } else {
      if (ratio > 0.66) return 'bg-emerald-500';
      if (ratio > 0.33) return 'bg-emerald-400';
      return 'bg-emerald-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/30">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>30-Day Volatility Heatmap</span>
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3" />
                <span>Rolling 30-Day Trajectory</span>
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2">
              <span>Currency Fluctuation & Foreign Holdings Overlay</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Real-time matrix correlating historical foreign exchange swings (INR, USD, GBP) against your actual cross-border portfolio assets. Uncover currency drag and hedging opportunities.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 shrink-0">
            <div>
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Foreign Exposure</div>
              <div className="text-lg font-mono font-extrabold text-white">
                {foreignHoldingsSummary.totalForeignPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-300">
                {formatCurrency(convertFromEUR(foreignHoldingsSummary.totalForeignEUR, currentCurrency), currentCurrency)}
              </div>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div>
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">30d FX Variance</div>
              <div className={`text-lg font-mono font-extrabold flex items-center gap-1 ${totalCalculatedFxPnlEUR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalCalculatedFxPnlEUR >= 0 ? '+' : ''}
                {formatCurrency(convertFromEUR(totalCalculatedFxPnlEUR, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[10px] text-slate-300">
                Relative to Euro base
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium mr-1">Filter Currency:</span>
            {(['ALL', 'INR', 'USD', 'GBP'] as const).map(cur => (
              <button
                key={cur}
                onClick={() => setSelectedCurrency(cur)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  selectedCurrency === cur
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {cur === 'ALL' ? 'All Denominations' : cur}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFxGuide(!showFxGuide)}
            className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How to interpret this Heatmap?</span>
          </button>
        </div>
      </div>

      {/* Explanatory banner if opened */}
      {showFxGuide && (
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-950 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Understanding 30-Day Currency Volatility Overlay:</p>
            <p className="text-indigo-900 leading-relaxed">
              When you hold assets denominated in foreign currencies (like Indian equities in INR or US tech in USD), your net worth in Euros fluctuates with both the asset price <em>and</em> the exchange rate. 
              A rising EUR/INR rate means the Euro has strengthened against the Rupee (yielding a negative FX effect on your INR holdings when converted to Euros). 
              Our heatmap grades each currency's 30-day volatility intensity and computes the exact translation gain or drag on your active portfolio.
            </p>
          </div>
        </div>
      )}

      {/* Main Heatmap Cards Grid */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {fxExposureImpact
            .filter(item => selectedCurrency === 'ALL' || item.code === selectedCurrency)
            .map((item) => {
              const isEURStrengthened = item.pctChange30d > 0;
              const holdingValCurrent = convertFromEUR(item.userEURHolding, currentCurrency);

              return (
                <div 
                  key={item.pair}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Flag, Pair, Heat index */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.flag}</span>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{item.name}</span>
                            <span className="font-mono text-xs text-slate-500">({item.code})</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            Pair: <strong className="text-slate-800">{item.pair}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Volatility Indicator Badge */}
                      <div className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 bg-gradient-to-r ${getHeatmapColor(item.heatIntensity)}`}>
                        <Flame className="w-3.5 h-3.5" />
                        <span>{item.riskLevel} Vol ({item.volatilityStdDevPct}%)</span>
                      </div>
                    </div>

                    {/* Rate Snapshot & 30-Day Delta */}
                    <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Exchange Rate</div>
                          <div className="text-xl font-mono font-extrabold text-slate-900">
                            1 EUR = {item.currentRate.toFixed(item.code === 'INR' ? 2 : 3)} {item.code}
                          </div>
                        </div>
                        <div className={`text-right ${isEURStrengthened ? 'text-amber-600' : 'text-emerald-600'}`}>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">30-Day Delta</div>
                          <div className="text-sm font-mono font-bold flex items-center justify-end gap-0.5">
                            {isEURStrengthened ? (
                              <>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>+{item.pctChange30d.toFixed(2)}%</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                <span>{item.pctChange30d.toFixed(2)}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>30d Low: <strong>{item.minRate30d}</strong></span>
                        <span>30d High: <strong>{item.maxRate30d}</strong></span>
                      </div>
                    </div>

                    {/* 30-Day Heat Sparkline (Visual Daily Matrix) */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <span>30-Day Rate Heat Trajectory</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Day 1 &rarr; Day 30</span>
                      </div>
                      
                      {/* Bar Heat Strip */}
                      <div className="grid grid-cols-30 gap-0.5 h-6 items-end bg-slate-100 p-1 rounded-md">
                        {item.dailyTrend.map((val, idx) => {
                          const heightPct = Math.max(20, Math.min(100, ((val - item.minRate30d) / (item.maxRate30d - item.minRate30d || 1)) * 100));
                          const barColor = getDayBarColor(val, item.minRate30d, item.maxRate30d, isEURStrengthened);
                          return (
                            <div 
                              key={idx}
                              title={`Day ${idx + 1}: 1 EUR = ${val} ${item.code}`}
                              className={`w-full rounded-xs transition-all hover:opacity-80 cursor-pointer ${barColor}`}
                              style={{ height: `${heightPct}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* User Holdings Overlay Section */}
                    <div className="mt-4 p-3.5 bg-slate-100/80 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <span>Your Active {item.code} Assets</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px] text-slate-700 font-bold">
                          {item.userHoldingsCount} Holding{item.userHoldingsCount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <div className="text-[10px] text-slate-400 font-sans">Native Balance</div>
                          <div className="font-bold text-slate-900 truncate">
                            {formatCurrency(item.userNativeHolding, item.code)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-sans">Converted Value</div>
                          <div className="font-bold text-slate-900 truncate">
                            {formatCurrency(holdingValCurrent, currentCurrency)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">Portfolio Share:</span>
                        <span className="font-bold font-mono text-slate-800">
                          {item.portfolioSharePct.toFixed(1)}%
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">30d Net FX Impact:</span>
                        <span className={`font-bold font-mono ${item.currencyPnlEUR >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {item.currencyPnlEUR >= 0 ? '+' : ''}
                          {formatCurrency(convertFromEUR(item.currencyPnlEUR, currentCurrency), currentCurrency)}
                        </span>
                      </div>
                    </div>

                    {/* Specific Assets List */}
                    {item.userHoldingsCount > 0 ? (
                      <div className="mt-3 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Tracked Holdings
                        </div>
                        {foreignHoldingsSummary.currencyMap[item.code].holdings.map(h => (
                          <div 
                            key={h.id}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-200"
                          >
                            <span className="truncate max-w-[140px] text-slate-700 font-medium" title={h.assetName}>
                              {h.assetName}
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-[11px]">
                              {formatCurrency(h.currentValue, h.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-center py-2 px-3 rounded-lg bg-white border border-dashed border-slate-200 text-[11px] text-slate-400">
                        No active holdings in {item.code}
                      </div>
                    )}
                  </div>

                  {/* Recommendation action footer */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {item.riskLevel === 'High' ? 'Hedging advised' : 'Exposure monitored'}
                    </span>
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('tax_estimator')}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Check FX CGT</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Global Cross-Border Exposure Heat Matrix Summary */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  Cross-Border Risk Assessment
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                Currency Exposure: {foreignHoldingsSummary.totalForeignPct > 40 ? 'High FX Sensitivity' : 'Balanced Diversification'}
              </h4>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {foreignHoldingsSummary.totalForeignPct > 0 ? (
                  <>
                    You hold <strong>{foreignHoldingsSummary.totalForeignPct.toFixed(1)}%</strong> of your total assets outside the Eurozone ({foreignHoldingsSummary.currencyMap.INR.shareOfPortfolioPct.toFixed(1)}% in INR, {foreignHoldingsSummary.currencyMap.USD.shareOfPortfolioPct.toFixed(1)}% in USD). 
                    The combined 30-day currency translation effect resulted in a <strong>{totalCalculatedFxPnlEUR >= 0 ? '+' : ''}{formatCurrency(convertFromEUR(totalCalculatedFxPnlEUR, currentCurrency), currentCurrency)}</strong> variance.
                  </>
                ) : (
                  <>All your assets are currently denominated in EUR. You have zero foreign currency translation risk.</>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onNavigateTab && (
                <>
                  <button
                    onClick={() => onNavigateTab('rebalance')}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer border border-white/20"
                  >
                    Rebalance Exposure
                  </button>
                  <button
                    onClick={() => onNavigateTab('investment_account')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    Explore EUR Tax Shelters
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
