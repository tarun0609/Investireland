import React, { useState, useMemo } from 'react';
import { Currency, BudgetCalculatorInputs, BudgetCalculatorResult } from '../types';
import { calculateBudgetProjections } from '../services/budgetCalculatorService';
import { formatCurrency, convertFromEUR, convertToEUR } from '../services/fiscalDataService';
import { 
  Calculator, 
  TrendingUp, 
  Percent, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  RotateCcw, 
  Table, 
  BarChart3, 
  Clock,
  Layers,
  Info
} from 'lucide-react';

interface BudgetCalculatorSectionProps {
  currentCurrency: Currency;
  onOpenWaitlist: (prefillData?: any) => void;
}

export const BudgetCalculatorSection: React.FC<BudgetCalculatorSectionProps> = ({
  currentCurrency,
  onOpenWaitlist
}) => {
  // Mode toggle: 'comparison' | 'fy26' | 'fy27'
  const [activeRegimeTab, setActiveRegimeTab] = useState<'comparison' | 'fy26' | 'fy27'>('comparison');
  const [showTable, setShowTable] = useState(false);

  // Dynamic state inputs (stored in EUR)
  const [startingAmountEUR, setStartingAmountEUR] = useState<number>(10000);
  const [monthlyContributionEUR, setMonthlyContributionEUR] = useState<number>(1000); // €1,000/mo = €12,000/yr (max FY27 scheme)
  const [timeHorizonYears, setTimeHorizonYears] = useState<number>(10);
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(0.07); // 7%
  const [adjustForInflation, setAdjustForInflation] = useState<boolean>(false);
  const [assetClass, setAssetClass] = useState<'etf_fund' | 'individual_shares'>('etf_fund');

  // Compute live projections dynamically
  const calculation: BudgetCalculatorResult = useMemo(() => {
    return calculateBudgetProjections({
      startingAmount: startingAmountEUR,
      monthlyContribution: monthlyContributionEUR,
      timeHorizonYears,
      annualReturnRate,
      adjustForInflation,
      assetClass
    });
  }, [startingAmountEUR, monthlyContributionEUR, timeHorizonYears, annualReturnRate, adjustForInflation, assetClass]);

  // Currency converted displays
  const displayTotalInvested = formatCurrency(convertFromEUR(calculation.totalContributions, currentCurrency), currentCurrency);
  const displayFY26Net = formatCurrency(convertFromEUR(calculation.fy26FinalNetValue, currentCurrency), currentCurrency);
  const displayFY27Net = formatCurrency(convertFromEUR(calculation.fy27FinalNetValue, currentCurrency), currentCurrency);
  const displayWealthSaved = formatCurrency(convertFromEUR(calculation.totalWealthSaved, currentCurrency), currentCurrency);
  const displayTaxesFY26 = formatCurrency(convertFromEUR(calculation.totalTaxesFY26, currentCurrency), currentCurrency);
  const displayTaxesFY27 = formatCurrency(convertFromEUR(calculation.totalTaxesFY27, currentCurrency), currentCurrency);

  // Quick preset handlers
  const handleReset = () => {
    setStartingAmountEUR(10000);
    setMonthlyContributionEUR(1000);
    setTimeHorizonYears(10);
    setAnnualReturnRate(0.07);
    setAdjustForInflation(false);
    setAssetClass('etf_fund');
  };

  const handleMaxScheme = () => {
    setMonthlyContributionEUR(1000); // €1,000/mo maxes out the €12,000/year allowance
  };

  return (
    <section id="calculator" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive Fiscal Model</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            FY26 vs FY27 Budget &amp; Investment Calculator
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            See the exact mathematical impact of transitioning from Ireland’s current <strong className="text-slate-900">41% deemed disposal regime</strong> to the new <strong className="text-slate-900">Budget 2027 Personal Savings &amp; Investment Account</strong>.
          </p>
        </div>

        {/* View / Regime Switcher Tabs */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setActiveRegimeTab('comparison')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeRegimeTab === 'comparison'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Side-by-Side Comparison
            </button>
            <button
              onClick={() => setActiveRegimeTab('fy27')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeRegimeTab === 'fy27'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FY27 New Scheme Only (€12k / €50k)
            </button>
            <button
              onClick={() => setActiveRegimeTab('fy26')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeRegimeTab === 'fy26'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FY26 Current Regime (41% Deemed Disposal)
            </button>
          </div>
        </div>

        {/* Main Interactive Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Dynamic Sliders & Inputs (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Simulation Parameters</span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                title="Reset to default values"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="space-y-6">

              {/* Starting Lump Sum */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <label htmlFor="starting-amount">Starting Lump Sum Investment</label>
                  <span className="font-mono text-slate-900 font-bold">
                    {formatCurrency(convertFromEUR(startingAmountEUR, currentCurrency), currentCurrency)}
                  </span>
                </div>
                <input
                  id="starting-amount"
                  type="range"
                  min="0"
                  max="100000"
                  step="1000"
                  value={startingAmountEUR}
                  onChange={(e) => setStartingAmountEUR(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-600 mt-1">
                  <span>€0</span>
                  <span>€25,000</span>
                  <span>€50,000</span>
                  <span>€100,000</span>
                </div>
              </div>

              {/* Monthly Contribution */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="monthly-contribution">Monthly Contribution</label>
                    {monthlyContributionEUR === 1000 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                        €12k Max Cap
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-900 font-bold">
                    {formatCurrency(convertFromEUR(monthlyContributionEUR, currentCurrency), currentCurrency)}
                    <span className="text-[11px] text-slate-600 font-normal">/mo</span>
                  </span>
                </div>
                <input
                  id="monthly-contribution"
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={monthlyContributionEUR}
                  onChange={(e) => setMonthlyContributionEUR(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-600 mt-1">
                  <span>€0</span>
                  <button
                    onClick={handleMaxScheme}
                    className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    Quick Set €1,000/mo (Annual Cap)
                  </button>
                  <span>€2,000</span>
                </div>
              </div>

              {/* Time Horizon */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <label htmlFor="time-horizon">Investment Period</label>
                  <span className="font-mono text-slate-900 font-bold">
                    {timeHorizonYears} Years
                  </span>
                </div>
                <input
                  id="time-horizon"
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={timeHorizonYears}
                  onChange={(e) => setTimeHorizonYears(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-600 mt-1">
                  <span>1 yr</span>
                  <span className={timeHorizonYears >= 8 ? 'text-amber-800 font-bold' : ''}>
                    8 yrs (Deemed Disposal)
                  </span>
                  <span>15 yrs</span>
                  <span>25 yrs</span>
                </div>
              </div>

              {/* Illustrative Return Rate Buttons */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Illustrative Annual Return Rate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[0.05, 0.07, 0.09].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setAnnualReturnRate(rate)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        annualReturnRate === rate
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {Math.round(rate * 100)}% p.a.
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5 italic">
                  Hypothetical scenario only. Past performance does not guarantee future results.
                </p>
              </div>

              {/* Asset Class Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Underlying Asset Vehicle
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAssetClass('etf_fund')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      assetClass === 'etf_fund'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>UCITS ETFs &amp; Funds</div>
                    <div className="text-[10px] text-slate-500 font-normal">FY26: 41% + 8-yr disposal</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssetClass('individual_shares')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      assetClass === 'individual_shares'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>Direct Equities</div>
                    <div className="text-[10px] text-slate-500 font-normal">FY26: 33% CGT (€1,270 exempt)</div>
                  </button>
                </div>
              </div>

              {/* Inflation Adjustment Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Adjust for Inflation (CSO 2.2% HICP)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Calculates future purchasing power
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustForInflation(!adjustForInflation)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    adjustForInflation ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs"></span>
                </button>
              </div>

            </div>

          </div>

          {/* Right Column: Projection Results & Visual Breakdown (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Spotlight Banner: Total Wealth Saved */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 rounded-2xl p-6 text-white shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-200 bg-emerald-800/60 px-2.5 py-1 rounded-full">
                    <Sparkles className="w-3.5 h-3.5" />
                    Projected Benefit under FY27 Scheme
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono mt-2 tracking-tight">
                    +{displayWealthSaved}
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                    Extra wealth retained in your pocket compared to current FY26 rules over {timeHorizonYears} years.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/20 text-center sm:min-w-[150px]">
                  <div className="text-2xl font-extrabold font-mono text-emerald-300">
                    {calculation.percentageTaxReduction}%
                  </div>
                  <div className="text-[11px] text-white/80 font-medium">
                    Estimated Tax Drag Reduction
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-Side Regime Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* FY26 Card */}
              <div className={`p-5 rounded-2xl border transition-all ${
                activeRegimeTab === 'fy26' || activeRegimeTab === 'comparison'
                  ? 'bg-white border-slate-300 shadow-xs ring-1 ring-slate-300/50'
                  : 'bg-slate-50/50 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    FY26 Current Regime
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                    {assetClass === 'etf_fund' ? '41% Exit Tax' : '33% CGT'}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-500">Projected Net Value</div>
                  <div className="text-2xl font-extrabold text-slate-800 font-mono">
                    {displayFY26Net}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Invested:</span>
                    <span className="font-mono font-medium">{displayTotalInvested}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Tax Drag &amp; Deemed Disposal:</span>
                    <span className="font-mono">-{displayTaxesFY26}</span>
                  </div>
                  {assetClass === 'etf_fund' && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg mt-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <span>Forced deemed disposal events hit every 8 years on unrealized gains.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* FY27 Card */}
              <div className={`p-5 rounded-2xl border transition-all ${
                activeRegimeTab === 'fy27' || activeRegimeTab === 'comparison'
                  ? 'bg-emerald-50/50 border-emerald-300 shadow-xs ring-1 ring-emerald-400/50'
                  : 'bg-slate-50/50 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                  <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
                    FY27 Investment Account
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-medium">
                    €50k Tax-Free + 1% Excess
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-emerald-800 font-medium">Projected Net Value</div>
                  <div className="text-2xl font-extrabold text-emerald-950 font-mono">
                    {displayFY27Net}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Invested:</span>
                    <span className="font-mono font-medium">{displayTotalInvested}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>1% Annual Charge (above €50k):</span>
                    <span className="font-mono">-{displayTaxesFY27}</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 bg-emerald-100/70 p-2 rounded-lg mt-2 flex items-start gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-700" />
                    <span>0% tax on first €50,000 &middot; No 8-year deemed disposal forced sales!</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Threshold Progress Bar for FY27 */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-2">
                <span>€50,000 Tax-Free Threshold Status</span>
                <span className="text-emerald-700 font-bold font-mono">
                  {calculation.projections[calculation.projections.length - 1].fy27NetValue >= 50000 
                    ? '100% Tax-Free Ceiling Reached' 
                    : `${calculation.projections[calculation.projections.length - 1].thresholdProgressPct}% Filled`}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, calculation.projections[calculation.projections.length - 1].thresholdProgressPct)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                The 1.0% annual charge only applies to portfolio value exceeding €50,000. All compounding up to €50,000 is sheltered.
              </p>
            </div>

            {/* Toggle Year-by-Year Table Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowTable(!showTable)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Table className="w-3.5 h-3.5" />
                <span>{showTable ? 'Hide Annual Breakdown Table' : 'Show Year-by-Year Breakdown Table'}</span>
              </button>

              <button
                onClick={() => onOpenWaitlist({
                  startingAmountEUR,
                  monthlyContributionEUR,
                  timeHorizonYears,
                  estimatedWealthSaved: calculation.totalWealthSaved
                })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <span>Save My Calculation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expandable Table */}
            {showTable && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                  Annual Milestone Projection (Nominal Values)
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Year</th>
                        <th className="py-2.5 px-3">Total Deposited</th>
                        <th className="py-2.5 px-3">FY26 Net (Old)</th>
                        <th className="py-2.5 px-3 text-emerald-800">FY27 Net (New)</th>
                        <th className="py-2.5 px-3 text-emerald-700">Wealth Saved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                      {calculation.projections.map((p) => (
                        <tr key={p.year} className={p.year % 8 === 0 ? 'bg-amber-50/60' : 'hover:bg-slate-50'}>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            Yr {p.year} {p.year % 8 === 0 && <span className="text-[10px] text-amber-700 font-sans font-semibold">(8yr cycle)</span>}
                          </td>
                          <td className="py-2 px-3">
                            {formatCurrency(convertFromEUR(p.contributionsCumulative, currentCurrency), currentCurrency)}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {formatCurrency(convertFromEUR(p.fy26NetValue, currentCurrency), currentCurrency)}
                          </td>
                          <td className="py-2 px-3 font-semibold text-emerald-900">
                            {formatCurrency(convertFromEUR(p.fy27NetValue, currentCurrency), currentCurrency)}
                          </td>
                          <td className="py-2 px-3 font-bold text-emerald-700">
                            +{formatCurrency(convertFromEUR(p.wealthSavedUnderFY27, currentCurrency), currentCurrency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};
