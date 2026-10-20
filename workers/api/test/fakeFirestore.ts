import { decodeFields, decodeValue, Firestore, type FsValue, type Plain } from '../src/firestore';

type Fields = Record<string, FsValue>;
const ROOT = 'projects/test/databases/(default)/documents';

const cmp = (a: Plain, b: Plain) => {
  const x = a instanceof Date ? a.getTime() : a;
  const y = b instanceof Date ? b.getTime() : b;
  return x === y ? 0 : (x as any) < (y as any) ? -1 : 1;
};

/** In-memory stand-in for the Firestore REST endpoints used by the Worker. */
export class FakeFirestoreServer {
  docs = new Map<string, Fields>();
  commits = 0;

  seed(path: string, data: Record<string, Plain>) {
    const write = this.client().set(path, data as any, { merge: false });
    this.docs.set(path, write.update!.fields);
  }

  data(path: string) {
    const f = this.docs.get(path);
    return f ? decodeFields(f) : undefined;
  }

  client() {
    return new Firestore('test', async () => 't', this.fetch);
  }

  private rel = (name: string) => name.slice(ROOT.length + 1);

  fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
    if (url.endsWith(':beginTransaction')) return ok({ transaction: 'tx' });
    if (url.endsWith(':rollback')) return ok({});
    if (url.endsWith(':batchGet')) {
      return ok((body.documents as string[]).map((name) => {
        const f = this.docs.get(this.rel(name));
        return f ? { found: { name, fields: f, updateTime: 'now' } } : { missing: name };
      }));
    }
    if (url.endsWith(':commit')) {
      const staged = new Map(this.docs);
      for (const w of body.writes) {
        if (w.delete) { staged.delete(this.rel(w.delete)); continue; }
        const path = this.rel(w.update.name);
        const existing = staged.get(path);
        if (w.currentDocument?.exists === false && existing) return new Response('ALREADY_EXISTS', { status: 409 });
        if (w.currentDocument?.exists === true && !existing) return new Response('NOT_FOUND', { status: 404 });
        let next: Fields;
        if (w.updateMask) {
          next = { ...(existing ?? {}) };
          for (const p of w.updateMask.fieldPaths) {
            if (p in w.update.fields) next[p] = w.update.fields[p];
            else delete next[p];
          }
        } else next = { ...w.update.fields };
        for (const t of w.updateTransforms ?? []) {
          const cur = next[t.fieldPath] ? Number(decodeValue(next[t.fieldPath])) : 0;
          next[t.fieldPath] = { integerValue: String(cur + Number(t.increment.integerValue)) };
        }
        staged.set(path, next);
      }
      this.docs = staged;
      this.commits++;
      return ok({});
    }
    if (url.endsWith(':runQuery') || url.endsWith(':runAggregationQuery')) {
      const q = body.structuredQuery ?? body.structuredAggregationQuery.structuredQuery;
      const collection = q.from[0].collectionId;
      const filters = q.where ? (q.where.compositeFilter ? q.where.compositeFilter.filters : [q.where]) : [];
      let rows = [...this.docs.entries()]
        .filter(([p]) => p.split('/').length === 2 && p.startsWith(`${collection}/`))
        .map(([p, f]) => ({ p, f, d: decodeFields(f) }))
        .filter(({ d }) => filters.every(({ fieldFilter: ff }: any) => {
          const v = d[ff.field.fieldPath];
          if (v === undefined) return false;
          const c = cmp(v, decodeValue(ff.value));
          return ff.op === 'EQUAL' ? c === 0 : ff.op === 'GREATER_THAN' ? c > 0 : ff.op === 'LESS_THAN' ? c < 0 : true;
        }));
      const order = q.orderBy?.[0];
      if (order) {
        const f = order.field.fieldPath;
        const dir = order.direction === 'DESCENDING' ? -1 : 1;
        rows = rows.filter((r) => r.d[f] !== undefined).sort((a, b) => cmp(a.d[f], b.d[f]) * dir);
        if (q.startAt) {
          const after = decodeValue(q.startAt.values[0]);
          rows = rows.filter((r) => cmp(r.d[f], after) * dir > 0);
        }
      }
      if (url.endsWith(':runAggregationQuery')) return ok([{ result: { aggregateFields: { n: { integerValue: String(rows.length) } } } }]);
      if (q.limit) rows = rows.slice(0, q.limit);
      return ok(rows.length ? rows.map((r) => ({ document: { name: `${ROOT}/${r.p}`, fields: r.f } })) : [{ readTime: 'now' }]);
    }
    return new Response('unexpected ' + url, { status: 500 });
  }) as typeof fetch;
}
