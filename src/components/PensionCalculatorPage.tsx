import React, { useMemo, useState } from 'react';
import { PENSION_CALCULATOR, type CalculatorView } from '../config/calculators';
import { calculatePension, PENSION_EARNINGS_CAP } from '../services/irishCalculators';
import { Assumptions, CalculatorGrid, CalculatorLayout, DataTable, LineChart, NumberField, ResultCard, eur, pct } from './CalculatorUi';

interface Props {
  onNavigate: (view: CalculatorView | 'landing') => void;
}

export const PensionCalculatorPage: React.FC<Props> = ({ onNavigate }) => {
  const [currentAge, setCurrentAge] = useState(32);
  const [retirementAge, setRetirementAge] = useState(66);
  const [salary, setSalary] = useState(60000);
  const [salaryGrowth, setSalaryGrowth] = useState(2);
  const [currentPot, setCurrentPot] = useState(20000);
  const [employeePct, setEmployeePct] = useState(8);
  const [employerPct, setEmployerPct] = useState(5);
  const [returnPct, setReturnPct] = useState(6);
  const [chargePct, setChargePct] = useState(0.75);
  const [inflationPct, setInflationPct] = useState(2);

  const r = useMemo(
    () =>
      calculatePension({
        currentAge,
        retirementAge,
        salary,
        salaryGrowth: salaryGrowth / 100,
        currentPot,
        employeeRate: employeePct / 100,
        employerRate: employerPct / 100,
        annualReturn: returnPct / 100,
        annualCharge: chargePct / 100,
        inflation: inflationPct / 100,
      }),
    [currentAge, retirementAge, salary, salaryGrowth, currentPot, employeePct, employerPct, returnPct, chargePct, inflationPct]
  );

  const firstYear = r.years[0];
  const reliefRate = firstYear && firstYear.employeeContribution > 0 ? firstYear.taxRelief / firstYear.employeeContribution : 0;

  return (
    <CalculatorLayout page={PENSION_CALCULATOR} onNavigate={onNavigate}>
      <CalculatorGrid
        inputs={
          <>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Your age" value={currentAge} onChange={(v) => setCurrentAge(Math.round(v))} min={18} max={75} />
              <NumberField label="Retire at" value={retirementAge} onChange={(v) => setRetirementAge(Math.round(v))} min={50} max={80} />
            </div>
            <NumberField label="Gross salary" prefix="€" value={salary} onChange={setSalary} max={2_000_000} step={1000} />
            <NumberField label="Salary growth per year" suffix="%" value={salaryGrowth} onChange={setSalaryGrowth} min={-5} max={15} step={0.5} />
            <NumberField label="Current pension pot" prefix="€" value={currentPot} onChange={setCurrentPot} max={10_000_000} step={1000} />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="You pay" suffix="%" value={employeePct} onChange={setEmployeePct} max={100} step={0.5} />
              <NumberField label="Employer pays" suffix="%" value={employerPct} onChange={setEmployerPct} max={100} step={0.5} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Return" suffix="%" value={returnPct} onChange={setReturnPct} min={-10} max={20} step={0.5} />
              <NumberField label="Fund charge" suffix="%" value={chargePct} onChange={setChargePct} max={5} step={0.05} />
            </div>
            <NumberField
              label="Inflation"
              suffix="%"
              value={inflationPct}
              onChange={setInflationPct}
              min={-2}
              max={15}
              step={0.5}
              help="Used to show your pot and income in today's money."
            />
          </>
        }
        results={
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <ResultCard
                tone="highlight"
                label={`Pension pot at ${r.retirementAge}`}
                value={eur(r.finalPot)}
                detail={`${eur(r.finalPotTodaysMoney)} in today's money`}
              />
              <ResultCard
                label="Tax-free lump sum (25%)"
                value={eur(r.lumpSum - r.lumpSumTax)}
                detail={r.lumpSumTax > 0 ? `Lump sum ${eur(r.lumpSum)} less ${eur(r.lumpSumTax)} tax` : `Within the €200,000 tax-free limit`}
              />
              <ResultCard
                label="Yearly income (4% drawdown)"
                value={eur(r.annualDrawdownIncome)}
                detail={`${eur(r.annualDrawdownIncomeTodaysMoney)} in today's money, before income tax`}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ResultCard label="You pay in" value={eur(r.totalEmployee)} detail={`Over ${r.yearsToRetirement} years`} />
              <ResultCard
                tone="positive"
                label="Income tax relief"
                value={eur(r.totalTaxRelief)}
                detail={`Real cost to you ${eur(r.netCostToYou)}. Year-one relief ${pct(reliefRate, 0)} of your contribution.`}
              />
              <ResultCard tone="positive" label="Employer pays in" value={eur(r.totalEmployer)} detail="Not taxed as a benefit-in-kind" />
            </div>

            {r.exceedsReliefLimit && (
              <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                At age {currentAge} you get tax relief on up to {pct(r.reliefLimitPct, 0)} of earnings (capped at {eur(PENSION_EARNINGS_CAP)}). Part of your
                contribution is above that limit, so it gets no relief this year. Unused relief can sometimes be carried forward – ask Revenue.
              </p>
            )}
            {r.exceedsStandardFundThreshold && (
              <p role="note" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                Your projected pot is above the Standard Fund Threshold of {eur(r.standardFundThreshold)} (projected for your retirement year, before inflation).
                The excess may be taxed at 40% on top of income tax when you draw it. Take professional advice.
              </p>
            )}

            <LineChart
              title="Pension pot by age"
              labels={r.years.map((y) => y.age)}
              series={[{ label: 'Pot value', color: '#047857', values: r.years.map((y) => y.potValue) }]}
            />

            <DataTable
              caption="Year-by-year pension breakdown"
              headers={['Age', 'Salary', 'You pay', 'Employer pays', 'Tax relief', 'Pot at year end']}
              rows={r.years.map((y) => [y.age, eur(y.salary), eur(y.employeeContribution), eur(y.employerContribution), eur(y.taxRelief), eur(y.potValue)])}
            />

            <Assumptions
              items={[
                'Single person PAYE: 20% up to €44,000 and 40% above. Relief is the income tax saved by taking your contribution off the top of your salary. USC and PRSI are not relieved.',
                'Age-related relief limits: 15% under 30, 20% at 30–39, 25% at 40–49, 30% at 50–54, 35% at 55–59 and 40% from 60, on earnings up to €115,000.',
                'Contributions are paid monthly and the fund grows monthly after the annual charge. Growth inside a pension is not taxed.',
                'At retirement 25% is taken as a lump sum (first €200,000 tax-free, next €300,000 at 20%, the rest at 40%). Income is 4% of the rest each year, before income tax.',
                'The State Pension is not included.',
              ]}
            />
          </>
        }
      />
    </CalculatorLayout>
  );
};
