import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Holding } from '../types';
import { markAutoRefreshed, rankCandidates, refreshFundPrices, searchQueriesFor, shouldAutoRefresh } from './navRefreshService';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const fund = (over: Partial<Holding> = {}): Holding => ({
  id: 'h1',
  assetName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
  assetType: 'Mutual Fund',
  isin: 'INF879O01027',
  units: 1000,
  unitPrice: 85.1,
  currentValue: 85100,
  currency: 'INR',
  country: 'India',
  provider: 'Indian CAS',
  updatedAt: '2026-09-30',
  ...over,
});

const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

function mfapi() {
  return vi.fn((url: string) => {
    if (url.includes('/mf/search')) {
      return json([
        { schemeCode: 122640, schemeName: 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth' },
        { schemeCode: 122639, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
      ]);
    }
    if (url.endsWith('/mf/122639/latest')) {
      return json({ meta: { isin_growth: 'INF879O01027', isin_div_reinvestment: null }, data: [{ date: '19-10-2026', nav: '90.35460' }] });
    }
    if (url.endsWith('/mf/122640/latest')) {
      return json({ meta: { isin_growth: 'INF879O01019', isin_div_reinvestment: null }, data: [{ date: '19-10-2026', nav: '84.10000' }] });
    }
    return Promise.resolve(new Response('not found', { status: 404 }));
  });
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});

describe('searchQueriesFor / rankCandidates', () => {
  it('builds short name searches and ranks the matching plan first', () => {
    expect(searchQueriesFor('Axis ELSS Tax Saver Fund - Direct Growth')).toEqual(['axis elss tax saver', 'axis elss']);
    const ranked = rankCandidates('Parag Parikh Flexi Cap Fund - Direct Plan - Growth', [
      { schemeCode: 1, schemeName: 'Parag Parikh Flexi Cap Fund - Regular Plan - IDCW' },
      { schemeCode: 2, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
    ]);
    expect(ranked[0].schemeCode).toBe(2);
  });
});

describe('refreshFundPrices', () => {
  it('finds the scheme by ISIN and values units at the latest NAV', async () => {
    const fetchFn = mfapi();
    const r = await refreshFundPrices([fund(), fund({ id: 'eq', isin: 'INE002A01018', assetType: 'Share' })], fetchFn as unknown as typeof fetch);
    expect(r.checked).toBe(1);
    expect(r.updates).toHaveLength(1);
    expect(r.updates[0]).toMatchObject({ id: 'h1', unitPrice: 90.3546, currentValue: 90354.6, updatedAt: '2026-10-19' });
  });

  it('uses the cached scheme code next time', async () => {
    await refreshFundPrices([fund()], mfapi() as unknown as typeof fetch);
    const fetchFn = mfapi();
    await refreshFundPrices([fund()], fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.mfapi.in/mf/122639/latest');
  });

  it('never overwrites a newer price with an older NAV', async () => {
    const r = await refreshFundPrices([fund({ updatedAt: '2026-10-20' })], mfapi() as unknown as typeof fetch);
    expect(r.updates).toHaveLength(0);
  });

  it('reports funds it cannot find and survives network errors', async () => {
    const notFound = await refreshFundPrices([fund({ isin: 'INF846K01EW2', assetName: 'Parag Parikh Something' })], mfapi() as unknown as typeof fetch);
    expect(notFound.notFound).toEqual(['Parag Parikh Something']);

    const failing = vi.fn(() => Promise.reject(new Error('offline')));
    const r = await refreshFundPrices([fund({ isin: 'INF204KB14I2', assetName: 'Nippon India ETF Nifty 50 BeES' })], failing as unknown as typeof fetch);
    expect(r.failed).toBe(1);
  });
});

describe('auto refresh', () => {
  it('runs once a day per user only when there are Indian funds', () => {
    const now = new Date('2026-10-20T09:00:00');
    expect(shouldAutoRefresh('u1', [fund({ isin: 'IE00B4L5Y983', currency: 'EUR' })], now)).toBe(false);
    expect(shouldAutoRefresh('u1', [fund()], now)).toBe(true);
    markAutoRefreshed('u1', now);
    expect(shouldAutoRefresh('u1', [fund()], now)).toBe(false);
    expect(shouldAutoRefresh('u2', [fund()], now)).toBe(true);
    expect(shouldAutoRefresh('u1', [fund()], new Date('2026-10-21T09:00:00'))).toBe(true);
  });
});
