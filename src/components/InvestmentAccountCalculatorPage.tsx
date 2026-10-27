import React, { useMemo, useState } from 'react';
import { INVESTMENT_ACCOUNT_CALCULATOR, type CalculatorView } from '../config/calculators';
import { INVESTMENT_ACCOUNT, pct as ratePct } from '../config/irishTax';
import { calculateBudgetProjections } from '../services/budgetCalculatorService';
import { Assumptions, CalculatorGrid, CalculatorLayout, DataTable, LineChart, NumberField, ResultCard, eur } from './CalculatorUi';

interface Props {
  onNavigate: (view: CalculatorView | 'landing') => void;
}

/** Investment Account vs a normal ETF account. Also embedded in the "exit tax vs Investment Account" guide. */
export const InvestmentAccountWidget: React.FC = () => {
  const [startingAmount, setStartingAmount] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(20);
  const [returnPct, setReturnPct] = useState(6);

  const r = useMemo(
    () =>
      calculateBudgetProjections({
        startingAmount,
        monthlyContribution: monthly,
        timeHorizonYears: years,
        annualReturnRate: returnPct / 100,
        adjustForInflation: false,
        assetClass: 'etf_fund',
      }),
    [startingAmount, monthly, years, returnPct]
  );

  const limit = INVESTMENT_ACCOUNT.annualContributionLimit;
  const firstYearIn = startingAmount + monthly * 12;
  const overflowFirstYear = Math.max(0, firstYearIn - limit);
  const overflowLaterYears = Math.max(0, monthly * 12 - limit);
  const totalCharges = r.projections.reduce((sum, p) => sum + p.fy27AnnualCharge, 0);
  const thresholdYear = r.projections.find((p) => p.thresholdProgressPct >= 100)?.year ?? null;
  const advantage = r.fy27FinalNetValue - r.fy26FinalNetValue;

  return (
    <CalculatorGrid
      inputs={
        <>
          <NumberField label="Lump sum to start" prefix="€" value={startingAmount} onChange={setStartingAmount} max={10_000_000} step={1000} />
          <NumberField
            label="Monthly investment"
            prefix="€"
            value={monthly}
            onChange={setMonthly}
            max={1_000_000}
            step={50}
            help={`The account limit is €${limit.toLocaleString('en-IE')} a year (€${(limit / 12).toLocaleString('en-IE')} a month).`}
          />
          <NumberField label="Years" suffix="years" value={years} onChange={(v) => setYears(Math.round(v))} min={1} max={60} />
          <NumberField label="Expected annual return" suffix="%" value={returnPct} onChange={setReturnPct} min={-20} max={30} step={0.1} help="After fund fees. Investments can fall in value." />
        </>
      }
      results={
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <ResultCard tone="highlight" label="Investment Account, after tax" value={eur(r.fy27FinalNetValue)} detail={`You put in ${eur(r.totalContributions)}`} />
            <ResultCard label="Normal ETF account, after exit tax" value={eur(r.fy26FinalNetValue)} detail="Exit tax and 8-year deemed disposal" />
            <ResultCard
              tone={advantage >= 0 ? 'positive' : 'negative'}
              label={advantage >= 0 ? 'Investment Account better by' : 'ETF account better by'}
              value={eur(Math.abs(advantage))}
              detail={`After ${years} year${years === 1 ? '' : 's'}`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ResultCard
              label={`${ratePct(INVESTMENT_ACCOUNT.annualTaxAboveThreshold)} charges paid`}
              value={eur(totalCharges)}
              detail={`On value above €${INVESTMENT_ACCOUNT.taxFreeThreshold.toLocaleString('en-IE')}`}
            />
            <ResultCard
              label="Passes the €50,000 threshold"
              value={thresholdYear === null ? 'Not reached' : `Year ${thresholdYear}`}
              detail={thresholdYear === null ? 'All growth stays tax-free' : 'From then on the 1% charge applies to the excess'}
            />
            <ResultCard
              tone={overflowFirstYear > 0 || overflowLaterYears > 0 ? 'negative' : 'default'}
              label="Over the yearly limit"
              value={eur(overflowFirstYear)}
              detail={
                overflowFirstYear > 0 || overflowLaterYears > 0
                  ? `In year 1${overflowLaterYears > 0 ? `, then ${eur(overflowLaterYears)} a year` : ''}. This goes into a normal ETF account and is taxed there.`
                  : 'Everything fits in the account'
              }
            />
          </div>

          <LineChart
            title="Value after tax: Investment Account vs normal ETF account"
            labels={r.projections.map((p) => `Yr ${p.year}`)}
            series={[
              { label: 'Investment Account', color: '#047857', values: r.projections.map((p) => p.fy27NetValue) },
              { label: 'Normal ETF account', color: '#d97706', values: r.projections.map((p) => p.fy26NetValue) },
              { label: 'Money put in', color: '#64748b', values: r.projections.map((p) => p.contributionsCumulative), dashed: true },
            ]}
          />

          <DataTable
            caption="Year-by-year comparison"
            headers={['Year', 'Put in', 'Investment Account', '1% charge that year', 'Normal ETF account', 'Deemed disposal tax so far']}
            rows={r.projections.map((p) => [
              p.year,
              eur(p.contributionsCumulative),
              eur(p.fy27NetValue),
              eur(p.fy27AnnualCharge),
              eur(p.fy26NetValue),
              eur(p.fy26TaxesPaid),
            ])}
          />

          <Assumptions
            items={[
              `Investment Account (from ${INVESTMENT_ACCOUNT.launchDate.slice(0, 4)}): up to €${limit.toLocaleString('en-IE')} goes in each year; no exit tax, CGT or deemed disposal inside; a ${ratePct(INVESTMENT_ACCOUNT.annualTaxAboveThreshold)} charge each year end on value above €${INVESTMENT_ACCOUNT.taxFreeThreshold.toLocaleString('en-IE')}.`,
              'Money above the yearly limit is invested in a normal ETF account with exit tax and deemed disposal.',
              'Normal ETF account: each purchase is taxed 8 years later (deemed disposal) and again on sale, at the exit tax rate from 2027, with credit for tax already paid. Deemed disposal tax is paid from the investment.',
              'Both accounts start today for comparison. The real account opens in July 2027 and its final rules depend on legislation.',
            ]}
          />
        </>
      }
    />
  );
};

export const InvestmentAccountCalculatorPage: React.FC<Props> = ({ onNavigate }) => (
  <CalculatorLayout page={INVESTMENT_ACCOUNT_CALCULATOR} onNavigate={onNavigate}>
    <InvestmentAccountWidget />
  </CalculatorLayout>
);
