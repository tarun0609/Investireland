import React, { useState, useMemo, useEffect } from 'react';
import { 
  Currency, 
  Holding, 
  InvestmentAccountState
} from '../types';
import { formatCurrency, convertFromEUR, convertToEUR, FALLBACK_FISCAL_DATA } from '../services/fiscalDataService';
import { computeFinancialXRay } from '../services/financialXRayService';
import { BudgetCalculatorSection } from './BudgetCalculatorSection';
import { ExportPdfModal } from './ExportPdfModal';
import { InvestmentAccountPdfModal } from './InvestmentAccountPdfModal';
import { MarketPerformanceWidget } from './MarketPerformanceWidget';
import { RiskExposureRadar } from './RiskExposureRadar';
import { AssetRebalancer } from './AssetRebalancer';
import { TaxImpactEstimator } from './TaxImpactEstimator';
import { DividendTracker } from './DividendTracker';
import { FinancialGoalMilestones } from './FinancialGoalMilestones';
import { CurrencyVolatilityHeatmap } from './CurrencyVolatilityHeatmap';
import { UserAuthModal, type AuthModalTab } from './UserAuthModal';
import { HoldingFormModal } from './HoldingFormModal';
import { CsvImportPanel } from './CsvImportPanel';
import { MAX_PROVIDER_LENGTH } from '../services/holdingForm';
import type { ImportPlanItem } from '../services/csvImportService';
import { getActiveUser, isDemoUser, subscribeToActiveUser, updateActiveUserProfile } from '../services/authEmailService';
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
  RefreshCw,
  CreditCard
} from 'lucide-react';
import { isRefreshableFund, type NavRefreshSummary } from '../services/navRefreshService';
import { FREE_HOLDINGS_LIMIT, PLAN_LABELS, type CheckoutPlan, type Feature } from '../config/plans';
import type { PlanAccess } from '../services/entitlementService';
import { LockedFeatureCard } from './PlanGate';
import { PlanBillingPanel } from './PlanBillingPanel';

type DashboardTab = 'overview' | 'milestones' | 'volatility' | 'dividend_tracker' | 'tax_estimator' | 'rebalance' | 'markets' | 'investment_account' | 'portfolio' | 'xray' | 'calculator' | 'import' | 'plan';

const TAB_FEATURE: Partial<Record<DashboardTab, Feature>> = {
  volatility: 'volatility',
  dividend_tracker: 'dividends',
  tax_estimator: 'tax_tools',
  rebalance: 'rebalance',
  xray: 'xray',
  import: 'import',
};

const COUNTRY_LABELS: Record<Holding['country'], string> = {
  Ireland: '🇮🇪 Ireland',
  India: '🇮🇳 India',
  US: '🇺🇸 US',
  Europe: '🇪🇺 Europe',
  Other: '🌐 Other',
};

const formatUnits = (n: number) => n.toLocaleString('en-IE', { maximumFractionDigits: 4 });

