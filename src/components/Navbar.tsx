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
  Scale
} from 'lucide-react';

interface NavbarProps {
  currentCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
  activeView: 'landing' | 'app' | 'sellix';
  onViewChange: (view: 'landing' | 'app' | 'sellix') => void;
  onOpenWaitlist: () => void;
  onNavigateSection: (sectionId: string) => void;
}

const CURRENCY_CONFIG: Record<Currency, { symbol: string; label: string; flag: string }> = {
  EUR: { symbol: '€', label: 'EUR', flag: '🇪🇺' },
  INR: { symbol: '₹', label: 'INR', flag: '🇮🇳' },
  USD: { symbol: '$', label: 'USD', flag: '🇺🇸' },
  GBP: { symbol: '£', label: 'GBP', flag: '🇬🇧' },
};

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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setIsCurrencyOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (sectionId: string) => {
    onNavigateSection(sectionId);
    setIsMoreOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Clean Brand Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none group" 
            onClick={() => onViewChange('landing')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs group-hover:shadow-emerald-700/20 transition-all">
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
          </div>

          {/* Center: Streamlined Navigation (Landing Mode) */}
          {activeView === 'landing' ? (
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <button 
                onClick={() => handleNavClick('investment-account')}
                className="hover:text-emerald-700 transition-colors cursor-pointer py-1"
              >
                Scheme 2027
              </button>
              <button 
                onClick={() => handleNavClick('calculator')}
                className="hover:text-emerald-700 transition-colors cursor-pointer py-1"
              >
                Budget Calculator
              </button>
              <button 
                onClick={() => handleNavClick('cross-border')}
                className="hover:text-emerald-700 transition-colors cursor-pointer py-1"
              >
                Cross-Border
              </button>
              <button 
                onClick={() => handleNavClick('financial-xray')}
                className="hover:text-emerald-700 transition-colors cursor-pointer py-1"
              >
                Financial X-Ray
              </button>

              {/* Clean 'More' Dropdown */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer py-1"
                >
                  <span>Resources</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMoreOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 text-xs text-slate-700 z-50 animate-in fade-in-50 zoom-in-95">
                    <button
                      onClick={() => handleNavClick('how-it-works')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>How it Works</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('govt-sources')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Govt Source APIs</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('learn')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Education &amp; FAQ</span>
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => {
                        onViewChange('sellix');
                        setIsMoreOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-violet-50 text-violet-900 font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                      <span>Sellix Hero Preview</span>
                    </button>
                  </div>
                )}
              </div>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Portfolio Beta &middot; Ireland &middot; India &middot; US</span>
              </span>
            </div>
          )}

          {/* Right: Compact Currency Dropdown & Clean Actions */}
          <div className="flex items-center gap-2.5">
            
            {/* Compact Currency Dropdown (Replaces congested 4-button pill bar) */}
            <div className="relative" ref={currencyRef}>
              <button
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold border border-slate-200/80 transition-all cursor-pointer"
                title="Change active currency"
              >
                <span>{CURRENCY_CONFIG[currentCurrency].symbol}</span>
                <span>{currentCurrency}</span>
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
                          <span>{cfg.flag}</span>
                          <span>{cur}</span>
                        </span>
                        <span className="font-mono text-slate-400">{cfg.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* View Switcher: Landing vs App */}
            <button
              onClick={() => onViewChange(activeView === 'landing' ? 'app' : 'landing')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
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

            {/* New Page: Sellix Video Hero Page Preview */}
            <button
              onClick={() => onViewChange('sellix')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-black text-white transition-all cursor-pointer shadow-xs"
              title="Preview the new Sellix looping video hero page"
            >
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
              <span className="hidden sm:inline">Sellix Page</span>
            </button>

            {/* Primary Call to Action */}
            <button
              onClick={onOpenWaitlist}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs hover:shadow transition-all cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Early Access</span>
            </button>

            {/* Mobile Hamburger Button */}
            {activeView === 'landing' && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Mobile Drawer (Visible on small screens when open) */}
      {isMobileMenuOpen && activeView === 'landing' && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 text-xs font-medium text-slate-700 shadow-md animate-in slide-in-from-top-2">
          <button 
            onClick={() => handleNavClick('investment-account')}
            className="w-full text-left py-2 px-2 hover:bg-slate-50 rounded-lg"
          >
            Scheme 2027 Framework
          </button>
          <button 
            onClick={() => handleNavClick('calculator')}
            className="w-full text-left py-2 px-2 hover:bg-slate-50 rounded-lg"
          >
            FY26 vs FY27 Budget Calculator
          </button>
          <button 
            onClick={() => handleNavClick('cross-border')}
            className="w-full text-left py-2 px-2 hover:bg-slate-50 rounded-lg"
          >
            India &amp; US International Assets
          </button>
          <button 
            onClick={() => handleNavClick('financial-xray')}
            className="w-full text-left py-2 px-2 hover:bg-slate-50 rounded-lg"
          >
            Financial X-Ray
          </button>
          <button 
            onClick={() => handleNavClick('govt-sources')}
            className="w-full text-left py-2 px-2 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 text-emerald-800"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Government Sources</span>
          </button>
          <button 
            onClick={() => handleNavClick('how-it-works')}
            className="w-full text-left py-2 px-2 hover:bg-slate-50 rounded-lg"
          >
            How it Works
          </button>
          <button 
            onClick={() => handleNavClick('learn')}
            className="w-full text-left py-2 px-2 hover:bg-slate-50 rounded-lg"
          >
            Education Hub &amp; FAQ
          </button>
        </div>
      )}
    </header>
  );
};
