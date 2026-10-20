import type { CountryExposure, Currency, Holding } from '../types';
import {
  MAX_ASSET_NAME_LENGTH,
  MAX_HOLDING_VALUE,
  MAX_PROVIDER_LENGTH,
  countryFromIsin,
  isValidIsin,
  normaliseTicker,
  todayISODate,
} from './holdingForm';

/**
 * Parses holdings from CSV files entirely in the browser. Nothing is uploaded.
 *
 * Supported formats:
 *  - InvestIreland template (see HOLDINGS_CSV_TEMPLATE)
 *  - DEGIRO "Portfolio" export (Portfolio.csv)
 *  - Trading 212 "History" export (transactions are netted into positions)
 */

export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;

export type ImportFormat = 'template' | 'degiro' | 'trading212';

export interface ImportResult {
  format: ImportFormat;
  formatLabel: string;
  holdings: Holding[];
  warnings: string[];
}

export class CsvImportError extends Error {}

export const HOLDINGS_CSV_TEMPLATE = [
  'Name,Type,Ticker,ISIN,Units,Price,Value,Currency,Country,Provider',
  'iShares Core MSCI World UCITS ETF,ETF,SWDA,IE00B4L5Y983,25,98.40,,EUR,Ireland,Trading 212',
  'Microsoft RSU,RSU,MSFT,US5949181045,80,430,,USD,US,E*TRADE',
  'Parag Parikh Flexi Cap Fund,Mutual Fund,,INF879O01027,1200,85.10,,INR,India,Zerodha Coin',
  'Irish Life PRSA,Pension,,,,,42000,EUR,Ireland,Irish Life',
].join('\n');

const SUPPORTED_CURRENCIES: Currency[] = ['EUR', 'INR', 'USD', 'GBP'];

// ---------- CSV primitives ----------

function detectDelimiter(headerLine: string): string {
  const counts = [',', ';', '\t'].map((d) => ({ d, n: headerLine.split(d).length }));
  return counts.sort((a, b) => b.n - a.n)[0].d;
}

/** RFC 4180 style parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f !== ''));
}

/** Detects whether numbers in the file use a decimal comma (e.g. "110,50"). */
function usesDecimalComma(cells: string[]): boolean {
  let comma = 0;
  let dot = 0;
  for (const c of cells) {
    const v = c.replace(/[^\d.,-]/g, '');
    if (/^-?\d+,\d{1,2}$|^-?\d+,\d{4,}$|^-?\d{1,3}(\.\d{3})+,\d+$/.test(v)) comma++;
    else if (/^-?\d+\.\d{1,2}$|^-?\d+\.\d{4,}$|^-?\d{1,3}(,\d{3})+\.\d+$/.test(v)) dot++;
  }
  return comma > dot;
}