const formatUpdated = (iso: string) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface DashboardViewProps {
  currentCurrency: Currency;
  holdings: Holding[];
  onAddHolding: (holding: Holding) => void;
  onUpdateHolding: (holding: Holding) => void;
  onImportHoldings: (items: ImportPlanItem[]) => Promise<number>;
  onRefreshFundPrices: () => Promise<NavRefreshSummary | null>;
  onDeleteHolding: (id: string) => void;
  investmentAccount: InvestmentAccountState;
  onAddContribution: (amount: number, provider: string) => void;
  onOpenWaitlist: (data?: any) => void;
  access: PlanAccess;
  onUpgrade: (plan: CheckoutPlan) => void;
  onNotice: (message: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentCurrency,
  holdings,
  onAddHolding,
  onUpdateHolding,
  onImportHoldings,
  onRefreshFundPrices,
  onDeleteHolding,
  investmentAccount,
  onAddContribution,
  onOpenWaitlist,
  access,
  onUpgrade,
  onNotice
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const lockedFeature = TAB_FEATURE[activeTab] && !access.canUse(TAB_FEATURE[activeTab]!) ? TAB_FEATURE[activeTab]! : null;
  const visibleTab: DashboardTab | null = lockedFeature ? null : activeTab;
  // Feature shown in the upgrade dialog (opened from buttons outside the tabs).
  const [upsell, setUpsell] = useState<Feature | null>(null);
  const withFeature = (feature: Feature, action: () => void) => () => (access.canUse(feature) ? action() : setUpsell(feature));
  const atHoldingLimit = !access.canUse('unlimited_holdings') && holdings.length >= FREE_HOLDINGS_LIMIT;
  
  const [navStatus, setNavStatus] = useState<{ busy: boolean; message: string | null }>({ busy: false, message: null });
  const handleRefreshFunds = async () => {
    setNavStatus({ busy: true, message: null });
    try {
      const summary = await onRefreshFundPrices();
      if (!summary) {
        setNavStatus({ busy: false, message: 'A price refresh is already running. Try again in a moment.' });
        return;
      }
      const parts = [`Updated ${summary.updates.length} of ${summary.checked} fund${summary.checked === 1 ? '' : 's'} with the latest NAV from mfapi.in.`];
      if (summary.notFound.length) parts.push(`No match found for: ${summary.notFound.join(', ')}.`);
      if (summary.failed) parts.push(`${summary.failed} couldn\u2019t be checked right now.`);
      setNavStatus({ busy: false, message: parts.join(' ') });
    } catch {
      setNavStatus({ busy: false, message: 'Fund prices couldn\u2019t be refreshed right now. Please try again later.' });
    }
  };

  // Real User Profile & Email Auth State
  const [activeUser, setActiveUserState] = useState<AuthUser>(() => getActiveUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<AuthModalTab | undefined>(undefined);
  const isSignedIn = !isDemoUser(activeUser);

  // Guests may personalise the greeting locally; signed-in users use their profile name.
  const [guestName, setGuestName] = useState<string>(() => localStorage.getItem('investireland_guest_display_name') || '');
  const userName = isSignedIn ? activeUser.name : guestName || activeUser.name;

  useEffect(() => subscribeToActiveUser(setActiveUserState), []);

  const openAuthModal = (tab?: AuthModalTab) => {
    setAuthModalInitialTab(tab);
    setIsAuthModalOpen(true);
  };
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

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tempName.trim().slice(0, 120) || 'Investor';
    if (isSignedIn) {
      await updateActiveUserProfile({ name: trimmed });
    } else {
      setGuestName(trimmed);
      localStorage.setItem('investireland_guest_display_name', trimmed);
    }
    setIsEditingName(false);
  };

  // Add / edit holding modal: null = closed, undefined holding = add
  const [holdingModal, setHoldingModal] = useState<{ holding?: Holding } | null>(null);

  // Add contribution modal for Investment Account
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [contribAmount, setContribAmount] = useState('1000');
  const [contribProvider, setContribProvider] = useState('');
  const [contribError, setContribError] = useState<string | null>(null);

  // PDF Export Modal State
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [isInvAccountPdfOpen, setIsInvAccountPdfOpen] = useState(false);

  // Compute live metrics
  const xray = computeFinancialXRay(holdings, currentCurrency);

  const cashTotalEUR = xray.liquidity.cashEUR;
  const pensionTotalEUR = xray.liquidity.pensionAndLockedEUR;

  const investmentTotalEUR = xray.totalAssetsEUR - cashTotalEUR - pensionTotalEUR;

  const contributionHeadroom = Math.max(0, investmentAccount.annualLimit - investmentAccount.annualContributions);
  const contributionUsedPct = investmentAccount.annualLimit > 0
    ? Math.min(100, Math.max(0, (investmentAccount.annualContributions / investmentAccount.annualLimit) * 100))
    : 0;

  const openAddHoldingModal = () => (atHoldingLimit ? setUpsell('unlimited_holdings') : setHoldingModal({}));
  const openEditHoldingModal = (holding: Holding) => setHoldingModal({ holding });
  const closeHoldingModal = () => setHoldingModal(null);

  const openContributionModal = () => {
    setContribError(null);
    setContribAmount(String(Math.min(1000, contributionHeadroom)));
    setIsContributionModalOpen(true);
  };

  const handleSaveHolding = (holding: Holding) => {
    if (holdingModal?.holding) onUpdateHolding(holding);
    else onAddHolding(holding);
    closeHoldingModal();
  };

  const handleDeleteHolding = (holding: Holding) => {
    if (window.confirm(`Delete "${holding.assetName}" from your holdings? This cannot be undone.`)) {
      onDeleteHolding(holding.id);
    }
  };

  const handleSaveContribution = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(contribAmount);
    if (contributionHeadroom <= 0) {
      setContribError("You have already reached this year's contribution limit.");
      return;
    }
    if (contribAmount.trim() === '' || !Number.isFinite(amount) || amount <= 0) {
      setContribError('Enter an amount greater than zero.');
      return;
    }
    if (amount > contributionHeadroom) {
      setContribError(`The most you can add this year is €${contributionHeadroom.toLocaleString('en-IE')}.`);
      return;
    }
    onAddContribution(Math.round(amount * 100) / 100, contribProvider.trim().slice(0, MAX_PROVIDER_LENGTH) || 'Not specified');
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
                    {greeting}, {userName}
                  </h1>
                  {isSignedIn && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Signed in</span>
                    </span>
                  )}
                  {!(isSignedIn && activeUser.emailVerified) && (
                    <button
                      type="button"
                      onClick={() => openAuthModal()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3 h-3 text-emerald-600" />
                      <span>{isSignedIn ? 'Verify email' : 'Sign in / Register'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setTempName(userName); setIsEditingName(true); }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer"
                    title="Click to personalize your dashboard name"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Name</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPersonaInfo(!showPersonaInfo)}
                    className="text-slate-500 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Where does this name come from?"
                    aria-label="Where does this name come from?"
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
                  <span className="font-bold text-blue-900 block mb-0.5">Where does this name come from?</span>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    {isSignedIn
                      ? 'This is the display name on your account. Use "Edit Name" to change it.'
                      : 'As a guest, the dashboard uses a demo persona name ("Priya Sharma") until you set your own. Use "Edit Name" to personalise it on this device, or sign in to save your portfolio to your account.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPersonaInfo(false)}
                  aria-label="Close"
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
              type="button"
              onClick={() => openAuthModal()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-900 transition-all cursor-pointer shadow-xs"
              title="Sign in, register, or manage your account"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isSignedIn ? activeUser.name : 'Sign in'}</span>
            </button>
            <button
              type="button"
              onClick={withFeature('exports', () => setIsExportPdfOpen(true))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 transition-all cursor-pointer shadow-xs"
              title="Export your current portfolio and budget analytics as a printable PDF summary"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              type="button"
              onClick={openAddHoldingModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Holding</span>
            </button>
            <button
              type="button"
              onClick={openContributionModal}
              aria-label="Record Investment Account contribution"
              title="Record Investment Account contribution"
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
            { id: 'import', label: 'Import Statement', icon: <FileUp className="w-4 h-4" /> },
            { id: 'plan', label: access.signedIn && access.billingEnabled ? `Plan: ${PLAN_LABELS[access.plan]}` : 'Plan & billing', icon: <CreditCard className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {TAB_FEATURE[tab.id as DashboardTab] && !access.canUse(TAB_FEATURE[tab.id as DashboardTab]!) && (
                <Lock className="w-3 h-3 opacity-70" aria-label="Upgrade required" />
              )}
            </button>
          ))}
        </div>

        {lockedFeature && (
          <LockedFeatureCard feature={lockedFeature} onUpgrade={onUpgrade} onShowPlans={() => setActiveTab('plan')} />
        )}

        {visibleTab === 'plan' && (
          <PlanBillingPanel
            access={access}
            userId={activeUser.id}
            holdings={holdings}
            currentCurrency={currentCurrency}
            onUpgrade={onUpgrade}
            onNotice={onNotice}
            onSignIn={() => openAuthModal()}
          />
        )}

        {access.signedIn && access.billingEnabled && access.plan === 'free' && holdings.length > FREE_HOLDINGS_LIMIT && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            You have {holdings.length} holdings saved. The Free plan tracks up to {FREE_HOLDINGS_LIMIT}; your existing holdings are kept, but you'll need Pro to add more.
          </p>
        )}

        {/* TAB 1: OVERVIEW SNAPSHOT (Spec Section 20) */}
        {visibleTab === 'overview' && (
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
                  <span>{holdings.length === 0 ? 'Add holdings to see your total' : `Unified across ${new Set(holdings.map(h => h.currency)).size} ${new Set(holdings.map(h => h.currency)).size === 1 ? 'currency' : 'currencies'}`}</span>
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
              onOpenAuthModal={() => openAuthModal()}
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
                    €{investmentAccount.annualContributions.toLocaleString('en-IE')} of €{investmentAccount.annualLimit.toLocaleString('en-IE')} Allocated
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {contributionUsedPct.toFixed(1)}% used &middot; €{contributionHeadroom.toLocaleString('en-IE')} remaining contribution headroom this tax year.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('investment_account')}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  View Account Details &rarr;
                </button>
              </div>

              <div className="w-full bg-emerald-200/60 h-2.5 rounded-full overflow-hidden mt-4">
                <div 
                  className="bg-emerald-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${contributionUsedPct}%` }}
                />
              </div>
            </div>

            {/* AI Insight Box (Spec Section 20) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    AI Portfolio Insight
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('xray')}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Understand this in Financial X-Ray &rarr;
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                  {holdings.length === 0
                    ? `Add your first holding to get personalised concentration and liquidity insights. When Ireland's proposed Investment Account launches on 1 July 2027, you could shelter up to €${investmentAccount.annualLimit.toLocaleString('en-IE')}/year from DIRT and exit tax.`
                    : `Your largest single holding represents ${xray.concentration.topHoldingPct}% of your total portfolio, and your top 5 assets represent ${xray.concentration.top5Pct}%. You have ${xray.liquidity.cashPct}% in cash reserves. When Ireland's proposed Investment Account launches on 1 July 2027, you could shelter up to €${investmentAccount.annualLimit.toLocaleString('en-IE')}/year from deposit interest retention tax (DIRT) and exit tax.`}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Rule-based summary of your holdings &middot; educational only, not financial advice.</p>
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate a printable summary summarizing your cross-border portfolio (IE, India, US), Budget 2027 allowances, and X-Ray diagnostics.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={withFeature('exports', () => setIsExportPdfOpen(true))}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm self-stretch sm:self-auto text-center"
              >
                Export PDF Summary &rarr;
              </button>
            </div>

          </div>
        )}

        {/* TAB: FINANCIAL GOAL MILESTONES (Life Stage Target Progress Engine) */}
        {visibleTab === 'milestones' && (
          <div className="mt-6 space-y-6">
            <FinancialGoalMilestones 
              holdings={holdings} 
              currentCurrency={currentCurrency}
              onOpenInvestmentAccount={() => setActiveTab('investment_account')}
              onOpenAuthModal={() => openAuthModal()}
            />
          </div>
        )}

        {/* TAB: CURRENCY VOLATILITY HEATMAP (30-day FX Trajectory & Foreign Holdings Overlay) */}
        {visibleTab === 'volatility' && (
          <div className="mt-6 space-y-6">
            <CurrencyVolatilityHeatmap 
              holdings={holdings} 
              currentCurrency={currentCurrency}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          </div>
        )}

        {/* TAB: DIVIDEND INCOME TRACKING MODULE (Cumulative Cross-Border Cashflow) */}
        {visibleTab === 'dividend_tracker' && (
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
                  type="button"
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
                  type="button"
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
                  type="button"
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
        {visibleTab === 'tax_estimator' && (
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
                  type="button"
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
                  type="button"
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
        {visibleTab === 'rebalance' && (
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
        {visibleTab === 'markets' && (
          <div className="mt-6 space-y-6">
            <MarketPerformanceWidget holdings={holdings} />
          </div>
        )}

        {/* TAB 2: INVESTMENT ACCOUNT (Spec Section 21) */}
        {visibleTab === 'investment_account' && (
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

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={withFeature('exports', () => setIsInvAccountPdfOpen(true))}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    title="Export Investment Account summary and transaction ledger to PDF"
                  >
                    <FileDown className="w-4 h-4 text-emerald-400" />
                    <span>Export to PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={openContributionModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Planned Deposit</span>
                  </button>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Current Account Value</span>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
                    €{investmentAccount.accountValue.toLocaleString('en-IE')}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Accumulated growth and planned early allocation
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Annual Contribution Allowance</span>
                  <div className="text-3xl font-extrabold text-emerald-800 font-mono mt-1">
                    €{investmentAccount.annualContributions.toLocaleString('en-IE')} <span className="text-base text-slate-500 font-normal">/ €{investmentAccount.annualLimit.toLocaleString('en-IE')}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    {contributionHeadroom > 0 ? `€${contributionHeadroom.toLocaleString('en-IE')} remaining headroom` : 'Annual limit reached for this tax year'}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Distance to €{Math.round(investmentAccount.taxFreeThreshold / 1000)}k Tax Threshold</span>
                  <div className="text-3xl font-extrabold text-teal-800 font-mono mt-1">
                    €{Math.max(0, investmentAccount.taxFreeThreshold - investmentAccount.accountValue).toLocaleString('en-IE')}
                  </div>
                  <p className="text-[11px] text-teal-700 mt-1">
                    {investmentAccount.accountValue >= investmentAccount.taxFreeThreshold ? 'Threshold reached' : 'Tax-free growth shelter remaining'}
                  </p>
                </div>

              </div>

              {/* History Table */}
              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Transaction &amp; Allocation Log
                </h3>
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
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
                      {investmentAccount.history.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 px-3 text-center font-sans text-slate-500">
                            No planned deposits recorded yet. Use &ldquo;Record Planned Deposit&rdquo; to log one.
                          </td>
                        </tr>
                      )}
                      {investmentAccount.history.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 whitespace-nowrap">{tx.date}</td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{tx.type}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-800 whitespace-nowrap">€{tx.amount.toLocaleString('en-IE')}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600">{tx.provider}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                              Planned (2027 rules)
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
        {visibleTab === 'portfolio' && (
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

                <div className="flex flex-wrap items-center gap-2">
                  {holdings.some(isRefreshableFund) && (
                    <button
                      type="button"
                      onClick={withFeature('fund_price_refresh', () => void handleRefreshFunds())}
                      disabled={navStatus.busy}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-4 h-4 ${navStatus.busy ? 'animate-spin' : ''}`} />
                      <span>{navStatus.busy ? 'Refreshing\u2026' : 'Refresh fund prices'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openAddHoldingModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Asset</span>
                  </button>
                </div>
              </div>
              {navStatus.message && (
                <p role="status" className="mt-3 text-xs text-slate-600">{navStatus.message}</p>
              )}

              {/* Table */}
              <div className="overflow-x-auto mt-4" tabIndex={0} role="region" aria-label="Scrollable table">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Asset Name</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Country</th>
                      <th className="py-3 px-3 text-right">Units</th>
                      <th className="py-3 px-3 text-right">Price / unit</th>
                      <th className="py-3 px-3 text-right">Value</th>
                      <th className="py-3 px-3 text-right">Value ({currentCurrency})</th>
                      <th className="py-3 px-3">Provider</th>
                      <th className="py-3 px-3">Updated</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {holdings.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 px-3 text-center">
                          <PieChart className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="mt-2 font-semibold text-slate-800">No holdings yet</p>
                          <p className="mt-1 text-slate-500">Add your pensions, ETFs, funds, shares or cash to see your unified portfolio.</p>
                          <button
                            type="button"
                            onClick={openAddHoldingModal}
                            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add your first holding</span>
                          </button>
                        </td>
                      </tr>
                    )}
                    {holdings.map((h) => {
                      const valEUR = convertToEUR(h.currentValue, h.currency);
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            <div className="break-words max-w-[220px]">{h.assetName}</div>
                            {(h.ticker || h.isin) && (
                              <div className="text-[10px] text-slate-500 font-mono font-normal">{[h.ticker, h.isin].filter(Boolean).join(' · ')}</div>
                            )}
                            {h.notes && <div className="text-[10px] text-slate-500 font-normal">{h.notes}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                              {h.assetType}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold whitespace-nowrap">
                            {COUNTRY_LABELS[h.country] ?? h.country}
                          </td>
                          <td className="py-3 px-3 font-mono text-right whitespace-nowrap">
                            {formatUnits(h.units)}
                          </td>
                          <td className="py-3 px-3 font-mono text-right whitespace-nowrap">
                            {formatCurrency(h.unitPrice, h.currency, 2)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                            {formatCurrency(h.currentValue, h.currency)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-800 text-right whitespace-nowrap">
                            {formatCurrency(convertFromEUR(valEUR, currentCurrency), currentCurrency)}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {h.provider}
                          </td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {formatUpdated(h.updatedAt)}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditHoldingModal(h)}
                              className="text-slate-500 hover:text-emerald-700 p-1 cursor-pointer transition-colors"
                              title="Edit position"
                              aria-label={`Edit ${h.assetName}`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHolding(h)}
                              className="text-slate-500 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                              title="Delete position"
                              aria-label={`Delete ${h.assetName}`}
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
        {visibleTab === 'xray' && (
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
                        <span className="font-mono font-bold">{formatCurrency(convertFromEUR(a.valueEUR, currentCurrency), currentCurrency)} ({a.percentage}%)</span>
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
                        <span className="font-mono font-bold">{formatCurrency(convertFromEUR(g.valueEUR, currentCurrency), currentCurrency)} ({g.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CALCULATOR */}
        {visibleTab === 'calculator' && (
          <div className="mt-6">
            <BudgetCalculatorSection
              currentCurrency={currentCurrency}
              onOpenWaitlist={onOpenWaitlist}
            />
          </div>
        )}

        {/* TAB 6: CSV IMPORTER */}
        {visibleTab === 'import' && (
          <CsvImportPanel
            holdings={holdings}
            onImport={onImportHoldings}
            onAddManually={openAddHoldingModal}
            onDone={() => setActiveTab('portfolio')}
          />
        )}

      </div>
      {/* MODAL 1: ADD / EDIT HOLDING */}
      {holdingModal && (
        <HoldingFormModal
          key={holdingModal.holding?.id ?? 'new'}
          initial={holdingModal.holding}
          onSave={handleSaveHolding}
          onClose={closeHoldingModal}
        />
      )}

      {/* MODAL 2: RECORD CONTRIBUTION */}
      {isContributionModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contribution-title"
          onKeyDown={(e) => { if (e.key === 'Escape') setIsContributionModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 id="contribution-title" className="text-lg font-bold text-slate-900">Record 2027 Scheme Contribution</h3>
              <button type="button" onClick={() => setIsContributionModalOpen(false)} aria-label="Close" className="text-slate-500 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContribution} noValidate className="mt-4 space-y-4 text-xs">
              {contributionHeadroom <= 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  You have used the full €{investmentAccount.annualLimit.toLocaleString('en-IE')} allowance for this year. No further contributions can be recorded.
                </p>
              )}
              <div>
                <label htmlFor="contribution-amount" className="block font-bold text-slate-700 mb-1">Contribution Amount (€ EUR) *</label>
                <input
                  id="contribution-amount"
                  type="number"
                  required
                  min="1"
                  step="any"
                  max={contributionHeadroom}
                  inputMode="decimal"
                  disabled={contributionHeadroom <= 0}
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-base disabled:opacity-60"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Remaining headroom: €{contributionHeadroom.toLocaleString('en-IE')}
                </span>
              </div>

              <div>
                <label htmlFor="contribution-source" className="block font-bold text-slate-700 mb-1">Funding Account / Source</label>
                <input
                  id="contribution-source"
                  type="text"
                  maxLength={MAX_PROVIDER_LENGTH}
                  value={contribProvider}
                  onChange={(e) => setContribProvider(e.target.value)}
                  placeholder="e.g. Bank transfer (AIB)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              {contribError && (
                <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {contribError}
                </p>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContributionModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contributionHeadroom <= 0}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Log Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: EXPORT FULL PORTFOLIO PDF SUMMARY */}
      {upsell && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setUpsell(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setUpsell(null); }}
        >
          <div role="dialog" aria-modal="true" aria-label="Upgrade required" className="relative w-full max-w-lg">
            <button
              type="button"
              autoFocus
              aria-label="Close"
              onClick={() => setUpsell(null)}
              className="absolute right-3 top-3 z-10 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <LockedFeatureCard
              compact
              feature={upsell}
              onUpgrade={(plan) => { setUpsell(null); onUpgrade(plan); }}
              onShowPlans={() => { setUpsell(null); setActiveTab('plan'); }}
            />
          </div>
        </div>
      )}

      <ExportPdfModal
        isOpen={isExportPdfOpen}
        onClose={() => setIsExportPdfOpen(false)}
        holdings={holdings}
        investmentAccount={investmentAccount}
        xray={xray}
        currentCurrency={currentCurrency}
        defaultUserName={userName}
      />

      {/* MODAL 3B: EXPORT BUDGET 2027 INVESTMENT ACCOUNT & TRANSACTION LEDGER PDF */}
      <InvestmentAccountPdfModal
        isOpen={isInvAccountPdfOpen}
        onClose={() => setIsInvAccountPdfOpen(false)}
        investmentAccount={investmentAccount}
        currentCurrency={currentCurrency}
        defaultUserName={userName}
        userEmail={activeUser.email}
      />

      {/* MODAL 4: USER AUTHENTICATION & EMAIL AUTO-RESPONSE ENGINE */}
      <UserAuthModal
        key={authModalInitialTab ?? 'default'}
        isOpen={isAuthModalOpen}
        initialTab={authModalInitialTab}
        onClose={() => setIsAuthModalOpen(false)}
        onUserChange={() => setActiveUserState(getActiveUser())}
      />

    </div>
  );
};
