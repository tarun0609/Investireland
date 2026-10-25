import React, { Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Currency, Holding, InvestmentAccountState } from './types';
import { INITIAL_HOLDINGS, INITIAL_INVESTMENT_ACCOUNT_STATE } from './data/mockData';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { InvestmentAccountSection } from './components/InvestmentAccountSection';
import { ProblemCardsSection } from './components/ProblemCardsSection';
import { BudgetCalculatorSection } from './components/BudgetCalculatorSection';
import { CrossBorderSection } from './components/CrossBorderSection';
import { FinancialXRaySection } from './components/FinancialXRaySection';
import { ProductCardsSection } from './components/ProductCardsSection';
import { ScenarioPlannerSection } from './components/ScenarioPlannerSection';
import { GovtSourcesSection } from './components/GovtSourcesSection';
import { AiAssistantSection } from './components/AiAssistantSection';
import { ReadinessQuizSection } from './components/ReadinessQuizSection';
import { EducationHubSection } from './components/EducationHubSection';
import { PricingSection } from './components/PricingSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { EarlyAccessModal } from './components/EarlyAccessModal';
import { isDemoUser, subscribeToActiveUser, waitForAuthReady } from './services/authEmailService';
import { FREE_HOLDINGS_LIMIT, type CheckoutPlan } from './config/plans';
import {
  BILLING_ENABLED,
  BillingError,
  FREE_ENTITLEMENT,
  acceptHouseholdInvite,
  getPendingInvite,
  getPendingPlan,
  getPendingPromo,
  openBillingPortal,
  planAccess,
  redeemPromoCode,
  setPendingInvite,
  setPendingPlan,
  setPendingPromo,
  startCheckout,
  subscribeEntitlement,
  type ClientEntitlement,
} from './services/entitlementService';
import { applyPageSeo, normalisePath, seoForView } from './utils/seo';
import {
  CALCULATOR_ALIASES,
  calculatorPageForView,
  calculatorViewForPath,
  isCalculatorView,
  type AppView,
  type CalculatorView,
} from './config/calculators';
import { getFxRates, loadEcbRates, subscribeFxRates } from './services/fxRateService';
import type { ImportPlanItem } from './services/csvImportService';
import { isRefreshableFund, markAutoRefreshed, refreshFundPrices, shouldAutoRefresh, type NavRefreshSummary } from './services/navRefreshService';
import { 
  loadUserHoldings, 
  saveUserHolding, 
  removeUserHolding, 
  loadInvestmentAccountState, 
  saveInvestmentAccountState 
} from './services/portfolioService';

