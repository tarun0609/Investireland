import React, { useMemo, useState } from 'react';
import { ETF_TAX_CALCULATOR, type CalculatorView } from '../config/calculators';
import { calculateEtfTax } from '../services/irishCalculators';
import { Assumptions, CalculatorGrid, CalculatorLayout, DataTable, LineChart, NumberField, ResultCard, eur } from './CalculatorUi';

interface Props {
  onNavigate: (view: CalculatorView | 'landing') => void;
}

export const EtfTaxCalculatorPage: React.FC<Props> = ({ onNavigate }) => {
  const [startingAmount, setStartingAmount] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(20);
  const [returnPct, setReturnPct] = useState(7);

  const result = useMemo(
    () => calculateEtfTax({ startingAmount, monthlyContribution: monthly, years, annualReturn: returnPct / 100 }),
    [startingAmount, monthly, years, returnPct]
  );

  const { etf, shares, noTax } = result;
  const yearOfMonth = (month: number) => Math.floor(month / 12) + 1;
  const deemedYears = new Set(etf.deemedDisposals.map((d) => yearOfMonth(d.month)));
  const highlight = new Set(etf.years.map((y, i) => (deemedYears.has(y.year) ? i : -1)).filter((i) => i >= 0));
  const firstDeemed = etf.deemedDisposals[0];
  const deemedTotal = etf.deemedDisposals.reduce((sum, d) => sum + d.tax, 0);

  return (
    <CalculatorLayout page={ETF_TAX_CALCULATOR} onNavigate={onNavigate}>
      <CalculatorGrid
        inputs={
          <>
            <NumberField label="Starting lump sum" prefix="€" value={startingAmount} onChange={setStartingAmount} max={10_000_000} step={500} />
            <NumberField label="Monthly investment" prefix="€" value={monthly} onChange={setMonthly} max={1_000_000} step={50} />
            <NumberField label="Years invested" suffix="years" value={years} onChange={(v) => setYears(Math.round(v))} min={1} max={60} />
            <NumberField
              label="Expected annual return"
              suffix="%"
              value={returnPct}
              onChange={setReturnPct}
              min={-20}
              max={30}
              step={0.5}
              help="After fund fees. Global equity has averaged roughly 6–8% a year over long periods, but it varies a lot."
            />
          </>
        }
        results={
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <ResultCard
                tone="highlight"
                label="ETF after exit tax"
                value={eur(etf.net)}
                detail={`Total ETF tax ${eur(etf.taxPaid + etf.taxOnSale)}`}
              />
              <ResultCard
                label="Shares after CGT"
                value={eur(shares.net)}
                detail={`Total CGT ${eur(shares.taxPaid + shares.taxOnSale)}`}
              />
              <ResultCard label="With no tax" value={eur(noTax.net)} detail={`You put in ${eur(noTax.contributed)}`} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard
                tone={etf.deemedDisposals.length ? 'negative' : 'default'}
                label="Deemed disposal tax paid before selling"
                value={eur(deemedTotal)}
                detail={
                  firstDeemed
                    ? `Each purchase is taxed every 8 years it is held, starting in year ${yearOfMonth(firstDeemed.month)} (${etf.deemedDisposals.length} monthly charges in total). This tax is credited against your tax when you sell.`
                    : 'No purchase is held for 8 years within this period, so no deemed disposal falls due.'
                }
              />
              <ResultCard
                tone={result.sharesAdvantage > 0 ? 'positive' : 'default'}
                label="Shares vs ETF difference"
                value={eur(Math.abs(result.sharesAdvantage))}
                detail={
                  result.sharesAdvantage > 0
                    ? 'More in your pocket with individual shares at the same return, because of the lower rate and the €1,270 exemption.'
                    : 'The ETF comes out ahead or level at these settings.'
                }
              />
            </div>

            <LineChart
              title="Value after tax if you sold at the end of each year"
              labels={etf.years.map((y) => `Yr ${y.year}`)}
              series={[
                { label: 'No tax', color: '#94a3b8', values: noTax.years.map((y) => y.netIfSold), dashed: true },
                { label: 'Shares (CGT)', color: '#0f766e', values: shares.years.map((y) => y.netIfSold) },
                { label: 'ETF (exit tax)', color: '#d97706', values: etf.years.map((y) => y.netIfSold) },
              ]}
            />

            <DataTable
              caption="Year-by-year ETF breakdown (highlighted rows include deemed disposal tax)"
              headers={['Year', 'Put in', 'Value before tax', 'Deemed disposal tax this year', 'Value if sold (ETF)', 'Value if sold (shares)']}
              highlightRows={highlight}
              rows={etf.years.map((y, i) => [
                y.year,
                eur(y.contributed),
                eur(y.gross),
                eur(y.taxPaidThisYear),
                eur(y.netIfSold),
                eur(shares.years[i]?.netIfSold ?? 0),
              ])}
            />

            <Assumptions
              items={[
                'Your lump sum is invested on day one and each monthly amount at the start of the month; growth compounds monthly.',
                'Each month’s ETF purchase is tracked separately: it is taxed at 38% on its gain 8 years after purchase (and every 8 years after), and that tax is credited when you sell. Deemed disposal is paid from the investment.',
                'Shares: CGT of 33% on the total gain if sold at the end, less one €1,270 annual exemption. Dividends are not modelled separately.',
                'If an ETF lot is worth less than its last deemed disposal value, no refund is modelled before you sell.',
              ]}
            />
          </>
        }
      />
    </CalculatorLayout>
  );
};
