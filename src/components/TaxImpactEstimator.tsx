import React, { useState, useMemo } from 'react';
import { Holding, Currency } from '../types';
import { FALLBACK_FISCAL_DATA, formatCurrency, convertFromEUR } from '../services/fiscalDataService';
import { 
  calculateTaxImpact, 
  TaxSimulationInputs, 
  DEFAULT_TAX_INPUTS,
  HoldingTaxDetail
} from '../services/taxEstimatorService';
import { 
  Receipt, 
  Globe2, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertCircle, 
  Sliders, 
  CheckCircle2, 
  Info, 
  ArrowRight, 
  RefreshCw, 
  Sparkles,
  HelpCircle,
  FileText,
  DollarSign,
  Percent,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Check
} from 'lucide-react';

interface TaxImpactEstimatorProps {
  holdings: Holding[];
  currentCurrency?: Currency;
  onOpenInvestmentAccount?: () => void;
}

export const TaxImpactEstimator: React.FC<TaxImpactEstimatorProps> = ({
  holdings,
  currentCurrency = 'EUR',
  onOpenInvestmentAccount
}) => {
  // Simulation Inputs
  const [inputs, setInputs] = useState<TaxSimulationInputs>(DEFAULT_TAX_INPUTS);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<'All' | 'Ireland' | 'India' | 'US'>('All');
  const [expandedHoldingId, setExpandedHoldingId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'currency_lab' | 'treaty_rules'>('overview');

  // Compute live tax metrics
  const taxResults = useMemo(() => {
    return calculateTaxImpact(holdings, inputs, FALLBACK_FISCAL_DATA);
  }, [holdings, inputs]);

  // Filtered holdings for details list
  const filteredHoldings = useMemo(() => {
    if (selectedCountryFilter === 'All') return taxResults.holdingDetails;
    if (selectedCountryFilter === 'Ireland') {
      return taxResults.holdingDetails.filter(h => h.country === 'Ireland' || h.country === 'Europe');
    }
    return taxResults.holdingDetails.filter(h => h.country === selectedCountryFilter);
  }, [taxResults.holdingDetails, selectedCountryFilter]);

  // Reset FX sliders
  const handleResetFx = () => {
    setInputs(prev => ({
      ...prev,
      eurUsdAdjustmentPct: 0,
      eurInrAdjustmentPct: 0
    }));
  };

  // Copy brief tax report
  const handleCopyReport = () => {
    const text = `Consolidated Cross-Border Tax Impact Report (InvestIreland AI)
Date: ${new Date().toLocaleDateString('en-IE')}
Total Portfolio: €${taxResults.totalPortfolioValueEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
Total Unrealized Gains: €${taxResults.totalUnrealizedGainsEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
  - Pure Asset Growth: €${taxResults.totalAssetGainEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
  - Currency Fluctuation Impact: €${taxResults.totalFxGainEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}

Tax Liabilities:
1. Ireland (Revenue Commissioners): €${taxResults.irelandSummary.grossTaxLiabilityEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
   (Includes 41% Exit Tax on ETFs and 33% CGT with €1,270 exemption)
2. India (CBDT/IT Dept): €${taxResults.indiaSummary.grossTaxLiabilityEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })} (₹${taxResults.indiaSummary.totalUnrealizedGainsLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })} gains, ₹1.25L exemption applied)
3. United States (IRS): €${taxResults.usSummary.grossTaxLiabilityEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })} (0% under W-8BEN Treaty)

DTAA Foreign Tax Credit: -€${taxResults.totalForeignTaxCreditsEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
Net Payable Tax: €${taxResults.netPayableTaxEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })} (Effective Rate: ${taxResults.overallEffectiveRatePct.toFixed(1)}%)
Budget 2027 PSIA Savings Potential: €${taxResults.psialSavingsPotentialEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Module Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Cross-Border Tax Engine
              </span>
              <span className="text-xs text-slate-400">
                Ireland &middot; India &middot; US Tri-Jurisdiction
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 flex items-center gap-2">
              <span>Tax Impact Estimator</span>
              <span className="text-xs font-normal text-emerald-300 bg-emerald-900/50 border border-emerald-700/50 px-2 py-0.5 rounded-lg">
                Budget 2027 Aligned
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Calculate your estimated Capital Gains Tax (CGT), Exit Tax, and Double Taxation Relief (DTAA) across Irish Revenue, Indian IT Dept, and US IRS — factoring in currency fluctuations and statutory exemptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedReport ? 'Tax Report Copied!' : 'Copy Summary'}</span>
            </button>
            <div className="bg-emerald-950/80 border border-emerald-600/40 px-3.5 py-1.5 rounded-xl text-right">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                Net Cross-Border Tax
              </span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-emerald-300">
                €{taxResults.netPayableTaxEUR.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex overflow-x-auto gap-2 mt-5 pt-4 border-t border-slate-800/80">
          {[
            { id: 'overview', label: 'Tri-Jurisdiction Overview', icon: <Globe2 className="w-3.5 h-3.5" /> },
            { id: 'currency_lab', label: 'Currency Fluctuation Simulator', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'holdings', label: `Asset Breakdown (${taxResults.holdingDetails.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'treaty_rules', label: 'DTAA & Statutory Rules', icon: <ShieldCheck className="w-3.5 h-3.5" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Body Content */}
      <div className="p-5 sm:p-6 space-y-6">

        {/* Global Key Metrics KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Unrealized Gains
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1">
              €{taxResults.totalUnrealizedGainsEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Asset: €{taxResults.totalAssetGainEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className={taxResults.totalFxGainEUR >= 0 ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                FX: {taxResults.totalFxGainEUR >= 0 ? '+' : ''}€{taxResults.totalFxGainEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Gross Tax Liabilities
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1">
              €{taxResults.totalGlobalTaxLiabilityEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              IE: €{taxResults.irelandSummary.grossTaxLiabilityEUR.toFixed(0)} &middot; IN: €{taxResults.indiaSummary.grossTaxLiabilityEUR.toFixed(0)} &middot; US: €{taxResults.usSummary.grossTaxLiabilityEUR.toFixed(0)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center justify-between">
              <span>Foreign Tax Credits</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono mt-1">
              -€{taxResults.totalForeignTaxCreditsEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-emerald-800 font-medium mt-1">
              Estimated India DTAA &amp; US treaty credits (capped at Irish tax)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-between">
              <span>Net Tax Payable</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                {taxResults.overallEffectiveRatePct.toFixed(1)}% eff.
              </span>
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1">
              €{taxResults.netPayableTaxEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              After €1,270 & ₹1.25L exemptions
            </div>
          </div>

        </div>

        {/* Currency Fluctuation Alert / Explainer */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950 flex items-start gap-3 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-900">How Irish Revenue Treats Foreign Currency Fluctuations: </span>
            Under Irish Capital Gains Tax (TCA 1997 s.28 & s.556), foreign assets (such as US RSUs or Indian Mutual Funds) must have their acquisition cost converted to EUR at the <em>historical acquisition exchange rate</em>, and the disposal proceeds converted at the <em>settlement date exchange rate</em>. 
            Because of this statutory rule, <strong>currency movements directly increase or decrease your taxable capital gain in EUR</strong>.
            Currently, FX fluctuations account for <strong className="font-mono">{taxResults.totalFxGainEUR >= 0 ? `+€${taxResults.totalFxGainEUR.toFixed(2)} in taxable gain` : `-€${Math.abs(taxResults.totalFxGainEUR).toFixed(2)} in FX loss relief`}</strong>.
          </div>
        </div>

        {/* TAB 1: TRI-JURISDICTION OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* The 3 Country Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Ireland Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label="Ireland">🇮🇪</span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Ireland</h3>
                      <span className="text-[10px] text-slate-500 font-medium">Revenue Commissioners (TCA 1997)</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    Primary Residence
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Unrealized Asset Gains:</span>
                    <span className="font-mono font-bold text-slate-800">€{taxResults.irelandSummary.totalUnrealizedGainsEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Exit Tax (41% on UCITS):</span>
                    <span className="font-mono font-bold text-amber-700">€{(taxResults.holdingDetails.filter(h => h.taxTreatment === 'Exit Tax (41%)').reduce((s, h) => s + h.totalGainEUR, 0) * 0.41).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Standard CGT (33%):</span>
                    <span className="font-mono font-bold text-slate-800">
                      €{(taxResults.irelandSummary.grossTaxLiabilityEUR - (taxResults.holdingDetails.filter(h => h.taxTreatment === 'Exit Tax (41%)').reduce((s, h) => s + h.totalGainEUR, 0) * 0.41)).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-700">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Annual CGT Exemption:
                    </span>
                    <span className="font-mono font-bold">-€{taxResults.irelandSummary.statutoryExemptionEUR.toFixed(0)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-sm">
                    <span className="text-slate-900">Total Irish Tax:</span>
                    <span className="font-mono text-emerald-700">€{taxResults.irelandSummary.grossTaxLiabilityEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
                  <strong>Key Strategy:</strong> {taxResults.irelandSummary.keyAdvice}
                </div>
              </div>

              {/* India Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-orange-300 transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label="India">🇮🇳</span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">India</h3>
                      <span className="text-[10px] text-slate-500 font-medium">Income Tax Act & DTAA Art. 13</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                    Source Jurisdiction
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Unrealized Gains:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ₹{taxResults.indiaSummary.totalUnrealizedGainsLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })} (~€{taxResults.indiaSummary.totalUnrealizedGainsEUR.toFixed(0)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Section 112A LTCG Rate:</span>
                    <span className="font-mono font-bold text-slate-800">12.5% (+ 4% cess)</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-700">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Section 112A Exemption:
                    </span>
                    <span className="font-mono font-bold">-₹{taxResults.indiaSummary.statutoryExemptionLocal.toLocaleString()} (~€{taxResults.indiaSummary.statutoryExemptionEUR.toFixed(0)})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Indian Tax Withholding:</span>
                    <span className="font-mono font-bold text-orange-700">₹{(taxResults.indiaSummary.grossTaxLiabilityEUR * taxResults.simulatedFxRates.EUR_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 0 })} (~€{taxResults.indiaSummary.grossTaxLiabilityEUR.toFixed(0)})</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-sm">
                    <span className="text-slate-900">Ireland DTAA Credit:</span>
                    <span className="font-mono text-emerald-700">-€{taxResults.indiaSummary.foreignTaxCreditEUR.toFixed(0)}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-orange-50/70 border border-orange-100 text-[11px] text-orange-950 leading-relaxed">
                  <strong>Key Strategy:</strong> {taxResults.indiaSummary.keyAdvice}
                </div>
              </div>

              {/* US Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label="United States">🇺🇸</span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">United States</h3>
                      <span className="text-[10px] text-slate-500 font-medium">IRS & US-Ireland Treaty Art. 14</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {inputs.hasW8Ben ? 'W-8BEN 0% US CGT' : 'No W-8BEN (30%)'}
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Unrealized Gains:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ${taxResults.usSummary.totalUnrealizedGainsLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })} (~€{taxResults.usSummary.totalUnrealizedGainsEUR.toFixed(0)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">US Withholding on CGT:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {inputs.hasW8Ben ? '$0.00 (0% via Treaty)' : `$${(taxResults.usSummary.totalUnrealizedGainsLocal * 0.3).toFixed(0)} (30%)`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Taxable in Ireland:</span>
                    <span className="font-mono font-bold text-slate-800">Yes (TCA 1997 s.28 @ 33%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">RSU Vest Basis Rule:</span>
                    <span className="font-mono font-bold text-slate-700">FMV on Vest Date</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-sm">
                    <span className="text-slate-900">Direct US Tax Liability:</span>
                    <span className="font-mono text-emerald-700">€{taxResults.usSummary.grossTaxLiabilityEUR.toFixed(0)}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-950 leading-relaxed">
                  <strong>Key Strategy:</strong> {taxResults.usSummary.keyAdvice}
                </div>
              </div>

            </div>

            {/* Budget 2027 PSIA Tax Shield Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border border-emerald-700/50 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Budget 2027 Personal Investment Account (PSIA) Tax Shield</span>
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded">
                      Saves €{taxResults.psialSavingsPotentialEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Under current Irish law, your UCITS ETF investments incur 41% exit tax and 8-year deemed disposal. Moving them into the 2027 Investment Account (€50,000 threshold) shelters you from exit tax, leaving more compounded wealth.
                  </p>
                </div>
              </div>

              {onOpenInvestmentAccount && (
                <button
                  onClick={onOpenInvestmentAccount}
                  className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
                >
                  Explore 2027 Account &rarr;
                </button>
              )}
            </div>

            {/* Tax Optimization Insights List */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Cross-Border Tax Harvesting Recommendations
              </h4>
              <div className="space-y-2.5">
                {taxResults.taxHarvestingInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {taxResults.assumptions.length > 0 && (
              <div className="bg-amber-50 p-5 rounded-xl border border-amber-200" role="note">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-3">
                  Assumptions used in this estimate
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-amber-900">
                  {taxResults.assumptions.map((assumption, idx) => (
                    <li key={idx} className="leading-relaxed">{assumption}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Estimates only, not tax advice. Deemed disposal, DIRT on deposits, loss relief and individual circumstances are simplified. Confirm with Revenue.ie or a qualified tax adviser before acting.
            </p>

          </div>
        )}

        {/* TAB 2: CURRENCY FLUCTUATION SIMULATOR LAB */}
        {activeTab === 'currency_lab' && (
          <div className="space-y-6">
            
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    Simulate Foreign Exchange (FX) Scenarios
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    See how movements in EUR/USD and EUR/INR directly shift your Irish Revenue taxable gains and liabilities.
                  </p>
                </div>
                <button
                  onClick={handleResetFx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset to Official Spot Rates</span>
                </button>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                
                {/* EUR/USD Slider */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-base" role="img" aria-label="US">🇺🇸</span>
                      EUR / USD Exchange Rate
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {taxResults.simulatedFxRates.EUR_TO_USD.toFixed(3)} USD
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({inputs.eurUsdAdjustmentPct >= 0 ? '+' : ''}{inputs.eurUsdAdjustmentPct}%)
                      </span>
                    </span>
                  </div>

                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={inputs.eurUsdAdjustmentPct}
                    onChange={(e) => setInputs(prev => ({ ...prev, eurUsdAdjustmentPct: Number(e.target.value) }))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>-15% (Stronger USD)</span>
                    <span className="font-semibold text-slate-600">Spot: {FALLBACK_FISCAL_DATA.macroIndicators.fxRates.EUR_TO_USD}</span>
                    <span>+15% (Weaker USD)</span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    {[-10, -5, 0, 5, 10].map(pct => (
                      <button
                        key={pct}
                        onClick={() => setInputs(prev => ({ ...prev, eurUsdAdjustmentPct: pct }))}
                        className={`flex-1 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                          inputs.eurUsdAdjustmentPct === pct
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pct > 0 ? `+${pct}%` : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* EUR/INR Slider */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-base" role="img" aria-label="India">🇮🇳</span>
                      EUR / INR Exchange Rate
                    </span>
                    <span className="text-xs font-mono font-bold text-orange-700">
                      ₹{taxResults.simulatedFxRates.EUR_TO_INR.toFixed(2)} INR
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({inputs.eurInrAdjustmentPct >= 0 ? '+' : ''}{inputs.eurInrAdjustmentPct}%)
                      </span>
                    </span>
                  </div>

                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={inputs.eurInrAdjustmentPct}
                    onChange={(e) => setInputs(prev => ({ ...prev, eurInrAdjustmentPct: Number(e.target.value) }))}
                    className="w-full accent-orange-600 cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>-15% (Stronger INR)</span>
                    <span className="font-semibold text-slate-600">Spot: ₹{FALLBACK_FISCAL_DATA.macroIndicators.fxRates.EUR_TO_INR}</span>
                    <span>+15% (Weaker INR)</span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    {[-10, -5, 0, 5, 10].map(pct => (
                      <button
                        key={pct}
                        onClick={() => setInputs(prev => ({ ...prev, eurInrAdjustmentPct: pct }))}
                        className={`flex-1 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                          inputs.eurInrAdjustmentPct === pct
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pct > 0 ? `+${pct}%` : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Simulation Result Comparison */}
              <div className="mt-5 p-4 rounded-xl bg-white border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Simulation Impact on Cross-Border Portfolio
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Simulated Portfolio (EUR):</span>
                    <span className="font-mono text-base font-extrabold text-slate-900">
                      €{taxResults.totalPortfolioValueEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Net FX Currency Attribution:</span>
                    <span className={`font-mono text-base font-extrabold ${taxResults.totalFxGainEUR >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {taxResults.totalFxGainEUR >= 0 ? '+' : ''}€{taxResults.totalFxGainEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Simulated Net Tax Bill:</span>
                    <span className="font-mono text-base font-extrabold text-slate-900">
                      €{taxResults.netPayableTaxEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: HOLDINGS BREAKDOWN TABLE */}
        {activeTab === 'holdings' && (
          <div className="space-y-4">
            
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {(['All', 'Ireland', 'India', 'US'] as const).map(country => (
                  <button
                    key={country}
                    onClick={() => setSelectedCountryFilter(country)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedCountryFilter === country
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {country === 'All' ? 'All Jurisdictions' : country}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredHoldings.length} assets
              </span>
            </div>

            {/* Holdings Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Asset & Provider</th>
                      <th className="px-4 py-3">Jurisdiction</th>
                      <th className="px-4 py-3 text-right">Current Value</th>
                      <th className="px-4 py-3 text-right">Unrealized Gain</th>
                      <th className="px-4 py-3">Tax Treatment</th>
                      <th className="px-4 py-3 text-right">Est. Tax</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredHoldings.map(h => {
                      const isExpanded = expandedHoldingId === h.id;
                      return (
                        <React.Fragment key={h.id}>
                          <tr className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div>{h.assetName}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{h.assetType} &middot; {h.units} units</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 text-slate-700">
                                {h.country === 'Ireland' && '🇮🇪 Ireland'}
                                {h.country === 'Europe' && '🇪🇺 Europe'}
                                {h.country === 'India' && '🇮🇳 India'}
                                {h.country === 'US' && '🇺🇸 US'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                              <div>€{h.currentValueEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                              {h.currency !== 'EUR' && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {h.currency} {h.currentValueLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              <div className="font-bold text-emerald-700">
                                +€{h.totalGainEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                +{h.gainPct.toFixed(1)}%
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                h.taxTreatment === 'Exit Tax (41%)' ? 'bg-amber-100 text-amber-800' :
                                h.taxTreatment.includes('12.5%') ? 'bg-orange-100 text-orange-800' :
                                h.taxTreatment.includes('Pension') ? 'bg-indigo-100 text-indigo-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {h.taxTreatment}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              €{h.estimatedTaxEUR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setExpandedHoldingId(isExpanded ? null : h.id)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                                title="Toggle details"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Detail Drawer */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-t border-b border-slate-200">
                              <td colSpan={7} className="p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <span className="font-bold text-slate-700 block mb-1">Gain Decomposition (Irish Revenue Rule):</span>
                                    <div className="text-slate-600 space-y-1">
                                      <div className="flex justify-between">
                                        <span>Pure Asset Gain:</span>
                                        <span className="font-mono font-bold">€{h.assetGainEUR.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>FX Currency Movement:</span>
                                        <span className={`font-mono font-bold ${h.fxGainEUR >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                          {h.fxGainEUR >= 0 ? '+' : ''}€{h.fxGainEUR.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <span className="font-bold text-slate-700 block mb-1">Cost Basis Details:</span>
                                    <div className="text-slate-600 space-y-1">
                                      <div className="flex justify-between">
                                        <span>Purchase Basis:</span>
                                        <span className="font-mono">{h.currency} {h.purchaseValueLocal.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Converted Basis (EUR):</span>
                                        <span className="font-mono">€{h.purchaseValueEUR.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <span className="font-bold text-slate-700 block mb-1">Statutory Tax Notes:</span>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                      {h.notes}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: TREATY RULES & SETTINGS */}
        {activeTab === 'treaty_rules' && (
          <div className="space-y-6">
            
            {/* Interactive Toggle Settings */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Tax Profile & Statutory Exemption Toggles
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Irish CGT Exemption */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Irish Personal CGT Exemption</span>
                    <span className="text-[11px] text-slate-500">€1,270 per tax year</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={inputs.applyIrishCgtExemption}
                    onChange={(e) => setInputs(prev => ({ ...prev, applyIrishCgtExemption: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Indian LTCG Exemption */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Indian Section 112A Exemption</span>
                    <span className="text-[11px] text-slate-500">₹1,25,000 per financial year</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={inputs.applyIndianLtcgExemption}
                    onChange={(e) => setInputs(prev => ({ ...prev, applyIndianLtcgExemption: e.target.checked }))}
                    className="w-4 h-4 accent-orange-600 cursor-pointer"
                  />
                </div>

                {/* US W-8BEN Form */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">US Form W-8BEN Filed</span>
                    <span className="text-[11px] text-slate-500">0% US withholding on capital gains</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={inputs.hasW8Ben}
                    onChange={(e) => setInputs(prev => ({ ...prev, hasW8Ben: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Holding Period Toggle */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Holding Duration</span>
                    <span className="text-[11px] text-slate-500">{inputs.holdingPeriod === 'long_term' ? 'Long-term (>12m)' : 'Short-term (<=12m)'}</span>
                  </div>
                  <button
                    onClick={() => setInputs(prev => ({ ...prev, holdingPeriod: prev.holdingPeriod === 'long_term' ? 'short_term' : 'long_term' }))}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Toggle
                  </button>
                </div>

                {/* Tax Residency */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between sm:col-span-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Tax Residency Status</span>
                    <span className="text-[11px] text-slate-500">
                      {inputs.userTaxResidency === 'irish_resident' ? 'Irish Tax Resident (Worldwide taxation)' : 'US Person / Green Card in Ireland'}
                    </span>
                  </div>
                  <button
                    onClick={() => setInputs(prev => ({ ...prev, userTaxResidency: prev.userTaxResidency === 'irish_resident' ? 'us_person_in_ireland' : 'irish_resident' }))}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Change Status
                  </button>
                </div>

              </div>
            </div>

            {/* Treaty & Statutory Legal Citations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  India-Ireland DTAA (Article 13 & 25)
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Under the bilateral agreement, capital gains from the alienation of shares in Indian companies are taxed in India. However, Article 25 directs Ireland to credit Indian tax paid against the Irish tax chargeable on the same gains.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  US-Ireland Double Taxation Treaty (Article 14)
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Gains derived by an Irish resident from the alienation of US capital stock are exempt from US tax, provided a current Form W-8BEN is maintained with the US broker. The gains remain taxable in Ireland under TCA 1997.
                </p>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
