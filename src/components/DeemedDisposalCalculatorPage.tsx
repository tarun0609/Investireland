import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DEEMED_DISPOSAL_CALCULATOR, type CalculatorView } from '../config/calculators';
import { DEEMED_DISPOSAL_YEARS } from '../config/irishTax';
import { MAX_DEEMED_DISPOSAL_LOTS, deemedDisposalSchedule, type DeemedDisposalLot } from '../services/irishCalculators';
import { Assumptions, CalculatorGrid, CalculatorLayout, DataTable, NumberField, ResultCard, eur, pct } from './CalculatorUi';

interface Props {
  onNavigate: (view: CalculatorView | 'landing') => void;
}

const THIS_YEAR = new Date().getFullYear();

export const DeemedDisposalCalculatorPage: React.FC<Props> = ({ onNavigate }) => {
  const [lots, setLots] = useState<DeemedDisposalLot[]>([
    { purchaseYear: THIS_YEAR - 6, amount: 10000 },
    { purchaseYear: THIS_YEAR - 3, amount: 5000 },
    { purchaseYear: THIS_YEAR, amount: 5000 },
  ]);
  const [returnPct, setReturnPct] = useState(6);
  const [untilYear, setUntilYear] = useState(THIS_YEAR + 25);

  const r = useMemo(() => deemedDisposalSchedule({ lots, annualReturn: returnPct / 100, untilYear }), [lots, returnPct, untilYear]);
  const nextEvent = r.events.find((e) => e.year >= THIS_YEAR) ?? null;
  const nextYearTotal = nextEvent ? r.byYear.find((y) => y.year === nextEvent.year)?.tax ?? 0 : 0;

  const updateLot = (index: number, patch: Partial<DeemedDisposalLot>) =>
    setLots((prev) => prev.map((lot, i) => (i === index ? { ...lot, ...patch } : lot)));

  return (
    <CalculatorLayout page={DEEMED_DISPOSAL_CALCULATOR} onNavigate={onNavigate}>
      <CalculatorGrid
        inputs={
          <>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-700">Your ETF purchases</legend>
              <p className="mt-1 text-[11px] text-slate-500">Each purchase has its own {DEEMED_DISPOSAL_YEARS}-year clock. Add one row per year you bought.</p>
              <div className="mt-3 space-y-3">
                {lots.map((lot, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border border-slate-200 p-2">
                    <NumberField label={`Year bought #${i + 1}`} value={lot.purchaseYear} onChange={(v) => updateLot(i, { purchaseYear: Math.round(v) })} min={1990} max={2100} />
                    <NumberField label="Amount" prefix="€" value={lot.amount} onChange={(v) => updateLot(i, { amount: v })} max={100_000_000} step={500} />
                    <button
                      type="button"
                      onClick={() => setLots((prev) => prev.filter((_, j) => j !== i))}
                      disabled={lots.length === 1}
                      aria-label={`Remove purchase ${i + 1}`}
                      className="mb-1 rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setLots((prev) => [...prev, { purchaseYear: THIS_YEAR, amount: 5000 }])}
                disabled={lots.length >= MAX_DEEMED_DISPOSAL_LOTS}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add purchase
              </button>
            </fieldset>
            <NumberField label="Expected annual return" suffix="%" value={returnPct} onChange={setReturnPct} min={-20} max={30} step={0.1} help="After fund fees." />
            <NumberField label="Show events up to" value={untilYear} onChange={(v) => setUntilYear(Math.round(v))} min={THIS_YEAR} max={2100} />
          </>
        }
        results={
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <ResultCard
                tone="highlight"
                label="Next deemed disposal"
                value={nextEvent ? String(nextEvent.year) : 'None'}
                detail={nextEvent ? `Estimated tax that year: ${eur(nextYearTotal)}` : `No purchase reaches ${DEEMED_DISPOSAL_YEARS} years by ${untilYear}`}
              />
              <ResultCard label="Total deemed disposal tax" value={eur(r.totalTax)} detail={`Up to ${untilYear}, before any final sale`} />
              <ResultCard label="Tax events" value={String(r.events.length)} detail={`Across ${r.byYear.length} tax year${r.byYear.length === 1 ? '' : 's'}`} />
            </div>

            {r.events.length > 0 ? (
              <>
                <DataTable
                  defaultOpen
                  caption="Deemed disposal tax by year"
                  headers={['Year', 'Tax to pay']}
                  rows={r.byYear.map((y) => [y.year, eur(y.tax)])}
                />
                <DataTable
                  caption="Each deemed disposal"
                  headers={['Year', 'Purchase', 'Value then', 'Gain taxed', 'Rate', 'Tax']}
                  rows={r.events.map((e) => [e.year, `#${e.lot + 1} (${e.purchaseYear})`, eur(e.value), eur(e.gain), pct(e.rate, 0), eur(e.tax)])}
                />
              </>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                No deemed disposals fall within the years shown. Try a later "show events up to" year.
              </p>
            )}

            <Assumptions
              items={[
                `Every ${DEEMED_DISPOSAL_YEARS} years after each purchase, the units are treated as sold and bought back at market value. Exit tax for that year is charged on the gain since purchase or the last deemed disposal.`,
                'The rate used is the exit tax rate for the year of each event (38% in 2026, 35% from 2027).',
                'The tax is assumed to be paid from other money, so each holding keeps growing untouched. Growth is compounded yearly.',
                'Tax paid at a deemed disposal is credited when you finally sell. Selling before the 8-year date means no deemed disposal for that purchase.',
              ]}
            />
          </>
        }
      />
    </CalculatorLayout>
  );
};
