import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Copy, Download, Eye, Gift, Plus, Search, Send, X } from 'lucide-react';
import { api, downloadCsv, errMsg, fmtDate, fmtDateTime, type AdminUser, type Campaign, type Overview, type PromoCode } from './lib';
import { Button, Card, ErrorBox, Field, PlanBadge, Progress, Spinner, inputCls } from './ui';

const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';
const td = 'px-3 py-2 align-top text-sm text-slate-700';

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{typeof value === 'number' ? value.toLocaleString('en-IE') : value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- Overview */

export function OverviewTab() {
  const { data, error, loading } = useLoad<Overview>('/admin/overview');
  if (loading) return <Spinner />;
  if (!data) return <ErrorBox message={error || 'No data'} />;
  const sources = Object.entries(data.bySource || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total users" value={data.totalUsers} />
        <Stat label="Free" value={data.byPlan?.free ?? 0} />
        <Stat label="Pro" value={data.byPlan?.pro ?? 0} />
        <Stat label="Family" value={data.byPlan?.family ?? 0} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Quotas">
          <div className="space-y-4">
            <Progress label="Free Pro places used (promo)" value={data.promo.redeemed} max={data.promo.cap} />
            <Progress label="Emails sent today" value={data.email.sentToday} max={data.email.dailyLimit} />
          </div>
        </Card>
        <Card title="Plans by source">
          {sources.length === 0 ? (
            <p className="text-sm text-slate-500">No paid or granted plans yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {sources.map(([src, n]) => (
                <li key={src} className="flex justify-between py-1.5">
                  <span className="capitalize text-slate-600">{src}</span>
                  <span className="font-medium text-slate-900">{n.toLocaleString('en-IE')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Recent sign-ups">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Country</th>
                <th className={th}>Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentSignups.map((u) => (
                <tr key={u.uid}>
                  <td className={td}>{u.name || '—'}</td>
                  <td className={td}>{u.email}</td>
                  <td className={td}>{u.country || '—'}</td>
                  <td className={td}>{fmtDateTime(u.registeredAt)}</td>
                </tr>
              ))}
              {data.recentSignups.length === 0 && (
                <tr>
                  <td className={td} colSpan={4}>
                    No sign-ups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Customers */

type UsersPage = { users: AdminUser[]; nextCursor: string | null };
const PAGE = 50;

function GrantDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: (u: Partial<AdminUser>) => void }) {
  const [plan, setPlan] = useState<'pro' | 'family' | 'none'>('pro');
  const [months, setMonths] = useState(12);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ uid: string; plan: string; planSource: string | null; planExpiresAt: string | null }>('/admin/grant', {
        uid: user.uid,
        plan,
        months,
        note: note.trim(),
      });
      onDone({ plan: res.plan, planSource: res.planSource, planExpiresAt: res.planExpiresAt });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-900">Grant plan</h3>
            <p className="text-sm text-slate-500">
              {user.name || user.email} · currently <PlanBadge plan={user.plan} />
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ErrorBox message={error} />
        <Field label="Plan">
          <select value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)} className={inputCls}>
            <option value="pro">Pro</option>
            <option value="family">Family</option>
            <option value="none">None (revoke manual grant)</option>
          </select>
        </Field>
        {plan !== 'none' && (
          <Field label="Months" hint="1–36 months from today.">
            <input type="number" min={1} max={36} required value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputCls} />
          </Field>
        )}
        <Field label="Note (optional)">
          <input type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="e.g. beta tester thank-you" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CustomersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState('all');
  const [grantFor, setGrantFor] = useState<AdminUser | null>(null);

  const loadFirst = useCallback(async (email?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = email ? `email=${encodeURIComponent(email)}` : `limit=${PAGE}`;
      const res = await api<UsersPage>(`/admin/users?${qs}`);
      setUsers(res.users);
      setCursor(email ? null : res.nextCursor);
      setSearching(email || null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = async () => {
    if (!cursor) return;
    setMoreLoading(true);
    setError(null);
    try {
      const res = await api<UsersPage>(`/admin/users?limit=${PAGE}&cursor=${encodeURIComponent(cursor)}`);
      setUsers((prev) => [...prev, ...res.users]);
      setCursor(res.nextCursor);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setMoreLoading(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const all: AdminUser[] = [];
      let next: string | null = null;
      for (let i = 0; i < 1000; i++) {
        const qs: string = `limit=${PAGE}` + (next ? `&cursor=${encodeURIComponent(next)}` : '');
        const res: UsersPage = await api<UsersPage>(`/admin/users?${qs}`);
        all.push(...res.users);
        next = res.nextCursor;
        if (!next) break;
      }
      const cols: (keyof AdminUser)[] = [
        'uid', 'name', 'email', 'country', 'registeredAt', 'plan', 'planSource', 'planExpiresAt', 'promoCode',
        'stripeStatus', 'cancelAtPeriodEnd', 'householdRole', 'householdPartnerEmail', 'marketingOptOut',
      ];
      downloadCsv(`investireland-customers-${new Date().toISOString().slice(0, 10)}.csv`, [cols, ...all.map((u) => cols.map((c) => u[c]))]);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setExporting(false);
    }
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    void loadFirst(q || undefined);
  };

  const visible = useMemo(() => (planFilter === 'all' ? users : users.filter((u) => (u.plan || 'free') === planFilter)), [users, planFilter]);

  return (
    <Card
      title={`Customers${users.length ? ` (${visible.length}${planFilter !== 'all' ? ` of ${users.length}` : ''} loaded)` : ''}`}
      actions={
        <Button variant="secondary" onClick={exportCsv} loading={exporting}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <form onSubmit={onSearch} className="flex flex-1 gap-2">
          <input type="email" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find by exact email…" className={inputCls} />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
          {searching && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                void loadFirst();
              }}
            >
              Clear
            </Button>
          )}
        </form>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className={`${inputCls} sm:w-40`} aria-label="Filter by plan">
          <option value="all">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="family">Family</option>
        </select>
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>Country</th>
                  <th className={th}>Registered</th>
                  <th className={th}>Plan</th>
                  <th className={th}>Details</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((u) => (
                  <tr key={u.uid}>
                    <td className={td}>
                      <div className="font-medium text-slate-900">{u.name || '—'}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className={td}>{u.country || '—'}</td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(u.registeredAt)}</td>
                    <td className={td}>
                      <PlanBadge plan={u.plan} />
                      {u.planSource && <div className="mt-0.5 text-xs text-slate-500">{u.planSource}</div>}
                      {u.planExpiresAt && <div className="text-xs text-slate-500">until {fmtDate(u.planExpiresAt)}</div>}
                    </td>
                    <td className={`${td} text-xs text-slate-500`}>
                      {u.promoCode && <div>Promo: {u.promoCode}</div>}
                      {u.stripeStatus && (
                        <div>
                          Stripe: {u.stripeStatus}
                          {u.cancelAtPeriodEnd ? ' (cancelling)' : ''}
                        </div>
                      )}
                      {u.householdRole && (
                        <div>
                          Household: {u.householdRole}
                          {u.householdPartnerEmail ? ` · ${u.householdPartnerEmail}` : ''}
                        </div>
                      )}
                      {u.marketingOptOut && <div>Unsubscribed</div>}
                    </td>
                    <td className={`${td} text-right`}>
                      <Button variant="secondary" onClick={() => setGrantFor(u)}>
                        <Gift className="h-4 w-4" /> Grant
                      </Button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td className={td} colSpan={6}>
                      {searching ? 'No customer with that email.' : 'No customers match.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {cursor && (
            <div className="mt-4 text-center">
              <Button variant="secondary" onClick={loadMore} loading={moreLoading}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
      {grantFor && (
        <GrantDialog
          user={grantFor}
          onClose={() => setGrantFor(null)}
          onDone={(patch) => {
            setUsers((prev) => prev.map((u) => (u.uid === grantFor.uid ? { ...u, ...patch } : u)));
            setGrantFor(null);
          }}
        />
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------- Promos */

type PromosRes = { codes: PromoCode[]; redeemed: number; cap: number };

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      title="Copy code"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt('Copy this code:', text);
        }
      }}
    >
      {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function PromosTab() {
  const { data, error, loading, reload } = useLoad<PromosRes>('/admin/promos');
  const [code, setCode] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [months, setMonths] = useState(12);
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const cap = data?.cap ?? 1000;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreated(null);
    const c = code.trim().toUpperCase();
    if (c && !/^[A-Z0-9-]{4,32}$/.test(c)) {
      setFormError('Code must be 4–32 characters: A–Z, 0–9 and hyphens.');
      return;
    }
    const body: Record<string, unknown> = { maxRedemptions, months };
    if (c) body.code = c;
    if (note.trim()) body.note = note.trim();
    if (expiresAt) body.expiresAt = new Date(`${expiresAt}T23:59:59Z`).toISOString();
    setBusy(true);
    try {
      const res = await api<PromoCode>('/admin/promos', body);
      setCreated(res.code);
      setCode('');
      setNote('');
      setExpiresAt('');
      await reload();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p: PromoCode) => {
    setToggling(p.code);
    setFormError(null);
    try {
      await api('/admin/promos/active', { code: p.code, active: !p.active });
      await reload();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      {data && (
        <Card>
          <Progress label={`${data.redeemed.toLocaleString('en-IE')} of ${data.cap.toLocaleString('en-IE')} free Pro places used`} value={data.redeemed} max={data.cap} />
        </Card>
      )}
      <Card title="Create promo code">
        <ErrorBox message={formError} />
        {created && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <Check className="h-4 w-4" /> Created <code className="font-semibold">{created}</code>
            <CopyButton text={created} />
          </div>
        )}
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Code (optional)" hint="Leave blank to auto-generate EARLY-XXXXXXXX.">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={32}
              placeholder="EARLY-…"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="Max redemptions" hint={`1–${cap.toLocaleString('en-IE')}`}>
            <input type="number" min={1} max={cap} required value={maxRedemptions} onChange={(e) => setMaxRedemptions(Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Months of Pro" hint="1–24">
            <input type="number" min={1} max={24} required value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Note (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={inputCls} placeholder="e.g. Reddit launch post" />
          </Field>
          <Field label="Code expires (optional)">
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" loading={busy} className="w-full">
              <Plus className="h-4 w-4" /> Create code
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Promo codes">
        <ErrorBox message={error} />
        {loading && !data ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className={th}>Code</th>
                  <th className={th}>Plan</th>
                  <th className={th}>Used</th>
                  <th className={th}>Created</th>
                  <th className={th}>Expires</th>
                  <th className={th}>Last used</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.codes.map((p) => (
                  <tr key={p.code} className={p.active ? '' : 'opacity-60'}>
                    <td className={td}>
                      <div className="flex items-center gap-1">
                        <code className="font-mono font-semibold text-slate-900">{p.code}</code>
                        <CopyButton text={p.code} />
                      </div>
                      {p.note && <div className="text-xs text-slate-500">{p.note}</div>}
                    </td>
                    <td className={td}>
                      <PlanBadge plan={p.plan} /> <span className="text-xs text-slate-500">{p.months} mo</span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {p.redemptions} / {p.maxRedemptions}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(p.createdAt)}</td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(p.expiresAt)}</td>
                    <td className={`${td} whitespace-nowrap`}>{fmtDateTime(p.lastRedeemedAt)}</td>
                    <td className={td}>
                      <Button variant={p.active ? 'secondary' : 'primary'} loading={toggling === p.code} onClick={() => toggle(p)}>
                        {p.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {data && data.codes.length === 0 && (
                  <tr>
                    <td className={td} colSpan={7}>
                      No promo codes yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------- Email */

const AUDIENCES: { value: string; label: string }[] = [
  { value: 'test', label: 'Test — only me' },
  { value: 'all', label: 'All users' },
  { value: 'free', label: 'Free plan' },
  { value: 'pro', label: 'Pro plan' },
  { value: 'family', label: 'Family plan' },
  { value: 'paid', label: 'All paid (Pro + Family)' },
];

export function EmailTab({ adminEmail }: { adminEmail: string | null }) {
  const overview = useLoad<Overview>('/admin/overview');
  const campaigns = useLoad<{ campaigns: Campaign[] }>('/admin/campaigns');
  const [audience, setAudience] = useState('test');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<{ audience: string; recipients: number } | null>(null);
  const [busy, setBusy] = useState<'preview' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const valid = subject.trim().length > 0 && subject.length <= 150 && body.trim().length > 0 && body.length <= 10000;
  const payload = () => ({ audience, subject: subject.trim(), body });

  const doPreview = async () => {
    setBusy('preview');
    setError(null);
    setResult(null);
    try {
      setPreview(await api<{ audience: string; recipients: number }>('/admin/email', { ...payload(), dryRun: true }));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const doSend = async () => {
    setError(null);
    setResult(null);
    let count = preview?.audience === audience ? preview.recipients : null;
    setBusy('send');
    try {
      if (count === null) {
        const p = await api<{ audience: string; recipients: number }>('/admin/email', { ...payload(), dryRun: true });
        setPreview(p);
        count = p.recipients;
      }
      if (count === 0) {
        setError('No recipients for this audience.');
        return;
      }
      const label = AUDIENCES.find((a) => a.value === audience)?.label || audience;
      if (!window.confirm(`Send "${subject.trim()}" to ${count.toLocaleString('en-IE')} recipient(s) (${label})?\n\nThis cannot be undone.`)) return;
      const res = await api<{ id: string; audience: string; requested: number; sent: number }>('/admin/email', payload());
      setResult(`Sent ${res.sent.toLocaleString('en-IE')} of ${res.requested.toLocaleString('en-IE')} email(s).`);
      void campaigns.reload();
      void overview.reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const q = overview.data?.email;

  return (
    <div className="space-y-6">
      <Card title="Compose email">
        {q && (
          <div className="mb-4">
            <Progress label="Daily email quota" value={q.sentToday} max={q.dailyLimit} />
          </div>
        )}
        <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          Tip: always send to <strong>Test — only me</strong>{adminEmail ? ` (${adminEmail})` : ''} first and check how it looks before emailing customers.
        </p>
        <ErrorBox message={error} />
        {result && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <Check className="h-4 w-4" /> {result}
          </div>
        )}
        <div className="space-y-3">
          <Field label="Audience">
            <select
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value);
                setPreview(null);
              }}
              className={inputCls}
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject" hint={`${subject.length}/150`}>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} className={inputCls} />
          </Field>
          <Field
            label="Message (plain text)"
            hint={`${body.length.toLocaleString('en-IE')}/10,000 · Leave a blank line to start a new paragraph. An unsubscribe link is added automatically.`}
          >
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} rows={12} className={`${inputCls} font-sans`} />
          </Field>
          {preview && preview.audience === audience && (
            <p className="text-sm text-slate-600">
              This will go to <strong>{preview.recipients.toLocaleString('en-IE')}</strong> recipient(s) (unsubscribed users excluded).
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={doPreview} loading={busy === 'preview'} disabled={!valid || busy !== null}>
              <Eye className="h-4 w-4" /> Preview recipients
            </Button>
            <Button onClick={doSend} loading={busy === 'send'} disabled={!valid || busy !== null}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </div>
      </Card>
      <Card title="Sent campaigns">
        <ErrorBox message={campaigns.error} />
        {campaigns.loading && !campaigns.data ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className={th}>Sent</th>
                  <th className={th}>Audience</th>
                  <th className={th}>Subject</th>
                  <th className={th}>Delivered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.data?.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className={`${td} whitespace-nowrap`}>{fmtDateTime(c.sentAt)}</td>
                    <td className={`${td} capitalize`}>{c.audience}</td>
                    <td className={td}>{c.subject}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {c.sent} / {c.requested}
                    </td>
                  </tr>
                ))}
                {campaigns.data && campaigns.data.campaigns.length === 0 && (
                  <tr>
                    <td className={td} colSpan={4}>
                      No campaigns sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
