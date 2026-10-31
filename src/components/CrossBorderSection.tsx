import React from 'react';
import { Currency } from '../types';
import { formatCurrency, convertFromEUR, convertToEUR, FALLBACK_FISCAL_DATA } from '../services/fiscalDataService';
import { describeFxRates } from '../services/fxRateService';
import { 
  Globe2, 
  ArrowRight, 
  ShieldCheck, 
  Coins, 
  HelpCircle, 
  Building2, 
  ExternalLink,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface CrossBorderSectionProps {
  currentCurrency: Currency;
  onOpenWaitlist: () => void;
  onOpenDashboard: () => void;
}

export const CrossBorderSection: React.FC<CrossBorderSectionProps> = ({
  currentCurrency,
  onOpenWaitlist,
  onOpenDashboard
}) => {
  const fx = FALLBACK_FISCAL_DATA.macroIndicators.fxRates;

  // Example portfolio (native amounts); EUR/converted figures use the current ECB reference rates
  const IE = { investmentAccount: 30000, pension: 60000, cash: 20000 };
  const IN = { mutualFundsINR: 2500000, sharesINR: 1000000, fcnrEUR: 10000 };
  const US = { rsuUSD: 18500, equitiesUSD: 6500, cashUSD: 2000 };

  const irelandTotalEUR = IE.investmentAccount + IE.pension + IE.cash;
  const mutualFundsEUR = convertToEUR(IN.mutualFundsINR, 'INR', fx);
  const sharesINREUR = convertToEUR(IN.sharesINR, 'INR', fx);
  const indiaTotalEUR = mutualFundsEUR + sharesINREUR + IN.fcnrEUR;
  const rsuEUR = convertToEUR(US.rsuUSD, 'USD', fx);
  const usEquitiesEUR = convertToEUR(US.equitiesUSD, 'USD', fx);
  const usCashEUR = convertToEUR(US.cashUSD, 'USD', fx);
  const usTotalUSD = US.rsuUSD + US.equitiesUSD + US.cashUSD;
  const usTotalEUR = rsuEUR + usEquitiesEUR + usCashEUR;

  const fmtIn = (amountEUR: number, currency: typeof currentCurrency) => formatCurrency(convertFromEUR(amountEUR, currency, fx), currency);
  // Secondary figure in the selected display currency, or EUR when that matches the native currency
  const secondary = (amountEUR: number, nativeCurrency: typeof currentCurrency) =>
    `~${fmtIn(amountEUR, currentCurrency === nativeCurrency ? 'EUR' : currentCurrency)}`;

  return (
    <section id="cross-border" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-800 text-xs font-bold uppercase tracking-wider mb-3 border border-orange-200">
            <Globe2 className="w-3.5 h-3.5" />
            <span>Cross-Border Wealth Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Your financial life doesn’t always fit inside one country.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Irish savings. Irish pension. Indian mutual funds in rupees. US employer stock. Different currencies. One crystal-clear financial picture.
          </p>
        </div>

        {/* ECB reference rates (live, with a bundled offline copy) */}
        <div className="mt-8 max-w-2xl mx-auto bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-around gap-x-4 gap-y-2 text-xs font-medium text-slate-700">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${fx.source === 'ECB' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            {describeFxRates(fx)}:
          </span>
          <span className="font-mono">
            €1 EUR = <strong className="text-slate-900">₹{fx.EUR_TO_INR.toFixed(2)} INR</strong>
          </span>
          <span className="font-mono">
            €1 EUR = <strong className="text-slate-900">${fx.EUR_TO_USD.toFixed(3)} USD</strong>
          </span>
          <span className="font-mono">
            €1 EUR = <strong className="text-slate-900">£{fx.EUR_TO_GBP.toFixed(3)} GBP</strong>
          </span>
        </div>

        <p className="mt-10 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Illustrative example portfolio &middot; not your data
        </p>

        {/* 3 Country Visual Showcase Cards (Spec Section 12) */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* IRELAND CARD */}
          <div className="bg-slate-50/80 rounded-2xl p-6 border-2 border-emerald-500/30 hover:border-emerald-500 transition-all shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🇮🇪</span>
                <span className="font-extrabold text-slate-900 text-base">IRELAND</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
                EUR (€)
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">New Investment Account</div>
                <div className="text-lg font-bold text-slate-900 font-mono">{fmtIn(IE.investmentAccount, 'EUR')}</div>
                <div className="text-[10px] text-emerald-700 font-semibold">Within the €50,000 tax-free threshold</div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Occupational Pension / PRSA</div>
                <div className="text-lg font-bold text-slate-900 font-mono">{fmtIn(IE.pension, 'EUR')}</div>
                <div className="text-[10px] text-slate-500">Tax relief at your marginal rate (up to 40%)</div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Liquid Cash Savings</div>
                <div className="text-lg font-bold text-slate-900 font-mono">{fmtIn(IE.cash, 'EUR')}</div>
                <div className="text-[10px] text-slate-500">Emergency buffer in Irish bank / Bunq</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-600 font-medium flex items-center justify-between">
              <span>Irish Subtotal:</span>
              <span className="font-mono font-bold text-slate-900 text-right">
                {fmtIn(irelandTotalEUR, 'EUR')}{currentCurrency !== 'EUR' && ` (${secondary(irelandTotalEUR, 'EUR')})`}
              </span>
            </div>
          </div>

          {/* INDIA CARD */}
          <div className="bg-slate-50/80 rounded-2xl p-6 border-2 border-orange-500/30 hover:border-orange-500 transition-all shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🇮🇳</span>
                <span className="font-extrabold text-slate-900 text-base">INDIA</span>
              </div>
              <span className="text-[11px] font-bold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full font-mono">
                INR (₹) / EUR
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Equity Mutual Funds (SIP)</div>
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(IN.mutualFundsINR, 'INR')}</div>
                  <div className="text-xs font-mono text-slate-500">{secondary(mutualFundsEUR, 'INR')}</div>
                </div>
                <div className="text-[10px] text-orange-700 font-semibold">Tracked under DTAA Article 13</div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">NSE / BSE Direct Shares</div>
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(IN.sharesINR, 'INR')}</div>
                  <div className="text-xs font-mono text-slate-500">{secondary(sharesINREUR, 'INR')}</div>
                </div>
                <div className="text-[10px] text-slate-500">Indian long-term capital gains credit</div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">FCNR / NRE Fixed Deposit</div>
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-bold text-slate-900 font-mono">{fmtIn(IN.fcnrEUR, 'EUR')}</div>
                  <div className="text-xs font-mono text-slate-500">~{fmtIn(IN.fcnrEUR, 'INR')}</div>
                </div>
                <div className="text-[10px] text-slate-500">Tax-free interest in India</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-600 font-medium flex items-center justify-between">
              <span>India Subtotal:</span>
              <span className="font-mono font-bold text-slate-900 text-right">
                {secondary(indiaTotalEUR, 'INR')} ({fmtIn(indiaTotalEUR, 'INR')})
              </span>
            </div>
          </div>

          {/* US / GLOBAL CARD */}
          <div className="bg-slate-50/80 rounded-2xl p-6 border-2 border-blue-500/30 hover:border-blue-500 transition-all shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🇺🇸</span>
                <span className="font-extrabold text-slate-900 text-base">UNITED STATES</span>
              </div>
              <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full font-mono">
                USD ($) / EUR
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Tech Employer RSUs (Vested)</div>
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(US.rsuUSD, 'USD')}</div>
                  <div className="text-xs font-mono text-slate-500">{secondary(rsuEUR, 'USD')}</div>
                </div>
                <div className="text-[10px] text-blue-700 font-semibold">Irish RTSO tax settled on vest</div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">US Listed Equities / ESPP</div>
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(US.equitiesUSD, 'USD')}</div>
                  <div className="text-xs font-mono text-slate-500">{secondary(usEquitiesEUR, 'USD')}</div>
                </div>
                <div className="text-[10px] text-slate-500">W-8BEN 15% dividend treaty rate</div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">USD Cash Balance</div>
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(US.cashUSD, 'USD')}</div>
                  <div className="text-xs font-mono text-slate-500">{secondary(usCashEUR, 'USD')}</div>
                </div>
                <div className="text-[10px] text-slate-500">Brokerage cash in Charles Schwab</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-600 font-medium flex items-center justify-between">
              <span>US Subtotal:</span>
              <span className="font-mono font-bold text-slate-900 text-right">
                {secondary(usTotalEUR, 'USD')} ({formatCurrency(usTotalUSD, 'USD')})
              </span>
            </div>
          </div>

        </div>

        {/* Regulatory & DTAA Clarity Box */}
        <div className="mt-10 bg-slate-50 rounded-2xl p-6 border border-slate-200">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ireland &amp; India Double Taxation Avoidance Agreement (DTAA)
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                If you are tax-resident in Ireland, Revenue considers your worldwide income and gains. However, under the comprehensive <strong>Ireland-India DTAA (Taxes on Capital Gains, Article 13)</strong>, relief is generally available so the same gain is not fully taxed twice (subject to the treaty's conditions; confirm with Revenue or a tax adviser). InvestIreland AI helps you to maintain clean, unified records of currency conversion dates, purchase prices, and withholding tax certificates.
              </p>
            </div>
          </div>
        </div>

        {/* Section CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onOpenDashboard}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all cursor-pointer"
          >
            <span>Explore Cross-Border Portfolio Tracker</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenWaitlist}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-all cursor-pointer"
          >
            <span>Join Early Access for International Expats</span>
          </button>
        </div>

      </div>
    </section>
  );
};