const DashboardView = lazy(() => import('./components/DashboardView').then((m) => ({ default: m.DashboardView })));
const PrivacyPage = lazy(() => import('./components/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const CalculatorsHubPage = lazy(() => import('./components/CalculatorsHubPage').then((m) => ({ default: m.CalculatorsHubPage })));
const InvestmentCalculatorPage = lazy(() => import('./components/InvestmentCalculatorPage').then((m) => ({ default: m.InvestmentCalculatorPage })));
const EtfTaxCalculatorPage = lazy(() => import('./components/EtfTaxCalculatorPage').then((m) => ({ default: m.EtfTaxCalculatorPage })));
const PensionCalculatorPage = lazy(() => import('./components/PensionCalculatorPage').then((m) => ({ default: m.PensionCalculatorPage })));
const SavingsGoalCalculatorPage = lazy(() => import('./components/SavingsGoalCalculatorPage').then((m) => ({ default: m.SavingsGoalCalculatorPage })));
const MortgageVsInvestingCalculatorPage = lazy(() =>
  import('./components/MortgageVsInvestingCalculatorPage').then((m) => ({ default: m.MortgageVsInvestingCalculatorPage }))
);

const PRIVACY_PATH = '/privacy';

const pathForView = (view: AppView): string => {
  if (view === 'privacy') return PRIVACY_PATH;
  if (isCalculatorView(view)) return calculatorPageForView(view).path;
  return '/';
};

const viewFromLocation = (): AppView => {
  if (typeof window === 'undefined') return 'landing';
  const path = normalisePath(window.location.pathname);
  if (path === PRIVACY_PATH) return 'privacy';
  const alias = CALCULATOR_ALIASES[path.toLowerCase()];
  if (alias) {
    // The host normally 301s these; this covers the dev server and stale caches.
    window.history.replaceState(null, '', alias + window.location.search + window.location.hash);
    return calculatorViewForPath(alias) ?? 'landing';
  }
  return calculatorViewForPath(path) ?? 'landing';
};

const ViewFallback = () => (
  <div role="status" aria-live="polite" className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-slate-500">
    Loading…
  </div>
);

// Must match the history size limit in firestore.rules.
const MAX_ACCOUNT_HISTORY = 500;
const EMPTY_INVESTMENT_ACCOUNT: InvestmentAccountState = { ...INITIAL_INVESTMENT_ACCOUNT_STATE, accountValue: 0, annualContributions: 0, history: [] };

export default function App() {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>('EUR');
  const [activeView, setActiveViewState] = useState<AppView>(viewFromLocation);

  // Keep /privacy and the calculator pages as real, shareable URLs; other views live at the site root.
  const setActiveView = useCallback((view: AppView) => {
    const targetPath = pathForView(view);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
      if (view !== 'landing') window.scrollTo({ top: 0 });
    }
    setActiveViewState(view);
  }, []);

  useEffect(() => {
    const onPopState = () => setActiveViewState(viewFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    applyPageSeo(seoForView(activeView), window.location.pathname);
  }, [activeView]);

  // Live ECB reference rates; subscribing re-renders the tree so every EUR conversion updates.
  useSyncExternalStore(subscribeFxRates, getFxRates);
  useEffect(() => {
    void loadEcbRates();
  }, []);

  const [activeUserId, setActiveUserId] = useState<string>('guest');
  const [entitlement, setEntitlement] = useState<ClientEntitlement>(FREE_ENTITLEMENT);
  const [notice, setNotice] = useState<string | null>(null);
  const isSignedIn = activeUserId !== 'guest';
  const access = planAccess(entitlement, isSignedIn);
  const accessRef = useRef(access);
  accessRef.current = access;
  const activeUserIdRef = useRef(activeUserId);
  const [holdings, setHoldings] = useState<Holding[]>(INITIAL_HOLDINGS);
  const [investmentAccount, setInvestmentAccount] = useState<InvestmentAccountState>(INITIAL_INVESTMENT_ACCOUNT_STATE);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistPrefill, setWaitlistPrefill] = useState<any>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  // Writes are blocked until the active user's own data has loaded, so stale data can never be saved into another account.
  const [isDataReady, setIsDataReady] = useState(false);
  const isDataReadyRef = useRef(false);

  // Reload portfolio data whenever the signed-in user changes.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    waitForAuthReady().then(() => {
      if (cancelled) return;
      unsubscribe = subscribeToActiveUser((user) => {
        const uid = isDemoUser(user) ? 'guest' : user.id;
        if (uid === activeUserIdRef.current && uid !== 'guest') return;
        activeUserIdRef.current = uid;
        isDataReadyRef.current = false;
        setIsDataReady(false);
        setActiveUserId(uid);
        setHoldings([]);
        setInvestmentAccount(EMPTY_INVESTMENT_ACCOUNT);
        Promise.all([loadUserHoldings(uid), loadInvestmentAccountState(uid)])
          .then(([loadedHoldings, accountState]) => {
            if (activeUserIdRef.current !== uid) return;
            setHoldings(loadedHoldings);
            setInvestmentAccount(accountState);
            isDataReadyRef.current = true;
            setIsDataReady(true);
            setDataError(null);
          })
          .catch((err) => {
            console.error('Failed to load portfolio', err);
            if (activeUserIdRef.current === uid) setDataError('We could not load your saved portfolio. Please refresh to try again.');
          });
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // Live plan details for the signed-in user.
  useEffect(() => {
    setEntitlement(FREE_ENTITLEMENT);
    if (!BILLING_ENABLED || activeUserId === 'guest') return;
    return subscribeEntitlement(activeUserId, setEntitlement);
  }, [activeUserId]);

  // Return links from Stripe (?billing=…) and household invites (?household=…) land on the site root.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    const invite = params.get('household');
    if (!billing && !invite) return;
    if (billing === 'success') setNotice('Thanks! Your payment went through. Your plan updates here within a few seconds.');
    else if (billing === 'cancelled') setNotice('Checkout was cancelled, so nothing was charged.');
    if (invite && /^[A-Za-z0-9_-]{10,128}\.[A-Za-z0-9_-]{16,128}$/.test(invite)) {
      setPendingInvite(invite);
      setNotice('You\u2019ve been invited to a Family household. Sign in (or create an account) with the invited email address to join.');
    }
    params.delete('billing');
    params.delete('household');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    setActiveViewState('app');
  }, []);

  const showBillingError = (err: unknown) => {
    setDataError(err instanceof BillingError ? err.message : 'Something went wrong. Please try again.');
  };

  // Actions chosen before signing in (plan, promo code, household invite) run once the user is signed in.
  useEffect(() => {
    if (!BILLING_ENABLED || activeUserId === 'guest') return;
    const invite = getPendingInvite();
    const promo = getPendingPromo();
    const plan = getPendingPlan();
    if (invite) {
      acceptHouseholdInvite(invite)
        .then(() => {
          setPendingInvite(null);
          setNotice('You\u2019ve joined the Family household. You now have Family features.');
        })
        .catch((err) => {
          if (!(err instanceof BillingError) || err.code !== 'email_unverified') setPendingInvite(null);
          showBillingError(err);
        });
    } else if (promo) {
      redeemPromoCode(promo)
        .then((res) => {
          setPendingPromo(null);
          setNotice(`Promo code applied: Pro is unlocked until ${new Date(res.expiresAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}.`);
        })
        .catch((err) => {
          if (err instanceof BillingError && err.code === 'email_unverified') {
            setNotice(`Verify your email address, then open Plan & billing in the dashboard to redeem ${promo}.`);
            return;
          }
          setPendingPromo(null);
          showBillingError(err);
        });
    } else if (plan) {
      setPendingPlan(null);
      startCheckout(plan).catch(showBillingError);
    }
  }, [activeUserId]);

  const handleUpgrade = useCallback(async (plan: CheckoutPlan) => {
    if (!BILLING_ENABLED) {
      handleOpenWaitlist({ plan: plan.startsWith('family') ? 'Family' : 'Pro' });
      return;
    }
    if (activeUserIdRef.current === 'guest') {
      setPendingPlan(plan);
      handleOpenWaitlist({ plan: plan.startsWith('family') ? 'Family' : 'Pro', checkoutPlan: plan });
      return;
    }
    try {
      await startCheckout(plan);
    } catch (err) {
      if (err instanceof BillingError && err.code === 'has_subscription') {
        await openBillingPortal().catch(showBillingError);
        return;
      }
      showBillingError(err);
    }
  }, []);

  const handleOpenWaitlist = (prefillData?: any) => {
    setWaitlistPrefill(prefillData || null);
    setIsWaitlistOpen(true);
  };

  const handleNavigateSection = (sectionId: string) => {
    if (activeView !== 'landing') {
      setActiveView('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;

  const renderCalculator = (view: CalculatorView) => {
    switch (view) {
      case 'investment-calculator':
        return <InvestmentCalculatorPage currentCurrency={currentCurrency} onOpenWaitlist={handleOpenWaitlist} onNavigate={setActiveView} />;
      case 'etf-tax-calculator':
        return <EtfTaxCalculatorPage onNavigate={setActiveView} />;
      case 'pension-calculator':
        return <PensionCalculatorPage onNavigate={setActiveView} />;
      case 'savings-goal-calculator':
        return <SavingsGoalCalculatorPage onNavigate={setActiveView} />;
      case 'mortgage-vs-investing-calculator':
        return <MortgageVsInvestingCalculatorPage onNavigate={setActiveView} />;
      default:
        return <CalculatorsHubPage onNavigate={setActiveView} />;
    }
  };

  const ensureDataReady = () => {
    if (isDataReadyRef.current) return true;
    setDataError('Your portfolio is still loading. Please wait a moment and try again.');
    return false;
  };

  const atFreeHoldingLimit = (current: number) => !accessRef.current.canUse('unlimited_holdings') && current >= FREE_HOLDINGS_LIMIT;

  const handleAddHolding = useCallback(async (newHolding: Holding) => {
    if (!ensureDataReady()) return;
    if (atFreeHoldingLimit(holdingsRef.current.length)) {
      setDataError(`The Free plan tracks up to ${FREE_HOLDINGS_LIMIT} holdings. Upgrade to Pro for unlimited holdings.`);
      return;
    }
    setHoldings(prev => [newHolding, ...prev]);
    const result = await saveUserHolding(activeUserId, newHolding);
    if (!result.success) {
      setHoldings(prev => prev.filter(h => h.id !== newHolding.id));
      setDataError(result.error ?? 'Could not save the holding.');
    }
  }, [activeUserId]);

  const handleUpdateHolding = useCallback(async (updated: Holding) => {
    if (!ensureDataReady()) return;
    const previous = holdings.find(h => h.id === updated.id);
    setHoldings(prev => prev.map(h => (h.id === updated.id ? updated : h)));
    const result = await saveUserHolding(activeUserId, updated);
    if (!result.success) {
      if (previous) setHoldings(prev => prev.map(h => (h.id === updated.id ? previous : h)));
      setDataError(result.error ?? 'Could not update the holding.');
    }
  }, [activeUserId, holdings]);

  // Saves sequentially so local storage writes never race; returns how many failed.
  const handleImportHoldings = useCallback(async (items: ImportPlanItem[]): Promise<number> => {
    if (!ensureDataReady()) return items.length;
    const uid = activeUserId;
    let failed = 0;
    let count = holdingsRef.current.length;
    let skipped = 0;
    for (const { holding, action } of items) {
      if (action !== 'update' && atFreeHoldingLimit(count)) {
        skipped++;
        continue;
      }
      const result = await saveUserHolding(uid, holding);
      if (activeUserIdRef.current !== uid) return items.length;
      if (!result.success) {
        failed++;
        continue;
      }
      if (action !== 'update') count++;
      setHoldings(prev => (action === 'update' ? prev.map(h => (h.id === holding.id ? holding : h)) : [holding, ...prev]));
    }
    if (skipped > 0) setDataError(`${skipped} holding${skipped === 1 ? ' was' : 's were'} not added because the Free plan tracks up to ${FREE_HOLDINGS_LIMIT}. Upgrade to Pro for unlimited holdings.`);
    else if (failed > 0) setDataError(`${failed} imported holding${failed === 1 ? '' : 's'} could not be saved.`);
    return failed + skipped;
  }, [activeUserId]);

  const navRefreshInFlight = useRef(false);

  // Updates Indian fund prices (NAV) from mfapi.in; only the price and value of matched funds change.
  const handleRefreshFundPrices = useCallback(async (): Promise<NavRefreshSummary | null> => {
    if (!isDataReadyRef.current || navRefreshInFlight.current || !accessRef.current.canUse('fund_price_refresh')) return null;
    navRefreshInFlight.current = true;
    const uid = activeUserIdRef.current;
    try {
      const summary = await refreshFundPrices(holdingsRef.current);
      if (activeUserIdRef.current !== uid) return null;
      if (summary.updates.length > 0) {
        await handleImportHoldings(summary.updates.map(holding => ({ holding, action: 'update' as const })));
      }
      return summary;
    } finally {
      navRefreshInFlight.current = false;
    }
  }, [handleImportHoldings]);

  useEffect(() => {
    if (!isDataReady || activeUserId === 'guest' || !access.canUse('fund_price_refresh')) return;
    if (!holdings.some(isRefreshableFund) || !shouldAutoRefresh(activeUserId, holdings)) return;
    markAutoRefreshed(activeUserId);
    handleRefreshFundPrices().catch(err => console.warn('Fund price refresh failed', err));
    // Runs once per user per day after their data loads; later holding edits must not retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataReady, activeUserId, access.plan]);

  const handleDeleteHolding = useCallback(async (id: string) => {
    if (!ensureDataReady()) return;
    const removed = holdings.find(h => h.id === id);
    setHoldings(prev => prev.filter(h => h.id !== id));
    const result = await removeUserHolding(activeUserId, id);
    if (!result.success) {
      if (removed) setHoldings(prev => [removed, ...prev]);
      setDataError(result.error ?? 'Could not delete the holding.');
    }
  }, [activeUserId, holdings]);

  const handleAddContribution = useCallback(async (amount: number, provider: string) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!ensureDataReady()) return;
    const previous = investmentAccount;
    const allowed = Math.max(0, Math.min(amount, previous.annualLimit - previous.annualContributions));
    if (allowed <= 0) {
      setDataError(`You have already reached the €${previous.annualLimit.toLocaleString()} annual contribution limit.`);
      return;
    }
    const updated: InvestmentAccountState = {
      ...previous,
      accountValue: previous.accountValue + allowed,
      annualContributions: previous.annualContributions + allowed,
      history: [
        {
          id: `tx-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: allowed,
          provider,
          type: 'Contribution' as const
        },
        ...previous.history
      ].slice(0, MAX_ACCOUNT_HISTORY)
    };
    setInvestmentAccount(updated);
    if (allowed < amount) {
      setDataError(`Only €${allowed.toLocaleString()} was added: contributions are capped at €${previous.annualLimit.toLocaleString()} per year.`);
    }
    const result = await saveInvestmentAccountState(activeUserId, updated);
    if (!result.success) {
      setInvestmentAccount(previous);
      setDataError(result.error ?? 'Could not save the contribution.');
    }
  }, [activeUserId, investmentAccount]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Universal Top Navigation */}
      <Navbar
        currentCurrency={currentCurrency}
        onCurrencyChange={setCurrentCurrency}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenWaitlist={() => handleOpenWaitlist()}
        onNavigateSection={handleNavigateSection}
      />

      {dataError && (
        <div role="alert" className="sticky top-16 z-40 mx-auto mt-2 flex max-w-3xl items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">
          <span>{dataError}</span>
          <button type="button" onClick={() => setDataError(null)} aria-label="Dismiss" className="shrink-0 cursor-pointer font-bold text-rose-700 hover:text-rose-900">
            ×
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className="sticky top-16 z-40 mx-auto mt-2 flex max-w-3xl items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 cursor-pointer font-bold text-emerald-700 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {!isDataReady && activeView === 'app' && !dataError && (
        <div role="status" aria-live="polite" className="sticky top-16 z-40 mx-auto mt-2 max-w-3xl rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-600 shadow-sm">
          Loading your portfolio…
        </div>
      )}

      {/* Main View Router: Landing Page vs. Interactive App Dashboard vs. Privacy & Cookies */}
      {activeView === 'privacy' ? (
        <Suspense fallback={<ViewFallback />}>
          <PrivacyPage onBack={() => setActiveView('landing')} />
        </Suspense>
      ) : isCalculatorView(activeView) ? (
        <>
          <Suspense fallback={<ViewFallback />}>
            {renderCalculator(activeView)}
          </Suspense>
          <Footer
            onNavigateSection={handleNavigateSection}
            onOpenWaitlist={() => handleOpenWaitlist()}
            onOpenPrivacy={() => setActiveView('privacy')}
            onNavigateView={setActiveView}
          />
        </>
      ) : activeView === 'landing' ? (
        <main>
          {/* 1. Hero Section & Product Demo Mockup */}
          <HeroSection
            currentCurrency={currentCurrency}
            onOpenWaitlist={() => handleOpenWaitlist()}
            onExploreCalculator={() => handleNavigateSection('calculator')}
            onOpenDashboard={() => setActiveView('app')}
          />

          {/* 2. Ireland's New Investment Account Framework (Budget 2027) */}
          <InvestmentAccountSection
            investmentAccount={investmentAccount}
            currentCurrency={currentCurrency}
            onOpenWaitlist={() => handleOpenWaitlist()}
            onExploreCalculator={() => handleNavigateSection('calculator')}
            onAddContribution={handleAddContribution}
          />

          {/* 3. Problem Cards ("Investing shouldn't require a finance degree") */}
          <ProblemCardsSection />

          {/* 4. FY26 vs FY27 Interactive Budget & Investment Calculator (Robust Dynamic State Component) */}
          <BudgetCalculatorSection
            currentCurrency={currentCurrency}
            onOpenWaitlist={handleOpenWaitlist}
          />

          {/* 5. Cross-Border Wealth Architecture (Ireland + India + US + EU) */}
          <CrossBorderSection
            currentCurrency={currentCurrency}
            onOpenWaitlist={() => handleOpenWaitlist()}
            onOpenDashboard={() => setActiveView('app')}
          />

          {/* 6. Signature Feature: The Financial X-Ray */}
          <FinancialXRaySection
            currentCurrency={currentCurrency}
            holdings={holdings}
            onOpenWaitlist={() => handleOpenWaitlist()}
            onOpenDashboard={() => setActiveView('app')}
          />

          {/* 7. Product Architecture Cards */}
          <ProductCardsSection
            onOpenDashboard={() => setActiveView('app')}
            onOpenWaitlist={() => handleOpenWaitlist()}
          />

          {/* 8. Scenario Planner ("What If?") */}
          <ScenarioPlannerSection
            currentCurrency={currentCurrency}
            onOpenWaitlist={() => handleOpenWaitlist()}
          />

          {/* 9. Live Official Government Sources & Secure Fiscal API Inspector */}
          <GovtSourcesSection />

          {/* 10. AI Assistant ("Ask your money questions in plain English") */}
          <AiAssistantSection />

          {/* 11. Viral Diagnostic Tool: "How Invested Are You?" (0-100 Readiness Score) */}
          <ReadinessQuizSection
            onOpenWaitlist={handleOpenWaitlist}
          />

          {/* 12. Educational Knowledge Hub (Reviewed & Dated Sources) */}
          <EducationHubSection />

          {/* 13. Transparent Pricing (Free, Pro, Family, B2B Enterprise API) */}
          <PricingSection
            onOpenWaitlist={(plan) => handleOpenWaitlist({ plan })}
            billingEnabled={BILLING_ENABLED}
            currentPlan={access.plan}
            onUpgrade={handleUpgrade}
            onOpenDashboard={() => setActiveView('app')}
          />

          {/* 14. Frequently Asked Questions */}
          <FAQSection />

          {/* 15. Regulatory Footer & Statutory Disclaimers */}
          <Footer
            onNavigateSection={handleNavigateSection}
            onOpenWaitlist={() => handleOpenWaitlist()}
            onOpenPrivacy={() => setActiveView('privacy')}
            onNavigateView={setActiveView}
          />
        </main>
      ) : (
        /* Interactive App Mode */
        <Suspense fallback={<ViewFallback />}>
        <DashboardView
          key={activeUserId}
          currentCurrency={currentCurrency}
          holdings={holdings}
          onAddHolding={handleAddHolding}
          onUpdateHolding={handleUpdateHolding}
          onImportHoldings={handleImportHoldings}
          onRefreshFundPrices={handleRefreshFundPrices}
          onDeleteHolding={handleDeleteHolding}
          investmentAccount={investmentAccount}
          onAddContribution={handleAddContribution}
          onOpenWaitlist={handleOpenWaitlist}
          access={access}
          onUpgrade={handleUpgrade}
          onNotice={setNotice}
        />
        </Suspense>
      )}

      {/* Early Access / Calculation Saver Modal */}
      <EarlyAccessModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
        prefillData={waitlistPrefill}
        billingEnabled={BILLING_ENABLED}
      />

    </div>
  );
}
