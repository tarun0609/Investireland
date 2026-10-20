import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Holding, InvestmentAccountState } from '../types';
import { INITIAL_HOLDINGS, INITIAL_INVESTMENT_ACCOUNT_STATE } from '../data/mockData';

/**
 * Persistence model
 * - Signed out ("guest"): data lives only in this browser's localStorage. A guest
 *   with no saved data sees the demo portfolio.
 * - Signed in: Firestore (users/{uid}/...) is the source of truth, protected by
 *   owner-only security rules. An empty portfolio stays empty.
 */

const GUEST_SCOPE = 'guest';
const PORTFOLIO_KEY_PREFIX = 'investireland_portfolio_';
const INVESTMENT_ACCOUNT_KEY_PREFIX = 'investireland_inv_account_';
const INVESTMENT_ACCOUNT_DOC_ID = 'budget2027_investment_account';

export interface PersistResult {
  success: boolean;
  error?: string;
}

function signedInUid(userId: string): string | null {
  const uid = auth.currentUser?.uid;
  return uid && uid === userId ? uid : null;
}

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown): PersistResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { success: true };
  } catch {
    return { success: false, error: 'Could not save to this browser (storage may be full or disabled).' };
  }
}

export function toFirestoreId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return safe || `h_${Date.now()}`;
}

function holdingFromDoc(id: string, item: Record<string, any>): Holding {
  return {
    id,
    assetName: item.assetName || item.name || 'Untitled holding',
    assetType: item.assetType || item.category || 'ETF',
    units: Number(item.units) || 0,
    unitPrice: Number(item.unitPrice) || 0,
    currentValue: Number(item.currentValue) || 0,
    currency: item.currency || 'EUR',
    country: item.country || 'Ireland',
    provider: item.provider || '',
    ticker: item.ticker || undefined,
    isin: item.isin || undefined,
    purchaseValue: item.purchaseValue ?? undefined,
    notes: item.notes || undefined,
    updatedAt: item.updatedAt || new Date().toISOString(),
  } as Holding;
}

export async function loadUserHoldings(userId: string): Promise<Holding[]> {
  const uid = signedInUid(userId);
  if (!uid) {
    return readLocal<Holding[]>(`${PORTFOLIO_KEY_PREFIX}${GUEST_SCOPE}`) ?? INITIAL_HOLDINGS;
  }
  const snap = await getDocs(collection(db, 'users', uid, 'holdings'));
  const holdings: Holding[] = [];
  snap.forEach((d) => holdings.push(holdingFromDoc(d.id, d.data())));
  return holdings.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
}

/** Read-only holdings of a Family-plan household partner (allowed by Firestore rules while the plan is active). */
export async function loadPartnerHoldings(partnerUid: string): Promise<Holding[]> {
  const snap = await getDocs(collection(db, 'users', partnerUid, 'holdings'));
  const holdings: Holding[] = [];
  snap.forEach((d) => holdings.push(holdingFromDoc(d.id, d.data())));
  return holdings;
}

export async function saveUserHolding(userId: string, holding: Holding): Promise<PersistResult> {
  const uid = signedInUid(userId);
  if (!uid) {
    const key = `${PORTFOLIO_KEY_PREFIX}${GUEST_SCOPE}`;
    const list = readLocal<Holding[]>(key) ?? [...INITIAL_HOLDINGS];
    const index = list.findIndex((h) => h.id === holding.id);
    if (index >= 0) list[index] = holding;
    else list.unshift(holding);
    return writeLocal(key, list);
  }
  try {
    const holdingId = toFirestoreId(holding.id);
    await setDoc(
      doc(db, 'users', uid, 'holdings', holdingId),
      {
        holdingId,
        userId: uid,
        name: holding.assetName.slice(0, 150),
        assetName: holding.assetName.slice(0, 150),
        category: holding.assetType,
        assetType: holding.assetType,
        units: Number(holding.units) || 0,
        unitPrice: Number(holding.unitPrice) || 0,
        currentValue: Number(holding.currentValue) || 0,
        currency: holding.currency,
        country: holding.country,
        provider: holding.provider || '',
        ticker: holding.ticker || '',
        isin: holding.isin || '',
        purchaseValue: holding.purchaseValue ?? null,
        notes: (holding.notes || '').slice(0, 1000),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    console.error('Failed to save holding', err);
    return { success: false, error: 'Could not save this holding to your account. Please try again.' };
  }
}

export async function removeUserHolding(userId: string, holdingId: string): Promise<PersistResult> {
  const uid = signedInUid(userId);
  if (!uid) {
    const key = `${PORTFOLIO_KEY_PREFIX}${GUEST_SCOPE}`;
    const list = readLocal<Holding[]>(key) ?? [...INITIAL_HOLDINGS];
    return writeLocal(key, list.filter((h) => h.id !== holdingId));
  }
  try {
    await deleteDoc(doc(db, 'users', uid, 'holdings', toFirestoreId(holdingId)));
    return { success: true };
  } catch (err) {
    console.error('Failed to delete holding', err);
    return { success: false, error: 'Could not delete this holding from your account. Please try again.' };
  }
}

export async function loadInvestmentAccountState(userId: string): Promise<InvestmentAccountState> {
  const uid = signedInUid(userId);
  if (!uid) {
    return readLocal<InvestmentAccountState>(`${INVESTMENT_ACCOUNT_KEY_PREFIX}${GUEST_SCOPE}`) ?? INITIAL_INVESTMENT_ACCOUNT_STATE;
  }
  const accountDoc = await getDoc(doc(db, 'users', uid, 'accounts', INVESTMENT_ACCOUNT_DOC_ID));
  if (!accountDoc.exists()) {
    return { ...INITIAL_INVESTMENT_ACCOUNT_STATE, accountValue: 0, annualContributions: 0, history: [] };
  }
  const { updatedAt: _updatedAt, ...state } = accountDoc.data() as InvestmentAccountState & { updatedAt?: string };
  return { ...INITIAL_INVESTMENT_ACCOUNT_STATE, ...state };
}

export async function saveInvestmentAccountState(userId: string, state: InvestmentAccountState): Promise<PersistResult> {
  const uid = signedInUid(userId);
  if (!uid) return writeLocal(`${INVESTMENT_ACCOUNT_KEY_PREFIX}${GUEST_SCOPE}`, state);
  try {
    await setDoc(doc(db, 'users', uid, 'accounts', INVESTMENT_ACCOUNT_DOC_ID), {
      ...JSON.parse(JSON.stringify(state)),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to save investment account', err);
    return { success: false, error: 'Could not save your Investment Account changes. Please try again.' };
  }
}
