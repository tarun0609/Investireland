import type { Holding } from '../types';
import { CsvImportError, makeHolding, validAmount, type ImportResult } from './csvImportService';
import { isValidIsin, todayISODate } from './holdingForm';

/**
 * Reads holdings from the text of an Indian Consolidated Account Statement (CAS):
 *  - NSDL / CDSL depository CAS (all demat accounts plus mutual fund folios)
 *  - CAMS / KFintech mutual fund CAS (detailed statement)
 *
 * Layouts differ between depositories and change over time, so rows are found by their ISIN and
 * the units, price and value are picked from the numbers on the row by checking units × price = value.
 */

/** Every CAS import uses one provider so re-importing a newer statement updates holdings instead of duplicating them. */
export const CAS_PROVIDER = 'Indian CAS';

const ISIN_RE = /\b([A-Z]{2}[A-Z0-9]{9}\d)\b/g;
const NUMBER_RE = /^\(?-?[\d,]*\d(?:\.\d+)?\)?$/;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const parseIndianNumber = (s: string) => Number(s.replace(/[,()]/g, ''));

/** "30-Sep-2026", "30/09/2026" or "30 Sep 2026" -> "2026-09-30". */
export function parseCasDate(raw: string): string | null {
  const m = /^(\d{1,2})[-/ ]([A-Za-z]{3,9}|\d{1,2})[-/ ](\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const month = /^\d+$/.test(m[2]) ? Number(m[2]) : MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
  const day = Number(m[1]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DATE_TOKEN = String.raw`(\d{1,2}[-/ ](?:[A-Za-z]{3,9}|\d{1,2})[-/ ]\d{4})`;

/** The most recent "as on" / period-end date in the statement, used as the holdings' price date. */
function findStatementDate(lines: string[]): string | null {
  const re = new RegExp(String.raw`(?:as\s+on|as\s+of|to|valuation\s+on|nav\s+on)\s*:?\s*` + DATE_TOKEN, 'gi');
  let latest: string | null = null;
  for (const line of lines) {
    for (const m of line.matchAll(re)) {
      const d = parseCasDate(m[1]);
      if (d && (!latest || d > latest)) latest = d;
    }
  }
  return latest;
}

function assetTypeFor(isin: string, name: string): Holding['assetType'] {
  if (/\b(ETF|BEES)\b/i.test(name)) return 'ETF';
  if (isin.startsWith('INF')) return 'Mutual Fund';
  if (/^IN[0-9]/.test(isin) || /\b(BOND|DEBENTURE|NCD|SGB|G-?SEC|T-?BILL)\b/i.test(name)) return 'Bond';
  return 'Share';
}

const tidyName = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-:#|]+|[\s\-:#|]+$/g, '')
    .trim();

interface Row {
  isin: string;
  name: string;
  units: number;
  price: number;
  value: number;
}

/**
 * Picks (units, price, value) from a row's numbers. Tables list units before price and value last, so the
 * right-most matching value and the closest price are preferred (e.g. NSDL fund rows also have units × cost = total cost).
 */
export function pickUnitsPriceValue(nums: number[]): { units: number; price: number; value: number } | null {
  for (let c = nums.length - 1; c >= 2; c--) {
    const value = nums[c];
    if (!validAmount(value)) continue;
    const tolerance = Math.max(0.05, value * 0.001);
    for (let b = c - 1; b >= 1; b--) {
      const price = nums[b];
      if (!validAmount(price)) continue;
      for (let a = b - 1; a >= 0; a--) {
        const units = nums[a];
        if (validAmount(units) && Math.abs(units * price - value) <= tolerance) return { units, price, value };
      }
    }
  }
  return null;
}

function numbersIn(text: string): number[] {
  return text
    .split(/\s+/)
    .filter((t) => NUMBER_RE.test(t))
    .map(parseIndianNumber)
    .filter((n) => Number.isFinite(n));
}

function isinsIn(line: string): string[] {
  return [...line.matchAll(ISIN_RE)].map((m) => m[1]).filter(isValidIsin);
}

// ---------- NSDL / CDSL depository CAS ----------

function parseDepositoryRows(lines: string[]): { rows: Row[]; unmatched: Map<string, string> } {
  const rows: Row[] = [];
  const unmatched = new Map<string, string>();
  for (let i = 0; i < lines.length; i++) {
    const isins = isinsIn(lines[i]);
    if (isins.length !== 1) continue;
    const isin = isins[0];
    const after = lines[i].slice(lines[i].indexOf(isin) + isin.length);
    // Wrapped table cells: pull in up to two following lines until another ISIN row starts.
    let text = after;
    for (let j = 1; j <= 2 && numbersIn(text).length < 3 && i + j < lines.length && isinsIn(lines[i + j]).length === 0; j++) {
      text += ' ' + lines[i + j];
    }
    const tokens = after.split(/\s+/).filter(Boolean);
    // The name ends where the run of numeric columns starts; a lone number such as "NIFTY 50 BEES" stays in the name.
    const firstNum = tokens.findIndex((t, k) => NUMBER_RE.test(t) && (k === tokens.length - 1 || NUMBER_RE.test(tokens[k + 1])));
    const name = tidyName((firstNum === -1 ? tokens : tokens.slice(0, firstNum)).join(' '));
    const picked = pickUnitsPriceValue(numbersIn(text));
    if (picked) rows.push({ isin, name, ...picked });
    else if (!unmatched.has(isin)) unmatched.set(isin, name);
  }
  return { rows, unmatched };
}

// ---------- CAMS / KFintech detailed mutual fund CAS ----------

function parseCamsRows(lines: string[]): { rows: Row[]; unmatched: Map<string, string> } {
  const rows: Row[] = [];
  const unmatched = new Map<string, string>();
  let scheme: { isin: string; name: string } | null = null;
  const amount = String.raw`(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)`;
  const navRe = new RegExp(String.raw`NAV\s+on\s+` + DATE_TOKEN + String.raw`\s*:?\s*` + amount, 'i');
  const valueRe = new RegExp(String.raw`(?:Market\s+Value|Valuation)\s+on\s+` + DATE_TOKEN + String.raw`\s*:?\s*` + amount, 'i');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isinMatch = /ISIN\s*:\s*([A-Z0-9]{12})/i.exec(line);
    if (isinMatch && isValidIsin(isinMatch[1].toUpperCase())) {
      const before = line.slice(0, isinMatch.index).replace(/^[A-Z0-9]{2,12}\s*-\s*/, '');
      scheme = { isin: isinMatch[1].toUpperCase(), name: tidyName(before) || (lines[i - 1] ? tidyName(lines[i - 1]) : '') };
      continue;
    }
    const closing = /Closing\s+Unit\s+Balance\s*:?\s*([\d,]+(?:\.\d+)?)/i.exec(line);
    if (!closing || !scheme) continue;
    const units = parseIndianNumber(closing[1]);
    const window = [line, lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ');
    const nav = navRe.exec(window);
    const value = valueRe.exec(window);
    const price = nav ? parseIndianNumber(nav[2]) : NaN;
    const total = value ? parseIndianNumber(value[2]) : validAmount(price) ? units * price : NaN;
    if (units > 0 && validAmount(price) && validAmount(total)) rows.push({ isin: scheme.isin, name: scheme.name, units, price, value: total });
    else if (units > 0) unmatched.set(scheme.isin, scheme.name);
    scheme = null;
  }
  return { rows, unmatched };
}

// ---------- Entry point ----------

/** Merges rows per ISIN: identical rows repeated in summary sections are counted once; separate folios/accounts are added up. */
function mergeRows(rows: Row[]): Row[] {
  const byIsin = new Map<string, { row: Row; seen: Set<string> }>();
  for (const r of rows) {
    const sig = `${r.units.toFixed(4)}|${r.value.toFixed(2)}`;
    const entry = byIsin.get(r.isin);
    if (!entry) {
      byIsin.set(r.isin, { row: { ...r }, seen: new Set([sig]) });
    } else if (!entry.seen.has(sig)) {
      entry.seen.add(sig);
      entry.row.units += r.units;
      entry.row.value += r.value;
      entry.row.price = entry.row.value / entry.row.units;
      if (!entry.row.name && r.name) entry.row.name = r.name;
    }
  }
  return [...byIsin.values()].map((e) => e.row);
}

export function parseCasText(lines: string[], now = new Date()): ImportResult {
  const all = lines.join('\n');
  const isCams = /Closing\s+Unit\s+Balance/i.test(all);
  const { rows, unmatched } = isCams ? parseCamsRows(lines) : parseDepositoryRows(lines);
  const merged = mergeRows(rows);
  if (merged.length === 0) {
    throw new CsvImportError(
      'No holdings were found in this PDF. Use a Consolidated Account Statement (CAS) from NSDL, CDSL, CAMS or KFintech that lists your holdings.',
    );
  }

  const statementDate = findStatementDate(lines);
  const updatedAt = statementDate ?? todayISODate(now);
  const holdings = merged.map((r) =>
    makeHolding({
      name: r.name || r.isin,
      assetType: assetTypeFor(r.isin, r.name),
      isin: r.isin,
      units: Math.round(r.units * 1e6) / 1e6,
      unitPrice: r.price,
      currentValue: r.value,
      currency: 'INR',
      country: 'India',
      provider: CAS_PROVIDER,
      updatedAt,
    }),
  );

  const label = isCams ? 'CAMS / KFintech mutual fund CAS' : /\bNSDL\b/.test(all) ? 'NSDL CAS' : /\bCDSL\b/.test(all) ? 'CDSL CAS' : 'Depository CAS';
  const warnings: string[] = [];
  warnings.push(
    `Values are as of ${statementDate ?? 'the statement date'}. Compare the total below with your statement before importing.`,
  );
  const found = new Set(merged.map((r) => r.isin));
  const missing = [...unmatched.entries()].filter(([isin]) => !found.has(isin));
  if (missing.length > 0) {
    warnings.push(
      `${missing.length} other ISIN${missing.length === 1 ? '' : 's'} had no current value (usually sold or zero balance): ${missing
        .slice(0, 5)
        .map(([isin, name]) => (name ? `${name} (${isin})` : isin))
        .join(', ')}${missing.length > 5 ? ', \u2026' : ''}. If you still hold ${missing.length === 1 ? 'it' : 'any of them'}, add ${missing.length === 1 ? 'it' : 'them'} manually.`,
    );
  }
  return { format: 'cas', formatLabel: label, holdings, warnings };
}
