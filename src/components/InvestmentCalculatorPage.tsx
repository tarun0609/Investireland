import React from 'react';
import type { Currency } from '../types';
import { INVESTMENT_CALCULATOR, type CalculatorView } from '../config/calculators';
import { BudgetCalculatorSection } from './BudgetCalculatorSection';
import { Assumptions, CalculatorLayout } from './CalculatorUi';

interface Props {
  currentCurrency: Currency;
  onOpenWaitlist: (prefillData?: any) => void;
  onNavigate: (view: CalculatorView | 'landing') => void;
}

export const InvestmentCalculatorPage: React.FC<Props> = ({ currentCurrency, onOpenWaitlist, onNavigate }) => (
  <CalculatorLayout page={INVESTMENT_CALCULATOR} onNavigate={onNavigate}>
    <div className="-mx-4 overflow-hidden rounded-2xl border border-slate-200 sm:mx-0">
      <BudgetCalculatorSection currentCurrency={currentCurrency} onOpenWaitlist={onOpenWaitlist} />
    </div>
    <div className="mt-6">
      <Assumptions
        items={[
          'Monthly contributions with monthly compounding. Enter returns after fund fees.',
          'Current rules (FY26): ETF/fund gains taxed at 38% exit tax, with deemed disposal 8 years after each purchase; shares at 33% CGT above €1,270.',
          'Proposed Investment Account (FY27): up to €12,000 a year (lump sum and contributions combined); anything above that is invested under current rules. 0% tax up to €50,000 and a 1% yearly charge on the value above it. Not yet law – details may change.',
        ]}
      />
    </div>
  </CalculatorLayout>
);
