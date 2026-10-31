import React from 'react';
import {
  BookOpen,
  Calculator,
  ClipboardCheck,
  Globe2,
  LayoutDashboard,
  LineChart,
  MessageCircle,
  PiggyBank,
  ScanSearch,
  Sparkles,
} from 'lucide-react';
import { BEST_INVESTMENT_OPTIONS_GUIDE, CALCULATORS_HUB, type AppView } from '../config/calculators';
import { isModifiedClick } from '../utils/links';
import { openChat } from './chatEvents';

interface FeatureGridProps {
  onNavigateSection: (sectionId: string) => void;
  onNavigateView: (view: AppView) => void;
}

type Feature = {
  title: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
} & ({ view: AppView; href?: string } | { section: string } | { chat: true });

const FEATURES: Feature[] = [
  { title: 'Free calculators', text: 'Exit tax, deemed disposal, pension, savings and more.', icon: Calculator, view: 'calculators', href: CALCULATORS_HUB.path },
  { title: 'Portfolio tracker', text: 'See Irish, Indian and US holdings in euro.', icon: LayoutDashboard, view: 'app' },
  { title: '2027 Investment Account', text: 'Track your €12,000 yearly allowance.', icon: PiggyBank, section: 'investment-account' },
  { title: 'Budget calculator', text: 'Compare your take-home pay for FY26 and FY27.', icon: LineChart, section: 'calculator' },
  { title: 'India & US assets', text: 'How Irish tax treats funds, shares and RSUs abroad.', icon: Globe2, section: 'cross-border' },
  { title: 'Financial X-Ray', text: 'Check how spread out your money really is.', icon: ScanSearch, section: 'financial-xray' },
  { title: 'What-if planner', text: 'Test different monthly amounts and time frames.', icon: Sparkles, section: 'what-if' },
  { title: 'Readiness quiz', text: 'A 2-minute score for how ready you are to invest.', icon: ClipboardCheck, section: 'readiness-quiz' },
  { title: 'Guides and sources', text: 'Plain-English guides linked to Revenue and gov.ie.', icon: BookOpen, view: BEST_INVESTMENT_OPTIONS_GUIDE.view, href: BEST_INVESTMENT_OPTIONS_GUIDE.path },
  { title: 'Ask the assistant', text: 'Quick answers to common Irish investing questions.', icon: MessageCircle, chat: true },
];

const cardClass =
  'group flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md motion-reduce:hover:translate-y-0 cursor-pointer';

export const FeatureGrid: React.FC<FeatureGridProps> = ({ onNavigateSection, onNavigateView }) => (
  <section id="features" aria-labelledby="features-heading" className="py-16 sm:py-20 bg-white border-b border-slate-200">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h2 id="features-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Everything in one place
        </h2>
        <p className="mt-3 text-base sm:text-lg text-slate-600">
          Pick a tool to get started. All of them are free to try.
        </p>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          const body = (
            <>
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-slate-900">{feature.title}</span>
                <span className="mt-1 block text-sm text-slate-600">{feature.text}</span>
              </span>
            </>
          );

          let control: React.ReactNode;
          if ('chat' in feature) {
            control = (
              <button type="button" onClick={() => openChat()} className={`${cardClass} w-full`}>
                {body}
              </button>
            );
          } else if ('section' in feature) {
            control = (
              <a
                href={`/#${feature.section}`}
                onClick={(e) => {
                  if (isModifiedClick(e)) return;
                  e.preventDefault();
                  onNavigateSection(feature.section);
                }}
                className={cardClass}
              >
                {body}
              </a>
            );
          } else if (!feature.href) {
            const view = feature.view;
            control = (
              <button type="button" onClick={() => onNavigateView(view)} className={`${cardClass} w-full`}>
                {body}
              </button>
            );
          } else {
            control = (
              <a
                href={feature.href}
                onClick={(e) => {
                  if (isModifiedClick(e)) return;
                  e.preventDefault();
                  onNavigateView(feature.view);
                }}
                className={cardClass}
              >
                {body}
              </a>
            );
          }
          return <li key={feature.title}>{control}</li>;
        })}
      </ul>
    </div>
  </section>
);
