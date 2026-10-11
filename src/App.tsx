import React, { useState, useEffect } from 'react';
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
import { DashboardView } from './components/DashboardView';
import { SellixHeroView } from './components/SellixHeroView';
import { getActiveUser } from './services/authEmailService';
import { 
  loadUserHoldings, 
  saveUserHolding, 
  removeUserHolding, 
  loadInvestmentAccountState, 
  saveInvestmentAccountState 
} from './services/portfolioService';

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
  
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    const user = getActiveUser();
    return user?.id || 'usr_default';
  });

  const [holdings, setHoldings] = useState<Holding[]>(INITIAL_HOLDINGS);
  const [investmentAccount, setInvestmentAccount] = useState<InvestmentAccountState>(INITIAL_INVESTMENT_ACCOUNT_STATE);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistPrefill, setWaitlistPrefill] = useState<any>(null);

  // Load real user holdings and account data on mount & user change
  useEffect(() => {
    const user = getActiveUser();
    const uid = user?.id || 'usr_default';
    setActiveUserId(uid);

    loadUserHoldings(uid).then(loadedHoldings => {
      if (loadedHoldings && loadedHoldings.length > 0) {
        setHoldings(loadedHoldings);
      }
    });

    const accountState = loadInvestmentAccountState(uid);
    setInvestmentAccount(accountState);
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

  const handleAddHolding = (newHolding: Holding) => {
    setHoldings(prev => [newHolding, ...prev]);
    saveUserHolding(activeUserId, newHolding);
  };

  const handleDeleteHolding = (id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
    removeUserHolding(activeUserId, id);
  };

  const handleAddContribution = (amount: number, provider: string) => {
    setInvestmentAccount(prev => {
      const newTotal = prev.annualContributions + amount;
      const updated: InvestmentAccountState = {
        ...prev,
        accountValue: prev.accountValue + amount,
        annualContributions: Math.min(prev.annualLimit, newTotal),
        history: [
          {
            id: `tx-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount,
            provider,
            type: 'Contribution'
          },
          ...prev.history
        ]
      };
      saveInvestmentAccountState(activeUserId, updated);
      return updated;
    });
  };

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

      {/* Main View Router: Landing Page vs. Interactive App Dashboard vs. Standalone Sellix Hero Page */}
      {activeView === 'sellix' ? (
        <SellixHeroView onBack={() => setActiveView('landing')} />
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
        <DashboardView
          currentCurrency={currentCurrency}
          holdings={holdings}
          onAddHolding={handleAddHolding}
          onDeleteHolding={handleDeleteHolding}
          investmentAccount={investmentAccount}
          onAddContribution={handleAddContribution}
          onOpenWaitlist={handleOpenWaitlist}
        />
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
