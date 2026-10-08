import React, { useState, useMemo } from 'react';
import { 
  Currency, 
  Holding, 
  InvestmentAccountState,
  CountryExposure
} from '../types';
import { formatCurrency, convertFromEUR, convertToEUR, FALLBACK_FISCAL_DATA } from '../services/fiscalDataService';
import { computeFinancialXRay } from '../services/financialXRayService';
import { BudgetCalculatorSection } from './BudgetCalculatorSection';
import { ExportPdfModal } from './ExportPdfModal';
import { MarketPerformanceWidget } from './MarketPerformanceWidget';
import { RiskExposureRadar } from './RiskExposureRadar';
import { AssetRebalancer } from './AssetRebalancer';
import { TaxImpactEstimator } from './TaxImpactEstimator';
import { DividendTracker } from './DividendTracker';
import { FinancialGoalMilestones } from './FinancialGoalMilestones';
import { CurrencyVolatilityHeatmap } from './CurrencyVolatilityHeatmap';
import { UserAuthModal } from './UserAuthModal';
import { getActiveUser, setActiveUser as persistActiveUser } from '../services/authEmailService';
import { AuthUser } from '../types';
import { 
  LayoutDashboard, 
  Coins, 
  PieChart, 
  Layers, 
  TrendingUp, 
  Sparkles, 
  Plus, 
  Trash2, 
  FileUp, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  Globe2, 
  Calendar, 
  X, 
  Lock, 
  FileDown, 
  Activity,
  Scale,
  Receipt,
  Edit3,
  Check,
  HelpCircle,
  Target,
  Mail,
  UserCheck,
  Flame,
  Database
} from 'lucide-react';

