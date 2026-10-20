import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from 'firebase/auth';
import { BarChart3, LogOut, Mail, ShieldAlert, ShieldCheck, Ticket, Users, RefreshCw } from 'lucide-react';
import { API_URL, AUTH_ERROR_EVENT, auth, errMsg } from './lib';
import { Button, ErrorBox, Field, Spinner, inputCls } from './ui';
import { CustomersTab, EmailTab, OverviewTab, PromosTab } from './tabs';

type Tab = 'overview' | 'customers' | 'promos' | 'email';
const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'promos', label: 'Promo codes', icon: Ticket },
  { id: 'email', label: 'Email', icon: Mail },
];

function Shell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">{children}</div>;
}

function SetupMessage() {
  return (
    <Shell>
      <div className="max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <h1 className="mb-2 text-lg font-semibold">Admin dashboard not configured</h1>
        <p className="mb-2">
          Set the <code className="rounded bg-amber-100 px-1">VITE_API_URL</code> environment variable to your API base URL (for example{' '}
          <code className="rounded bg-amber-100 px-1">https://api.investirelandai.ie</code>) and rebuild.
        </p>
        <p>Locally, add it to the repo-root <code className="rounded bg-amber-100 px-1">.env</code> file; on Cloudflare Pages, add it under Settings → Environment variables.</p>
      </div>
    </Shell>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'email' | 'google', fn: () => Promise<unknown>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string }).code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') setError(null);
      else if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) setError('Incorrect email or password.');
      else if (code === 'auth/unauthorized-domain') setError('This domain is not authorised in Firebase Auth → Settings → Authorized domains.');
      else setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run('email', () => signInWithEmailAndPassword(auth, email.trim(), password));
  };

  return (
    <Shell>
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h1 className="text-lg font-semibold text-slate-900">InvestIreland AI Admin</h1>
        </div>
        <ErrorBox message={error} />
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Email">
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Password">
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </Field>
          <Button type="submit" loading={busy === 'email'} disabled={busy !== null} className="w-full">
            Sign in
          </Button>
        </form>
        <div className="my-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
        </div>
        <Button
          variant="secondary"
          className="w-full"
          loading={busy === 'google'}
          disabled={busy !== null}
          onClick={() => run('google', () => signInWithPopup(auth, new GoogleAuthProvider()))}
        >
          Continue with Google
        </Button>
      </div>
    </Shell>
  );
}

function AuthProblem({ kind, email }: { kind: 'not_admin' | 'reauth'; email: string | null }) {
  return (
    <Shell>
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-rose-500" />
        {kind === 'not_admin' ? (
          <>
            <h1 className="mb-2 text-lg font-semibold text-slate-900">Not an administrator</h1>
            <p className="mb-4 text-sm text-slate-600">
              The account <strong>{email || 'you signed in with'}</strong> does not have admin access.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-lg font-semibold text-slate-900">Please sign in again</h1>
            <p className="mb-4 text-sm text-slate-600">Your session needs to be refreshed for admin actions. Sign out and sign back in to continue.</p>
          </>
        )}
        <Button onClick={() => signOut(auth)}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </Shell>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authProblem, setAuthProblem] = useState<'not_admin' | 'reauth' | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthProblem(null);
      }),
    [],
  );

  useEffect(() => {
    const onErr = (e: Event) => {
      const code = (e as CustomEvent<string>).detail;
      if (code === 'not_admin' || code === 'reauth') setAuthProblem(code);
    };
    window.addEventListener(AUTH_ERROR_EVENT, onErr);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, onErr);
  }, []);

  if (!API_URL) return <SetupMessage />;
  if (user === undefined)
    return (
      <Shell>
        <Spinner />
      </Shell>
    );
  if (!user) return <SignIn />;
  if (authProblem) return <AuthProblem kind={authProblem} email={user.email} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-slate-900">InvestIreland AI Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
            <Button variant="ghost" onClick={() => setRefreshKey((k) => k + 1)} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={() => signOut(auth)}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="Sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                tab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6" key={`${tab}-${refreshKey}`}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'customers' && <CustomersTab />}
        {tab === 'promos' && <PromosTab />}
        {tab === 'email' && <EmailTab adminEmail={user.email} />}
      </main>
    </div>
  );
}