export function parseLooseNumber(raw: string, decimalComma = false): number {
  let v = (raw ?? '').replace(/[\s\u00a0'€$£₹]/g, '').replace(/[A-Z]{3}/gi, '');
  if (v === '' || v === '-') return NaN;
  if (decimalComma) v = v.replace(/\./g, '').replace(',', '.');
  else v = v.replace(/,/g, '');
  return Number(v);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const clean = (s: string | undefined, max: number) => (s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

const isSupportedCurrency = (c: string): c is Currency => (SUPPORTED_CURRENCIES as string[]).includes(c);

function inferAssetType(name: string): Holding['assetType'] {
  return /\b(ETF|UCITS|ETC)\b/i.test(name) ? 'ETF' : 'Share';
}

function inferCountry(isin: string | undefined, currency: Currency): CountryExposure {
  return countryFromIsin(isin) ?? (currency === 'INR' ? 'India' : currency === 'USD' ? 'US' : currency === 'EUR' ? 'Europe' : 'Other');
}

let idCounter = 0;
const importId = () => `imp-${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function makeHolding(p: {
  name: string;
  assetType: Holding['assetType'];
  ticker?: string;
  isin?: string;
  units: number;
  unitPrice: number;
  currentValue: number;
  currency: Currency;
  country?: CountryExposure;
  provider: string;
  updatedAt: string;
}): Holding {
  const isin = p.isin && isValidIsin(p.isin) ? p.isin.toUpperCase() : undefined;
  return {
    id: importId(),
    assetName: clean(p.name, MAX_ASSET_NAME_LENGTH) || isin || p.ticker || 'Imported holding',
    assetType: p.assetType,
    ticker: p.ticker ? normaliseTicker(p.ticker) || undefined : undefined,
    isin,
    units: p.units,
    unitPrice: p.unitPrice,
    currentValue: Math.round(p.currentValue * 100) / 100,
    currency: p.currency,
    country: p.country ?? inferCountry(isin, p.currency),
    provider: clean(p.provider, MAX_PROVIDER_LENGTH),
    updatedAt: p.updatedAt,
  };
}

const validAmount = (n: number) => Number.isFinite(n) && n > 0 && n <= MAX_HOLDING_VALUE;

// ---------- Template ----------

const TYPE_ALIASES: Record<string, Holding['assetType']> = {
  etf: 'ETF', ucitsetf: 'ETF', share: 'Share', shares: 'Share', stock: 'Share', equity: 'Share', directshare: 'Share',
  mutualfund: 'Mutual Fund', fund: 'Mutual Fund', mf: 'Mutual Fund', pension: 'Pension', prsa: 'Pension',
  cash: 'Cash / Deposit', deposit: 'Cash / Deposit', cashdeposit: 'Cash / Deposit', savings: 'Cash / Deposit',
  bond: 'Bond', bonds: 'Bond', rsu: 'RSU', ustechrsu: 'RSU',
};

const COUNTRY_ALIASES: Record<string, CountryExposure> = {
  ireland: 'Ireland', ie: 'Ireland', india: 'India', in: 'India', us: 'US', usa: 'US', unitedstates: 'US',
  europe: 'Europe', eu: 'Europe', global: 'Europe', europeglobal: 'Europe', other: 'Other',
};

function parseTemplate(rows: string[][], header: string[], today: string): ImportResult {
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = col('name', 'assetname');
  const iType = col('type', 'assettype');
  const iTicker = col('ticker', 'symbol');
  const iIsin = col('isin');
  const iUnits = col('units', 'quantity', 'shares');
  const iPrice = col('price', 'priceperunit', 'unitprice');
  const iValue = col('value', 'totalvalue', 'currentvalue');
  const iCur = col('currency');
  const iCountry = col('country');
  const iProvider = col('provider', 'platform', 'broker');
  const decimalComma = usesDecimalComma(rows.flatMap((r) => [r[iUnits], r[iPrice], r[iValue]].filter(Boolean) as string[]));

  const holdings: Holding[] = [];
  const warnings: string[] = [];
  rows.forEach((r, idx) => {
    const line = idx + 2;
    const name = r[iName] ?? '';
    const currency = (r[iCur] || 'EUR').toUpperCase();
    if (!isSupportedCurrency(currency)) {
      warnings.push(`Row ${line}: currency "${currency}" is not supported (use EUR, USD, GBP or INR). Skipped.`);
      return;
    }
    const units = iUnits >= 0 ? parseLooseNumber(r[iUnits], decimalComma) : NaN;
    const price = iPrice >= 0 ? parseLooseNumber(r[iPrice], decimalComma) : NaN;
    const value = iValue >= 0 ? parseLooseNumber(r[iValue], decimalComma) : NaN;
    let u: number, p: number, v: number;
    if (validAmount(units) && validAmount(price)) {
      u = units; p = price; v = units * price;
    } else if (validAmount(value)) {
      u = validAmount(units) ? units : 1; v = value; p = value / u;
    } else {
      warnings.push(`Row ${line}${name ? ` (${name})` : ''}: needs Units and Price, or a Value. Skipped.`);
      return;
    }
    const isin = (r[iIsin] ?? '').toUpperCase();
    if (isin && !isValidIsin(isin)) warnings.push(`Row ${line}: ISIN "${isin}" is not valid and was ignored.`);
    holdings.push(makeHolding({
      name,
      assetType: TYPE_ALIASES[norm(r[iType] ?? '')] ?? inferAssetType(name),
      ticker: r[iTicker],
      isin,
      units: u,
      unitPrice: p,
      currentValue: v,
      currency,
      country: COUNTRY_ALIASES[norm(r[iCountry] ?? '')],
      provider: r[iProvider] ?? '',
      updatedAt: today,
    }));
  });
  return { format: 'template', formatLabel: 'InvestIreland template', holdings, warnings };
}

// ---------- DEGIRO Portfolio.csv ----------
// Columns: Product, Symbol/ISIN, Amount, Closing, Local value (currency), (local amount), Value in EUR

function parseDegiro(rows: string[][], today: string): ImportResult {
  const decimalComma = usesDecimalComma(rows.flatMap((r) => r.slice(2)));
  const holdings: Holding[] = [];
  const warnings: string[] = [];
  rows.forEach((r, idx) => {
    const [product = '', isin = ''] = r;
    let currency = '';
    let local = NaN;
    if (/^[A-Z]{3}$/.test(r[4] ?? '')) {
      currency = r[4];
      local = parseLooseNumber(r[5], decimalComma);
    } else {
      const m = /([A-Z]{3})\s*([-\d.,]+)/.exec(r[4] ?? '');
      if (m) {
        currency = m[1];
        local = parseLooseNumber(m[2], decimalComma);
      }
    }
    const valueEur = parseLooseNumber(r[r.length - 1], decimalComma);
    const units = parseLooseNumber(r[2], decimalComma);
    const closing = parseLooseNumber(r[3], decimalComma);
    const isCash = !isin && /cash/i.test(product);

    if (isCash) {
      const cur = isSupportedCurrency(currency) ? currency : 'EUR';
      const v = isSupportedCurrency(currency) ? local : valueEur;
      if (validAmount(v)) {
        holdings.push(makeHolding({ name: `DEGIRO cash (${cur})`, assetType: 'Cash / Deposit', units: 1, unitPrice: v, currentValue: v, currency: cur, country: 'Europe', provider: 'DEGIRO', updatedAt: today }));
      }
      return;
    }
    if (!validAmount(units)) {
      warnings.push(`Row ${idx + 2} (${product || 'unknown'}): no quantity found. Skipped.`);
      return;
    }
    if (isSupportedCurrency(currency) && validAmount(local)) {
      holdings.push(makeHolding({
        name: product, assetType: inferAssetType(product), isin, units,
        unitPrice: validAmount(closing) ? closing : local / units, currentValue: local, currency, provider: 'DEGIRO', updatedAt: today,
      }));
    } else if (validAmount(valueEur)) {
      warnings.push(`${product}: ${currency || 'its currency'} is not supported, so it was imported using DEGIRO's EUR value.`);
      holdings.push(makeHolding({
        name: product, assetType: inferAssetType(product), isin, units,
        unitPrice: valueEur / units, currentValue: valueEur, currency: 'EUR', provider: 'DEGIRO', updatedAt: today,
      }));
    } else {
      warnings.push(`Row ${idx + 2} (${product}): no value found. Skipped.`);
    }
  });
  return { format: 'degiro', formatLabel: 'DEGIRO portfolio export', holdings, warnings };
}

