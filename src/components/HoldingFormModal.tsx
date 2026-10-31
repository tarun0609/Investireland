import React, { useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import type { CountryExposure, Currency, Holding } from '../types';
import { convertToEUR, formatCurrency } from '../services/fiscalDataService';
import { describeFxRates, getFxRates, subscribeFxRates } from '../services/fxRateService';
import {
  MAX_ASSET_NAME_LENGTH,
  MAX_HOLDING_VALUE,
  MAX_PROVIDER_LENGTH,
  MAX_TICKER_LENGTH,
  buildHoldingFromForm,
  countryFromIsin,
  defaultValueMode,
  emptyHoldingForm,
  formFromHolding,
  previewTotal,
  type HoldingFormValues,
} from '../services/holdingForm';

interface HoldingFormModalProps {
  /** When set the modal edits this holding; otherwise it adds a new one. */
  initial?: Holding;
  onSave: (holding: Holding) => void;
  onClose: () => void;
}

const inputClass = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium';
const numberClass = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold';

const formatUnits = (n: number) => n.toLocaleString('en-IE', { maximumFractionDigits: 6 });

export const HoldingFormModal: React.FC<HoldingFormModalProps> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState<HoldingFormValues>(() => (initial ? formFromHolding(initial) : emptyHoldingForm()));
  const [error, setError] = useState<string | null>(null);
  const [countryTouched, setCountryTouched] = useState(Boolean(initial));
  const fx = useSyncExternalStore(subscribeFxRates, getFxRates);

  const isEdit = Boolean(initial);
  const total = previewTotal(form);
  const units = Number(form.units);
  const price = Number(form.unitPrice);

  const update = <K extends keyof HoldingFormValues>(key: K, value: HoldingFormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const handleTypeChange = (type: Holding['assetType']) => {
    setForm((f) => {
      // Carry the current figure across when the entry mode changes so nothing typed is lost.
      const mode = defaultValueMode(type);
      if (mode === f.valueMode) return { ...f, assetType: type };
      const t = previewTotal(f);
      return { ...f, assetType: type, valueMode: mode, totalValue: mode === 'total' && t ? String(t) : f.totalValue };
    });
    setError(null);
  };

  const handleModeChange = (mode: HoldingFormValues['valueMode']) => {
    setForm((f) => {
      if (mode === f.valueMode) return f;
      const t = previewTotal(f);
      return { ...f, valueMode: mode, totalValue: mode === 'total' && t ? String(t) : f.totalValue };
    });
    setError(null);
  };

  const handleIsinChange = (value: string) => {
    const isin = value.toUpperCase();
    setForm((f) => {
      const inferred = countryTouched ? null : countryFromIsin(isin);
      return { ...f, isin, country: inferred && isin.length >= 2 ? inferred : f.country };
    });
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildHoldingFromForm(form, initial);
    if (!result.holding) {
      setError(result.error ?? 'Please check the details and try again.');
      return;
    }
    onSave(result.holding);
  };

  const previewText = (() => {
    if (total === null) return null;
    const totalText = formatCurrency(total, form.currency, 2);
    const eurText = form.currency === 'EUR' ? '' : ` \u2248 ${formatCurrency(convertToEUR(total, form.currency, fx), 'EUR')}`;
    if (form.valueMode === 'price') {
      return `${formatUnits(units)} \u00d7 ${formatCurrency(price, form.currency, 4)} = ${totalText}${eurText}`;
    }
    return `${totalText}${eurText}`;
  })();

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="holding-form-title"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 id="holding-form-title" className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit Holding' : 'Add Investment Holding'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3.5 text-xs">
          <div>
            <label htmlFor="holding-name" className="block font-bold text-slate-700 mb-1">Asset Name *</label>
            <input
              id="holding-name"
              type="text"
              required
              autoFocus
              maxLength={MAX_ASSET_NAME_LENGTH}
              value={form.assetName}
              onChange={(e) => update('assetName', e.target.value)}
              placeholder="e.g. Microsoft RSU or iShares Core MSCI World"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="holding-type" className="block font-bold text-slate-700 mb-1">Asset Type</label>
              <select id="holding-type" value={form.assetType} onChange={(e) => handleTypeChange(e.target.value as Holding['assetType'])} className={inputClass}>
                <option value="ETF">UCITS ETF</option>
                <option value="Mutual Fund">Mutual Fund</option>
                <option value="Share">Direct Share</option>
                <option value="RSU">US Tech RSU</option>
                <option value="Bond">Bond</option>
                <option value="Pension">Pension / PRSA</option>
                <option value="Cash / Deposit">Cash Deposit</option>
              </select>
            </div>
            <div>
              <label htmlFor="holding-currency" className="block font-bold text-slate-700 mb-1">Currency</label>
              <select id="holding-currency" value={form.currency} onChange={(e) => update('currency', e.target.value as Currency)} className={inputClass}>
                <option value="EUR">Euro (€ EUR)</option>
                <option value="INR">Indian Rupee (₹ INR)</option>
                <option value="USD">US Dollar ($ USD)</option>
                <option value="GBP">British Pound (£ GBP)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="holding-ticker" className="block font-bold text-slate-700 mb-1">Ticker <span className="font-normal text-slate-500">(optional)</span></label>
              <input
                id="holding-ticker"
                type="text"
                maxLength={MAX_TICKER_LENGTH}
                autoCapitalize="characters"
                spellCheck={false}
                value={form.ticker}
                onChange={(e) => update('ticker', e.target.value.toUpperCase())}
                placeholder="e.g. MSFT or VWCE.DE"
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
            <div>
              <label htmlFor="holding-isin" className="block font-bold text-slate-700 mb-1">ISIN <span className="font-normal text-slate-500">(optional)</span></label>
              <input
                id="holding-isin"
                type="text"
                maxLength={12}
                autoCapitalize="characters"
                spellCheck={false}
                value={form.isin}
                onChange={(e) => handleIsinChange(e.target.value)}
                placeholder="e.g. IE00B4L5Y983"
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
          </div>

          <fieldset>
            <legend className="block font-bold text-slate-700 mb-1">How do you want to enter the value?</legend>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="radiogroup">
              {([
                ['price', 'Units × price per unit'],
                ['total', 'Total value'],
              ] as const).map(([mode, label]) => (
                <label
                  key={mode}
                  className={`px-3 py-1.5 rounded-md cursor-pointer font-bold ${form.valueMode === mode ? 'bg-white shadow-xs text-emerald-800' : 'text-slate-500'}`}
                >
                  <input type="radio" name="value-mode" value={mode} checked={form.valueMode === mode} onChange={() => handleModeChange(mode)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {form.valueMode === 'price' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="holding-units" className="block font-bold text-slate-700 mb-1">Units *</label>
                <input
                  id="holding-units"
                  type="number"
                  required
                  min="0"
                  step="any"
                  max={MAX_HOLDING_VALUE}
                  inputMode="decimal"
                  value={form.units}
                  onChange={(e) => update('units', e.target.value)}
                  placeholder="e.g. 80"
                  className={numberClass}
                />
              </div>
              <div>
                <label htmlFor="holding-price" className="block font-bold text-slate-700 mb-1">Price per unit ({form.currency}) *</label>
                <input
                  id="holding-price"
                  type="number"
                  required
                  min="0"
                  step="any"
                  max={MAX_HOLDING_VALUE}
                  inputMode="decimal"
                  value={form.unitPrice}
                  onChange={(e) => update('unitPrice', e.target.value)}
                  placeholder="e.g. 430"
                  className={numberClass}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="holding-total" className="block font-bold text-slate-700 mb-1">Total value ({form.currency}) *</label>
                <input
                  id="holding-total"
                  type="number"
                  required
                  min="0"
                  step="any"
                  max={MAX_HOLDING_VALUE}
                  inputMode="decimal"
                  value={form.totalValue}
                  onChange={(e) => update('totalValue', e.target.value)}
                  placeholder="e.g. 42000"
                  className={numberClass}
                />
              </div>
              <div>
                <label htmlFor="holding-units-total" className="block font-bold text-slate-700 mb-1">Units <span className="font-normal text-slate-500">(optional)</span></label>
                <input
                  id="holding-units-total"
                  type="number"
                  min="0"
                  step="any"
                  max={MAX_HOLDING_VALUE}
                  inputMode="decimal"
                  value={form.units}
                  onChange={(e) => update('units', e.target.value)}
                  placeholder="1"
                  className={numberClass}
                />
              </div>
            </div>
          )}

          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2" aria-live="polite">
            {previewText ? (
              <>
                <span className="font-mono font-bold text-emerald-900 break-words">{previewText}</span>
                {form.currency !== 'EUR' && <span className="block text-[10px] text-emerald-800 mt-0.5">{describeFxRates(fx)}</span>}
              </>
            ) : (
              <span className="text-emerald-800">
                {form.valueMode === 'price' ? 'Enter units and price per unit to see the total.' : 'Enter the total value of this holding.'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="holding-country" className="block font-bold text-slate-700 mb-1">Country Jurisdiction</label>
              <select
                id="holding-country"
                value={form.country}
                onChange={(e) => { setCountryTouched(true); update('country', e.target.value as CountryExposure); }}
                className={inputClass}
              >
                <option value="Ireland">Ireland</option>
                <option value="India">India</option>
                <option value="US">United States</option>
                <option value="Europe">Europe / Global</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="holding-provider" className="block font-bold text-slate-700 mb-1">Provider / Platform</label>
              <input
                id="holding-provider"
                type="text"
                maxLength={MAX_PROVIDER_LENGTH}
                value={form.provider}
                onChange={(e) => update('provider', e.target.value)}
                placeholder="e.g. Trading 212, DEGIRO, Zerodha"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold cursor-pointer hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.assetName.trim() || total === null}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEdit ? 'Save Changes' : 'Save Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
