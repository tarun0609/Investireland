import React, { useMemo, useState } from 'react';
import { EXIT_TAX_CALCULATOR, type CalculatorView } from '../config/calculators';
import { DEEMED_DISPOSAL_YEARS, EXIT_TAX_RATE, EXIT_TAX_RATE_2026, pct as ratePct } from '../config/irishTax';
import { calculateExitTax } from '../services/irishCalculators';
import { Assumptions, CalculatorGrid, CalculatorLayout, NumberField, ResultCard, eur } from './CalculatorUi';

interface Props {
  onNavigate: (view: CalculatorView | 'landing') => void;
}

const THIS_YEAR = new Date().getFullYear();

/** Exit tax on selling an ETF or fund. Also embedded in the "ETF tax for beginners" guide. */
export const ExitTaxWidget: React.FC = () => {
  const [cost, setCost] = useState(10000);
  const [saleValue, setSaleValue] = useState(15000);
  const [saleYear, setSaleYear] = useState(Math.max(2027, THIS_YEAR));
  const [deemedPaid, setDeemedPaid] = useState(0);

  const r = useMemo(
    () => calculateExitTax({ purchaseCost: cost, saleValue, saleYear, deemedDisposalTaxPaid: deemedPaid }),
    [cost, saleValue, saleYear, deemedPaid]
  );

  return (
    <CalculatorGrid
      inputs={
        <>
          <NumberField label="What you paid (total cost)" prefix="€" value={cost} onChange={setCost} max={100_000_000} step={500} help="Include buying fees." />
          <NumberField label="Sale value" prefix="€" value={saleValue} onChange={setSaleValue} max={100_000_000} step={500} help="After selling fees." />
          <NumberField
            label="Year of sale"
            value={saleYear}
            onChange={(v) => setSaleYear(Math.round(v))}
            min={2020}
            max={2100}
            help={`${ratePct(EXIT_TAX_RATE_2026)} for 2026 sales, ${ratePct(EXIT_TAX_RATE)} from 2027.`}
          />
          <NumberField
            label="Deemed disposal tax already paid"
            prefix="€"
            value={deemedPaid}
            onChange={setDeemedPaid}
            max={100_000_000}
            step={100}
            help={`If you held these units for ${DEEMED_DISPOSAL_YEARS}+ years, enter the exit tax you paid at each deemed disposal.`}
          />
        </>
      }
      results={
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <ResultCard tone="highlight" label="Exit tax to pay" value={eur(r.taxDue, 2)} detail={`At ${ratePct(r.rate)} for a ${saleYear} sale`} />
            <ResultCard tone="positive" label="You keep" value={eur(r.netProceeds, 2)} detail={`Sale value ${eur(saleValue)} less tax due`} />
            <ResultCard
              tone={r.gain >= 0 ? 'default' : 'negative'}
              label={r.gain >= 0 ? 'Gain' : 'Loss'}
              value={eur(Math.abs(r.gain), 2)}
              detail={r.gain >= 0 ? 'Sale value less cost' : 'Fund losses cannot be offset against other gains'}
            />
          </div>

          <section aria-labelledby="exit-tax-workings" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <h2 id="exit-tax-workings" className="text-sm font-bold text-slate-900">
              How it is worked out
            </h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Gain: {eur(saleValue, 2)} − {eur(cost, 2)} = <strong>{eur(r.gain, 2)}</strong>
              </li>
              <li>
                Exit tax on the gain: {eur(Math.max(0, r.gain), 2)} × {ratePct(r.rate)} = <strong>{eur(r.taxOnGain, 2)}</strong>
              </li>
              <li>
                Less deemed disposal tax already paid: − {eur(r.credit, 2)} = <strong>{eur(r.taxDue, 2)} to pay</strong>
              </li>
              {r.refund > 0 && (
                <li>
                  You paid {eur(r.refund, 2)} more deemed disposal tax than the final gain needs. You can usually claim this back from Revenue.
                </li>
              )}
            </ol>
          </section>

          <Assumptions
            items={[
              'Applies to Irish and EU-domiciled ETFs and funds (UCITS) that are subject to exit tax, not to individual shares or US-listed ETFs.',
              'There is no €1,270 annual exemption and losses cannot be used against other gains.',
              'The gain is measured from what you originally paid; tax paid at earlier deemed disposals is credited against it.',
              'Irish funds usually deduct the tax for you; for most EU-domiciled ETFs you declare it yourself on Form 11.',
            ]}
          />
        </>
      }
    />
  );
};

export const ExitTaxCalculatorPage: React.FC<Props> = ({ onNavigate }) => (
  <CalculatorLayout page={EXIT_TAX_CALCULATOR} onNavigate={onNavigate}>
    <ExitTaxWidget />
  </CalculatorLayout>
);
