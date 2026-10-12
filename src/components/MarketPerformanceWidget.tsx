import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { MarketIndex, Holding } from '../types';
import { fetchMarketSnapshot, FALLBACK_MARKET_INDICES, MARKET_INDICES_AS_OF } from '../services/marketDataService';
import { RefreshCw, ShieldCheck, Activity, Sparkles, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface MarketPerformanceWidgetProps {
  holdings?: Holding[];
}

export const MarketPerformanceWidget: React.FC<MarketPerformanceWidgetProps> = ({ holdings = [] }) => {
  const [indices, setIndices] = useState<MarketIndex[]>(FALLBACK_MARKET_INDICES);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | 'YTD' | '1Y'>('1D');
  const [lastUpdated, setLastUpdated] = useState<string>(MARKET_INDICES_AS_OF);
  const [isSample, setIsSample] = useState<boolean>(true);
  // Unique per instance: the widget can be rendered more than once on a page, and SVG gradient ids are global
  const gradientPrefix = useId().replace(/:/g, '');
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const snapshot = await fetchMarketSnapshot();
      if (!isMountedRef.current) return;
      setIndices(snapshot.data);
      setIsSample(snapshot.isSample);
      setLastUpdated(snapshot.asOf);
    } catch (err) {
      console.error(err);
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadData();
    return () => { isMountedRef.current = false; };
  }, [loadData]);

  // Compute how user's holdings align with these indices
  const ieCount = holdings.filter(h => h.country === 'Ireland').length;
  const inCount = holdings.filter(h => h.country === 'India').length;
  const usCount = holdings.filter(h => h.country === 'US').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Market Performance &amp; Index Trends
              </h3>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                {isSample ? 'SAMPLE DATA' : 'DELAYED DATA'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Benchmarks for Ireland (ISEQ), India (NIFTY 50), and the US (S&amp;P 500)
            </p>
          </div>
        </div>

        {/* Timeframe & Refresh Controls */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Timeframe Buttons */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-mono" role="group" aria-label="Performance timeframe">
            {(['1D', '1W', '1M', 'YTD', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setSelectedTimeframe(tf)}
                aria-pressed={selectedTimeframe === tf}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  selectedTimeframe === tf
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            title="Reload index data"
            aria-label="Reload index data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main 3-Index Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {indices.map((idx) => {
            const rawPerf = idx.timeframePerformance?.[selectedTimeframe];
            const perf = typeof rawPerf === 'number' && Number.isFinite(rawPerf) ? rawPerf : 0;
            const isPositive = perf >= 0;
            const gradId = `${gradientPrefix}-grad-${idx.id}`;

            // Normalize sparkline coordinates for mini SVG (pad single-point series to avoid divide-by-zero)
            const series = idx.sparkline?.length ? (idx.sparkline.length === 1 ? [idx.sparkline[0], idx.sparkline[0]] : idx.sparkline) : [idx.price, idx.price];
            const min = Math.min(...series);
            const max = Math.max(...series);
            const range = max - min || 1;
            const points = series
              .map((val, i) => {
                const x = (i / (series.length - 1)) * 100;
                const y = 35 - ((val - min) / range) * 28;
                return `${x},${y}`;
              })
              .join(' ');

            return (
              <div
                key={idx.id}
                className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-5 border border-slate-200/90 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Region & Exchange Pill */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{idx.flag}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {idx.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {idx.exchange}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {idx.symbol}
                    </span>
                  </div>

                  {/* Price & Change */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                        {idx.price.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Currency: {idx.currency}
                      </div>
                    </div>

                    <div className={`text-right flex items-center gap-1 font-mono font-bold text-sm ${isPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span>{isPositive ? '+' : ''}{perf.toFixed(2)}%</span>
                      <span className="text-[10px] font-normal text-slate-400 font-sans">({selectedTimeframe})</span>
                    </div>
                  </div>

                  {/* Sparkline Graph */}
                  <div className="mt-3 h-10 w-full overflow-hidden">
                    <svg viewBox="0 0 100 38" preserveAspectRatio="none" className="w-full h-full overflow-visible" role="img" aria-label={`${idx.name} sample trend`}>
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isPositive ? '#10B981' : '#F43F5E'} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={isPositive ? '#10B981' : '#F43F5E'} stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <polygon
                        points={`0,38 ${points} 100,38`}
                        fill={`url(#${gradId})`}
                      />
                      <polyline
                        fill="none"
                        stroke={isPositive ? '#059669' : '#E11D48'}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    </svg>
                  </div>

                  {/* Intraday Range Bar */}
                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 flex justify-between font-mono">
                    <span>Day low: {idx.dayLow.toLocaleString('en-IE', { maximumFractionDigits: 2 })}</span>
                    <span>Day high: {idx.dayHigh.toLocaleString('en-IE', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Portfolio Context Link (Crucial for User's Holdings) */}
                <div className="mt-4 pt-3 border-t border-slate-200 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 leading-snug">
                    <div className="flex items-center gap-1 font-bold text-slate-800 mb-0.5">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Context for Your Portfolio:</span>
                    </div>
                    <p className="text-slate-600 text-[10.5px]">
                      {idx.portfolioContext}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner: Cross-Border Portfolio Impact Summary */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isSample ? 'Illustrative index figures (not live prices), shown alongside your tracked positions' : 'Delayed index figures alongside your tracked positions'} ({ieCount} IE &middot; {inCount} India &middot; {usCount} US).
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>Data as of: {lastUpdated}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
