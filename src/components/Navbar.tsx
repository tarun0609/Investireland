import React, { useState, useRef, useEffect } from 'react';
import { Currency } from '../types';
import { isModifiedClick } from '../utils/links';
import {
  ABOUT_PAGE,
  BEST_INVESTMENT_OPTIONS_GUIDE,
  CALCULATORS_HUB,
  CALCULATOR_TOOLS,
  GUIDE_PAGES,
  calculatorPageForView,
  isCalculatorView,
  type AppView,
} from '../config/calculators';
import { Sparkles, LayoutDashboard, Globe2, ChevronDown, Menu, X, BookOpen, Calculator } from 'lucide-react';

interface NavbarProps {
  currentCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onOpenWaitlist: () => void;
  onNavigateSection: (sectionId: string) => void;
}

const CURRENCY_CONFIG: Record<Currency, { symbol: string; label: string; flag: string }> = {
  EUR: { symbol: '€', label: 'EUR', flag: '🇪🇺' },
  INR: { symbol: '₹', label: 'INR', flag: '🇮🇳' },
  USD: { symbol: '$', label: 'USD', flag: '🇺🇸' },
  GBP: { symbol: '£', label: 'GBP', flag: '🇬🇧' },
};

/** Homepage sections reachable from "More" (desktop) and the mobile drawer. */
const SECTION_LINKS: { id: string; label: string }[] = [
  { id: 'investment-account', label: '2027 Investment Account' },
  { id: 'calculator', label: 'FY26 vs FY27 budget calculator' },
  { id: 'cross-border', label: 'India & US assets' },
  { id: 'financial-xray', label: 'Financial X-Ray' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'govt-sources', label: 'Official sources' },
  { id: 'education', label: 'Education hub' },
  { id: 'faq', label: 'FAQ' },
];

const linkBase = 'rounded-lg px-3 py-2 transition-colors hover:bg-slate-50 hover:text-emerald-800 cursor-pointer';

