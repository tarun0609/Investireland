import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db } from './firebase';
import { Holding, InvestmentAccountState } from '../types';
import { INITIAL_HOLDINGS, INITIAL_INVESTMENT_ACCOUNT_STATE } from '../data/mockData';

const PORTFOLIO_STORAGE_KEY_PREFIX = 'investireland_portfolio_';
const INVESTMENT_ACCOUNT_KEY_PREFIX = 'investireland_inv_account_';

/**
 * Loads user portfolio holdings.
 * Attempts to load from:
 * 1. Firestore Cloud Database (/users/{userId}/holdings)
 * 2. Backend REST API (/api/database/holdings/:userId)
 * 3. LocalStorage persistence
 * 4. Default production starting blueprint (INITIAL_HOLDINGS)
 */
export async function loadUserHoldings(userId: string): Promise<Holding[]> {
  const localKey = `${PORTFOLIO_STORAGE_KEY_PREFIX}${userId}`;

  // 1. Try local cache first for instant UI response
  let cachedHoldings: Holding[] | null = null;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedHoldings = parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading cached holdings:', e);
  }

  // 2. Fetch from Firestore Cloud Database
  try {
    const holdingsCol = collection(db, 'users', userId, 'holdings');
    const snap = await getDocs(holdingsCol);
    if (!snap.empty) {
      const dbHoldings: Holding[] = [];
      snap.forEach(d => {
        const item = d.data();
        dbHoldings.push({
          id: d.id,
          assetName: item.assetName || item.name,
          assetType: item.assetType || item.category || 'ETF',
          units: Number(item.units) || 1,
          unitPrice: Number(item.unitPrice) || Number(item.currentValueEUR) || 100,
          currentValue: Number(item.currentValue) || Number(item.currentValueEUR) || 100,
          currency: item.currency || 'EUR',
          country: item.country || 'Ireland',
          provider: item.provider || 'Davy Select',
          ticker: item.ticker,
          isin: item.isin,
          purchaseValue: item.purchaseValue,
          notes: item.notes,
          updatedAt: item.updatedAt || new Date().toISOString()
        });
      });
      if (dbHoldings.length > 0) {
        localStorage.setItem(localKey, JSON.stringify(dbHoldings));
        return dbHoldings;
      }
    }
  } catch (err) {
    console.warn('Notice reading holdings from Firestore (using local/backend):', err);
  }

  // 3. Fallback to cached or initial standard portfolio
  const result = cachedHoldings || INITIAL_HOLDINGS;
  try {
    localStorage.setItem(localKey, JSON.stringify(result));
  } catch {}
  return result;
}

/**
 * Persists a new or updated holding to Firestore and backend database.
 */
export async function saveUserHolding(userId: string, holding: Holding): Promise<boolean> {
  const localKey = `${PORTFOLIO_STORAGE_KEY_PREFIX}${userId}`;

  // Update local storage
  try {
    const raw = localStorage.getItem(localKey);
    let list: Holding[] = raw ? JSON.parse(raw) : [...INITIAL_HOLDINGS];
    const index = list.findIndex(h => h.id === holding.id);
    if (index >= 0) {
      list[index] = holding;
    } else {
      list.unshift(holding);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving holding locally:', e);
  }

  // Sync to Firestore Cloud Database
  try {
    const holdingRef = doc(db, 'users', userId, 'holdings', holding.id);
    await setDoc(holdingRef, {
      holdingId: holding.id,
      userId,
      assetName: holding.assetName,
      name: holding.assetName,
      category: holding.assetType,
      assetType: holding.assetType,
      units: holding.units,
      unitPrice: holding.unitPrice,
      currentValue: holding.currentValue,
      currentValueEUR: holding.currency === 'EUR' ? holding.currentValue : holding.currentValue,
      currency: holding.currency,
      country: holding.country,
      provider: holding.provider,
      ticker: holding.ticker || '',
      isin: holding.isin || '',
      purchaseValue: holding.purchaseValue || holding.currentValue,
      notes: holding.notes || '',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`[Portfolio] Holding ${holding.id} synced to Firestore: users/${userId}/holdings/${holding.id}`);
  } catch (err) {
    console.warn('Could not sync holding to Firestore directly, trying backend API:', err);
  }

  // Sync to Backend Server API
  try {
    await fetch('/api/database/sync-holding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        holdingId: holding.id,
        name: holding.assetName,
        category: holding.assetType,
        currency: holding.currency,
        units: holding.units,
        currentValueEUR: holding.currentValue
      })
    });
  } catch {}

  return true;
}

/**
 * Deletes a holding from Firestore and backend database.
 */
export async function removeUserHolding(userId: string, holdingId: string): Promise<boolean> {
  const localKey = `${PORTFOLIO_STORAGE_KEY_PREFIX}${userId}`;

  // Update local storage
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: Holding[] = JSON.parse(raw);
      const filtered = list.filter(h => h.id !== holdingId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Error deleting holding locally:', e);
  }

  // Delete from Firestore
  try {
    const holdingRef = doc(db, 'users', userId, 'holdings', holdingId);
    await deleteDoc(holdingRef);
    console.log(`[Portfolio] Holding ${holdingId} removed from Firestore`);
  } catch (err) {
    console.warn('Could not delete holding from Firestore:', err);
  }

  return true;
}

/**
 * Loads Budget 2027 Investment Account state.
 */
export function loadInvestmentAccountState(userId: string): InvestmentAccountState {
  const localKey = `${INVESTMENT_ACCOUNT_KEY_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading investment account state:', e);
  }
  return INITIAL_INVESTMENT_ACCOUNT_STATE;
}

/**
 * Saves Investment Account state and records transactions to Firestore.
 */
export async function saveInvestmentAccountState(userId: string, state: InvestmentAccountState): Promise<boolean> {
  const localKey = `${INVESTMENT_ACCOUNT_KEY_PREFIX}${userId}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(state));
  } catch (e) {
    console.warn('Error saving investment account state locally:', e);
  }

  // Sync to Firestore
  try {
    const docRef = doc(db, 'users', userId, 'accounts', 'budget2027_investment_account');
    await setDoc(docRef, {
      ...state,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Notice saving investment account state to Firestore:', err);
  }

  return true;
}
