import React from 'react';
import { LifeBuoy, Mail, ShieldCheck } from 'lucide-react';
import { CONTACT_EMAILS } from '../config/contact';
import { openCookieSettings } from './CookieConsentBanner';
import { openChat } from './chatEvents';
import { isModifiedClick } from '../utils/links';
import { ABOUT_PAGE, CALCULATORS_HUB, CALCULATOR_TOOLS, GUIDE_PAGES, type AppView } from '../config/calculators';

interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
  onOpenWaitlist: () => void;
  onOpenPrivacy: () => void;
  onNavigateView: (view: AppView) => void;
}

const linkClass = 'inline-block py-1 text-left hover:text-white hover:underline underline-offset-2 transition-colors cursor-pointer';
const headingClass = 'font-bold text-white uppercase tracking-wider text-xs';

const SITE_LINKS: { id: string; label: string }[] = [
  { id: 'investment-account', label: '2027 Investment Account' },
  { id: 'calculator', label: 'FY26 vs FY27 budget calculator' },
  { id: 'cross-border', label: 'India & US assets' },
  { id: 'financial-xray', label: 'Financial X-Ray' },
  { id: 'what-if', label: 'What-if planner' },
  { id: 'readiness-quiz', label: 'Readiness quiz' },
  { id: 'education', label: 'Education hub' },
  { id: 'govt-sources', label: 'Official sources' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

export const Footer: React.FC<FooterProps> = ({ onNavigateSection, onOpenWaitlist, onOpenPrivacy, onNavigateView }) => {
  const viewClick = (view: AppView) => (e: React.MouseEvent) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    onNavigateView(view);
  };
  const sectionClick = (id: string) => (e: React.MouseEvent) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    onNavigateSection(id);
  };

  return (
    <footer className="bg-slate-900 text-slate-300 text-sm py-14 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-slate-800">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-sm">
                IE
              </span>
              <span className="text-white font-bold text-lg tracking-tight">
                InvestIreland <span className="text-emerald-400 text-xs">AI</span>
              </span>
            </div>
            <p className="max-w-xs leading-relaxed">
              Free, independent tools to help people in Ireland understand their money, including assets in India and the US.
            </p>
            <ul className="space-y-1.5">
              <li className="flex flex-wrap items-center gap-x-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <a href={`mailto:${CONTACT_EMAILS.enquiries}`} className={`${linkClass} font-semibold text-slate-100`}>
                  {CONTACT_EMAILS.enquiries}
                </a>
              </li>
              <li className="flex flex-wrap items-center gap-x-2">
                <LifeBuoy className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <a href={`mailto:${CONTACT_EMAILS.support}`} className={`${linkClass} font-semibold text-slate-100`}>
                  {CONTACT_EMAILS.support}
                </a>
                <span className="sr-only">(help and feature requests)</span>
              </li>
            </ul>
          </div>

          <nav aria-label="Calculators" className="space-y-3">
            <h2 className={headingClass}>Calculators</h2>
            <ul>
              {CALCULATOR_TOOLS.map((page) => (
                <li key={page.view}>
                  <a href={page.path} onClick={viewClick(page.view)} className={linkClass}>
                    {page.name}
                  </a>
                </li>
              ))}
              <li>
                <a href={CALCULATORS_HUB.path} onClick={viewClick('calculators')} className={`${linkClass} font-semibold text-emerald-300`}>
                  All calculators
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Guides" className="space-y-3">
            <h2 className={headingClass}>Guides</h2>
            <ul>
              {[...GUIDE_PAGES, ABOUT_PAGE].map((page) => (
                <li key={page.view}>
                  <a href={page.path} onClick={viewClick(page.view)} className={linkClass}>
                    {page.name}
                  </a>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => openChat()} className={linkClass}>
                  Ask the assistant
                </button>
              </li>
            </ul>
          </nav>

          <nav aria-label="On this site" className="space-y-3">
            <h2 className={headingClass}>On this site</h2>
            <ul>
              {SITE_LINKS.map((link) => (
                <li key={link.id}>
                  <a href={`/#${link.id}`} onClick={sectionClick(link.id)} className={linkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <button type="button" onClick={onOpenWaitlist} className={linkClass}>
                  Join early access
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="pt-8 space-y-5">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
            <p className="flex items-center gap-2 font-bold text-white mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              Important information
            </p>
            <p>
              InvestIreland AI is an independent educational tool. It is not regulated by the Central Bank of Ireland and does not give investment, tax or financial advice, recommend securities or carry out trades. Details of the proposed Investment Account from Budget 2027 depend on the Finance Bill and may change. Market, exchange-rate and tax figures may be out of date, and all results are illustrative. Check Revenue.ie or speak to a qualified financial adviser before you decide anything.
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} InvestIreland AI. Not affiliated with Revenue or the Department of Finance.</p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <a
                href="/privacy"
                onClick={(e) => {
                  if (isModifiedClick(e)) return;
                  e.preventDefault();
                  onOpenPrivacy();
                }}
                className={linkClass}
              >
                Privacy &amp; cookies
              </a>
              <button type="button" onClick={openCookieSettings} className={linkClass}>
                Cookie settings
              </button>
              <span>Google Ads cookies only with consent. No analytics.</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