// ---------- Trading 212 history export ----------

function parseTrading212(rows: string[][], header: string[], today: string): ImportResult {
  const col = (name: string) => header.indexOf(norm(name));
  const iAction = col('Action');
  const iTime = col('Time');
  const iIsin = col('ISIN');
  const iTicker = col('Ticker');
  const iName = col('Name');
  const iShares = col('No. of shares');
  const iPrice = col('Price / share');
  const iPriceCur = col('Currency (Price / share)');
  const decimalComma = usesDecimalComma(rows.flatMap((r) => [r[iShares], r[iPrice]].filter(Boolean) as string[]));

  interface Pos { name: string; ticker: string; isin: string; shares: number; price: number; currency: string; time: string }
  const positions = new Map<string, Pos>();
  const warnings: string[] = [];
  let sawSplit = false;

  for (const r of rows) {
    const action = (r[iAction] ?? '').toLowerCase();
    const isBuy = /\bbuy\b/.test(action);
    const isSell = /\bsell\b/.test(action);
    if (/split/.test(action)) sawSplit = true;
    if (!isBuy && !isSell) continue;
    const key = (r[iIsin] || r[iTicker] || r[iName] || '').toUpperCase();
    const shares = parseLooseNumber(r[iShares], decimalComma);
    const price = parseLooseNumber(r[iPrice], decimalComma);
    if (!key || !Number.isFinite(shares)) continue;
    const pos = positions.get(key) ?? { name: r[iName] ?? '', ticker: r[iTicker] ?? '', isin: r[iIsin] ?? '', shares: 0, price: 0, currency: '', time: '' };
    pos.shares += isBuy ? shares : -shares;
    const time = r[iTime] ?? '';
    if (Number.isFinite(price) && price > 0 && time >= pos.time) {
      pos.price = price;
      pos.currency = (r[iPriceCur] ?? '').toUpperCase();
      pos.time = time;
    }
    positions.set(key, pos);
  }

  const holdings: Holding[] = [];
  for (const pos of positions.values()) {
    if (pos.shares <= 1e-9) continue;
    let currency = pos.currency;
    let price = pos.price;
    if (currency === 'GBX') {
      currency = 'GBP';
      price /= 100;
    }
    if (!isSupportedCurrency(currency) || !validAmount(price)) {
      warnings.push(`${pos.name || pos.ticker}: price currency ${pos.currency || 'unknown'} is not supported. Skipped; add it manually.`);
      continue;
    }
    const units = Math.round(pos.shares * 1e8) / 1e8;
    holdings.push(makeHolding({
      name: pos.name, assetType: inferAssetType(pos.name), ticker: pos.ticker, isin: pos.isin,
      units, unitPrice: price, currentValue: units * price, currency, provider: 'Trading 212', updatedAt: today,
    }));
  }
  warnings.unshift('Trading 212 exports transactions, not today\u2019s prices. Each position is valued at your last trade price \u2014 edit holdings to update the price.');
  if (sawSplit) warnings.push('Your history contains stock splits. Check the unit counts of affected holdings.');
  return { format: 'trading212', formatLabel: 'Trading 212 history export', holdings, warnings };
}

