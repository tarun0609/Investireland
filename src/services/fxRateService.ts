/**
 * Euro foreign-exchange reference rates.
 *
 * Live rates come from the European Central Bank's free public data API
 * (https://data.ecb.europa.eu), which is updated around 16:00 CET on TARGET
 * working days. If the ECB cannot be reached, the bundled rates below are used
 * and clearly labelled as such.
 */

export interface FxRates {
  EUR_TO_INR: number;
  EUR_TO_USD: number;
  EUR_TO_GBP: number;
  /** ECB reference date (YYYY-MM-DD) the rates apply to. */
  lastUpdated: string;
  source?: 'ECB' | 'bundled';
}

/** ECB euro reference rates for 19 October 2026, used only when the live ECB feed is unavailable. */
export const BUNDLED_FX_RATES: FxRates = Object.freeze({
  EUR_TO_INR: 106.559,
  EUR_TO_USD: 1.1225,
  EUR_TO_GBP: 0.84205,
  lastUpdated: '2026-10-19',
  source: 'bundled' as const,
});

export const ECB_RATES_URL =
  'https://data-api.ecb.europa.eu/service/data/EXR/D.USD+INR+GBP.EUR.SP00.A?lastNObservations=1&format=csvdata&detail=dataonly';

const CACHE_KEY = 'investireland_ecb_fx_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let current: FxRates = BUNDLED_FX_RATES;
const listeners = new Set<() => void>();

export function getFxRates(): FxRates {
  return current;
}

export function subscribeFxRates(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFxRates(rates: FxRates): void {
  current = rates;
  listeners.forEach((l) => l());
}

const isPlausibleRate = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;

export function isValidFxRates(r: Partial<FxRates> | null | undefined): r is FxRates {
  return !!r
    && isPlausibleRate(Number(r.EUR_TO_INR), 20, 500)
    && isPlausibleRate(Number(r.EUR_TO_USD), 0.3, 3)
    && isPlausibleRate(Number(r.EUR_TO_GBP), 0.3, 3)
    && typeof r.lastUpdated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.lastUpdated);
}

/** Parses the ECB SDMX "csvdata" (detail=dataonly) response. Returns null if any currency is missing or implausible. */
export function parseEcbCsv(csv: string): FxRates | null {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const header = lines[0].split(',');
  const cur = header.indexOf('CURRENCY');
  const period = header.indexOf('TIME_PERIOD');
  const value = header.indexOf('OBS_VALUE');
  if (cur < 0 || period < 0 || value < 0) return null;

  const rates: Record<string, number> = {};
  const dates: string[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const v = Number(cols[value]);
    if (cols[cur] && Number.isFinite(v)) {
      rates[cols[cur]] = v;
      dates.push(cols[period]);
    }
  }
  const parsed: FxRates = {
    EUR_TO_INR: rates.INR,
    EUR_TO_USD: rates.USD,
    EUR_TO_GBP: rates.GBP,
    lastUpdated: dates.sort()[dates.length - 1] ?? '',
    source: 'ECB',
  };
  return isValidFxRates(parsed) ? parsed : null;
}

function readCache(now: number): FxRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { fetchedAt: number; rates: FxRates };
    if (now - cached.fetchedAt > CACHE_TTL_MS || !isValidFxRates(cached.rates)) return null;
    return { ...cached.rates, source: 'ECB' };
  } catch {
    return null;
  }
}

/**
 * Loads today's ECB reference rates (cached in the browser for 6 hours) and
 * publishes them to subscribers. Falls back to the bundled rates on any error.
 */
export async function loadEcbRates(fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<FxRates> {
  const cached = typeof localStorage !== 'undefined' ? readCache(now) : null;
  if (cached) {
    setFxRates(cached);
    return cached;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetchImpl(ECB_RATES_URL, { signal: controller.signal, headers: { Accept: 'text/csv' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`ECB HTTP ${res.status}`);
    const parsed = parseEcbCsv(await res.text());
    if (!parsed) throw new Error('ECB response failed validation');
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: now, rates: parsed }));
    } catch {
      // Storage unavailable; rates still apply for this session.
    }
    setFxRates(parsed);
    return parsed;
  } catch (err) {
    console.warn('Using bundled FX rates:', err);
    return current;
  }
}

/** Human-readable label, e.g. "ECB reference rates, 19 Oct 2026". */
export function describeFxRates(r: FxRates = current): string {
  const date = new Date(`${r.lastUpdated}T12:00:00Z`).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return r.source === 'ECB' ? `ECB reference rates, ${date}` : `ECB reference rates, ${date} (offline copy)`;
}
