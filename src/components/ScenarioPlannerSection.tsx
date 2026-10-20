import React, { useState } from 'react';
import { Currency } from '../types';
import { formatCurrency, convertFromEUR } from '../services/fiscalDataService';
import { describeFxRates } from '../services/fxRateService';
import { 
  TrendingUp, 
  HelpCircle, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface ScenarioPlannerSectionProps {
  currentCurrency: Currency;
  onOpenWaitlist: () => void;
}

export const ScenarioPlannerSection: React.FC<ScenarioPlannerSectionProps> = ({
  currentCurrency,
  onOpenWaitlist
}) => {
  // Raw input text is kept as strings so fields can be cleared and retyped; amounts are in EUR.
  const [initialAmountInput, setInitialAmountInput] = useState('10000');
  const [monthlyAmountInput, setMonthlyAmountInput] = useState('1000');
  const [years, setYears] = useState(15);
  const [selectedReturn, setSelectedReturn] = useState<0.05 | 0.07 | 0.09>(0.07);

  const MAX_AMOUNT_EUR = 10_000_000;
  const parseAmount = (raw: string) => {
    const value = parseFloat(raw);
    return Number.isFinite(value) ? Math.min(MAX_AMOUNT_EUR, Math.max(0, value)) : 0;
  };
  const initialAmount = parseAmount(initialAmountInput);
  const monthlyAmount = parseAmount(monthlyAmountInput);
  const exceedsAllowance = monthlyAmount * 12 > 12000 || initialAmount > 12000;

  // Compute future values for 5%, 7%, 9%
  const calculateCompound = (rate: number) => {
    let balance = initialAmount;
    for (let yr = 1; yr <= years; yr++) {
      balance = (balance + (monthlyAmount * 12)) * (1 + rate);
    }
    return Math.round(balance);
  };

  const totalContributions = initialAmount + (monthlyAmount * 12 * years);
  const valAt5 = calculateCompound(0.05);
  const valAt7 = calculateCompound(0.07);
  const valAt9 = calculateCompound(0.09);

  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
            Long-Term Compounding Explorer
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Explore “What if?”
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            See the compounding potential of long-term disciplined contributions into Ireland's upcoming Investment Account.
          </p>
        </div>

        <div className="mt-12 max-w-4xl mx-auto bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          
          {/* Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-slate-200">
            <div>
              <label htmlFor="scenario-initial" className="text-xs font-bold text-slate-700 block mb-1">
                Starting Investment (€)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="scenario-initial"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={MAX_AMOUNT_EUR}
                  step={100}
                  value={initialAmountInput}
                  onChange={(e) => setInitialAmountInput(e.target.value)}
                  onBlur={() => setInitialAmountInput(String(initialAmount))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="scenario-monthly" className="text-xs font-bold text-slate-700 block mb-1">
                Monthly Contribution (€)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="scenario-monthly"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={MAX_AMOUNT_EUR}
                  step={50}
                  value={monthlyAmountInput}
                  onChange={(e) => setMonthlyAmountInput(e.target.value)}
                  onBlur={() => setMonthlyAmountInput(String(monthlyAmount))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="scenario-years" className="text-xs font-bold text-slate-700 block mb-1">
                Horizon: {years} Years
              </label>
              <input
                id="scenario-years"
                type="range"
                min="5"
                max="25"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          {currentCurrency !== 'EUR' && (
            <p className="mt-3 text-[11px] text-slate-500">
              Amounts are entered in euro; results are shown in {currentCurrency} using {describeFxRates()}.
            </p>
          )}
          {exceedsAllowance && (
            <p className="mt-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Note: the Investment Account allowance is €12,000 per year, so amounts above that would need to sit in a normal taxable account. These figures are gross growth only, before any tax or charges.
            </p>
          )}

          {/* Three Return Scenarios (5%, 7%, 9%) */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <button
              type="button"
              aria-pressed={selectedReturn === 0.05}
              onClick={() => setSelectedReturn(0.05)}
              className={`text-left w-full p-5 rounded-xl border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                selectedReturn === 0.05 
                  ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500' 
                  : 'bg-white/60 border-slate-200 hover:bg-white'
              }`}
            >
              <div className="text-xs font-bold text-slate-500 uppercase">Conservative Scenario</div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                5% Return
              </div>
              <div className="text-xl font-bold text-emerald-800 font-mono mt-3">
                {formatCurrency(convertFromEUR(valAt5, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Contributions: {formatCurrency(convertFromEUR(totalContributions, currentCurrency), currentCurrency)}
              </div>
            </button>

            <button
              type="button"
              aria-pressed={selectedReturn === 0.07}
              onClick={() => setSelectedReturn(0.07)}
              className={`text-left w-full p-5 rounded-xl border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                selectedReturn === 0.07 
                  ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500' 
                  : 'bg-white/60 border-slate-200 hover:bg-white'
              }`}
            >
              <div className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Balanced Baseline</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                7% Return
              </div>
              <div className="text-xl font-bold text-emerald-800 font-mono mt-3">
                {formatCurrency(convertFromEUR(valAt7, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Contributions: {formatCurrency(convertFromEUR(totalContributions, currentCurrency), currentCurrency)}
              </div>
            </button>

            <button
              type="button"
              aria-pressed={selectedReturn === 0.09}
              onClick={() => setSelectedReturn(0.09)}
              className={`text-left w-full p-5 rounded-xl border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                selectedReturn === 0.09 
                  ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500' 
                  : 'bg-white/60 border-slate-200 hover:bg-white'
              }`}
            >
              <div className="text-xs font-bold text-slate-500 uppercase">Growth Scenario</div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                9% Return
              </div>
              <div className="text-xl font-bold text-emerald-800 font-mono mt-3">
                {formatCurrency(convertFromEUR(valAt9, currentCurrency), currentCurrency)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Contributions: {formatCurrency(convertFromEUR(totalContributions, currentCurrency), currentCurrency)}
              </div>
            </button>

          </div>

          {/* Important Regulatory Disclaimer (Spec Section 14) */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Important Disclaimer:</strong> These are hypothetical illustrations only. They are not forecasts or guarantees of investment performance. The value of investments can fall as well as rise.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export const EducationHubSection: React.FC<{ onOpenWaitlist: () => void }> = ({ onOpenWaitlist }) => {
  const articles = [
    {
      title: "What is Ireland’s New Investment Account?",
      category: 'Investment Account',
      summary: 'Detailed explanation of the €12,000 annual contribution limit, the €50,000 tax-free threshold, eligible assets, and what is still awaiting legislative enactment.',
      source: 'Department of Finance Budget 2027 Whitepaper',
      sourceDate: 'October 2026',
      reviewer: 'Irish Financial Practice Group'
    },
    {
      title: "Understanding 38% Exit Tax & 8-Year Deemed Disposal",
      category: 'Taxation Basics',
      summary: 'How Irish collective investments are taxed under Section 739D of TCA 1997, why deemed disposal penalises long-term compounding, and what changes under the new scheme.',
      source: 'Revenue Commissioners Tax & Duty Manual 27-01a',
      sourceDate: 'October 2026',
      reviewer: 'Taxation Specialist Review'
    },
    {
      title: "Cross-Border Wealth: Ireland & India Investments",
      category: 'International',
      summary: 'Practical guidance for Indian professionals in Dublin, Cork, and Galway holding Indian mutual fund SIPs, direct equities, and NRE/FCNR fixed deposits under DTAA Article 13.',
      source: 'Revenue Commissioners Part 35 DTAA Guidance',
      sourceDate: 'October 2026',
      reviewer: 'Cross-Border Wealth Advisor'
    },
    {
      title: "What is an ETF vs a Mutual Fund vs a Share?",
      category: 'Investing Basics',
      summary: 'A jargon-free explanation of UCITS exchange-traded funds, mutual funds, diversification, volatility, and currency exposure for first-time investors.',
      source: 'CCPC (Competition & Consumer Protection Commission)',
      sourceDate: 'September 2026',
      reviewer: 'Financial Literacy Review'
    }
  ];

  return (
    <section id="learn" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
            Learning Centre
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Financial information without the jargon.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Every article is dated and points to the relevant official government source. Educational summaries only, not reviewed by a regulated adviser.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((art, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {art.category}
                  </span>
                  <span>Updated: {art.sourceDate}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-2 mb-2">
                  {art.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {art.summary}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>Source: <strong className="text-slate-700">{art.source}</strong></span>
                <span className="text-emerald-700 font-semibold">{art.reviewer}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
