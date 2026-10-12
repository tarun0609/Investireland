import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
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
import { 
  loadUserHoldings, 
  saveUserHolding, 
  removeUserHolding, 
  loadInvestmentAccountState, 
  saveInvestmentAccountState 
} from './services/portfolioService';

const DashboardView = lazy(() => import('./components/DashboardView').then((m) => ({ default: m.DashboardView })));
const SellixHeroView = lazy(() => import('./components/SellixHeroView').then((m) => ({ default: m.SellixHeroView })));

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
  const [activeView, setActiveView] = useState<'landing' | 'app' | 'sellix'>(() => {
    // If URL pathname is /sellix or query is ?page=sellix
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path.includes('sellix') || search.includes('page=sellix') || search.includes('view=sellix')) {
        return 'sellix';
      }
    }
    return 'landing';
  });
  
  const [activeUserId, setActiveUserId] = useState<string>('guest');
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

  const ensureDataReady = () => {
    if (isDataReadyRef.current) return true;
    setDataError('Your portfolio is still loading. Please wait a moment and try again.');
    return false;
  };

  const handleAddHolding = useCallback(async (newHolding: Holding) => {
    if (!ensureDataReady()) return;
    setHoldings(prev => [newHolding, ...prev]);
    const result = await saveUserHolding(activeUserId, newHolding);
    if (!result.success) {
      setHoldings(prev => prev.filter(h => h.id !== newHolding.id));
      setDataError(result.error ?? 'Could not save the holding.');
    }
  }, [activeUserId]);

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

      {!isDataReady && activeView === 'app' && !dataError && (
        <div role="status" aria-live="polite" className="sticky top-16 z-40 mx-auto mt-2 max-w-3xl rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-600 shadow-sm">
          Loading your portfolio…
        </div>
      )}

      {/* Main View Router: Landing Page vs. Interactive App Dashboard vs. Standalone Sellix Hero Page */}
      {activeView === 'sellix' ? (
        <Suspense fallback={<ViewFallback />}>
          <SellixHeroView onBack={() => setActiveView('landing')} />
        </Suspense>
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
          />

          {/* 14. Frequently Asked Questions */}
          <FAQSection />

          {/* 15. Regulatory Footer & Statutory Disclaimers */}
          <Footer
            onNavigateSection={handleNavigateSection}
            onOpenWaitlist={() => handleOpenWaitlist()}
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
          onDeleteHolding={handleDeleteHolding}
          investmentAccount={investmentAccount}
          onAddContribution={handleAddContribution}
          onOpenWaitlist={handleOpenWaitlist}
        />
        </Suspense>
      )}

      {/* Early Access / Calculation Saver Modal */}
      <EarlyAccessModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
        prefillData={waitlistPrefill}
      />

    </div>
  );
}