// ---------- Entry point ----------

export function parseHoldingsCsv(text: string, now = new Date()): ImportResult {
  if (text.length > MAX_IMPORT_FILE_BYTES) throw new CsvImportError('This file is too large. The limit is 2 MB.');
  const rows = parseCsv(text);
  if (rows.length < 2) throw new CsvImportError('This file has no data rows.');
  if (rows.length - 1 > MAX_IMPORT_ROWS) throw new CsvImportError(`This file has more than ${MAX_IMPORT_ROWS} rows. Split it into smaller files.`);

  const header = rows[0].map(norm);
  const data = rows.slice(1);
  const today = todayISODate(now);

  let result: ImportResult;
  if (header.includes('symbolisin')) result = parseDegiro(data, today);
  else if (header.includes('action') && header.includes('noofshares') && header.includes(norm('Price / share'))) result = parseTrading212(data, header, today);
  else if (header.some((h) => h === 'name' || h === 'assetname') && header.some((h) => ['units', 'value', 'totalvalue', 'currentvalue', 'quantity'].includes(h))) {
    result = parseTemplate(data, header, today);
  } else {
    throw new CsvImportError('This CSV format isn\u2019t recognised. Use a DEGIRO Portfolio export, a Trading 212 History export, or the InvestIreland template.');
  }
  if (result.holdings.length === 0) {
    throw new CsvImportError(result.warnings[result.warnings.length - 1] ?? 'No holdings were found in this file.');
  }
  return result;
}

export interface ImportPlanItem {
  holding: Holding;
  action: 'add' | 'update';
}

/**
 * Matches imported rows to existing holdings (same ISIN or ticker at the same provider)
 * so re-importing a statement updates positions instead of duplicating them.
 */
export function planImport(existing: Holding[], imported: Holding[]): ImportPlanItem[] {
  const keyOf = (h: Holding) => {
    const id = (h.isin || h.ticker || '').toUpperCase();
    return id ? `${id}|${(h.provider || '').trim().toLowerCase()}` : null;
  };
  const byKey = new Map<string, Holding>();
  for (const h of existing) {
    const k = keyOf(h);
    if (k) byKey.set(k, h);
  }
  return imported.map((h) => {
    const k = keyOf(h);
    const match = k ? byKey.get(k) : undefined;
    if (!match) return { holding: h, action: 'add' as const };
    // Refresh the position figures but keep the user's own name, type, country and notes.
    return {
      holding: {
        ...match,
        units: h.units,
        unitPrice: h.unitPrice,
        currentValue: h.currentValue,
        currency: h.currency,
        ticker: match.ticker || h.ticker,
        isin: match.isin || h.isin,
        updatedAt: h.updatedAt,
      },
      action: 'update' as const,
    };
  });
}
