import { EXPRESS_API_AVAILABLE } from '../config/runtime';
import { MarketIndex } from '../types';

export const FALLBACK_MARKET_INDICES: MarketIndex[] = [
  {
    id: 'iseq',
    symbol: '^ISEQ',
    name: 'ISEQ Overall Index',
    region: 'Ireland',
    exchange: 'Euronext Dublin',
    flag: '🇮🇪',
    currency: 'EUR',
    price: 9842.50,
    change: 44.10,
    changePercent: 0.45,
    timeframePerformance: {
      '1D': 0.45,
      '1W': 1.82,
      '1M': 3.40,
      'YTD': 12.60,
      '1Y': 18.25
    },
    dayLow: 9788.10,
    dayHigh: 9865.30,
    yearLow: 8120.00,
    yearHigh: 10020.00,
    marketStatus: 'Sample snapshot',
    portfolioContext: 'Direct benchmark for Irish equity pensions, Davy Select holdings, and domestic companies.',
    sparkline: [9680, 9710, 9745, 9720, 9790, 9820, 9842.50]
  },
  {
    id: 'nifty50',
    symbol: 'NIFTY 50',
    name: 'NIFTY 50',
    region: 'India',
    exchange: 'NSE (National Stock Exchange)',
    flag: '🇮🇳',
    currency: 'INR',
    price: 25285.30,
    change: 171.20,
    changePercent: 0.68,
    timeframePerformance: {
      '1D': 0.68,
      '1W': 1.25,
      '1M': 2.90,
      'YTD': 16.40,
      '1Y': 28.50
    },
    dayLow: 25110.40,
    dayHigh: 25340.80,
    yearLow: 19250.00,
    yearHigh: 26277.00,
    marketStatus: 'Sample snapshot',
    portfolioContext: 'Directly influences Indian mutual fund SIPs (Parag Parikh, HDFC) and NSE direct equities under DTAA.',
    sparkline: [24800, 24920, 25050, 24980, 25150, 25210, 25285.30]
  },
  {
    id: 'sp500',
    symbol: '^GSPC',
    name: 'S&P 500 Index',
    region: 'United States',
    exchange: 'NYSE / NASDAQ',
    flag: '🇺🇸',
    currency: 'USD',
    price: 5782.40,
    change: 18.45,
    changePercent: 0.32,
    timeframePerformance: {
      '1D': 0.32,
      '1W': 0.95,
      '1M': 4.10,
      'YTD': 21.50,
      '1Y': 31.80
    },
    dayLow: 5752.10,
    dayHigh: 5795.60,
    yearLow: 4210.00,
    yearHigh: 5820.00,
    marketStatus: 'Sample snapshot',
    portfolioContext: 'Primary driver of US employer tech RSUs (Alphabet, Microsoft) and European UCITS World ETFs.',
    sparkline: [5620, 5660, 5710, 5690, 5740, 5765, 5782.40]
  }
];

export const MARKET_INDICES_AS_OF = '2026-10-09';

export interface MarketSnapshot {
  data: MarketIndex[];
  /** True when figures are illustrative rather than a live exchange feed. */
  isSample: boolean;
  asOf: string;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isValidIndex(v: unknown): v is MarketIndex {
  if (!v || typeof v !== 'object') return false;
  const m = v as Partial<MarketIndex>;
  const perf = m.timeframePerformance as Record<string, unknown> | undefined;
  return typeof m.id === 'string' && typeof m.name === 'string' && isFiniteNumber(m.price)
    && isFiniteNumber(m.dayLow) && isFiniteNumber(m.dayHigh)
    && !!perf && ['1D', '1W', '1M', 'YTD', '1Y'].every(k => isFiniteNumber(perf[k]))
    && Array.isArray(m.sparkline) && m.sparkline.length >= 2 && m.sparkline.every(isFiniteNumber);
}

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  if (!EXPRESS_API_AVAILABLE) return { data: FALLBACK_MARKET_INDICES, isSample: true, asOf: MARKET_INDICES_AS_OF };
  try {
    const res = await fetch('/api/market-indices');
    if (!res.ok) throw new Error(`Failed to fetch market indices HTTP ${res.status}`);
    const json = await res.json();
    if (json && Array.isArray(json.data) && json.data.length > 0 && json.data.every(isValidIndex)) {
      return { data: json.data, isSample: json.isSample !== false, asOf: typeof json.asOf === 'string' && json.asOf ? json.asOf : MARKET_INDICES_AS_OF };
    }
    throw new Error('Market indices payload failed validation');
  } catch (err) {
    console.warn('Using bundled sample market indices:', err);
  }
  return { data: FALLBACK_MARKET_INDICES, isSample: true, asOf: MARKET_INDICES_AS_OF };
}

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  return (await fetchMarketSnapshot()).data;
}