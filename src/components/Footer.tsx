import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
  onOpenWaitlist: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateSection, onOpenWaitlist }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          
          {/* Brand Info (2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                IE
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                InvestIreland <span className="text-emerald-400 font-mono text-xs">AI</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              Understand. Track. Invest with clarity. Ireland’s premier financial intelligence platform built for modern Irish residents and international professionals.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Dublin, Ireland &middot; Cross-Border Fiscal Intelligence</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Product</div>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigateSection('investment-account')} className="hover:text-white transition-colors cursor-pointer">
                  Investment Account
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('calculator')} className="hover:text-white transition-colors cursor-pointer">
                  FY26 vs FY27 Calculator
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('cross-border')} className="hover:text-white transition-colors cursor-pointer">
                  India &amp; US Asset Tracker
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('financial-xray')} className="hover:text-white transition-colors cursor-pointer">
                  The Financial X-Ray
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('ai-assistant')} className="hover:text-white transition-colors cursor-pointer">
                  Plain English AI Assistant
                </button>
              </li>
            </ul>
          </div>

          {/* Learn Links */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Learn &amp; Sources</div>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigateSection('learn')} className="hover:text-white transition-colors cursor-pointer">
                  Investment Account Guide
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('learn')} className="hover:text-white transition-colors cursor-pointer">
                  41% Deemed Disposal Rules
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('cross-border')} className="hover:text-white transition-colors cursor-pointer">
                  Ireland-India DTAA Treaty
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('govt-sources')} className="hover:text-white transition-colors cursor-pointer">
                  Official Government API Feed
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('faq')} className="hover:text-white transition-colors cursor-pointer">
                  Frequently Asked Questions
                </button>
              </li>
            </ul>
          </div>

          {/* Regulatory & Company */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Company &amp; Trust</div>
            <ul className="space-y-2">
              <li>
                <button onClick={onOpenWaitlist} className="hover:text-white transition-colors cursor-pointer">
                  Join Early Access
                </button>
              </li>
              <li>
                <span className="text-slate-400">Our Approach (Anti-Jargon)</span>
              </li>
              <li>
                <span className="text-slate-400">Privacy &amp; GDPR Compliance</span>
              </li>
              <li>
                <span className="text-slate-400">Terms of Service</span>
              </li>
              <li>
                <span className="text-slate-400">Enterprise API Solutions</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Mandatory Regulatory & Legal Disclaimers (Spec Section 38, 39, 66) */}
        <div className="pt-8 space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-white mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Statutory &amp; Regulatory Disclosure</span>
            </div>
            <p>
              InvestIreland AI is an independent educational and financial-information platform. We do not provide regulated investment advice, recommend specific securities, or execute orders. Information relating to the proposed Irish Personal Savings &amp; Investment Account announced in the Budget 2027 framework is based on published Department of Finance policy papers and remains subject to ongoing legislative debate, committee scrutiny, and final enactment in the Finance Bill. Calculations are for illustrative scenario modeling only and do not constitute an offer or advice.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} InvestIreland AI. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Grounded in Irish Revenue &amp; Dept of Finance sources</span>
              <span>&middot;</span>
              <span>GDPR Privacy by Design</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
