import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Same public web config as the main site (src/services/firebase.ts); only Auth is used here.
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || '').trim().replace(/\/+$/, '');

export const AUTH_ERROR_EVENT = 'admin-auth-error';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError('Not signed in', 401, 'reauth');
  const token = await user.getIdToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: body !== undefined ? 'POST' : 'GET',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network error — could not reach the API.', 0);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const code = data?.code;
    if ((res.status === 403 && code === 'not_admin') || (res.status === 401 && code === 'reauth')) {
      window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT, { detail: code }));
    }
    throw new ApiError((data && typeof data.error === 'string' && data.error) || `Request failed (${res.status})`, res.status, data?.code);
  }
  return data as T;
}

export type Plan = 'free' | 'pro' | 'family';

export interface Overview {
  totalUsers: number;
  byPlan: Record<Plan, number>;
  bySource: Record<string, number>;
  promo: { redeemed: number; cap: number };
  email: { sentToday: number; dailyLimit: number };
  recentSignups: { uid: string; name: string; email: string; country: string; registeredAt: string | null }[];
}

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  country: string;
  registeredAt: string | null;
  plan: string;
  planSource: string | null;
  planExpiresAt: string | null;
  promoCode: string | null;
  stripeStatus: string | null;
  cancelAtPeriodEnd: boolean | null;
  householdRole: string | null;
  householdPartnerEmail: string | null;
  marketingOptOut: boolean | null;
}

export interface PromoCode {
  code: string;
  plan: string;
  months: number;
  maxRedemptions: number;
  redemptions: number;
  active: boolean;
  note: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  lastRedeemedAt: string | null;
}

export interface Campaign {
  id: string;
  audience: string;
  subject: string;
  requested: number;
  sent: number;
  sentAt: string | null;
}

const dateFmt = new Intl.DateTimeFormat('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function toDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(v: unknown): string {
  const d = toDate(v);
  return d ? dateFmt.format(d) : '—';
}

export function fmtDateTime(v: unknown): string {
  const d = toDate(v);
  return d ? dateTimeFmt.format(d) : '—';
}

export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename: string, rows: unknown[][]): void {
  const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
