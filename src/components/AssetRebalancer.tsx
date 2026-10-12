import React, { useState, useMemo, useEffect } from 'react';
import { Holding, Currency, CountryExposure } from '../types';
import { convertToEUR, convertFromEUR, formatCurrency, FALLBACK_FISCAL_DATA } from '../services/fiscalDataService';
import { 
  Scale, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Coins, 
  Globe2, 
  Sliders, 
  Copy, 
  Check, 
  RotateCcw,
  Info,
  DollarSign
} from 'lucide-react';

interface AssetRebalancerProps {
  holdings: Holding[];
  currentCurrency?: Currency;
  onOpenInvestmentAccount?: () => void;
}

type RebalanceStrategy = 'balanced' | 'irish_core' | 'global_growth' | 'custom';
type RebalanceMode = 'portfolio' | 'cash_injection';

interface TargetAllocation {
  ireland: number;
  india: number;
  us: number;
  other: number;
}

const STRATEGY_PRESETS: Record<Exclude<RebalanceStrategy, 'custom'>, { name: string; desc: string; targets: TargetAllocation }> = {
  balanced: {
    name: 'Balanced Tri-Market (Radar Benchmark)',
    desc: '40% Irish domestic anchor, 30% India high-growth equities, 30% US global tech.',
    targets: { ireland: 40, india: 30, us: 30, other: 0 }
  },
  irish_core: {
    name: 'Tax-Sheltered Irish Core',
    desc: '50% Ireland to maximize Budget 2027 PSIA & PRSA pension shields, 25% India, 25% US.',
    targets: { ireland: 50, india: 25, us: 25, other: 0 }
  },
  global_growth: {
    name: 'Global Tech & Growth Heavy',
    desc: '30% Ireland base, 35% India mutual funds / Nifty 50, 35% US equity index.',
    targets: { ireland: 30, india: 35, us: 35, other: 0 }
  }
};

