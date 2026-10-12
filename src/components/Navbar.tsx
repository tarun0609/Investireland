import React, { useState, useRef, useEffect } from 'react';
import { Currency } from '../types';
import { 
  ShieldCheck, 
  Sparkles, 
  LayoutDashboard, 
  Globe2, 
  ChevronDown, 
  Menu, 
  X, 
  HelpCircle,
  BookOpen,
  CreditCard
} from 'lucide-react';

interface NavbarProps {
  currentCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
  activeView: 'landing' | 'app' | 'privacy';
  onViewChange: (view: 'landing' | 'app' | 'privacy') => void;
  onOpenWaitlist: () => void;
  onNavigateSection: (sectionId: string) => void;
}

const CURRENCY_CONFIG: Record<Currency, { symbol: string; label: string; flag: string }> = {
  EUR: { symbol: '€', label: 'EUR', flag: '🇪🇺' },
  INR: { symbol: '₹', label: 'INR', flag: '🇮🇳' },
  USD: { symbol: '$', label: 'USD', flag: '🇺🇸' },
  GBP: { symbol: '£', label: 'GBP', flag: '🇬🇧' },
};

const DESKTOP_LINKS: { id: string; label: string }[] = [
  { id: 'investment-account', label: 'Scheme 2027' },
  { id: 'calculator', label: 'Budget Calculator' },
  { id: 'cross-border', label: 'Cross-Border' },
  { id: 'financial-xray', label: 'Financial X-Ray' },
];

const MOBILE_LINKS: { id: string; label: string }[] = [
  { id: 'investment-account', label: 'Investment Account (Budget 2027)' },
  { id: 'calculator', label: 'FY26 vs FY27 Budget Calculator' },
  { id: 'cross-border', label: 'India & US Assets' },
  { id: 'financial-xray', label: 'Financial X-Ray' },
  { id: 'govt-sources', label: 'Official Government Sources' },
  { id: 'how-it-works', label: 'How it Works' },
  { id: 'education', label: 'Education Hub' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

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

  const handleViewChange = (view: 'landing' | 'app') => {
    onViewChange(view);
    setIsMoreOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (sectionId: string) => {
    onNavigateSection(sectionId);
    setIsMoreOpen(false);
    setIsMobileMenuOpen(false);
  };

  const dropdownItemClass = 'w-full text-left px-3.5 py-2 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-16">
          
          {/* Left: Clean Brand Logo */}
          <button
            type="button"
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group shrink-0 rounded-xl"
            onClick={() => handleViewChange('landing')}
            aria-label="InvestIreland AI home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs group-hover:shadow-emerald-700/20 transition-all">
              <span className="font-extrabold text-sm tracking-tight">IE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                InvestIreland
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                AI
              </span>
            </div>
          </button>

          {/* Center: Streamlined Navigation (Landing Mode) */}
          {activeView === 'landing' ? (
            <nav aria-label="Main" className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
              {DESKTOP_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleNavClick(link.id)}
                  className="hover:text-emerald-700 transition-colors cursor-pointer py-1"
                >
                  {link.label}
                </button>
              ))}

              {/* Clean 'More' Dropdown */}
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  aria-haspopup="true"
                  aria-expanded={isMoreOpen}
                  className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer py-1"
                >
                  <span>Resources</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMoreOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 text-xs text-slate-700 z-50 animate-in fade-in-50 zoom-in-95">
                    <button type="button" onClick={() => handleNavClick('how-it-works')} className={dropdownItemClass}>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>How it Works</span>
                    </button>
                    <button type="button" onClick={() => handleNavClick('govt-sources')} className={dropdownItemClass}>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Official Sources</span>
                    </button>
                    <button type="button" onClick={() => handleNavClick('education')} className={dropdownItemClass}>
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Education Hub</span>
                    </button>
                    <button type="button" onClick={() => handleNavClick('pricing')} className={dropdownItemClass}>
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pricing</span>
                    </button>
                    <button type="button" onClick={() => handleNavClick('faq')} className={dropdownItemClass}>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>FAQ</span>
                    </button>
                  </div>
                )}
              </div>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Portfolio Beta &middot; Ireland &middot; India &middot; US</span>
              </span>
            </div>
          )}

          {/* Right: Compact Currency Dropdown & Clean Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            
            <div className="relative" ref={currencyRef}>
              <button
                type="button"
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                aria-haspopup="true"
                aria-expanded={isCurrencyOpen}
                aria-label={`Display currency: ${currentCurrency}. Change currency`}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold border border-slate-200/80 transition-all cursor-pointer"
                title="Change display currency"
              >
                <span aria-hidden="true">{CURRENCY_CONFIG[currentCurrency].symbol}</span>
                <span className="hidden sm:inline">{currentCurrency}</span>
                <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCurrencyOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-xs z-50 animate-in fade-in-50 zoom-in-95">
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
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true">{cfg.flag}</span>
                          <span>{cur}</span>
                        </span>
                        <span className="font-mono text-slate-400" aria-hidden="true">{cfg.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* View Switcher: Landing vs App (on small landing screens this lives in the mobile menu) */}
            <button
              type="button"
              onClick={() => handleViewChange(activeView === 'landing' ? 'app' : 'landing')}
              aria-label={activeView === 'landing' ? 'Open app dashboard' : 'Back to website'}
              className={`${activeView === 'landing' ? 'hidden sm:inline-flex' : 'inline-flex'} items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer`}
            >
              {activeView === 'landing' ? (
                <>
                  <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">App Dashboard</span>
                </>
              ) : (
                <>
                  <Globe2 className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Website</span>
                </>
              )}
            </button>

            {/* Primary Call to Action */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenWaitlist();
              }}
              aria-label="Join early access"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs hover:shadow transition-all cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden min-[400px]:inline">Early Access</span>
            </button>

            {/* Mobile Hamburger Button */}
            {activeView === 'landing' && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Mobile Drawer (Visible on small screens when open) */}
      {isMobileMenuOpen && activeView === 'landing' && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-3 space-y-1 text-sm font-medium text-slate-700 shadow-md animate-in slide-in-from-top-2"
        >
          {MOBILE_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleNavClick(link.id)}
              className="w-full text-left py-2 px-2 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              {link.label}
            </button>
          ))}
          <div className="border-t border-slate-100 pt-2 mt-1 sm:hidden">
            <button
              type="button"
              onClick={() => handleViewChange('app')}
              className="w-full text-left py-2 px-2 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-600" />
              <span>Open App Dashboard</span>
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};
