import React, { useMemo, useState } from 'react';
import {
  ABOUT_PAGE,
  BEST_INVESTMENT_OPTIONS_GUIDE,
  ETF_TAX_BEGINNERS_GUIDE,
  EXIT_TAX_VS_INVESTMENT_ACCOUNT_GUIDE,
  type CalculatorPage,
  type CalculatorView,
} from '../config/calculators';
import { CGT_RATE, DIRT_RATE, EXIT_TAX_RATE, pct as ratePct } from '../config/irishTax';
import { calculateBudgetProjections } from '../services/budgetCalculatorService';
import { simulateInvestment } from '../services/investmentEngine';
import { Assumptions, CalculatorGrid, CalculatorLayout, DataTable, NumberField, ResultCard, eur } from './CalculatorUi';
import { ExitTaxWidget } from './ExitTaxCalculatorPage';
import { InvestmentAccountWidget } from './InvestmentAccountCalculatorPage';

type GuideView = 'best-investment-options-ireland' | 'etf-tax-ireland-beginners' | 'exit-tax-vs-investment-account' | 'about';

interface Props {
  view: GuideView;
  onNavigate: (view: CalculatorView | 'landing') => void;
}

/** Same monthly amount in each option, after Irish tax if everything is withdrawn at the end. */
export const AfterTaxComparisonWidget: React.FC = () => {
  const [monthly, setMonthly] = useState(300);
  const [years, setYears] = useState(10);
  const [depositPct, setDepositPct] = useState(2.5);
  const [returnPct, setReturnPct] = useState(6);

  const rows = useMemo(() => {
    const base = { startingAmount: 0, monthlyContribution: monthly, years };
    const deposit = simulateInvestment({ ...base, annualReturn: depositPct / 100, treatment: 'deposit' });
    const etf = simulateInvestment({ ...base, annualReturn: returnPct / 100, treatment: 'etf_fund' });
    const shares = simulateInvestment({ ...base, annualReturn: returnPct / 100, treatment: 'individual_shares' });
    const ia = calculateBudgetProjections({
      startingAmount: 0,
      monthlyContribution: monthly,
      timeHorizonYears: years,
      annualReturnRate: returnPct / 100,
      adjustForInflation: false,
      assetClass: 'etf_fund',
    });
    return [
      { name: 'Investment Account (from July 2027)', net: ia.fy27FinalNetValue, note: 'Tax-free to €50,000, then 1% a year on the excess' },
      { name: 'Shares held directly', net: shares.net, note: `${ratePct(CGT_RATE)} CGT on sale above €1,270` },
      { name: 'ETF in a normal account', net: etf.net, note: `${ratePct(EXIT_TAX_RATE)} exit tax and 8-year deemed disposal` },
      { name: 'Deposit account', net: deposit.net, note: `${ratePct(DIRT_RATE)} DIRT on interest` },
    ].sort((a, b) => b.net - a.net);
  }, [monthly, years, depositPct, returnPct]);

  const contributed = monthly * 12 * years;
  const best = rows[0];

  return (
    <CalculatorGrid
      inputs={
        <>
          <NumberField label="Monthly amount" prefix="€" value={monthly} onChange={setMonthly} max={1_000_000} step={50} />
          <NumberField label="Years" suffix="years" value={years} onChange={(v) => setYears(Math.round(v))} min={1} max={60} />
          <NumberField label="Deposit interest rate" suffix="%" value={depositPct} onChange={setDepositPct} min={0} max={15} step={0.1} help="Before DIRT." />
          <NumberField
            label="Investment return (shares and ETFs)"
            suffix="%"
            value={returnPct}
            onChange={setReturnPct}
            min={-20}
            max={30}
            step={0.1}
            help="After fees. Investments can fall in value; deposits are much safer."
          />
        </>
      }
      results={
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <ResultCard tone="highlight" label="Most after tax with these inputs" value={eur(best.net)} detail={best.name} />
            <ResultCard label="You put in" value={eur(contributed)} detail={`${eur(monthly)} a month for ${years} year${years === 1 ? '' : 's'}`} />
          </div>
          <DataTable
            defaultOpen
            caption="Value after tax if you withdraw everything at the end"
            headers={['Option', 'After tax', 'Growth after tax', 'Tax rule']}
            rows={rows.map((row) => [row.name, eur(row.net), eur(row.net - contributed), row.note])}
          />
          <Assumptions
            items={[
              'Shares, ETFs and the Investment Account use the same return so only the tax rules differ. In reality, a single share is far riskier than a diversified ETF.',
              'The Investment Account is modelled as if open today; it is due to start on 1 July 2027 and its final rules depend on legislation.',
              'Pensions are not included because tax relief depends on your income. Use the pension calculator for that.',
            ]}
          />
        </>
      }
    />
  );
};

const PAGES: Record<GuideView, { page: CalculatorPage; widget: React.FC | null }> = {
  'best-investment-options-ireland': { page: BEST_INVESTMENT_OPTIONS_GUIDE, widget: AfterTaxComparisonWidget },
  'etf-tax-ireland-beginners': { page: ETF_TAX_BEGINNERS_GUIDE, widget: ExitTaxWidget },
  'exit-tax-vs-investment-account': { page: EXIT_TAX_VS_INVESTMENT_ACCOUNT_GUIDE, widget: InvestmentAccountWidget },
  about: { page: ABOUT_PAGE, widget: null },
};

export const GuidePage: React.FC<Props> = ({ view, onNavigate }) => {
  const { page, widget: Widget } = PAGES[view];
  return (
    <CalculatorLayout page={page} onNavigate={onNavigate}>
      {Widget && (
        <section aria-label="Calculator">
          <Widget />
        </section>
      )}
    </CalculatorLayout>
  );
};
