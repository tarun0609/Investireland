import type { CountryExposure, Currency, Holding } from '../types';

export const MAX_ASSET_NAME_LENGTH = 150;
export const MAX_PROVIDER_LENGTH = 100;
export const MAX_TICKER_LENGTH = 20;
export const MAX_HOLDING_VALUE = 1_000_000_000_000;

export type ValueMode = 'price' | 'total';

export interface HoldingFormValues {
  assetName: string;
  ticker: string;
  isin: string;
  assetType: Holding['assetType'];
  currency: Currency;
  country: CountryExposure;
  provider: string;
  units: string;
  unitPrice: string;
  totalValue: string;
  valueMode: ValueMode;
}

/** Pensions and cash are usually known only as a balance, so they default to entering the total. */
export const defaultValueMode = (type: Holding['assetType']): ValueMode =>
  type === 'Pension' || type === 'Cash / Deposit' ? 'total' : 'price';

export const todayISODate = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export function emptyHoldingForm(): HoldingFormValues {
  return {
    assetName: '',
    ticker: '',
    isin: '',
    assetType: 'ETF',
    currency: 'EUR',
    country: 'Ireland',
    provider: '',
    units: '',
    unitPrice: '',
    totalValue: '',
    valueMode: 'price',
  };
}

const trimNumber = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 1e6) / 1e6) : '');

export function formFromHolding(h: Holding): HoldingFormValues {
  const hasPrice = h.units > 0 && h.unitPrice > 0;
  return {
    assetName: h.assetName,
    ticker: h.ticker ?? '',
    isin: h.isin ?? '',
    assetType: h.assetType,
    currency: h.currency,
    country: h.country,
    provider: h.provider ?? '',
    units: h.units > 0 ? trimNumber(h.units) : '',
    unitPrice: hasPrice ? trimNumber(h.unitPrice) : '',
    totalValue: h.currentValue > 0 ? trimNumber(h.currentValue) : '',
    valueMode: hasPrice ? defaultValueMode(h.assetType) : 'total',
  };
}

const roundMoney = (n: number) => Math.round(n * 100) / 100;

const parseNumber = (s: string): number => (s.trim() === '' ? NaN : Number(s.trim()));

/** Total value implied by the form, or null while inputs are incomplete. */
export function previewTotal(form: HoldingFormValues): number | null {
  if (form.valueMode === 'total') {
    const total = parseNumber(form.totalValue);
    return Number.isFinite(total) && total > 0 ? total : null;
  }
  const units = parseNumber(form.units);
  const price = parseNumber(form.unitPrice);
  return Number.isFinite(units) && Number.isFinite(price) && units > 0 && price > 0 ? roundMoney(units * price) : null;
}

/** ISO 6166 ISIN with check digit validation. */
export function isValidIsin(isin: string): boolean {
  const s = isin.trim().toUpperCase();
  if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(s)) return false;
  const digits = s.slice(0, 11).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let sum = 0;
  let double = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return (10 - (sum % 10)) % 10 === Number(s[11]);
}

export function countryFromIsin(isin: string | undefined): CountryExposure | null {
  const prefix = (isin ?? '').trim().toUpperCase().slice(0, 2);
  if (!/^[A-Z]{2}$/.test(prefix)) return null;
  if (prefix === 'IE') return 'Ireland';
  if (prefix === 'IN') return 'India';
  if (prefix === 'US') return 'US';
  const europe = ['AT', 'BE', 'CH', 'DE', 'DK', 'ES', 'FI', 'FR', 'GB', 'GR', 'IT', 'LU', 'NL', 'NO', 'PL', 'PT', 'SE'];
  return europe.includes(prefix) ? 'Europe' : 'Other';
}

export const normaliseTicker = (t: string) => t.trim().toUpperCase().slice(0, MAX_TICKER_LENGTH);

export type BuildResult = { holding: Holding; error?: undefined } | { holding?: undefined; error: string };

const newHoldingId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function buildHoldingFromForm(form: HoldingFormValues, existing?: Holding, now = new Date()): BuildResult {
  const name = form.assetName.trim();
  if (!name) return { error: 'Enter an asset name.' };

  const ticker = normaliseTicker(form.ticker);
  if (ticker && !/^[A-Z0-9][A-Z0-9.\-:^]*$/.test(ticker)) {
    return { error: 'Ticker can contain only letters, numbers, dots, dashes and colons (e.g. MSFT or VWCE.DE).' };
  }
  const isin = form.isin.trim().toUpperCase();
  if (isin && !isValidIsin(isin)) return { error: 'That ISIN is not valid. It should be 12 characters, e.g. IE00B4L5Y983.' };

  let units: number;
  let unitPrice: number;
  let currentValue: number;
  if (form.valueMode === 'price') {
    units = parseNumber(form.units);
    unitPrice = parseNumber(form.unitPrice);
    if (!Number.isFinite(units) || units <= 0 || units > MAX_HOLDING_VALUE) return { error: 'Enter the number of units (greater than zero).' };
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > MAX_HOLDING_VALUE) return { error: 'Enter the price per unit (greater than zero).' };
    currentValue = roundMoney(units * unitPrice);
  } else {
    currentValue = parseNumber(form.totalValue);
    if (!Number.isFinite(currentValue) || currentValue <= 0) return { error: 'Enter a total value greater than zero.' };
    units = form.units.trim() === '' ? 1 : parseNumber(form.units);
    if (!Number.isFinite(units) || units <= 0 || units > MAX_HOLDING_VALUE) return { error: 'Units must be greater than zero (leave blank for 1).' };
    unitPrice = currentValue / units;
  }
  if (currentValue > MAX_HOLDING_VALUE) return { error: 'That total value is too large.' };

  return {
    holding: {
      ...existing,
      id: existing?.id ?? newHoldingId(),
      assetName: name.slice(0, MAX_ASSET_NAME_LENGTH),
      assetType: form.assetType,
      ticker: ticker || undefined,
      isin: isin || undefined,
      units,
      unitPrice,
      currentValue,
      currency: form.currency,
      country: form.country,
      provider: form.provider.trim().slice(0, MAX_PROVIDER_LENGTH),
      updatedAt: todayISODate(now),
    },
  };
}
