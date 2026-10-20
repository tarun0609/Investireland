import { importPkcs8Pem, signRs256Jwt } from './crypto';
import { HttpError } from './http';

/* ---------- Value codec (Firestore REST "Value" JSON) ---------- */

export type FsValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } };

export type Plain = null | boolean | number | string | Date | Plain[] | { [key: string]: Plain | undefined };
export type DocData = Record<string, Plain | undefined>;

export function encodeValue(value: Plain): FsValue {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}

export function encodeFields(data: DocData): Record<string, FsValue> {
  const fields: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined) fields[k] = encodeValue(v);
  return fields;
}

/** Timestamps decode to Date so they round-trip. */
export function decodeValue(value: FsValue): Plain {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  return null;
}

export function decodeFields(fields: Record<string, FsValue>): Record<string, Plain> {
  const out: Record<string, Plain> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

/* ---------- Service account access token ---------- */

interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id?: string;
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getGoogleAccessToken(serviceAccountJson: string, fetchFn: typeof fetch = fetch, now = Date.now()): Promise<string> {
  let sa: ServiceAccount;
  try {
    sa = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT is not valid JSON');
  }
  const cached = tokenCache.get(sa.client_email);
  if (cached && cached.expiresAt > now + 60_000) return cached.token;

  const iat = Math.floor(now / 1000);
  const assertion = await signRs256Jwt(
    {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp: iat + 3600,
    },
    await importPkcs8Pem(sa.private_key),
    sa.private_key_id,
  );
  const res = await fetchFn('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(sa.client_email, { token: data.access_token, expiresAt: now + data.expires_in * 1000 });
  return data.access_token;
}

/* ---------- Firestore REST client ---------- */

export interface FsDocument {
  path: string;
  data: Record<string, Plain>;
  updateTime?: string;
}

export interface Write {
  update?: { name: string; fields: Record<string, FsValue> };
  delete?: string;
  updateMask?: { fieldPaths: string[] };
  updateTransforms?: { fieldPath: string; increment?: FsValue; setToServerValue?: 'REQUEST_TIME' }[];
  currentDocument?: { exists?: boolean; updateTime?: string };
}

export interface QueryFilter {
  field: string;
  op: 'EQUAL' | 'NOT_EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL' | 'IN';
  value: Plain;
}

export interface QueryOptions {
  where?: QueryFilter[];
  orderBy?: { field: string; direction?: 'ASCENDING' | 'DESCENDING' }[];
  limit?: number;
  startAfter?: Plain[];
}

const isMissingField = (path: string) => !/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(path);

export class Firestore {
  readonly root: string;
  private readonly baseUrl: string;

  constructor(
    private readonly projectId: string,
    private readonly getToken: () => Promise<string>,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    this.root = `projects/${projectId}/databases/(default)/documents`;
    this.baseUrl = `https://firestore.googleapis.com/v1/${this.root}`;
  }

  name(path: string) {
    return `${this.root}/${path}`;
  }

  private async call<T>(url: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetchFn(url, {
      ...init,
      headers: { Authorization: `Bearer ${await this.getToken()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 409 || /ABORTED|FAILED_PRECONDITION/.test(text)) throw new HttpError(409, 'That changed at the same time. Please try again.', 'conflict');
      throw new Error(`Firestore ${res.status}: ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  private toDoc(raw: { name: string; fields?: Record<string, FsValue>; updateTime?: string }): FsDocument {
    return { path: raw.name.slice(this.root.length + 1), data: decodeFields(raw.fields ?? {}), updateTime: raw.updateTime };
  }

  async get(path: string, transaction?: string): Promise<FsDocument | null> {
    const docs = await this.batchGet([path], transaction);
    return docs.get(path) ?? null;
  }

  async batchGet(paths: string[], transaction?: string): Promise<Map<string, FsDocument>> {
    const out = new Map<string, FsDocument>();
    if (paths.length === 0) return out;
    const results = await this.call<{ found?: { name: string; fields?: Record<string, FsValue>; updateTime?: string } }[]>(
      `${this.baseUrl}:batchGet`,
      { method: 'POST', body: JSON.stringify({ documents: paths.map((p) => this.name(p)), ...(transaction ? { transaction } : {}) }) },
    );
    for (const r of results) if (r.found) {
      const doc = this.toDoc(r.found);
      out.set(doc.path, doc);
    }
    return out;
  }

  async beginTransaction(): Promise<string> {
    const r = await this.call<{ transaction: string }>(`${this.baseUrl}:beginTransaction`, {
      method: 'POST',
      body: JSON.stringify({ options: { readWrite: {} } }),
    });
    return r.transaction;
  }

  async rollback(transaction: string) {
    await this.call(`${this.baseUrl}:rollback`, { method: 'POST', body: JSON.stringify({ transaction }) }).catch(() => undefined);
  }

  async commit(writes: Write[], transaction?: string) {
    await this.call(`${this.baseUrl}:commit`, { method: 'POST', body: JSON.stringify({ writes, ...(transaction ? { transaction } : {}) }) });
  }

  /** Runs fn inside a read-write transaction, retrying on contention. */
  async runTransaction<T>(fn: (tx: string) => Promise<{ writes: Write[]; result: T }>, attempts = 4): Promise<T> {
    for (let i = 0; ; i++) {
      const tx = await this.beginTransaction();
      try {
        const { writes, result } = await fn(tx);
        await this.commit(writes, tx);
        return result;
      } catch (err) {
        await this.rollback(tx);
        if (err instanceof HttpError && err.code === 'conflict' && i < attempts - 1) continue;
        throw err;
      }
    }
  }

  /** Merge-style write of the given fields (other fields are kept). */
  set(path: string, data: DocData, opts: { merge?: boolean; exists?: boolean } = {}): Write {
    const fields = encodeFields(data);
    const write: Write = { update: { name: this.name(path), fields } };
    if (opts.merge !== false) {
      for (const k of Object.keys(fields)) if (isMissingField(k)) throw new Error(`Unsupported field name ${k}`);
      write.updateMask = { fieldPaths: Object.keys(fields) };
    }
    if (opts.exists !== undefined) write.currentDocument = { exists: opts.exists };
    return write;
  }

  increment(path: string, field: string, by = 1, extra: DocData = {}): Write {
    const write = this.set(path, extra);
    write.updateTransforms = [{ fieldPath: field, increment: { integerValue: String(by) } }];
    return write;
  }

  remove(path: string): Write {
    return { delete: this.name(path) };
  }

  private structuredQuery(collection: string, q: QueryOptions) {
    const filters = (q.where ?? []).map((f) => ({ fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: encodeValue(f.value) } }));
    return {
      from: [{ collectionId: collection }],
      ...(filters.length === 1 ? { where: filters[0] } : filters.length > 1 ? { where: { compositeFilter: { op: 'AND', filters } } } : {}),
      ...(q.orderBy ? { orderBy: q.orderBy.map((o) => ({ field: { fieldPath: o.field }, direction: o.direction ?? 'ASCENDING' })) } : {}),
      ...(q.startAfter ? { startAt: { values: q.startAfter.map(encodeValue), before: false } } : {}),
      ...(q.limit ? { limit: q.limit } : {}),
    };
  }

  /** Queries a top-level collection. */
  async query(collection: string, q: QueryOptions = {}): Promise<FsDocument[]> {
    const rows = await this.call<{ document?: { name: string; fields?: Record<string, FsValue>; updateTime?: string } }[]>(
      `${this.baseUrl}:runQuery`,
      { method: 'POST', body: JSON.stringify({ structuredQuery: this.structuredQuery(collection, q) }) },
    );
    return rows.filter((r) => r.document).map((r) => this.toDoc(r.document!));
  }

  async count(collection: string, where: QueryFilter[] = []): Promise<number> {
    const rows = await this.call<{ result?: { aggregateFields?: Record<string, FsValue> } }[]>(`${this.baseUrl}:runAggregationQuery`, {
      method: 'POST',
      body: JSON.stringify({
        structuredAggregationQuery: {
          structuredQuery: this.structuredQuery(collection, { where }),
          aggregations: [{ alias: 'n', count: {} }],
        },
      }),
    });
    const value = rows[0]?.result?.aggregateFields?.n;
    return value ? Number(decodeValue(value)) : 0;
  }
}

export function firestoreFor(env: { FIREBASE_PROJECT_ID: string; GOOGLE_SERVICE_ACCOUNT: string }, fetchFn: typeof fetch = fetch) {
  return new Firestore(env.FIREBASE_PROJECT_ID, () => getGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT, fetchFn), fetchFn);
}
