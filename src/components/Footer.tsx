import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
  onOpenWaitlist: () => void;
  onOpenPrivacy: () => void;
}

const linkClass = 'text-left hover:text-white transition-colors cursor-pointer';

export const Footer: React.FC<FooterProps> = ({ onNavigateSection, onOpenWaitlist, onOpenPrivacy }) => {
  const productLinks: { id: string; label: string }[] = [
    { id: 'investment-account', label: 'Investment Account' },
    { id: 'calculator', label: 'FY26 vs FY27 Calculator' },
    { id: 'cross-border', label: 'India & US Asset Tracker' },
    { id: 'financial-xray', label: 'The Financial X-Ray' },
    { id: 'ai-assistant', label: 'Plain English AI Assistant' },
  ];
  const learnLinks: { id: string; label: string }[] = [
    { id: 'education', label: 'Investment Account Guide' },
    { id: 'education', label: 'Exit Tax & Deemed Disposal' },
    { id: 'cross-border', label: 'Ireland-India DTAA Treaty' },
    { id: 'govt-sources', label: 'Official Government Sources' },
    { id: 'faq', label: 'Frequently Asked Questions' },
  ];
  const aboutLinks: { id: string; label: string }[] = [
    { id: 'how-it-works', label: 'How it Works' },
    { id: 'pricing', label: 'Pricing' },
  ];

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          
          {/* Brand Info (2 cols) */}
          <div className="sm:col-span-3 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                IE
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                InvestIreland <span className="text-emerald-400 font-mono text-xs">AI</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              Understand. Track. Invest with clarity. An independent, educational personal-finance tool for people living in Ireland, including those with assets in India, the US and elsewhere.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Independent project &middot; Not affiliated with Revenue or the Department of Finance</span>
            </div>
          </div>

          {/* Product Links */}
          <nav aria-label="Product" className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Product</div>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <button type="button" onClick={() => onNavigateSection(link.id)} className={linkClass}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Learn Links */}
          <nav aria-label="Learn and sources" className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Learn &amp; Sources</div>
            <ul className="space-y-2">
              {learnLinks.map((link) => (
                <li key={link.label}>
                  <button type="button" onClick={() => onNavigateSection(link.id)} className={linkClass}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* About */}
          <nav aria-label="About" className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">About</div>
            <ul className="space-y-2">
              <li>
                <button type="button" onClick={onOpenWaitlist} className={linkClass}>
                  Join Early Access
                </button>
              </li>
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <button type="button" onClick={() => onNavigateSection(link.id)} className={linkClass}>
                    {link.label}
                  </button>
                </li>
              ))}
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenPrivacy();
                  }}
                  className={linkClass}
                >
                  Privacy &amp; Cookies
                </a>
              </li>
            </ul>
            <p className="text-[11px] leading-relaxed text-slate-400">
              No advertising, analytics or tracking cookies. Account data is stored with Firebase and can only be read by your signed-in account.
            </p>
          </nav>

        </div>

        {/* Regulatory & Legal Disclaimers */}
        <div className="pt-8 space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-white mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Important information</span>
            </div>
            <p>
              InvestIreland AI is an independent educational and financial-information tool. It is not regulated by the Central Bank of Ireland and does not provide investment, tax or financial advice, recommend specific securities, or execute orders. Information about the proposed Irish Investment Account announced in Budget 2027 is based on published Government announcements and remains subject to the Finance Bill and final enactment. Market, exchange-rate and fiscal figures on this site are sample or reference data and may be out of date. Calculations are illustrative only. Check Revenue.ie or speak to a Qualified Financial Adviser before making decisions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 text-center sm:text-left">
            <div>
              &copy; {new Date().getFullYear()} InvestIreland AI. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span>References Revenue &amp; Department of Finance publications</span>
              <span aria-hidden="true">&middot;</span>
              <span>Not financial advice</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
