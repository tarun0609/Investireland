import React, { useMemo, useState } from 'react';
import { MORTGAGE_VS_INVESTING_CALCULATOR, type CalculatorView } from '../config/calculators';
import { compareMortgageVsInvesting } from '../services/irishCalculators';
import type { TaxTreatment } from '../services/investmentEngine';
import { Assumptions, CalculatorGrid, CalculatorLayout, DataTable, LineChart, NumberField, ResultCard, TreatmentPicker, eur, pct } from './CalculatorUi';

interface Props {
  onNavigate: (view: CalculatorView | 'landing') => void;
}

const yearsAndMonths = (months: number) => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} year${y === 1 ? '' : 's'}` : '', m ? `${m} month${m === 1 ? '' : 's'}` : ''].filter(Boolean).join(' ') || '0 months';
};

export const MortgageVsInvestingCalculatorPage: React.FC<Props> = ({ onNavigate }) => {
  const [balance, setBalance] = useState(300000);
  const [ratePct, setRatePct] = useState(3.9);
  const [remainingYears, setRemainingYears] = useState(25);
  const [extraMonthly, setExtraMonthly] = useState(300);
  const [returnPct, setReturnPct] = useState(6);
  const [treatment, setTreatment] = useState<TaxTreatment>('etf_fund');

  const r = useMemo(
    () =>
      compareMortgageVsInvesting({
        balance,
        mortgageRate: ratePct / 100,
        remainingYears,
        extraMonthly,
        investReturn: returnPct / 100,
        treatment,
      }),
    [balance, ratePct, remainingYears, extraMonthly, returnPct, treatment]
  );

  const investWins = r.investAdvantage > 0;

  return (
    <CalculatorLayout page={MORTGAGE_VS_INVESTING_CALCULATOR} onNavigate={onNavigate}>
      <CalculatorGrid
        inputs={
          <>
            <NumberField label="Mortgage balance" prefix="€" value={balance} onChange={setBalance} max={10_000_000} step={5000} />
            <NumberField label="Mortgage interest rate" suffix="%" value={ratePct} onChange={setRatePct} max={20} step={0.05} />
            <NumberField label="Years left" suffix="years" value={remainingYears} onChange={(v) => setRemainingYears(Math.round(v))} min={1} max={40} />
            <NumberField label="Extra money each month" prefix="€" value={extraMonthly} onChange={setExtraMonthly} max={100_000} step={50} />
            <TreatmentPicker label="If invested, how is it taxed?" value={treatment} onChange={setTreatment} options={['etf_fund', 'individual_shares', 'deposit', 'none']} />
            <NumberField
              label="Expected investment return"
              suffix="%"
              value={returnPct}
              onChange={setReturnPct}
              min={-20}
              max={30}
              step={0.5}
              help="Before tax, after fees."
            />
          </>
        }
        results={
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard
                tone={investWins ? 'default' : 'highlight'}
                label="Overpay the mortgage"
                value={eur(r.overpayWealth)}
                detail={`Saves ${eur(r.interestSaved)} interest and clears it ${yearsAndMonths(r.monthsSaved)} early. Then the full repayment is invested.`}
              />
              <ResultCard
                tone={investWins ? 'highlight' : 'default'}
                label="Invest the extra instead"
                value={eur(r.investWealth)}
                detail={`Mortgage cleared on the normal schedule. Investments after ${treatment === 'none' ? 'no tax' : 'tax if sold'}.`}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ResultCard
                tone={investWins ? 'positive' : 'negative'}
                label={investWins ? 'Investing ahead by' : 'Overpaying ahead by'}
                value={eur(Math.abs(r.investAdvantage))}
                detail={`After ${remainingYears} years, at a ${returnPct}% return`}
              />
              <ResultCard
                label="Break-even return"
                value={r.breakEvenReturn === null ? 'Over 30%' : pct(r.breakEvenReturn, 2)}
                detail="The yearly return (before tax) investments need to match overpaying."
              />
              <ResultCard label="Normal monthly repayment" value={eur(r.monthlyPayment, 2)} detail={`Total interest ${eur(r.baselineInterest)} without overpaying`} />
            </div>

            <LineChart
              title="Wealth after tax: investments minus mortgage owed"
              labels={r.years.map((y) => `Yr ${y.year}`)}
              series={[
                { label: 'Overpay', color: '#0f766e', values: r.years.map((y) => y.overpayInvestments - y.overpayBalance) },
                { label: 'Invest', color: '#d97706', values: r.years.map((y) => y.investInvestments - y.investBalance) },
              ]}
            />

            <DataTable
              caption="Year-by-year comparison"
              headers={['Year', 'Overpay: owed', 'Overpay: investments', 'Invest: owed', 'Invest: investments']}
              rows={r.years.map((y) => [y.year, eur(y.overpayBalance), eur(y.overpayInvestments), eur(y.investBalance), eur(y.investInvestments)])}
            />

            <Assumptions
              items={[
                'Repayment mortgage with a fixed interest rate for the whole term and monthly repayments.',
                'Both options spend the same money each month for the full original term, so the comparison is fair. Once the overpaid mortgage is cleared, the full repayment plus the extra is invested.',
                'Investment values are after the tax you would pay if you sold at that point. Overpaying gives a guaranteed, tax-free saving; investment returns are not guaranteed.',
                'Early repayment fees on fixed-rate mortgages are not included.',
              ]}
            />
          </>
        }
      />
    </CalculatorLayout>
  );
};