export const AssetRebalancer: React.FC<AssetRebalancerProps> = ({
  holdings,
  currentCurrency = 'EUR',
  onOpenInvestmentAccount
}) => {
  const [strategy, setStrategy] = useState<RebalanceStrategy>('balanced');
  const [mode, setMode] = useState<RebalanceMode>('portfolio');
  const [cashToInject, setCashToInject] = useState<number>(5000);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<boolean>(false);

  useEffect(() => {
    if (!copied && !copyError) return;
    const timer = setTimeout(() => { setCopied(false); setCopyError(false); }, 2500);
    return () => clearTimeout(timer);
  }, [copied, copyError]);

  const fmt = (amountEUR: number) => formatCurrency(convertFromEUR(amountEUR, currentCurrency), currentCurrency);

  // Custom targets state
  const [customTargets, setCustomTargets] = useState<TargetAllocation>({
    ireland: 40,
    india: 30,
    us: 30,
    other: 0
  });

  // Calculate current allocation by region
  const currentAllocation = useMemo(() => {
    let totalEUR = 0;
    let ieVal = 0;
    let inVal = 0;
    let usVal = 0;
    let otherVal = 0;

    holdings.forEach((h) => {
      const valEUR = convertToEUR(h.currentValue, h.currency);
      totalEUR += valEUR;

      if (h.country === 'Ireland') ieVal += valEUR;
      else if (h.country === 'India') inVal += valEUR;
      else if (h.country === 'US') usVal += valEUR;
      else otherVal += valEUR;
    });

    const safeTotal = totalEUR > 0 ? totalEUR : 1;
    const iePct = (ieVal / safeTotal) * 100;
    const inPct = (inVal / safeTotal) * 100;
    const usPct = (usVal / safeTotal) * 100;
    const otherPct = (otherVal / safeTotal) * 100;

    return {
      totalEUR,
      ieVal,
      inVal,
      usVal,
      otherVal,
      iePct,
      inPct,
      usPct,
      otherPct
    };
  }, [holdings]);

  // Active targets
  const activeTargets: TargetAllocation = useMemo(() => {
    if (strategy === 'custom') {
      return customTargets;
    }
    return STRATEGY_PRESETS[strategy].targets;
  }, [strategy, customTargets]);

  const targetSum = activeTargets.ireland + activeTargets.india + activeTargets.us + activeTargets.other;

  // Compute rebalance orders
  const rebalancePlan = useMemo(() => {
    const total = currentAllocation.totalEUR;
    const fx = FALLBACK_FISCAL_DATA.macroIndicators.fxRates;

    if (mode === 'portfolio') {
      // Classic rebalance: Target value is based on current total portfolio value
      const ieTargetVal = (total * activeTargets.ireland) / 100;
      const inTargetVal = (total * activeTargets.india) / 100;
      const usTargetVal = (total * activeTargets.us) / 100;
      const otherTargetVal = (total * activeTargets.other) / 100;

      const ieDiff = ieTargetVal - currentAllocation.ieVal;
      const inDiff = inTargetVal - currentAllocation.inVal;
      const usDiff = usTargetVal - currentAllocation.usVal;
      const otherDiff = otherTargetVal - currentAllocation.otherVal;

      return {
        mode: 'portfolio' as const,
        postTotalEUR: total,
        items: [
          {
            region: 'Ireland',
            flag: '🇮🇪',
            currencyName: 'EUR (€)',
            localCurrency: 'EUR' as Currency,
            currentValEUR: currentAllocation.ieVal,
            currentPct: currentAllocation.iePct,
            targetPct: activeTargets.ireland,
            targetValEUR: ieTargetVal,
            diffEUR: ieDiff,
            action: Math.abs(ieDiff) < 150 ? 'HOLD' : ieDiff > 0 ? 'BUY' : 'SELL',
            localVal: ieDiff,
            suggestedVehicle: ieDiff > 0 
              ? 'Budget 2027 Personal Investment Account (€12,000/yr tax shelter) or PRSA AVC pension' 
              : 'Trim cash or bond deposits (avoid selling ETFs with 38% deemed disposal penalties)',
            taxNote: ieDiff < 0 
              ? 'Selling Irish/EU funds triggers 38% Exit Tax. Prefer rebalancing via fresh deposits.' 
              : 'Qualifies for 2027 PSIA €12,000/yr exemption from 8-year deemed disposal.'
          },
          {
            region: 'India Market',
            flag: '🇮🇳',
            currencyName: 'INR (₹)',
            localCurrency: 'INR' as Currency,
            currentValEUR: currentAllocation.inVal,
            currentPct: currentAllocation.inPct,
            targetPct: activeTargets.india,
            targetValEUR: inTargetVal,
            diffEUR: inDiff,
            action: Math.abs(inDiff) < 150 ? 'HOLD' : inDiff > 0 ? 'BUY' : 'SELL',
            localVal: inDiff * fx.EUR_TO_INR,
            suggestedVehicle: inDiff > 0 
              ? 'Deploy via NRE / NRO SIP into Nifty 50 Index or Flexi-Cap Mutual Funds' 
              : 'Redeem high-gains Indian mutual funds; report under Ireland-India DTAA credit',
            taxNote: 'Taxes paid in India (LTCG 12.5%) are creditable against Irish CGT under Article 24 of DTAA.'
          },
          {
            region: 'United States',
            flag: '🇺🇸',
            currencyName: 'USD ($)',
            localCurrency: 'USD' as Currency,
            currentValEUR: currentAllocation.usVal,
            currentPct: currentAllocation.usPct,
            targetPct: activeTargets.us,
            targetValEUR: usTargetVal,
            diffEUR: usDiff,
            action: Math.abs(usDiff) < 150 ? 'HOLD' : usDiff > 0 ? 'BUY' : 'SELL',
            localVal: usDiff * fx.EUR_TO_USD,
            suggestedVehicle: usDiff > 0 
              ? 'Add S&P 500 / NASDAQ-100 or global US equities' 
              : 'Trim vested tech RSUs (utilize annual €1,270 Irish CGT exemption threshold)',
            taxNote: 'US withholding tax 15% under Irish W-8BEN form is credited against Irish tax returns.'
          },
          {
            region: 'Europe / Global',
            flag: '🇪🇺',
            currencyName: 'EUR (€)',
            localCurrency: 'EUR' as Currency,
            currentValEUR: currentAllocation.otherVal,
            currentPct: currentAllocation.otherPct,
            targetPct: activeTargets.other,
            targetValEUR: otherTargetVal,
            diffEUR: otherDiff,
            action: Math.abs(otherDiff) < 150 ? 'HOLD' : otherDiff > 0 ? 'BUY' : 'SELL',
            localVal: otherDiff,
            suggestedVehicle: otherDiff > 0
              ? 'Add global or European UCITS index funds'
              : 'Redirect European / global holdings towards your Ireland, India and US targets',
            taxNote: 'Disposals of EU-domiciled funds are generally subject to 38% Irish Exit Tax.'
          }
        ].filter(item => item.region !== 'Europe / Global' || item.currentValEUR > 0 || item.targetPct > 0)
      };
    } else {
      // Cash injection mode (Tax-Smart Irish Strategy): Do NOT sell anything!
      // Distribute the new cash to underweight positions only.
      const newTotal = total + Math.max(0, cashToInject);
      
      const ieTargetVal = (newTotal * activeTargets.ireland) / 100;
      const inTargetVal = (newTotal * activeTargets.india) / 100;
      const usTargetVal = (newTotal * activeTargets.us) / 100;
      const otherTargetVal = (newTotal * activeTargets.other) / 100;

      // Deficits: how much each market is below target
      const ieDeficit = Math.max(0, ieTargetVal - currentAllocation.ieVal);
      const inDeficit = Math.max(0, inTargetVal - currentAllocation.inVal);
      const usDeficit = Math.max(0, usTargetVal - currentAllocation.usVal);
      const otherDeficit = Math.max(0, otherTargetVal - currentAllocation.otherVal);
      const totalDeficit = ieDeficit + inDeficit + usDeficit + otherDeficit;

      let ieAlloc = 0;
      let inAlloc = 0;
      let usAlloc = 0;
      let otherAlloc = 0;

      if (totalDeficit > 0 && cashToInject > 0) {
        ieAlloc = (ieDeficit / totalDeficit) * cashToInject;
        inAlloc = (inDeficit / totalDeficit) * cashToInject;
        usAlloc = (usDeficit / totalDeficit) * cashToInject;
        otherAlloc = (otherDeficit / totalDeficit) * cashToInject;
      }

      return {
        mode: 'cash_injection' as const,
        postTotalEUR: newTotal,
        items: [
          {
            region: 'Ireland',
            flag: '🇮🇪',
            currencyName: 'EUR (€)',
            localCurrency: 'EUR' as Currency,
            currentValEUR: currentAllocation.ieVal,
            currentPct: currentAllocation.iePct,
            targetPct: activeTargets.ireland,
            targetValEUR: currentAllocation.ieVal + ieAlloc,
            diffEUR: ieAlloc,
            action: ieAlloc > 50 ? 'BUY' : 'HOLD',
            localVal: ieAlloc,
            suggestedVehicle: 'Allocate to Ireland Budget 2027 PSIA (€12k annual allowance) or PRSA Pension',
            taxNote: 'No-sale rebalance: because nothing is sold, no exit tax or CGT is triggered by the rebalance itself.'
          },
          {
            region: 'India Market',
            flag: '🇮🇳',
            currencyName: 'INR (₹)',
            localCurrency: 'INR' as Currency,
            currentValEUR: currentAllocation.inVal,
            currentPct: currentAllocation.inPct,
            targetPct: activeTargets.india,
            targetValEUR: currentAllocation.inVal + inAlloc,
            diffEUR: inAlloc,
            action: inAlloc > 50 ? 'BUY' : 'HOLD',
            localVal: inAlloc * fx.EUR_TO_INR,
            suggestedVehicle: 'Top up NRE Monthly SIP into Nifty 50 or Parag Parikh Flexi Cap',
            taxNote: 'Fresh capital injection avoids triggering Indian STCG/LTCG redemption taxes.'
          },
          {
            region: 'United States',
            flag: '🇺🇸',
            currencyName: 'USD ($)',
            localCurrency: 'USD' as Currency,
            currentValEUR: currentAllocation.usVal,
            currentPct: currentAllocation.usPct,
            targetPct: activeTargets.us,
            targetValEUR: currentAllocation.usVal + usAlloc,
            diffEUR: usAlloc,
            action: usAlloc > 50 ? 'BUY' : 'HOLD',
            localVal: usAlloc * fx.EUR_TO_USD,
            suggestedVehicle: 'Channel funds into US broad index ETFs or hold cash reserve',
            taxNote: 'Maintains long-term compounding without crystallizing capital gains in Ireland.'
          },
          {
            region: 'Europe / Global',
            flag: '🇪🇺',
            currencyName: 'EUR (€)',
            localCurrency: 'EUR' as Currency,
            currentValEUR: currentAllocation.otherVal,
            currentPct: currentAllocation.otherPct,
            targetPct: activeTargets.other,
            targetValEUR: currentAllocation.otherVal + otherAlloc,
            diffEUR: otherAlloc,
            action: otherAlloc > 50 ? 'BUY' : 'HOLD',
            localVal: otherAlloc,
            suggestedVehicle: 'Add global or European UCITS index funds',
            taxNote: 'Fresh capital injection avoids crystallizing Exit Tax on existing funds.'
          }
        ].filter(item => item.region !== 'Europe / Global' || item.currentValEUR > 0 || item.targetPct > 0)
      };
    }
  }, [currentAllocation, activeTargets, mode, cashToInject]);

  const hasHoldings = currentAllocation.totalEUR > 0;
  const targetsValid = targetSum === 100;

  const handleCopyPlan = async () => {
    const textLines = [
      `INVESTIRELAND AI — REBALANCING PLAN`,
      `Strategy: ${strategy === 'custom' ? 'Custom Targets' : STRATEGY_PRESETS[strategy].name}`,
      `Method: ${mode === 'portfolio' ? 'Full Rebalance (Buy/Sell)' : `Tax-Smart Cash Injection (+€${cashToInject.toLocaleString('en-IE')})`}`,
      `Total Portfolio: €${Math.round(currentAllocation.totalEUR).toLocaleString('en-IE')}`,
      `------------------------------------------`,
      ...rebalancePlan.items.map(item => {
        const sign = item.action === 'BUY' ? '+' : item.action === 'SELL' ? '-' : '';
        const amount = item.action === 'HOLD' ? 0 : Math.round(Math.abs(item.diffEUR));
        return `${item.flag} ${item.region} [${item.action}]: ${sign}€${amount.toLocaleString('en-IE')} (Target: ${item.targetPct}% | Current: ${item.currentPct.toFixed(1)}%)\n  Vehicle: ${item.suggestedVehicle}`;
      }),
      `------------------------------------------`,
      `Educational estimate only — not financial advice.`
    ];

    try {
      await navigator.clipboard.writeText(textLines.join('\n'));
      setCopyError(false);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Top Header */}
      <div className="px-6 py-4.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Asset Rebalancer Tool
              </h3>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                RADAR INTEGRATED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculates precise buy and sell orders across Ireland 🇮🇪, India 🇮🇳, and US 🇺🇸 to match target radar allocations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleCopyPlan}
            disabled={!targetsValid || (!hasHoldings && mode === 'portfolio')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copy rebalance order checklist to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Plan Copied</span>
              </>
            ) : copyError ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300">Copy failed</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Checklist</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Step 1: Strategy Preset Selector */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                1. Select Target Allocation Profile
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Benchmark goals synced directly with your Risk Exposure Radar
              </p>
            </div>
            {targetSum !== 100 && strategy === 'custom' && (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Sum must equal 100% (currently {targetSum}%)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {(Object.keys(STRATEGY_PRESETS) as Array<Exclude<RebalanceStrategy, 'custom'>>).map((stratKey) => {
              const preset = STRATEGY_PRESETS[stratKey];
              const isSelected = strategy === stratKey;
              return (
                <button
                  type="button"
                  key={stratKey}
                  onClick={() => setStrategy(stratKey)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                      {preset.name}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {preset.desc}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-600">
                    <span className="bg-emerald-100/70 text-emerald-800 px-1.5 py-0.5 rounded">IE: {preset.targets.ireland}%</span>
                    <span className="bg-amber-100/70 text-amber-800 px-1.5 py-0.5 rounded">IN: {preset.targets.india}%</span>
                    <span className="bg-blue-100/70 text-blue-800 px-1.5 py-0.5 rounded">US: {preset.targets.us}%</span>
                  </div>
                </button>
              );
            })}

            {/* Custom Option */}
            <button
              type="button"
              onClick={() => setStrategy('custom')}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                strategy === 'custom'
                  ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${strategy === 'custom' ? 'text-emerald-950' : 'text-slate-800'}`}>
                  Custom Sliders
                </span>
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Define your exact custom percentage targets across Ireland, India, and US.
              </p>
              <div className="mt-2.5 text-[10px] font-mono font-bold text-slate-600">
                IE {customTargets.ireland}% · IN {customTargets.india}% · US {customTargets.us}%{customTargets.other > 0 ? ` · EU ${customTargets.other}%` : ''}
              </div>
            </button>
          </div>

          {/* Custom Sliders Drawer (Visible if Custom Selected) */}
          {strategy === 'custom' && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800">🇮🇪 Ireland Target</span>
                  <span className="font-mono text-emerald-700">{customTargets.ireland}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={customTargets.ireland}
                  onChange={(e) => setCustomTargets({ ...customTargets, ireland: Number(e.target.value) })}
                  aria-label="Ireland target percentage"
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800">🇮🇳 India Target</span>
                  <span className="font-mono text-amber-700">{customTargets.india}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={customTargets.india}
                  onChange={(e) => setCustomTargets({ ...customTargets, india: Number(e.target.value) })}
                  aria-label="India target percentage"
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800">🇺🇸 US Target</span>
                  <span className="font-mono text-blue-700">{customTargets.us}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={customTargets.us}
                  onChange={(e) => setCustomTargets({ ...customTargets, us: Number(e.target.value) })}
                  aria-label="US target percentage"
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800">🇪🇺 Europe / Global Target</span>
                  <span className="font-mono text-slate-700">{customTargets.other}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={customTargets.other}
                  onChange={(e) => setCustomTargets({ ...customTargets, other: Number(e.target.value) })}
                  aria-label="Europe and global target percentage"
                  className="w-full accent-slate-600 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Rebalancing Mode Selector */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                2. Execution Strategy Mode
              </span>
              <p className="text-xs text-slate-500">
                Choose how you want to restore balance without unnecessary Irish tax drag
              </p>
            </div>

            <div className="flex flex-wrap items-center bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto shadow-xs">
              <button
                type="button"
                onClick={() => setMode('portfolio')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'portfolio'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Classic Buy/Sell (Net €0)
              </button>
              <button
                type="button"
                onClick={() => setMode('cash_injection')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  mode === 'cash_injection'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-300" />
                <span>Tax-Smart Cash Inflow</span>
              </button>
            </div>
          </div>

          {/* If Cash Injection Mode: Input new capital */}
          {mode === 'cash_injection' && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80">
              <div>
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Irish Tax-Smart Advantage: Zero Taxable Realizations</span>
                </span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Instead of selling overweight assets (which triggers 38% exit tax or 33% CGT), inject fresh savings directly into underweight markets.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="rebalancer-cash-inject" className="text-xs font-bold text-slate-700 whitespace-nowrap">Fresh Capital to Invest:</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">€</span>
                  <input
                    id="rebalancer-cash-inject"
                    type="number"
                    step="500"
                    min="0"
                    max="1000000"
                    value={cashToInject}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setCashToInject(Number.isFinite(next) ? Math.min(1000000, Math.max(0, next)) : 0);
                    }}
                    className="w-28 pl-6 pr-2 py-1.5 text-xs font-bold font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600 shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCashToInject(12000)}
                  className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold cursor-pointer"
                  title="Set to Budget 2027 PSIA annual limit"
                >
                  €12k PSIA Max
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Calculated Buy & Sell Orders Matrix */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              3. Calculated Order Checklist & Allocation Target
            </span>
            <span className="text-xs font-mono text-slate-500">
              Portfolio Base: {fmt(currentAllocation.totalEUR)}
            </span>
          </div>

          {!targetsValid ? (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Your custom targets add up to {targetSum}%. Adjust the sliders so they total exactly 100% to see buy and sell orders.</span>
            </div>
          ) : !hasHoldings && mode === 'portfolio' ? (
            <div className="p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-600">
              <Scale className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-slate-800">No holdings to rebalance yet</p>
              <p className="mt-1">Add holdings to your portfolio to calculate buy and sell orders, or switch to <strong>Tax-Smart Cash Inflow</strong> to plan how to invest fresh savings.</p>
            </div>
          ) : (
          <div className="space-y-3">
            {rebalancePlan.items.map((item) => {
              const isBuy = item.action === 'BUY';
              const isSell = item.action === 'SELL';
              const isHold = item.action === 'HOLD';

              const diffPct = (item.targetPct - item.currentPct).toFixed(1);

              return (
                <div 
                  key={item.region}
                  className={`p-4 rounded-xl border transition-all ${
                    isBuy
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : isSell
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Region & Allocation comparison */}
                    <div className="flex items-center gap-3.5 min-w-[240px]">
                      <span className="text-2xl">{item.flag}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{item.region}</h4>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isBuy
                              ? 'bg-emerald-100 text-emerald-800'
                              : isSell
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.action === 'BUY' ? 'BUY / TOP-UP' : item.action === 'SELL' ? 'TRIM / SELL' : 'IN BALANCE'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-slate-600">
                          <span>Current: <strong className="font-mono text-slate-900">{item.currentPct.toFixed(1)}%</strong></span>
                          <span>&rarr;</span>
                          <span>Target: <strong className="font-mono text-slate-900">{item.targetPct}%</strong></span>
                          <span className={`text-[11px] font-mono font-bold ${
                            Number(diffPct) > 0 ? 'text-emerald-700' : Number(diffPct) < 0 ? 'text-amber-700' : 'text-slate-500'
                          }`}>
                            ({Number(diffPct) > 0 ? `+${diffPct}%` : `${diffPct}%`})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Recommended Execution Vehicle & Tax Advisory */}
                    <div className="flex-1 text-xs text-slate-700 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-slate-900 shrink-0">Action Vehicle:</span>
                        <span className="text-slate-700">{item.suggestedVehicle}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Info className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{item.taxNote}</span>
                      </div>
                    </div>

                    {/* Right: Order Value in EUR & Local Currency */}
                    <div className="text-right lg:min-w-[180px] shrink-0">
                      <div className="text-xs text-slate-500 font-medium uppercase">
                        {isBuy ? 'Order Amount to Buy' : isSell ? 'Order Amount to Trim' : 'Position Adjusted'}
                      </div>
                      <div className={`text-lg font-black font-mono mt-0.5 ${
                        isBuy ? 'text-emerald-700' : isSell ? 'text-amber-800' : 'text-slate-600'
                      }`}>
                        {isHold ? fmt(0) : `${isBuy ? '+' : '-'}${fmt(Math.abs(item.diffEUR))}`}
                      </div>
                      {item.localCurrency !== currentCurrency && !isHold && (
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          ~{formatCurrency(Math.abs(item.localVal), item.localCurrency)} {item.localCurrency}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Step 4: Before vs After Allocation Preview */}
        <div className="p-4 bg-slate-900 text-white rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulated Portfolio Balance (Before vs After)</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              Projected Post-Rebalance Value: {fmt(rebalancePlan.postTotalEUR)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            
            {/* Ireland Pillar */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <div className="flex justify-between mb-1.5">
                <span className="font-bold flex items-center gap-1">
                  <span>🇮🇪 Ireland</span>
                </span>
                <span className="font-mono text-emerald-300 font-bold">
                  {currentAllocation.iePct.toFixed(1)}% &rarr; {activeTargets.ireland}%
                </span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${Math.min(100, activeTargets.ireland)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400">
                Target: {fmt((rebalancePlan.postTotalEUR * activeTargets.ireland) / 100)}
              </div>
            </div>

            {/* India Pillar */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <div className="flex justify-between mb-1.5">
                <span className="font-bold flex items-center gap-1">
                  <span>🇮🇳 India</span>
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {currentAllocation.inPct.toFixed(1)}% &rarr; {activeTargets.india}%
                </span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden flex">
                <div 
                  className="bg-amber-500 h-full transition-all"
                  style={{ width: `${Math.min(100, activeTargets.india)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400">
                Target: {fmt((rebalancePlan.postTotalEUR * activeTargets.india) / 100)}
              </div>
            </div>

            {/* US Pillar */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <div className="flex justify-between mb-1.5">
                <span className="font-bold flex items-center gap-1">
                  <span>🇺🇸 US</span>
                </span>
                <span className="font-mono text-blue-300 font-bold">
                  {currentAllocation.usPct.toFixed(1)}% &rarr; {activeTargets.us}%
                </span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden flex">
                <div 
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${Math.min(100, activeTargets.us)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400">
                Target: {fmt((rebalancePlan.postTotalEUR * activeTargets.us) / 100)}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
