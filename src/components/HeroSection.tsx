import React from 'react';
import { ArrowRight, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { CALCULATORS_HUB } from '../config/calculators';
import { HOME_HERO } from '../config/site';
import { isModifiedClick } from '../utils/links';

interface HeroSectionProps {
  onOpenCalculators: () => void;
  onOpenDashboard: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenCalculators, onOpenDashboard }) => (
  <section aria-labelledby="hero-heading" className="relative overflow-hidden pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-32 bg-gradient-to-b from-emerald-50/60 via-white to-white border-b border-slate-200/60">
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />

    <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
      <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-emerald-900">
        <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
        Built for people investing in Ireland
      </p>

      <h1 id="hero-heading" className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.1]">
        {HOME_HERO.h1Lead}{' '}
        <span className="text-emerald-800">{HOME_HERO.h1Rest}</span>
      </h1>

      <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed">
        {HOME_HERO.subline}
      </p>

      <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
        <a
          href={CALCULATORS_HUB.path}
          onClick={(e) => {
            if (isModifiedClick(e)) return;
            e.preventDefault();
            onOpenCalculators();
          }}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all cursor-pointer group"
        >
          Try the calculators
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform motion-reduce:transition-none" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={onOpenDashboard}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 shadow-xs transition-all cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-600" aria-hidden="true" />
          Open my tracker
        </button>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
        Educational tools, not financial advice.
      </p>
    </div>
  </section>
);
