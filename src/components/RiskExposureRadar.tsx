import React, { useMemo } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Holding, Currency } from '../types';
import { convertToEUR, formatCurrency } from '../services/fiscalDataService';
import { 
  ShieldAlert, 
  Sparkles, 
  Globe2, 
  PieChart, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Scale
} from 'lucide-react';

interface RiskExposureRadarProps {
  holdings: Holding[];
  currentCurrency?: Currency;
  onOpenRebalancer?: () => void;
}

export const RiskExposureRadar: React.FC<RiskExposureRadarProps> = ({ 
  holdings, 
  currentCurrency = 'EUR',
  onOpenRebalancer
}) => {
  // Compute portfolio metrics
  const analysis = useMemo(() => {
    let totalEUR = 0;
    let ieVal = 0;
    let inVal = 0;
    let usVal = 0;
    let euVal = 0;
    let cashVal = 0;
    let equityVal = 0;
    let pensionVal = 0;

    holdings.forEach((h) => {
      const valEUR = convertToEUR(h.currentValue, h.currency);
      totalEUR += valEUR;

      if (h.country === 'Ireland') ieVal += valEUR;
      else if (h.country === 'India') inVal += valEUR;
      else if (h.country === 'US') usVal += valEUR;
      else euVal += valEUR;

      if (h.assetType === 'Cash / Deposit') cashVal += valEUR;
      else if (h.assetType === 'Pension') pensionVal += valEUR;
      if (h.assetType === 'Share' || h.assetType === 'ETF' || h.assetType === 'Mutual Fund' || h.assetType === 'RSU') {
        equityVal += valEUR;
      }
    });

    if (totalEUR === 0) totalEUR = 1; // avoid division by zero

    const iePct = Math.round((ieVal / totalEUR) * 100);
    const inPct = Math.round((inVal / totalEUR) * 100);
    const usPct = Math.round((usVal / totalEUR) * 100);
    const cashPct = Math.round((cashVal / totalEUR) * 100);
    const equityPct = Math.round((equityVal / totalEUR) * 100);
    const pensionPct = Math.round((pensionVal / totalEUR) * 100);

    // Radar Chart Data across multi-dimensional risk axes
    const radarData = [
      {
        axis: 'Ireland Base (IE)',
        portfolio: iePct,
        benchmark: 40,
        fullMark: 100
      },
      {
        axis: 'India Market (IN)',
        portfolio: inPct,
        benchmark: 25,
        fullMark: 100
      },
      {
        axis: 'US Equities (US)',
        portfolio: usPct,
        benchmark: 25,
        fullMark: 100
      },
      {
        axis: 'Equity Growth',
        portfolio: equityPct,
        benchmark: 60,
        fullMark: 100
      },
      {
        axis: 'Cash Liquidity',
        portfolio: cashPct,
        benchmark: 20,
        fullMark: 100
      },
      {
        axis: 'Pension Shelter',
        portfolio: pensionPct,
        benchmark: 30,
        fullMark: 100
      }
    ];

    // Compute diversification health score
    let score = 85;
    if (iePct > 65 || inPct > 50 || usPct > 50) score -= 20; // high single-country concentration
    if (cashPct > 45) score -= 15; // excessive cash drag
    if (cashPct < 10) score -= 10; // low liquidity buffer

    return {
      totalEUR,
      ieVal,
      inVal,
      usVal,
      iePct,
      inPct,
      usPct,
      cashPct,
      equityPct,
      pensionPct,
      radarData,
      score: Math.max(40, score)
    };
  }, [holdings]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xl text-xs font-mono">
          <div className="font-bold text-emerald-400 font-sans mb-1">{data.axis}</div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Your Allocation:</span>
            <span className="font-bold text-white">{data.portfolio}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Benchmark Model:</span>
            <span className="text-emerald-300">{data.benchmark}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <Globe2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Risk Exposure Radar &middot; Multi-Market Diversification
              </h3>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                RECHARTS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Visualizes cross-border asset concentration across Ireland 🇮🇪, India 🇮🇳, and US 🇺🇸 markets
            </p>
          </div>
        </div>

        {/* Header Right Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium">Diversification Health:</span>
            <span className="font-mono font-bold text-emerald-400 text-xs">
              {analysis.score}/100
            </span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-semibold">
              {analysis.score >= 75 ? 'Balanced' : 'Skewed'}
            </span>
          </div>

          {onOpenRebalancer && (
            <button
              onClick={onOpenRebalancer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs"
              title="Calculate buy/sell orders to match target allocation"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Asset Rebalancer</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Recharts Radar Chart (7 cols) */}
          <div className="lg:col-span-7 h-[330px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={analysis.radarData}>
                <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <PolarAngleAxis 
                  dataKey="axis" 
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: '#94A3B8', fontSize: 9 }}
                  stroke="#CBD5E1"
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Benchmark Radar Series */}
                <Radar
                  name="Expat Target Benchmark"
                  dataKey="benchmark"
                  stroke="#94A3B8"
                  fill="#94A3B8"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />

                {/* User Current Portfolio Radar Series */}
                <Radar
                  name="Your Current Portfolio"
                  dataKey="portfolio"
                  stroke="#059669"
                  fill="#10B981"
                  fillOpacity={0.45}
                  strokeWidth={2.5}
                />
                
                <Legend 
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  iconType="circle"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Right Column: 3 Core Regional Market Cards & Diagnostics (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5">
            
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Geographic Concentration Profile
            </div>

            {/* Ireland Market Pillar */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇮🇪</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Ireland (Home Base)</div>
                  <div className="text-[10px] text-slate-500">Pensions, Cash, Budget 2027 PSIA</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold font-mono text-slate-900">
                  {analysis.iePct}%
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  €{Math.round(analysis.ieVal).toLocaleString()}
                </div>
              </div>
            </div>

            {/* India Market Pillar */}
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇮🇳</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">India Market</div>
                  <div className="text-[10px] text-amber-700">Mutual Funds (SIP), NSE Shares (DTAA)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold font-mono text-amber-900">
                  {analysis.inPct}%
                </div>
                <div className="text-[10px] font-mono text-amber-700">
                  ~€{Math.round(analysis.inVal).toLocaleString()}
                </div>
              </div>
            </div>

            {/* US Market Pillar */}
            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇺🇸</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">US Market</div>
                  <div className="text-[10px] text-blue-700">Tech RSUs, US Listed Equities (W-8BEN)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold font-mono text-blue-900">
                  {analysis.usPct}%
                </div>
                <div className="text-[10px] font-mono text-blue-700">
                  ~€{Math.round(analysis.usVal).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Plain English Diagnosis Callout */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 leading-relaxed">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1 font-bold text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Radar Insight:</span>
                </div>
                {onOpenRebalancer && (
                  <button
                    onClick={onOpenRebalancer}
                    className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span>Rebalance Targets &rarr;</span>
                  </button>
                )}
              </div>
              <p>
                {analysis.iePct >= 50
                  ? `Your portfolio has a strong Irish domestic core (${analysis.iePct}%), providing local stability. Maintaining exposure in high-growth Indian equity SIPs (${analysis.inPct}%) and US tech (${analysis.usPct}%) helps capture global returns while cushioning against single-currency shocks.`
                  : `Your portfolio maintains active international diversification across Ireland (${analysis.iePct}%), India (${analysis.inPct}%), and the US (${analysis.usPct}%). Preparing to allocate into Ireland's Budget 2027 scheme will enhance local tax efficiency.`}
              </p>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
