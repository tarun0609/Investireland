import React, { useMemo, useState } from 'react';
import { SAVINGS_GOAL_CALCULATOR, type CalculatorView } from '../config/calculators';
import { calculateSavingsGoal, yearsToReachGoal } from '../services/irishCalculators';
import type { TaxTreatment } from '../services/investmentEngine';
import { Assumptions, CalculatorGrid, CalculatorLayout, DataTable, LineChart, NumberField, ResultCard, TreatmentPicker, eur } from './CalculatorUi';

interface Props {
  onNavigate: (view: CalculatorView | 'landing') => void;
}

export const SavingsGoalCalculatorPage: React.FC<Props> = ({ onNavigate }) => {
  const [goal, setGoal] = useState(40000);
  const [years, setYears] = useState(5);
  const [startingAmount, setStartingAmount] = useState(5000);
  const [treatment, setTreatment] = useState<TaxTreatment>('deposit');
  const [returnPct, setReturnPct] = useState(2.5);
  const [inflationPct, setInflationPct] = useState(2);
  const [adjustForInflation, setAdjustForInflation] = useState(true);
  const [currentMonthly, setCurrentMonthly] = useState(400);

  const common = { goal, startingAmount, annualReturn: returnPct / 100, treatment, inflation: inflationPct / 100, adjustForInflation };
  const r = useMemo(() => calculateSavingsGoal({ ...common, years }), [goal, years, startingAmount, treatment, returnPct, inflationPct, adjustForInflation]); // eslint-disable-line react-hooks/exhaustive-deps
  const yearsNeeded = useMemo(
    () => yearsToReachGoal({ ...common, monthlyContribution: currentMonthly }),
    [goal, startingAmount, treatment, returnPct, inflationPct, adjustForInflation, currentMonthly] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const sim = r.simulation;
  const taxTotal = sim.taxPaid + sim.taxOnSale;

  return (
    <CalculatorLayout page={SAVINGS_GOAL_CALCULATOR} onNavigate={onNavigate}>
      <CalculatorGrid
        inputs={
          <>
            <NumberField label="Savings goal (in today's money)" prefix="€" value={goal} onChange={setGoal} max={100_000_000} step={1000} />
            <NumberField label="Years to reach it" suffix="years" value={years} onChange={(v) => setYears(Math.round(v))} min={1} max={60} />
            <NumberField label="Already saved" prefix="€" value={startingAmount} onChange={setStartingAmount} max={100_000_000} step={500} />
            <TreatmentPicker
              label="Where will you keep it?"
              value={treatment}
              onChange={(t) => {
                setTreatment(t);
                setReturnPct(t === 'deposit' ? 2.5 : 6);
              }}
              options={['deposit', 'etf_fund', 'individual_shares', 'none']}
            />
            <NumberField
              label={treatment === 'deposit' ? 'Interest rate (AER)' : 'Expected annual return'}
              suffix="%"
              value={returnPct}
              onChange={setReturnPct}
              min={-20}
              max={30}
              step={0.1}
              help={treatment === 'deposit' ? 'Before DIRT. Irish demand and regular saver accounts typically pay 1–3%.' : 'After fees. Investments can fall in value.'}
            />
            <NumberField label="Inflation" suffix="%" value={inflationPct} onChange={setInflationPct} min={-2} max={15} step={0.5} />
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={adjustForInflation}
                onChange={(e) => setAdjustForInflation(e.target.checked)}
                className="h-4 w-4 accent-emerald-700"
              />
              Grow my goal with inflation
            </label>
          </>
        }
        results={
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <ResultCard
                tone="highlight"
                label="Save each month"
                value={r.alreadyOnTrack ? eur(0) : eur(r.requiredMonthly, 2)}
                detail={r.alreadyOnTrack ? 'What you already have should reach your goal on its own.' : `For ${years} year${years === 1 ? '' : 's'}`}
              />
              <ResultCard
                label="Target in future euros"
                value={eur(r.targetFuture)}
                detail={adjustForInflation ? `${eur(goal)} today, grown at ${inflationPct}% a year` : 'Not adjusted for inflation'}
              />
              <ResultCard
                tone="positive"
                label="Growth after tax"
                value={eur(r.growth)}
                detail={`You put in ${eur(r.totalContributed)}; tax ${eur(taxTotal)}`}
              />
            </div>

            <section aria-labelledby="time-to-goal" className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 id="time-to-goal" className="text-sm font-bold text-slate-900">
                How long at a fixed monthly amount?
              </h2>
              <div className="mt-3 grid items-end gap-3 sm:grid-cols-2">
                <NumberField label="If I save each month" prefix="€" value={currentMonthly} onChange={setCurrentMonthly} max={1_000_000} step={50} />
                <p className="text-sm text-slate-700">
                  {yearsNeeded === null ? (
                    <>You would not reach the goal within 60 years at this amount.</>
                  ) : yearsNeeded === 0 ? (
                    <>Your goal is already met.</>
                  ) : (
                    <>
                      You reach your goal in about <strong className="text-emerald-800">{yearsNeeded} year{yearsNeeded === 1 ? '' : 's'}</strong>.
                    </>
                  )}
                </p>
              </div>
            </section>

            <LineChart
              title="Your savings vs your target"
              labels={sim.years.map((y) => `Yr ${y.year}`)}
              series={[
                { label: 'Value after tax', color: '#047857', values: sim.years.map((y) => y.netIfSold) },
                { label: 'Money put in', color: '#64748b', values: sim.years.map((y) => y.contributed), dashed: true },
                { label: 'Target', color: '#d97706', values: sim.years.map(() => r.targetFuture), dashed: true },
              ]}
            />

            <DataTable
              caption="Year-by-year savings"
              headers={['Year', 'Put in', 'Value before tax', 'Tax paid this year', 'Value after tax']}
              rows={sim.years.map((y) => [y.year, eur(y.contributed), eur(y.gross), eur(y.taxPaidThisYear), eur(y.netIfSold)])}
            />

            <Assumptions
              items={[
                'Monthly saving is added at the start of each month and interest or growth compounds monthly.',
                'Deposit accounts: DIRT at 33% is taken from interest each month. ETFs: 38% exit tax with deemed disposal. Shares: 33% CGT on sale above €1,270.',
                '"Value after tax" is what you would have if you sold or withdrew everything at the end of that year.',
              ]}
            />
          </>
        }
      />
    </CalculatorLayout>
  );
};