export const Navbar: React.FC<NavbarProps> = ({
  currentCurrency,
  onCurrencyChange,
  activeView,
  onViewChange,
  onOpenWaitlist,
  onNavigateSection
}) => {
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currencyRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setIsCurrencyOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCurrencyOpen(false);
        setIsMoreOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMoreOpen(false);
  }, [activeView]);

  // Calculator pages are part of the public website, so they share the landing navigation.
  const isWebsite = activeView === 'landing' || isCalculatorView(activeView);
  const pageKind = isCalculatorView(activeView) ? calculatorPageForView(activeView).kind : null;
  const onCalculatorPage = pageKind === 'hub' || pageKind === 'tool';
  const onGuidePage = pageKind === 'guide';

  const handleViewChange = (view: AppView) => {
    onViewChange(view);
    setIsMoreOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (sectionId: string) => {
    onNavigateSection(sectionId);
    setIsMoreOpen(false);
    setIsMobileMenuOpen(false);
  };

  const viewLink = (view: AppView, path: string, label: React.ReactNode, className: string, current?: boolean) => (
    <a
      href={path}
      aria-current={current ? 'page' : undefined}
      onClick={(e) => {
        if (isModifiedClick(e)) return;
        e.preventDefault();
        handleViewChange(view);
      }}
      className={className}
    >
      {label}
    </a>
  );

  const sectionLink = (id: string, label: React.ReactNode, className: string) => (
    <a
      key={id}
      href={`/#${id}`}
      onClick={(e) => {
        if (isModifiedClick(e)) return;
        e.preventDefault();
        handleNavClick(id);
      }}
      className={className}
    >
      {label}
    </a>
  );

  const drawerItem = 'flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left hover:bg-slate-50 cursor-pointer';
  const drawerGroup = 'group rounded-lg [&_summary::-webkit-details-marker]:hidden';
  const drawerSummary = 'flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2.5 font-semibold text-slate-800 hover:bg-slate-50';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-16">

          <a
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group shrink-0 rounded-xl"
            onClick={(e) => {
              if (isModifiedClick(e)) return;
              e.preventDefault();
              handleViewChange('landing');
            }}
          >
            <span aria-hidden="true" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs group-hover:shadow-emerald-700/20 transition-all">
              <span className="font-extrabold text-sm tracking-tight">IE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">InvestIreland</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">AI</span>
              <span className="sr-only">home</span>
            </span>
          </a>

          {isWebsite ? (
            <nav aria-label="Main" className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-700">
              {viewLink('calculators', CALCULATORS_HUB.path, 'Calculators', `${linkBase} ${onCalculatorPage ? 'text-emerald-800' : ''}`, onCalculatorPage)}
              {viewLink(BEST_INVESTMENT_OPTIONS_GUIDE.view, BEST_INVESTMENT_OPTIONS_GUIDE.path, 'Guides', `${linkBase} ${onGuidePage ? 'text-emerald-800' : ''}`, onGuidePage)}
              <button type="button" onClick={() => handleViewChange('app')} className={linkBase}>
                Tracker
              </button>
              {sectionLink('pricing', 'Pricing', linkBase)}

              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  aria-haspopup="true"
                  aria-expanded={isMoreOpen}
                  aria-controls="nav-more-menu"
                  className={`${linkBase} flex items-center gap-1`}
                >
                  <span>More</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {isMoreOpen && (
                  <div id="nav-more-menu" className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 text-sm font-medium text-slate-700 z-50">
                    {SECTION_LINKS.map((link) => sectionLink(link.id, link.label, 'block px-4 py-2 hover:bg-slate-50 hover:text-emerald-800 cursor-pointer'))}
                    <div className="my-1 border-t border-slate-100" />
                    {viewLink(ABOUT_PAGE.view, ABOUT_PAGE.path, ABOUT_PAGE.name, 'block px-4 py-2 hover:bg-slate-50 hover:text-emerald-800 cursor-pointer', activeView === ABOUT_PAGE.view)}
                  </div>
                )}
              </div>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                <span>Portfolio Beta &middot; Ireland &middot; India &middot; US</span>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="relative" ref={currencyRef}>
              <button
                type="button"
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                aria-haspopup="true"
                aria-expanded={isCurrencyOpen}
                aria-label={`Display currency: ${currentCurrency}. Change currency`}
                className="flex h-9 items-center gap-1 sm:gap-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold border border-slate-200/80 transition-all cursor-pointer"
                title="Change display currency"
              >
                <span aria-hidden="true">{CURRENCY_CONFIG[currentCurrency].symbol}</span>
                <span className="hidden sm:inline">{currentCurrency}</span>
                <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {isCurrencyOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-sm z-50">
                  {(['EUR', 'INR', 'USD', 'GBP'] as Currency[]).map((cur) => {
                    const cfg = CURRENCY_CONFIG[cur];
                    const isSelected = currentCurrency === cur;
                    return (
                      <button
                        key={cur}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          onCurrencyChange(cur);
                          setIsCurrencyOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true">{cfg.flag}</span>
                          <span>{cur}</span>
                        </span>
                        <span className="font-mono text-slate-500" aria-hidden="true">{cfg.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tracker shortcut for tablets (desktop has it in the menu, phones in the drawer). */}
            <button
              type="button"
              onClick={() => handleViewChange(isWebsite ? 'app' : 'landing')}
              aria-label={isWebsite ? 'Open my tracker' : 'Back to website'}
              className={`${isWebsite ? 'hidden sm:inline-flex lg:hidden' : 'inline-flex'} h-9 items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer`}
            >
              {isWebsite ? (
                <>
                  <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span>Tracker</span>
                </>
              ) : (
                <>
                  <Globe2 className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span className="hidden sm:inline">Website</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenWaitlist();
              }}
              className="inline-flex h-9 items-center gap-1.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs hover:shadow transition-all cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" aria-hidden="true" />
              <span className="max-[399px]:sr-only">Early Access</span>
            </button>

            {isWebsite && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden flex h-10 w-10 items-center justify-center text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {isMobileMenuOpen && isWebsite && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-slate-200 bg-white px-4 py-3 space-y-1 text-base font-medium text-slate-700 shadow-md"
        >
          {viewLink('calculators', CALCULATORS_HUB.path, <><Calculator className="w-4 h-4 text-emerald-700" aria-hidden="true" /> All calculators</>, drawerItem, activeView === 'calculators')}
          {viewLink(BEST_INVESTMENT_OPTIONS_GUIDE.view, BEST_INVESTMENT_OPTIONS_GUIDE.path, <><BookOpen className="w-4 h-4 text-emerald-700" aria-hidden="true" /> Best investment options guide</>, drawerItem, activeView === BEST_INVESTMENT_OPTIONS_GUIDE.view)}
          <button type="button" onClick={() => handleViewChange('app')} className={drawerItem}>
            <LayoutDashboard className="w-4 h-4 text-emerald-700" aria-hidden="true" /> Open my tracker
          </button>
          {sectionLink('pricing', 'Pricing', drawerItem)}

          <div className="border-t border-slate-100 pt-1 mt-1 space-y-1">
            <details className={drawerGroup}>
              <summary className={drawerSummary}>
                Calculators
                <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="pl-2">
                {CALCULATOR_TOOLS.map((page) => (
                  <React.Fragment key={page.view}>{viewLink(page.view, page.path, page.name, drawerItem, activeView === page.view)}</React.Fragment>
                ))}
              </div>
            </details>
            <details className={drawerGroup}>
              <summary className={drawerSummary}>
                Guides
                <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="pl-2">
                {[...GUIDE_PAGES, ABOUT_PAGE].map((page) => (
                  <React.Fragment key={page.view}>{viewLink(page.view, page.path, page.name, drawerItem, activeView === page.view)}</React.Fragment>
                ))}
              </div>
            </details>
            <details className={drawerGroup}>
              <summary className={drawerSummary}>
                On this site
                <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="pl-2">{SECTION_LINKS.map((link) => sectionLink(link.id, link.label, drawerItem))}</div>
            </details>
          </div>
        </nav>
      )}
    </header>
  );
};