interface DashboardViewProps {
  currentCurrency: Currency;
  holdings: Holding[];
  onAddHolding: (holding: Holding) => void;
  onDeleteHolding: (id: string) => void;
  investmentAccount: InvestmentAccountState;
  onAddContribution: (amount: number, provider: string) => void;
  onOpenWaitlist: (data?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentCurrency,
  holdings,
  onAddHolding,
  onDeleteHolding,
  investmentAccount,
  onAddContribution,
  onOpenWaitlist
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'volatility' | 'dividend_tracker' | 'tax_estimator' | 'rebalance' | 'markets' | 'investment_account' | 'portfolio' | 'xray' | 'calculator' | 'import'>('overview');
  
  // Real User Profile & Email Auth State
  const [activeUser, setActiveUserState] = useState<AuthUser>(() => getActiveUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'register' | 'login' | 'outbox' | 'database'>('register');

  // User Profile & Dynamic Greeting State
  const [userName, setUserName] = useState<string>(() => {
    const saved = localStorage.getItem('investireland_user_name');
    if (saved) return saved;
    const u = getActiveUser();
    return u?.name || 'Damak';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [showPersonaInfo, setShowPersonaInfo] = useState(false);

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return 'Good morning';
    if (currentHour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tempName.trim() || 'Investor';
    setUserName(trimmed);
    localStorage.setItem('investireland_user_name', trimmed);
    setIsEditingName(false);
  };

  // Add holding modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<Holding['assetType']>('ETF');
  const [newUnits, setNewUnits] = useState(10);
  const [newValue, setNewValue] = useState(5000);
  const [newCurrency, setNewCurrency] = useState<Currency>('EUR');
  const [newCountry, setNewCountry] = useState<CountryExposure>('Ireland');
  const [newProvider, setNewProvider] = useState('Davy Select');

  // Add contribution modal for Investment Account
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [contribAmount, setContribAmount] = useState(1000);
  const [contribProvider, setContribProvider] = useState('Personal Bank Transfer (AIB)');

  // PDF Export Modal State
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);

  // CSV Import simulation
  const [importedFile, setImportedFile] = useState<string | null>(null);
  const [importConfirmed, setImportConfirmed] = useState(false);

  // Compute live metrics
  const xray = computeFinancialXRay(holdings);

  const cashHoldings = holdings.filter(h => h.assetType === 'Cash / Deposit');
  const cashTotalEUR = cashHoldings.reduce((sum, h) => sum + convertToEUR(h.currentValue, h.currency), 0);

  const pensionHoldings = holdings.filter(h => h.assetType === 'Pension');
  const pensionTotalEUR = pensionHoldings.reduce((sum, h) => sum + convertToEUR(h.currentValue, h.currency), 0);

  const investmentTotalEUR = xray.totalAssetsEUR - cashTotalEUR - pensionTotalEUR;

  const handleSaveHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName) return;
    const item: Holding = {
      id: `h-${Date.now()}`,
      assetName: newAssetName,
      assetType: newAssetType,
      units: Number(newUnits),
      unitPrice: Number(newValue) / Number(newUnits || 1),
      currentValue: Number(newValue),
      currency: newCurrency,
      country: newCountry,
      provider: newProvider,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    onAddHolding(item);
    setIsAddModalOpen(false);
    setNewAssetName('');
  };

  const handleSaveContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (contribAmount <= 0) return;
    onAddContribution(Number(contribAmount), contribProvider);
    setIsContributionModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* App Topbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
                Interactive Dashboard Beta
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Grounded in Budget 2027 Framework
              </span>
            </div>

            {/* Dynamic Greeting & Editable User Profile */}
            <div className="mt-1">
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex flex-wrap items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{greeting},</span>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="text-2xl sm:text-3xl font-extrabold text-emerald-800 bg-white border border-emerald-400 rounded-xl px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[220px]"
                    autoFocus
                    placeholder="Your Name"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                    title="Save name"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTempName(userName); setIsEditingName(false); }}
                    className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {greeting}, {activeUser.name || userName}
                  </h1>
                  {activeUser.emailVerified && activeUser.email !== 'priya.sharma@investireland.demo' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Verified Member</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3 h-3 text-emerald-600" />
                      <span>Connect Email / Register</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setTempName(userName); setIsEditingName(true); }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer"
                    title="Click to personalize your dashboard name"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit Name</span>
                  </button>
                  <button
                    onClick={() => setShowPersonaInfo(!showPersonaInfo)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Why did the dashboard show Priya?"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Persona explanation popup banner */}
            {showPersonaInfo && (
              <div className="mt-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start justify-between gap-3 max-w-xl shadow-2xs">
                <div>
                  <span className="font-bold text-blue-900 block mb-0.5">Why was it showing "Good morning, Priya"?</span>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    The platform initialized with a realistic cross-border demo persona (Priya Sharma, a Dublin tech lead holding Irish PRSA pensions, Indian Zerodha mutual funds, and US tech RSUs). You can customize this to your own name or register your credentials to receive automated email reports!
                  </p>
                </div>
                <button
                  onClick={() => setShowPersonaInfo(false)}
                  className="text-blue-500 hover:text-blue-700 p-0.5 rounded cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your consolidated cross-border financial dashboard (Ireland &middot; India &middot; US)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setAuthModalInitialTab('register');
                setIsAuthModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 transition-all cursor-pointer shadow-xs"
              title="Manage user registration, password credentials, and auto email outbox"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-700" />
              <span>{activeUser.email && activeUser.email !== 'priya.sharma@investireland.demo' ? activeUser.name : 'Account & Auto-Email'}</span>
            </button>
            <button
              onClick={() => {
                setAuthModalInitialTab('database');
                setIsAuthModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-900 text-slate-700 transition-all cursor-pointer shadow-xs"
              title="Inspect Firebase Cloud Firestore database, collections & live sync"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Database</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            </button>
            <button
              onClick={() => setIsExportPdfOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 transition-all cursor-pointer shadow-xs"
              title="Export your current portfolio and budget analytics as an official PDF summary"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Holding</span>
            </button>
            <button
              onClick={() => setIsContributionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-all cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Contribution</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="mt-6 flex overflow-x-auto pb-2 scrollbar-none gap-2">
          {[
            { id: 'overview', label: 'Financial Snapshot', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'milestones', label: 'Goal Milestones', icon: <Target className="w-4 h-4" /> },
            { id: 'volatility', label: 'Currency Volatility', icon: <Flame className="w-4 h-4 text-rose-500" /> },
            { id: 'dividend_tracker', label: 'Dividend Income', icon: <Coins className="w-4 h-4" /> },
            { id: 'tax_estimator', label: 'Tax Impact Estimator', icon: <Receipt className="w-4 h-4" /> },
            { id: 'rebalance', label: 'Asset Rebalancer', icon: <Scale className="w-4 h-4" /> },
            { id: 'markets', label: 'Market Indices', icon: <Activity className="w-4 h-4" /> },
            { id: 'investment_account', label: '2027 Investment Account', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'portfolio', label: `Holdings (${holdings.length})`, icon: <PieChart className="w-4 h-4" /> },
            { id: 'xray', label: 'Financial X-Ray', icon: <Layers className="w-4 h-4" /> },
            { id: 'calculator', label: 'Budget Calculator', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'import', label: 'Import Statement', icon: <FileUp className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW SNAPSHOT (Spec Section 20) */}
        {activeTab === 'overview' && (
          <div className="mt-6 space-y-6">
            
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Financial Assets
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1">
                  {formatCurrency(convertFromEUR(xray.totalAssetsEUR, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cross-border unified across 3 currencies</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Liquid Cash
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1">
                  {formatCurrency(convertFromEUR(cashTotalEUR, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {xray.liquidity.cashPct}% of total net worth
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Investments (IE/IN/US)
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1">
                  {formatCurrency(convertFromEUR(investmentTotalEUR, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  ETFs, ₹ Mutual Funds, US RSUs
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Irish Pension / PRSA
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1">
                  {formatCurrency(convertFromEUR(pensionTotalEUR, currentCurrency), currentCurrency)}
                </div>
                <div className="text-[11px] text-indigo-700 font-medium mt-1">
                  Tax-relieved retirement vehicle
                </div>
              </div>

            </div>

            {/* Market Performance & Index Trends Widget (ISEQ, Nifty 50, S&P 500) */}
            <MarketPerformanceWidget holdings={holdings} />

            {/* Risk Exposure Radar Chart (Recharts) */}
            <RiskExposureRadar 
              holdings={holdings} 
              currentCurrency={currentCurrency} 
              onOpenRebalancer={() => setActiveTab('rebalance')}
            />

            {/* Asset Rebalancer Tool */}
            <AssetRebalancer 
              holdings={holdings} 
              currentCurrency={currentCurrency}
              onOpenInvestmentAccount={() => setActiveTab('investment_account')}
            />

            {/* Tax Impact Estimator Module */}
            <TaxImpactEstimator 
              holdings={holdings} 
              currentCurrency={currentCurrency}
              onOpenInvestmentAccount={() => setActiveTab('investment_account')}
            />

            {/* Dividend Income Tracking Module */}
            <DividendTracker
              holdings={holdings}
              currentCurrency={currentCurrency}
              onOpenInvestmentAccount={() => setActiveTab('investment_account')}
            />

            {/* Financial Goal Milestones Module */}
            <FinancialGoalMilestones
              holdings={holdings}
              currentCurrency={currentCurrency}
              onOpenInvestmentAccount={() => setActiveTab('investment_account')}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />

            {/* Currency Volatility Heatmap Widget (30-day FX vs Foreign Holdings Overlay) */}
            <CurrencyVolatilityHeatmap
              holdings={holdings}
              currentCurrency={currentCurrency}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />

            {/* Investment Account Card & Allowance Tracker */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 p-6 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                      Budget 2027 Personal Account
                    </span>
                    <span className="text-xs text-slate-500">Commencement: 1 July 2027</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    €{investmentAccount.annualContributions.toLocaleString()} of €{investmentAccount.annualLimit.toLocaleString()} Allocated
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {((investmentAccount.annualContributions / investmentAccount.annualLimit) * 100).toFixed(1)}% used &middot; €{(investmentAccount.annualLimit - investmentAccount.annualContributions).toLocaleString()} remaining contribution headroom this tax year.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('investment_account')}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  View Account Details &rarr;
                </button>
              </div>

              <div className="w-full bg-emerald-200/60 h-2.5 rounded-full overflow-hidden mt-4">
                <div 
                  className="bg-emerald-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${(investmentAccount.annualContributions / investmentAccount.annualLimit) * 100}%` }}
                />
              </div>
            </div>

            {/* AI Insight Box (Spec Section 20) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    AI Portfolio Insight
                  </span>
                  <button 
                    onClick={() => setActiveTab('xray')}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Understand this in Financial X-Ray &rarr;
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                  "Your largest single holding represents {xray.concentration.topHoldingPct}% of your total portfolio, and your top 5 assets represent {xray.concentration.top5Pct}%. You have {xray.liquidity.cashPct}% in cash reserves. When Ireland's Investment Account launches on 1 July 2027, you can shelter up to €12,000/year out of standard deposit interest retention tax (DIRT) and 41% exit tax."
                </p>
              </div>
            </div>

            {/* Export PDF Dossier Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Export Financial Intelligence Report</span>
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                      PDF &middot; A4
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generate an official, printable dossier summarizing your cross-border portfolio (IE, India, US), Budget 2027 allowances, and X-Ray diagnostics.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsExportPdfOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm self-stretch sm:self-auto text-center"
              >
                Export PDF Summary &rarr;
              </button>
            </div>

          </div>
        )}

        {/* TAB: FINANCIAL GOAL MILESTONES (Life Stage Target Progress Engine) */}
        {activeTab === 'milestones' && (
          <div className="mt-6 space-y-6">
            <FinancialGoalMilestones 
              holdings={holdings} 
              currentCurrency={currentCurrency}
              onOpenInvestmentAccount={() => setActiveTab('investment_account')}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          </div>
        )}

        {/* TAB: CURRENCY VOLATILITY HEATMAP (30-day FX Trajectory & Foreign Holdings Overlay) */}
        {activeTab === 'volatility' && (
          <div className="mt-6 space-y-6">
            <CurrencyVolatilityHeatmap 
              holdings={holdings} 
              currentCurrency={currentCurrency}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          </div>
        )}

        {/* TAB: DIVIDEND INCOME TRACKING MODULE (Cumulative Cross-Border Cashflow) */}
        {activeTab === 'dividend_tracker' && (
          <div className="mt-6 space-y-6">
            <DividendTracker 
              holdings={holdings} 
              currentCurrency={currentCurrency}
              onOpenInvestmentAccount={() => setActiveTab('investment_account')}
            />

            {/* Contextual Guidance & Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Check Capital Gains Tax Impact</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Estimate Irish CGT, Indian LTCG/STCG, and currency fluctuation gains on your portfolio principal.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('tax_estimator')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap self-start"
                >
                  Open Tax Estimator &rarr;
                </button>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Shelter High-Yield Cash & ETFs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Explore how transferring dividend-bearing assets into the upcoming Budget 2027 PSIA (€50,000 threshold) eliminates 33% DIRT and exit tax.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('investment_account')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap self-start"
                >
                  View 2027 Account &rarr;
                </button>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <span>Rebalance Portfolio Allocation</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Calculate buy and sell orders to restore target diversification across Ireland, India, and the US.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('rebalance')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap self-start"
                >
                  Open Rebalancer &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TAX IMPACT ESTIMATOR (Cross-Border CGT & Currency Fluctuation Engine) */}
        {activeTab === 'tax_estimator' && (
          <div className="mt-6 space-y-6">
            <TaxImpactEstimator 
              holdings={holdings} 
              currentCurrency={currentCurrency}
              onOpenInvestmentAccount={() => setActiveTab('investment_account')}
            />

            {/* Contextual Quick Links to Rebalancer & Risk Radar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Need to execute tax-loss harvesting?</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Restore your portfolio target weights in the Asset Rebalancer.</p>
                </div>
                <button
                  onClick={() => setActiveTab('rebalance')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                >
                  Open Rebalancer &rarr;
                </button>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Shelter gains in Budget 2027 PSIA?</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Explore the upcoming €50,000 personal tax-sheltered investment account.</p>
                </div>
                <button
                  onClick={() => setActiveTab('investment_account')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                >
                  View 2027 Scheme &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ASSET REBALANCER TOOL */}
        {activeTab === 'rebalance' && (
          <div className="mt-6 space-y-6">
            <AssetRebalancer 
              holdings={holdings} 
              currentCurrency={currentCurrency}
              onOpenInvestmentAccount={() => setActiveTab('investment_account')}
            />

            {/* Contextual Risk Radar */}
            <RiskExposureRadar 
              holdings={holdings} 
              currentCurrency={currentCurrency} 
            />
          </div>
        )}

        {/* TAB: MARKET PERFORMANCE & INDICES (ISEQ, NIFTY 50, S&P 500) */}
        {activeTab === 'markets' && (
          <div className="mt-6 space-y-6">
            <MarketPerformanceWidget holdings={holdings} />
          </div>
        )}

        {/* TAB 2: INVESTMENT ACCOUNT (Spec Section 21) */}
        {activeTab === 'investment_account' && (
          <div className="mt-6 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded font-mono">
                    Budget 2027 Personal Savings &amp; Investment Account (PSIA)
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">
                    Account Status: Pre-Launch Readiness
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Launch Date: 1 July 2027 &middot; Governed under Department of Finance framework
                  </p>
                </div>

                <button
                  onClick={() => setIsContributionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Planned Deposit</span>
                </button>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Current Account Value</span>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
                    €{investmentAccount.accountValue.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Accumulated growth and planned early allocation
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Annual Contribution Allowance</span>
                  <div className="text-3xl font-extrabold text-emerald-800 font-mono mt-1">
                    €{investmentAccount.annualContributions.toLocaleString()} <span className="text-base text-slate-400 font-normal">/ €12,000</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    €{(investmentAccount.annualLimit - investmentAccount.annualContributions).toLocaleString()} remaining headroom
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Distance to €50k Tax Threshold</span>
                  <div className="text-3xl font-extrabold text-teal-800 font-mono mt-1">
                    €{(investmentAccount.taxFreeThreshold - investmentAccount.accountValue).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-teal-700 mt-1">
                    100% tax-free growth shelter remaining
                  </p>
                </div>

              </div>

              {/* History Table */}
              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Transaction &amp; Allocation Log
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Provider / Source</th>
                        <th className="py-2.5 px-3">Statutory Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                      {investmentAccount.history.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">{tx.date}</td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{tx.type}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-800">€{tx.amount.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600">{tx.provider}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              Eligible (2027 Rules)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: PORTFOLIO HOLDINGS (Spec Section 22 & 23) */}
        {activeTab === 'portfolio' && (
          <div className="mt-6 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Your Unified Investment Holdings
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Covers Irish pensions, European UCITS ETFs, Indian mutual funds (₹) and US stocks ($).
                  </p>
                </div>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Asset</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Asset Name</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Country</th>
                      <th className="py-3 px-3">Original Value</th>
                      <th className="py-3 px-3">Value (EUR)</th>
                      <th className="py-3 px-3">Provider</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {holdings.map((h) => {
                      const valEUR = convertToEUR(h.currentValue, h.currency);
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            <div>{h.assetName}</div>
                            {h.notes && <div className="text-[10px] text-slate-400 font-normal">{h.notes}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                              {h.assetType}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            {h.country === 'Ireland' ? '🇮🇪 Ireland' : h.country === 'India' ? '🇮🇳 India' : h.country === 'US' ? '🇺🇸 US' : '🇪🇺 Europe'}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {formatCurrency(h.currentValue, h.currency)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                            €{Math.round(valEUR).toLocaleString('en-IE')}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {h.provider}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => onDeleteHolding(h.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                              title="Delete position"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FINANCIAL X-RAY (Spec Section 26 & 60) */}
        {activeTab === 'xray' && (
          <div className="mt-6 space-y-6">
            {/* Risk Exposure Radar Chart across Ireland, India & US */}
            <RiskExposureRadar holdings={holdings} currentCurrency={currentCurrency} />

            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  AI Financial Diagnosis
                </span>
                <p className="text-sm text-slate-800 mt-1 leading-relaxed">
                  "{xray.aiDiagnosis}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Asset Distribution</h4>
                  <div className="space-y-2 text-xs">
                    {xray.assetAllocation.map(a => (
                      <div key={a.category} className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                          <span>{a.category}</span>
                        </span>
                        <span className="font-mono font-bold">€{a.valueEUR.toLocaleString()} ({a.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Geographic Exposure</h4>
                  <div className="space-y-2 text-xs">
                    {xray.geographicExposure.map(g => (
                      <div key={g.country} className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                          <span>{g.country}</span>
                        </span>
                        <span className="font-mono font-bold">€{g.valueEUR.toLocaleString()} ({g.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CALCULATOR */}
        {activeTab === 'calculator' && (
          <div className="mt-6">
            <BudgetCalculatorSection
              currentCurrency={currentCurrency}
              onOpenWaitlist={onOpenWaitlist}
            />
          </div>
        )}

        {/* TAB 6: STATEMENT / CSV IMPORTER (Spec Section 34 & 35) */}
        {activeTab === 'import' && (
          <div className="mt-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xs max-w-2xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3">
                <FileUp className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                CSV Statement &amp; Document AI Importer
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Upload broker statements from Davy, Degiro, Zerodha, Morgan Stanley, or Irish Life. The system parses your holdings and prompts for confirmation before adding.
              </p>
            </div>

            {!importedFile ? (
              <div className="mt-8 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-50/50">
                <input
                  type="file"
                  accept=".csv,.xlsx,.pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setImportedFile(e.target.files[0].name);
                      setImportConfirmed(false);
                    }
                  }}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer block">
                  <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-sm font-bold text-slate-800 block">
                    Click to select CSV or Broker PDF statement
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Supports Davy, Degiro, Zerodha, Schwab, Trade Republic &middot; Max 10MB
                  </span>
                </label>
              </div>
            ) : (
              <div className="mt-8 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Detected File: {importedFile}</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                    PARSED SUCCESSFULLY
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="text-slate-500 font-sans font-semibold">Extracted Positions Preview:</div>
                  <div className="text-slate-800">&bull; Vanguard S&amp;P 500 UCITS ETF &mdash; 50 units &mdash; €4,850 (EUR)</div>
                  <div className="text-slate-800">&bull; Mirae Asset Large Cap Fund &mdash; 1,200 units &mdash; ₹1,80,000 (INR)</div>
                  <div className="text-slate-800">&bull; Microsoft Corp (MSFT) &mdash; 15 units &mdash; $6,450 (USD)</div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setImportedFile(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setImportConfirmed(true);
                      // Add sample parsed holding
                      onAddHolding({
                        id: `h-${Date.now()}`,
                        assetName: 'Vanguard S&P 500 UCITS ETF (VUAA)',
                        assetType: 'ETF',
                        ticker: 'VUAA.L',
                        units: 50,
                        unitPrice: 97,
                        currentValue: 4850,
                        currency: 'EUR',
                        country: 'Europe',
                        provider: 'Degiro Ireland',
                        notes: 'Imported via CSV statement parser',
                        updatedAt: new Date().toISOString().split('T')[0]
                      });
                      setTimeout(() => setImportedFile(null), 2000);
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Confirm &amp; Add to Portfolio
                  </button>
                </div>

                {importConfirmed && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Positions safely appended to your holdings. Never silently overwrites.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL 1: ADD HOLDING */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add Investment Holding</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHolding} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="e.g. HDFC Top 100 or iShares Core MSCI World"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Asset Type</label>
                  <select
                    value={newAssetType}
                    onChange={(e) => setNewAssetType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="ETF">UCITS ETF</option>
                    <option value="Mutual Fund">Mutual Fund</option>
                    <option value="Share">Direct Share</option>
                    <option value="RSU">US Tech RSU</option>
                    <option value="Pension">Pension / PRSA</option>
                    <option value="Cash / Deposit">Cash Deposit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="EUR">Euro (€ EUR)</option>
                    <option value="INR">Indian Rupee (₹ INR)</option>
                    <option value="USD">US Dollar ($ USD)</option>
                    <option value="GBP">British Pound (£ GBP)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Value ({newCurrency})</label>
                  <input
                    type="number"
                    required
                    value={newValue}
                    onChange={(e) => setNewValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Country Jurisdiction</label>
                  <select
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="Ireland">Ireland</option>
                    <option value="India">India</option>
                    <option value="US">United States</option>
                    <option value="Europe">Europe / Global</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Provider / Platform</label>
                <input
                  type="text"
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value)}
                  placeholder="e.g. Davy, Zerodha, Morgan Stanley, Bunq"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD CONTRIBUTION */}
      {isContributionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Record 2027 Scheme Contribution</h3>
              <button onClick={() => setIsContributionModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContribution} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contribution Amount (€ EUR) *</label>
                <input
                  type="number"
                  required
                  min="100"
                  max={investmentAccount.annualLimit - investmentAccount.annualContributions}
                  value={contribAmount}
                  onChange={(e) => setContribAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-base"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Remaining headroom: €{(investmentAccount.annualLimit - investmentAccount.annualContributions).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Funding Account / Source</label>
                <input
                  type="text"
                  value={contribProvider}
                  onChange={(e) => setContribProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContributionModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Log Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXPORT PDF SUMMARY */}
      <ExportPdfModal
        isOpen={isExportPdfOpen}
        onClose={() => setIsExportPdfOpen(false)}
        holdings={holdings}
        investmentAccount={investmentAccount}
        xray={xray}
        currentCurrency={currentCurrency}
        defaultUserName={userName}
      />

      {/* MODAL 4: USER AUTHENTICATION & EMAIL AUTO-RESPONSE ENGINE */}
      <UserAuthModal
        key={authModalInitialTab}
        isOpen={isAuthModalOpen}
        initialTab={authModalInitialTab}
        onClose={() => setIsAuthModalOpen(false)}
        onUserChange={(newUser) => {
          setActiveUserState(newUser);
          setUserName(newUser.name);
          localStorage.setItem('investireland_user_name', newUser.name);
        }}
      />

    </div>
  );
};
