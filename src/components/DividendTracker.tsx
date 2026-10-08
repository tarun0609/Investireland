import React, { useState, useMemo, useEffect } from 'react';
import { 
  Holding, 
  Currency, 
  DividendRecord, 
  CountryExposure 
} from '../types';
import { 
  formatCurrency, 
  convertToEUR, 
  convertFromEUR, 
  FALLBACK_FISCAL_DATA 
} from '../services/fiscalDataService';
import { 
  getStoredDividends, 
  saveStoredDividends, 
  calculateDividendAnalytics, 
  DEFAULT_HISTORICAL_DIVIDENDS 
} from '../services/dividendService';
import { 
  Coins, 
  TrendingUp, 
  ShieldCheck, 
  Globe2, 
  Calendar, 
  Plus, 
  RotateCcw, 
  Filter, 
  Download, 
  Search, 
  Info, 
  ChevronRight, 
  Check, 
  X, 
  ArrowUpRight,
  Sparkles,
  PieChart as PieIcon,
  Receipt
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Legend 
} from 'recharts';

interface DividendTrackerProps {
  holdings: Holding[];
  currentCurrency: Currency;
  onOpenInvestmentAccount?: () => void;
  compact?: boolean;
}

export const DividendTracker: React.FC<DividendTrackerProps> = ({
  holdings,
  currentCurrency,
  onOpenInvestmentAccount,
  compact = false
}) => {
  const [dividends, setDividends] = useState<DividendRecord[]>(() => getStoredDividends());
  const [countryFilter, setCountryFilter] = useState<'All' | CountryExposure>('All');
  const [yearFilter, setYearFilter] = useState<'All' | number>('All');
  const [payoutTypeFilter, setPayoutTypeFilter] = useState<'All' | DividendRecord['payoutType']>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartMode, setChartMode] = useState<'cumulative' | 'jurisdiction' | 'periodic'>('cumulative');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showDtaaGuide, setShowDtaaGuide] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // New dividend form state
  const [newHoldingId, setNewHoldingId] = useState<string>(holdings[0]?.id || 'h-5');
  const [newPaymentDate, setNewPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newGrossAmount, setNewGrossAmount] = useState<number>(15000);
  const [newWithholdingRate, setNewWithholdingRate] = useState<number>(20);
  const [newPayoutType, setNewPayoutType] = useState<DividendRecord['payoutType']>('Cash Payout');
  const [newNotes, setNewNotes] = useState<string>('');

  // Persist changes to localStorage
  useEffect(() => {
    saveStoredDividends(dividends);
  }, [dividends]);

  // Synchronize new holding form defaults when newHoldingId changes
  const selectedHolding = useMemo(() => {
    return holdings.find(h => h.id === newHoldingId) || holdings[0];
  }, [newHoldingId, holdings]);

  useEffect(() => {
    if (selectedHolding) {
      if (selectedHolding.country === 'US') {
        setNewWithholdingRate(15);
      } else if (selectedHolding.country === 'India') {
        setNewWithholdingRate(20);
      } else if (selectedHolding.country === 'Ireland') {
        setNewWithholdingRate(33);
      } else {
        setNewWithholdingRate(20);
      }
    }
  }, [selectedHolding]);

  // Compute analytics
  const analytics = useMemo(() => {
    return calculateDividendAnalytics(dividends, holdings);
  }, [dividends, holdings]);

  // Filtered ledger
  const filteredDividends = useMemo(() => {
    return dividends.filter(item => {
      if (countryFilter !== 'All' && item.country !== countryFilter) return false;
      if (yearFilter !== 'All' && new Date(item.paymentDate).getFullYear() !== yearFilter) return false;
      if (payoutTypeFilter !== 'All' && item.payoutType !== payoutTypeFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.holdingName.toLowerCase().includes(query);
        const matchesTicker = item.ticker?.toLowerCase().includes(query) || false;
        const matchesBroker = item.broker.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesTicker && !matchesBroker && !matchesNotes) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [dividends, countryFilter, yearFilter, payoutTypeFilter, searchQuery]);

  // Chart data formatting in user currency
  const chartData = useMemo(() => {
    return analytics.timeline.map(point => {
      return {
        date: point.date,
        period: point.periodLabel,
        cumulativeGross: Math.round(convertFromEUR(point.cumulativeEUR, currentCurrency)),
        cumulativeNet: Math.round(convertFromEUR(point.cumulativeNetEUR, currentCurrency)),
        withholdingTax: Math.round(convertFromEUR(point.whtEUR, currentCurrency)),
        ireland: Math.round(convertFromEUR(point.irelandEUR, currentCurrency)),
        india: Math.round(convertFromEUR(point.indiaEUR, currentCurrency)),
        us: Math.round(convertFromEUR(point.usEUR, currentCurrency)),
        payout: Math.round(convertFromEUR(point.payoutEUR, currentCurrency))
      };
    });
  }, [analytics.timeline, currentCurrency]);

  // Periodic bar chart data (quarterly/yearly aggregation)
  const periodicChartData = useMemo(() => {
    const periodMap = new Map<string, { period: string; ireland: number; india: number; us: number; total: number }>();
    
    // Sort chronological
    const sorted = [...dividends].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
    
    for (const div of sorted) {
      const d = new Date(div.paymentDate);
      const q = Math.floor(d.getMonth() / 3) + 1;
      const key = `${d.getFullYear()} Q${q}`;
      const entry = periodMap.get(key) || { period: key, ireland: 0, india: 0, us: 0, total: 0 };
      
      const valEUR = convertToEUR(div.grossAmount, div.currency);
      const valUserCurr = convertFromEUR(valEUR, currentCurrency);

      if (div.country === 'Ireland') entry.ireland += valUserCurr;
      else if (div.country === 'India') entry.india += valUserCurr;
      else if (div.country === 'US') entry.us += valUserCurr;
      entry.total += valUserCurr;

      periodMap.set(key, entry);
    }

    return Array.from(periodMap.values()).map(p => ({
      ...p,
      ireland: Math.round(p.ireland),
      india: Math.round(p.india),
      us: Math.round(p.us),
      total: Math.round(p.total)
    }));
  }, [dividends, currentCurrency]);

  const handleSaveDividend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHolding || newGrossAmount <= 0) return;

    const whtAmount = (newGrossAmount * (newWithholdingRate / 100));
    const netAmount = newGrossAmount - whtAmount;

    let taxCategory: DividendRecord['taxCategory'] = 'Irish DIRT / Income Tax';
    if (selectedHolding.country === 'US') taxCategory = 'US WHT (W-8BEN)';
    else if (selectedHolding.country === 'India') taxCategory = 'India TDS (DTAA Art 12)';
    else if (selectedHolding.assetType === 'ETF') taxCategory = 'UCITS Fund Distribution';

    const newRecord: DividendRecord = {
      id: `div-${Date.now()}`,
      holdingId: selectedHolding.id,
      holdingName: selectedHolding.assetName,
      ticker: selectedHolding.ticker,
      country: selectedHolding.country,
      paymentDate: newPaymentDate,
      grossAmount: Number(newGrossAmount),
      withholdingTax: Number(whtAmount.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      currency: selectedHolding.currency,
      withholdingRatePct: Number(newWithholdingRate),
      taxCategory,
      payoutType: newPayoutType,
      broker: selectedHolding.provider,
      notes: newNotes.trim() || undefined
    };

    setDividends(prev => [newRecord, ...prev]);
    setIsAddModalOpen(false);
    setNewNotes('');
  };

  const handleDeleteDividend = (id: string) => {
    setDividends(prev => prev.filter(d => d.id !== id));
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset dividend tracker to default verified cross-border historical records?')) {
      setDividends(DEFAULT_HISTORICAL_DIVIDENDS);
      saveStoredDividends(DEFAULT_HISTORICAL_DIVIDENDS);
    }
  };

  const handleCopySummary = () => {
    const text = `=== CROSS-BORDER DIVIDEND INCOME SUMMARY ===
Cumulative Historical Dividends: ${formatCurrency(convertFromEUR(analytics.totalGrossEUR, currentCurrency), currentCurrency)}
Net Dividends Received: ${formatCurrency(convertFromEUR(analytics.totalNetEUR, currentCurrency), currentCurrency)}
Total Foreign & Domestic Tax Withheld: ${formatCurrency(convertFromEUR(analytics.totalWithholdingTaxEUR, currentCurrency), currentCurrency)} (${analytics.effectiveTaxRatePct.toFixed(1)}%)
Foreign Tax Credit Claimable (Ireland DTAA): ${formatCurrency(convertFromEUR(analytics.foreignTaxCreditAvailableEUR, currentCurrency), currentCurrency)}
Trailing 12-Month Dividend Run Rate: ${formatCurrency(convertFromEUR(analytics.ttmDividendsEUR, currentCurrency), currentCurrency)} / yr (${analytics.annualizedYieldPct.toFixed(2)}% yield)

JURISDICTION BREAKDOWN:
- Ireland: ${formatCurrency(convertFromEUR(analytics.byCountry.find(c => c.country === 'Ireland')?.grossEUR || 0, currentCurrency), currentCurrency)}
- India: ${formatCurrency(convertFromEUR(analytics.byCountry.find(c => c.country === 'India')?.grossEUR || 0, currentCurrency), currentCurrency)} (TDS claimable under Art 23)
- US: ${formatCurrency(convertFromEUR(analytics.byCountry.find(c => c.country === 'US')?.grossEUR || 0, currentCurrency), currentCurrency)} (15% W-8BEN WHT)
Total Recorded Payments: ${dividends.length}
Generated via InvestIreland Portfolio Engine`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Holding', 'Ticker', 'Country', 'Currency', 'Gross Amount', 'Withholding Tax', 'Net Amount', 'WHT Rate %', 'Tax Category', 'Payout Type', 'Broker', 'Notes'];
    const rows = dividends.map(d => [
      d.paymentDate,
      `"${d.holdingName.replace(/"/g, '""')}"`,
      d.ticker || '',
      d.country,
      d.currency,
      d.grossAmount,
      d.withholdingTax,
      d.netAmount,
      d.withholdingRatePct,
      d.taxCategory,
      d.payoutType,
      `"${d.broker.replace(/"/g, '""')}"`,
      `"${(d.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `investireland_dividend_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* 1. Header Bar */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded">
                Cross-Border Cashflow Engine
              </span>
              <span className="text-xs text-slate-400">
                Ireland &middot; India &middot; US Tax Treaties
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 flex items-center gap-2.5">
              <Coins className="w-6 h-6 text-emerald-400" />
              <span>Dividend Income Tracking Module</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Consolidated historical ledger and cumulative trajectory of dividends received across all foreign and domestic assets. Tracks Double Taxation Agreement (DTAA) foreign tax credits for Irish Revenue Form 11 reporting.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDtaaGuide(!showDtaaGuide)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="View Irish Revenue DTAA rules on foreign dividends"
            >
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>DTAA Tax Rules</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Download dividend ledger CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Copy executive summary to clipboard"
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Receipt className="w-3.5 h-3.5" />}
              <span>{copySuccess ? 'Copied!' : 'Copy Summary'}</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Dividend</span>
            </button>
          </div>
        </div>

        {/* DTAA Guidance Drawer */}
        {showDtaaGuide && (
          <div className="mt-5 p-4 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Irish Tax Treatment of Cross-Border Dividends (Revenue TCA 1997)
              </span>
              <button 
                onClick={() => setShowDtaaGuide(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
                <span className="font-bold text-white block mb-1">🇮🇪 Ireland (Domestic Equities & Cash)</span>
                Dividends on Irish shares incur 25% Dividend Withholding Tax (DWT) at source, or 33% DIRT on bank deposits. Reported under Schedule F / Case III. In Budget 2027, transfers into the €50k Personal Investment Account eliminate this drag.
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
                <span className="font-bold text-white block mb-1">🇮🇳 India (Direct Shares & Mutual Funds)</span>
                Indian corporates withhold 20% Tax Deducted at Source (TDS) under Section 195/196D. Under Article 23 of the Ireland-India DTAA, Irish residents receive a 100% tax credit for Indian TDS against Irish income tax liability.
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
                <span className="font-bold text-white block mb-1">🇺🇸 United States (RSUs & US Equities)</span>
                Standard US statutory rate is 30%, but submitting Form W-8BEN to your broker halves this to 15%. This 15% is eligible for double taxation relief against Irish tax under Article 12 of the Ireland-US Treaty.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Executive Metric Cards */}
      <div className="p-6 bg-slate-50/70 border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Cumulative Dividends Received */}
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Cumulative Dividends</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {formatCurrency(convertFromEUR(analytics.totalGrossEUR, currentCurrency), currentCurrency)}
              </span>
              <span className="text-xs text-emerald-700 font-medium">Gross</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-mono tabular-nums">
              <span>Net: {formatCurrency(convertFromEUR(analytics.totalNetEUR, currentCurrency), currentCurrency)}</span>
              <span>{analytics.timeline.length} payouts</span>
            </div>
          </div>

          {/* Card 2: Trailing 12-Month Run Rate & Yield */}
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">TTM Dividend Run Rate</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {formatCurrency(convertFromEUR(analytics.ttmDividendsEUR, currentCurrency), currentCurrency)}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ year</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-mono tabular-nums">
              <span>{analytics.annualizedYieldPct.toFixed(2)}% portfolio yield</span>
              <span>~{formatCurrency(convertFromEUR(analytics.monthlyAverageEUR, currentCurrency), currentCurrency)}/mo</span>
            </div>
          </div>

          {/* Card 3: Foreign Tax Credits (DTAA Relief) */}
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Foreign Tax Credits (DTAA)</span>
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-indigo-700 font-mono tabular-nums">
                {formatCurrency(convertFromEUR(analytics.foreignTaxCreditAvailableEUR, currentCurrency), currentCurrency)}
              </span>
              <span className="text-xs text-indigo-600 font-medium">Claimable</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-600">India TDS & US WHT offset</span>
              <span className="font-mono text-emerald-700 font-semibold">100% credit</span>
            </div>
          </div>

          {/* Card 4: Total Withholding Drag & 2027 PSIA Impact */}
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Tax Drag (All Countries)</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Receipt className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {formatCurrency(convertFromEUR(analytics.totalWithholdingTaxEUR, currentCurrency), currentCurrency)}
              </span>
              <span className="text-xs text-amber-700 font-mono font-bold">
                {analytics.effectiveTaxRatePct.toFixed(1)}% eff.
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-emerald-700 font-medium">Shelterable in 2027</span>
              {onOpenInvestmentAccount && (
                <button
                  onClick={onOpenInvestmentAccount}
                  className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <span>Learn how</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 3. Cumulative Growth Timeline & Interactive Visualization */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Cumulative Historical Dividend Trajectory</span>
              <span className="text-xs font-normal text-slate-500 font-mono">
                (2024 &ndash; 2026)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cumulative progression of cross-border dividend payouts in {currentCurrency}.
            </p>
          </div>

          {/* Segmented Chart View Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200/60">
            <button
              onClick={() => setChartMode('cumulative')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                chartMode === 'cumulative'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cumulative (Gross vs Net)
            </button>
            <button
              onClick={() => setChartMode('jurisdiction')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                chartMode === 'jurisdiction'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Jurisdiction
            </button>
            <button
              onClick={() => setChartMode('periodic')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                chartMode === 'periodic'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quarterly Cashflow
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-72 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'periodic' ? (
              <BarChart data={periodicChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tickFormatter={(val) => `${val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}`}
                />
                <Tooltip 
                  formatter={(val: any, name: any) => [
                    `${formatCurrency(Number(val), currentCurrency)}`, 
                    name === 'ireland' ? 'Ireland' : name === 'india' ? 'India' : name === 'us' ? 'United States' : 'Total'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                  formatter={(value) => value === 'ireland' ? 'Ireland' : value === 'india' ? 'India' : 'United States'}
                />
                <Bar dataKey="ireland" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="india" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="us" fill="#3b82f6" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : chartMode === 'jurisdiction' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIndia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorUs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorIreland" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tickFormatter={(val) => val.slice(0, 7)}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tickFormatter={(val) => `${val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}`}
                />
                <Tooltip 
                  formatter={(val: any, name: any) => [
                    `${formatCurrency(Number(val), currentCurrency)}`,
                    name === 'india' ? 'India Cumulative' : name === 'us' ? 'US Cumulative' : 'Ireland Cumulative'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                  formatter={(value) => value === 'india' ? 'India' : value === 'us' ? 'United States' : 'Ireland'}
                />
                <Area type="monotone" dataKey="india" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorIndia)" />
                <Area type="monotone" dataKey="us" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorUs)" />
                <Area type="monotone" dataKey="ireland" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIreland)" />
              </AreaChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCumulativeGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorCumulativeNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tickFormatter={(val) => val.slice(0, 7)}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tickFormatter={(val) => `${val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}`}
                />
                <Tooltip 
                  formatter={(val: any, name: any) => [
                    `${formatCurrency(Number(val), currentCurrency)}`,
                    name === 'cumulativeGross' ? 'Cumulative Gross' : 'Cumulative Net (Post-WHT)'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                  formatter={(value) => value === 'cumulativeGross' ? 'Cumulative Gross Dividends' : 'Cumulative Net Received'}
                />
                <Area type="monotone" dataKey="cumulativeGross" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCumulativeGross)" />
                <Area type="monotone" dataKey="cumulativeNet" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorCumulativeNet)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Tri-Jurisdiction Breakdown Cards */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-emerald-600" />
              <span>Cross-Border Jurisdiction Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Summary of dividends received and tax withholding rules by source country.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {analytics.byCountry.reduce((sum, c) => sum + c.count, 0)} total payouts tracked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analytics.byCountry.map(c => {
            const isIreland = c.country === 'Ireland';
            const isIndia = c.country === 'India';
            const isUS = c.country === 'US';
            
            const badgeColor = isIreland 
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
              : isIndia 
              ? 'text-amber-700 bg-amber-50 border-amber-200' 
              : 'text-blue-700 bg-blue-50 border-blue-200';

            return (
              <div 
                key={c.country} 
                className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {isIreland ? '🇮🇪' : isIndia ? '🇮🇳' : '🇺🇸'}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{c.country}</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border font-mono ${badgeColor}`}>
                    {c.pctOfTotal.toFixed(1)}% of total
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500">Cumulative Gross ({currentCurrency}):</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrency(convertFromEUR(c.grossEUR, currentCurrency), currentCurrency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500">Original Currency Gross:</span>
                    <span className="font-semibold text-slate-700 font-mono tabular-nums">
                      {c.currency === 'INR' ? `₹${c.originalGross.toLocaleString('en-IN')}` : c.currency === 'USD' ? `$${c.originalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `€${c.originalGross.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500">Withholding Tax (WHT/DIRT):</span>
                    <span className="font-semibold text-amber-700 font-mono tabular-nums">
                      {formatCurrency(convertFromEUR(c.whtEUR, currentCurrency), currentCurrency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-xs pt-1.5 border-t border-slate-100 font-bold">
                    <span className="text-slate-700">Net Received:</span>
                    <span className="text-emerald-700 font-mono tabular-nums">
                      {formatCurrency(convertFromEUR(c.netEUR, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                  <span className="font-semibold text-slate-700 block mb-0.5">Tax note:</span>
                  {c.taxNotes}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Historical Dividend Ledger Table */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Historical Dividend Payments Ledger</span>
              <span className="text-xs font-mono text-slate-500">
                ({filteredDividends.length} of {dividends.length} records)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed transaction log of all dividends received with withholding tax rates and broker receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Reset records to default portfolio dividends"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pb-4">
          
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search holding, ticker, broker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Country filter buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Ireland', 'India', 'US'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCountryFilter(c)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  countryFilter === c
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c === 'All' ? 'All Countries' : c}
              </button>
            ))}
          </div>

          {/* Year filter buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 2026, 2025, 2024] as const).map(yr => (
              <button
                key={yr}
                onClick={() => setYearFilter(yr)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  yearFilter === yr
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Payout type filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Cash Payout', 'Fund IDCW'] as const).map(pt => (
              <button
                key={pt}
                onClick={() => setPayoutTypeFilter(pt)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  payoutTypeFilter === pt
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {pt === 'All' ? 'All Types' : pt}
              </button>
            ))}
          </div>

        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3.5">Payment Date</th>
                <th className="py-3 px-3.5">Holding & Asset</th>
                <th className="py-3 px-3.5">Country & Broker</th>
                <th className="py-3 px-3.5 text-right">Gross Dividend</th>
                <th className="py-3 px-3.5 text-right">Withholding (WHT)</th>
                <th className="py-3 px-3.5 text-right">Net Received</th>
                <th className="py-3 px-3.5 text-right">Converted ({currentCurrency})</th>
                <th className="py-3 px-3.5">Tax Category</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredDividends.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Coins className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-800">No dividend records found</p>
                      <p className="text-xs text-slate-500">
                        Try clearing your search query or filters, or log a new payment using the "Log Dividend" button.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDividends.map((item) => {
                  const grossInCurr = convertFromEUR(convertToEUR(item.grossAmount, item.currency), currentCurrency);
                  const netInCurr = convertFromEUR(convertToEUR(item.netAmount, item.currency), currentCurrency);
                  const isIreland = item.country === 'Ireland';
                  const isIndia = item.country === 'India';
                  const isUS = item.country === 'US';

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 font-medium">
                        {item.paymentDate}
                      </td>

                      {/* Holding Name */}
                      <td className="py-3 px-3.5 font-sans">
                        <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {item.holdingName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                          {item.ticker && <span className="font-bold text-slate-600">{item.ticker}</span>}
                          <span>&middot;</span>
                          <span>{item.payoutType}</span>
                        </div>
                      </td>

                      {/* Country & Broker */}
                      <td className="py-3 px-3.5 font-sans whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{isIreland ? '🇮🇪' : isIndia ? '🇮🇳' : '🇺🇸'}</span>
                          <span className="font-medium text-slate-800">{item.country}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[130px]">
                          {item.broker}
                        </div>
                      </td>

                      {/* Gross Amount (Original) */}
                      <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {item.currency === 'INR' ? `₹${item.grossAmount.toLocaleString('en-IN')}` : item.currency === 'USD' ? `$${item.grossAmount.toFixed(2)}` : `€${item.grossAmount.toFixed(2)}`}
                      </td>

                      {/* Withholding Tax */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <span className="text-amber-700 font-medium">
                          {item.currency === 'INR' ? `₹${item.withholdingTax.toLocaleString('en-IN')}` : item.currency === 'USD' ? `$${item.withholdingTax.toFixed(2)}` : `€${item.withholdingTax.toFixed(2)}`}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {item.withholdingRatePct}%
                        </div>
                      </td>

                      {/* Net Amount */}
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {item.currency === 'INR' ? `₹${item.netAmount.toLocaleString('en-IN')}` : item.currency === 'USD' ? `$${item.netAmount.toFixed(2)}` : `€${item.netAmount.toFixed(2)}`}
                      </td>

                      {/* Converted to active currency */}
                      <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(netInCurr, currentCurrency)}
                        <div className="text-[10px] text-slate-400">
                          Gross: {formatCurrency(grossInCurr, currentCurrency)}
                        </div>
                      </td>

                      {/* Tax Category */}
                      <td className="py-3 px-3.5 font-sans whitespace-nowrap">
                        <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded ${
                          isUS ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          isIndia ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {item.taxCategory}
                        </span>
                        {item.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5 font-mono" title={item.notes}>
                            {item.notes}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleDeleteDividend(item.id)}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                          title="Delete this dividend record"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 6. MODAL: LOG NEW DIVIDEND PAYMENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Dividend Payment</h3>
                  <p className="text-xs text-slate-500">Log a cross-border dividend payout into your portfolio ledger</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDividend} className="mt-4 space-y-4">
              
              {/* Holding Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Portfolio Holding *
                </label>
                <select
                  value={newHoldingId}
                  onChange={(e) => setNewHoldingId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                >
                  {holdings.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.country === 'Ireland' ? '🇮🇪' : h.country === 'India' ? '🇮🇳' : '🇺🇸'} {h.assetName} ({h.currency} &middot; {h.provider})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Payout Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={newPaymentDate}
                    onChange={(e) => setNewPaymentDate(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payout Type
                  </label>
                  <select
                    value={newPayoutType}
                    onChange={(e) => setNewPayoutType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Cash Payout">Cash Payout (Bank/Broker)</option>
                    <option value="Fund IDCW">Fund IDCW (Mutual Fund)</option>
                    <option value="Reinvested (DRIP)">Reinvested (DRIP)</option>
                  </select>
                </div>
              </div>

              {/* Gross Amount & Currency Display */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gross Dividend Amount ({selectedHolding?.currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={newGrossAmount}
                    onChange={(e) => setNewGrossAmount(Number(e.target.value))}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Withholding Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={newWithholdingRate}
                    onChange={(e) => setNewWithholdingRate(Number(e.target.value))}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {selectedHolding?.country === 'US' ? '15% US treaty rate with W-8BEN' :
                     selectedHolding?.country === 'India' ? '20% Indian TDS under s.195' :
                     '33% standard Irish DIRT'}
                  </span>
                </div>
              </div>

              {/* Calculated Summary Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Gross:</span>
                  <span className="font-semibold text-slate-900">{selectedHolding?.currency} {newGrossAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Tax Withheld ({newWithholdingRate}%):</span>
                  <span>- {selectedHolding?.currency} {(newGrossAmount * (newWithholdingRate / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200">
                  <span>Net Received:</span>
                  <span>{selectedHolding?.currency} {(newGrossAmount * (1 - newWithholdingRate / 100)).toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Receipt Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 interim dividend, Form 16A TDS ref #10492"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Save Dividend Record
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
