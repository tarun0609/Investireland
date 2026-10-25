import React from 'react';
import { Calculator, ChevronRight, Home, PiggyBank, Receipt, Target, TrendingUp } from 'lucide-react';
import { CALCULATORS_HUB, CALCULATOR_TOOLS, type CalculatorView } from '../config/calculators';
import { CalculatorLayout, CalculatorLink } from './CalculatorUi';

interface Props {
  onNavigate: (view: CalculatorView | 'landing') => void;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'investment-calculator': TrendingUp,
  'etf-tax-calculator': Receipt,
  'pension-calculator': PiggyBank,
  'savings-goal-calculator': Target,
  'mortgage-vs-investing-calculator': Home,
};

export const CalculatorsHubPage: React.FC<Props> = ({ onNavigate }) => (
  <CalculatorLayout page={CALCULATORS_HUB} onNavigate={onNavigate}>
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CALCULATOR_TOOLS.map((tool) => {
        const Icon = ICONS[tool.view] ?? Calculator;
        return (
          <li key={tool.view}>
            <CalculatorLink
              view={tool.view}
              path={tool.path}
              onNavigate={onNavigate}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-emerald-600 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-lg font-extrabold text-slate-900">{tool.h1}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{tool.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 group-hover:text-emerald-900">
                Open calculator
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </CalculatorLink>
          </li>
        );
      })}
    </ul>
  </CalculatorLayout>
);
