import type { Holding } from '../types';
import { parseCasDate } from './casParserService';
import { todayISODate } from './holdingForm';

/**
 * Refreshes Indian mutual fund and ETF prices (NAV) from mfapi.in, a free public mirror of AMFI's daily NAVs.
 * mfapi.in has no ISIN lookup, so a fund's scheme code is found by searching its name and confirming the ISIN,
 * then cached on the device. Only fund names and scheme codes are sent; no holdings or amounts leave the device.
 */

export const MFAPI_BASE = 'https://api.mfapi.in';
const CODE_CACHE_KEY = 'investireland_mf_codes_v1';
const LAST_RUN_KEY = 'investireland_nav_refresh_v1';
const REQUEST_TIMEOUT_MS = 8000;
const MAX_CANDIDATES_PER_FUND = 6;
const NOT_FOUND_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

type FetchFn = typeof fetch;

interface CodeCacheEntry {
  code: number | null;
  checkedAt: number;
}

export interface NavRefreshSummary {
  checked: number;
  updates: Holding[];
  notFound: string[];
  failed: number;
}

export const isRefreshableFund = (h: Holding) => !!h.isin && h.isin.startsWith('INF') && h.currency === 'INR' && h.units > 0;

function readCache(): Record<string, CodeCacheEntry> {
  try {
    const raw = globalThis.localStorage?.getItem(CODE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CodeCacheEntry>) {
  try {
    globalThis.localStorage?.setItem(CODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked: lookups simply happen again next time.
  }
}

async function getJson(fetchFn: FetchFn, url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetchFn(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

/** Search phrases from most to least specific, e.g. "Axis ELSS Tax Saver Fund - Direct Growth" -> "axis elss tax saver", "axis elss". */
export function searchQueriesFor(name: string): string[] {
  const base = words(name.split(/\s+-\s+|\(/)[0]).filter((w) => !['fund', 'plan', 'scheme', 'the', 'ltd', 'limited'].includes(w));
  const queries = [base.slice(0, 4), base.slice(0, 2)].map((w) => w.join(' ')).filter((q) => q.length >= 3);
  return [...new Set(queries)];
}

/** Ranks search results by how many words they share with the holding's name (plan and option words matter most). */
export function rankCandidates(name: string, results: { schemeCode: number; schemeName: string }[]) {
  const target = new Set(words(name));
  return results
    .map((r) => ({ ...r, score: words(r.schemeName).filter((w) => target.has(w)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES_PER_FUND);
}

interface LatestNav {
  code: number;
  nav: number;
  date: string;
  isins: string[];
}

async function fetchLatest(fetchFn: FetchFn, code: number): Promise<LatestNav | null> {
  const body = (await getJson(fetchFn, `${MFAPI_BASE}/mf/${code}/latest`)) as {
    meta?: { isin_growth?: string | null; isin_div_reinvestment?: string | null };
    data?: { date?: string; nav?: string }[];
  };
  const point = body?.data?.[0];
  const nav = Number(point?.nav);
  const date = point?.date ? parseCasDate(point.date) : null;
  if (!Number.isFinite(nav) || nav <= 0 || !date) return null;
  const isins = [body.meta?.isin_growth, body.meta?.isin_div_reinvestment].filter((x): x is string => !!x).map((x) => x.toUpperCase());
  return { code, nav, date, isins };
}

async function resolveLatest(fetchFn: FetchFn, holding: Holding, cache: Record<string, CodeCacheEntry>, now: number): Promise<LatestNav | null> {
  const isin = holding.isin!.toUpperCase();
  const cached = cache[isin];
  if (cached?.code) {
    const latest = await fetchLatest(fetchFn, cached.code);
    if (latest && latest.isins.includes(isin)) return latest;
  } else if (cached && cached.code === null && now - cached.checkedAt < NOT_FOUND_RETRY_MS) {
    return null;
  }

  const tried = new Set<number>();
  for (const q of searchQueriesFor(holding.assetName)) {
    const results = (await getJson(fetchFn, `${MFAPI_BASE}/mf/search?q=${encodeURIComponent(q)}`)) as { schemeCode: number; schemeName: string }[];
    if (!Array.isArray(results)) continue;
    for (const c of rankCandidates(holding.assetName, results)) {
      if (tried.has(c.schemeCode) || !Number.isInteger(c.schemeCode)) continue;
      tried.add(c.schemeCode);
      const latest = await fetchLatest(fetchFn, c.schemeCode);
      if (!latest) continue;
      for (const other of latest.isins) cache[other] = { code: latest.code, checkedAt: now };
      if (latest.isins.includes(isin)) return latest;
    }
  }
  cache[isin] = { code: null, checkedAt: now };
  return null;
}

/** Looks up today's NAV for each Indian fund holding and returns the holdings whose price changed. */
export async function refreshFundPrices(holdings: Holding[], fetchFn: FetchFn = fetch, now = new Date()): Promise<NavRefreshSummary> {
  const funds = holdings.filter(isRefreshableFund);
  const cache = readCache();
  const summary: NavRefreshSummary = { checked: funds.length, updates: [], notFound: [], failed: 0 };
  for (const h of funds) {
    try {
      const latest = await resolveLatest(fetchFn, h, cache, now.getTime());
      if (!latest) {
        summary.notFound.push(h.assetName);
        continue;
      }
      // Never replace a newer price (e.g. from a statement) with an older NAV.
      if (h.updatedAt && h.updatedAt.slice(0, 10) > latest.date) continue;
      if (Math.abs(latest.nav - h.unitPrice) < 1e-9 && h.updatedAt?.slice(0, 10) === latest.date) continue;
      summary.updates.push({
        ...h,
        unitPrice: latest.nav,
        currentValue: Math.round(h.units * latest.nav * 100) / 100,
        updatedAt: latest.date,
      });
    } catch {
      summary.failed++;
    }
  }
  writeCache(cache);
  return summary;
}

/** Automatic refresh runs at most once a day per user and device. */
export function shouldAutoRefresh(userId: string, holdings: Holding[], now = new Date()): boolean {
  if (!holdings.some(isRefreshableFund)) return false;
  try {
    const raw = globalThis.localStorage?.getItem(LAST_RUN_KEY);
    const last = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return last[userId] !== todayISODate(now);
  } catch {
    return true;
  }
}

export function markAutoRefreshed(userId: string, now = new Date()) {
  try {
    const raw = globalThis.localStorage?.getItem(LAST_RUN_KEY);
    const last = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    last[userId] = todayISODate(now);
    globalThis.localStorage?.setItem(LAST_RUN_KEY, JSON.stringify(last));
  } catch {
    // Ignore: worst case it refreshes again on the next visit.
  }
}
