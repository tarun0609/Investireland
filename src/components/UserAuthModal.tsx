import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Inbox, Loader2, LogOut, Mail, RefreshCw, X } from 'lucide-react';
import type { AuthUser, Currency, EmailDispatchLog, LifeStageCategory } from '../types';
import {
  MIN_PASSWORD_LENGTH,
  fetchSentEmailLogs,
  getSignedInUser,
  registerWithCredentials,
  requestPasswordReset,
  resendVerificationEmail,
  sendMilestoneAutoEmail,
  signInWithCredentials,
  signInWithGoogleOAuth,
  signOutUser,
  subscribeToActiveUser,
  type AuthErrorInfo,
  type ResidencyCountry,
} from '../services/authEmailService';

export type AuthModalTab = 'register' | 'login' | 'account';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChange?: (user: AuthUser | null) => void;
  initialTab?: AuthModalTab;
}

const COUNTRY_OPTIONS: ResidencyCountry[] = ['Ireland', 'India', 'United States', 'United Kingdom', 'Other EU'];
const CURRENCY_OPTIONS: Currency[] = ['EUR', 'INR', 'USD', 'GBP'];
const GOAL_OPTIONS: { value: LifeStageCategory; label: string }[] = [
  { value: 'house_deposit', label: 'Home deposit' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'family_education', label: 'Family & education' },
  { value: 'emergency_buffer', label: 'Emergency buffer' },
  { value: 'financial_independence', label: 'Financial independence' },
  { value: 'cross_border_repatriation', label: 'Cross-border repatriation' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
const labelClass = 'block text-xs font-semibold text-slate-700 mb-1';
const primaryButton =
  'w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';
const secondaryButton =
  'w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

const STATUS_STYLES: Record<EmailDispatchLog['status'], string> = {
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  SENT: 'bg-sky-100 text-sky-800',
  SIMULATED: 'bg-amber-100 text-amber-800',
};

export const UserAuthModal: React.FC<UserAuthModalProps> = ({ isOpen, onClose, onUserChange, initialTab }) => {
  const [signedIn, setSignedIn] = useState<AuthUser | null>(() => getSignedInUser());
  const [tab, setTab] = useState<AuthModalTab>(() => initialTab ?? (getSignedInUser() ? 'account' : 'register'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState<ResidencyCountry>('Ireland');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [goal, setGoal] = useState<LifeStageCategory>('house_deposit');
  const [targetAmount, setTargetAmount] = useState('85000');

  const [emailLogs, setEmailLogs] = useState<EmailDispatchLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const fieldId = useId();

  useEffect(() => subscribeToActiveUser(() => setSignedIn(getSignedInUser())), []);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.querySelector<HTMLElement>('input, button:not([data-close])')?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setEmailLogs(await fetchSentEmailLogs());
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && tab === 'account' && signedIn) void loadLogs();
  }, [isOpen, tab, signedIn, loadLogs]);

  if (!isOpen) return null;

  const switchTab = (next: AuthModalTab) => {
    setTab(next);
    setError(null);
    setNotice(null);
  };

  const showError = (message?: string, details?: AuthErrorInfo) =>
    setError({ title: details?.title ?? 'Something went wrong', message: message ?? 'Please try again.' });

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await registerWithCredentials({
      name,
      email,
      password,
      country,
      preferredCurrency: currency,
      primaryLifeStageGoal: goal,
      targetLifeGoalAmount: Number(targetAmount) || undefined,
      hasOverseasAssets: country !== 'Ireland',
    });
    setBusy(false);
    if (!result.success || !result.user) return showError(result.error, result.errorDetails);
    setPassword('');
    onUserChange?.(result.user);
    setNotice(
      result.verificationEmailSent
        ? `Account created. We sent a verification link to ${result.user.email}.`
        : 'Account created. We could not send a verification email right now; you can resend it from this page.'
    );
    setTab('account');
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signInWithCredentials(email, password);
    setBusy(false);
    if (!result.success || !result.user) return showError(result.error, result.errorDetails);
    setPassword('');
    onUserChange?.(result.user);
    setNotice(`Welcome back, ${result.user.name}.`);
    setTab('account');
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    const result = await signInWithGoogleOAuth();
    setBusy(false);
    if (!result.success || !result.user) return showError(result.error, result.errorDetails);
    onUserChange?.(result.user);
    setNotice(`Signed in as ${result.user.email}.`);
    setTab('account');
  };

  const handleReset = async () => {
    setBusy(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (!result.success) return showError(result.error);
    setNotice('If an account exists for that address, a password reset email is on its way.');
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOutUser();
      onUserChange?.(null);
      setEmailLogs([]);
      switchTab('login');
    } catch {
      showError('Sign-out failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendReport = async () => {
    if (!signedIn) return;
    setBusy(true);
    setError(null);
    const goalLabel = GOAL_OPTIONS.find((g) => g.value === signedIn.primaryLifeStageGoal)?.label ?? 'My investment goal';
    const result = await sendMilestoneAutoEmail({ goalTitle: goalLabel, targetAmount: Number(targetAmount) || 0 });
    setBusy(false);
    if (!result.success) return showError(result.error);
    setNotice(
      result.emailDispatch?.status === 'SIMULATED'
        ? 'Email recorded but not delivered: SMTP is not configured on this server.'
        : `Milestone summary sent to ${signedIn.email}.`
    );
    void loadLogs();
  };

  const handleResendVerification = async () => {
    setBusy(true);
    const ok = await resendVerificationEmail();
    setBusy(false);
    if (ok) setNotice('Verification email sent. Refresh this page after confirming.');
    else showError('Could not send the verification email. Please wait a minute and try again.');
  };

  const tabs: { id: AuthModalTab; label: string }[] = signedIn
    ? [{ id: 'account', label: 'My account' }]
    : [
        { id: 'register', label: 'Create account' },
        { id: 'login', label: 'Sign in' },
      ];
  const activeTab: AuthModalTab = signedIn ? 'account' : tab === 'account' ? 'login' : tab;

  const titles: Record<AuthModalTab, string> = {
    register: 'Create your account',
    login: 'Sign in to your portfolio',
    account: 'Your account',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
      >
        <button
          type="button"
          data-close
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">InvestIreland account</p>
        <h2 id={titleId} className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          {titles[activeTab]}
        </h2>

        <div role="tablist" aria-label="Account" className="mb-5 mt-4 flex gap-1 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => switchTab(t.id)}
              className={`cursor-pointer border-b-2 px-3 pb-2.5 text-xs font-bold transition-colors ${
                activeTab === t.id ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">{error.title}</p>
              <p className="mt-0.5 leading-relaxed">{error.message}</p>
            </div>
          </div>
        )}
        {notice && (
          <div role="status" className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="leading-relaxed">{notice}</p>
          </div>
        )}

        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3" noValidate={false}>
            <div>
              <label htmlFor={`${fieldId}-name`} className={labelClass}>Full name</label>
              <input id={`${fieldId}-name`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" />
            </div>
            <div>
              <label htmlFor={`${fieldId}-email`} className={labelClass}>Email</label>
              <input id={`${fieldId}-email`} type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label htmlFor={`${fieldId}-password`} className={labelClass}>Password</label>
              <input
                id={`${fieldId}-password`}
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                aria-describedby={`${fieldId}-password-hint`}
              />
              <p id={`${fieldId}-password-hint`} className="mt-1 text-[11px] text-slate-500">At least {MIN_PASSWORD_LENGTH} characters.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${fieldId}-country`} className={labelClass}>Tax residency</label>
                <select id={`${fieldId}-country`} className={inputClass} value={country} onChange={(e) => setCountry(e.target.value as ResidencyCountry)}>
                  {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${fieldId}-currency`} className={labelClass}>Currency</label>
                <select id={`${fieldId}-currency`} className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                  {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${fieldId}-goal`} className={labelClass}>Primary goal</label>
                <select id={`${fieldId}-goal`} className={inputClass} value={goal} onChange={(e) => setGoal(e.target.value as LifeStageCategory)}>
                  {GOAL_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${fieldId}-target`} className={labelClass}>Target amount</label>
                <input id={`${fieldId}-target`} type="number" min={0} step={1000} inputMode="numeric" className={inputClass} value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
            </button>
            <GoogleButton onClick={handleGoogle} disabled={busy} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Your profile is stored in your private Firebase account. Estimates in this app are educational and are not tax or investment advice.
            </p>
          </form>
        )}

        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label htmlFor={`${fieldId}-login-email`} className={labelClass}>Email</label>
              <input id={`${fieldId}-login-email`} type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label htmlFor={`${fieldId}-login-password`} className={labelClass}>Password</label>
              <input id={`${fieldId}-login-password`} type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </button>
            <button type="button" onClick={handleReset} disabled={busy} className="cursor-pointer text-xs font-semibold text-emerald-800 hover:underline">
              Forgot password?
            </button>
            <GoogleButton onClick={handleGoogle} disabled={busy} />
          </form>
        )}

        {activeTab === 'account' && signedIn && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-semibold text-slate-900">{signedIn.name}</dd>
              <dt className="text-slate-500">Email</dt>
              <dd className="break-all font-semibold text-slate-900">{signedIn.email}</dd>
              <dt className="text-slate-500">Verified</dt>
              <dd className={signedIn.emailVerified ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                {signedIn.emailVerified ? 'Yes' : 'Not yet'}
              </dd>
              <dt className="text-slate-500">Residency / currency</dt>
              <dd className="font-semibold text-slate-900">{signedIn.country} · {signedIn.preferredCurrency}</dd>
            </dl>

            {!signedIn.emailVerified && (
              <button type="button" onClick={handleResendVerification} disabled={busy} className={secondaryButton}>
                <Mail className="h-4 w-4" /> Resend verification email
              </button>
            )}
            <button
              type="button"
              onClick={handleSendReport}
              disabled={busy || !signedIn.emailVerified}
              title={signedIn.emailVerified ? undefined : 'Verify your email address first'}
              className={primaryButton}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Email me a milestone summary
            </button>

            <section aria-labelledby={`${fieldId}-outbox`}>
              <div className="mb-2 flex items-center justify-between">
                <h3 id={`${fieldId}-outbox`} className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Inbox className="h-3.5 w-3.5" /> Recent emails
                </h3>
                <button type="button" onClick={loadLogs} aria-label="Refresh emails" className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100">
                  <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {emailLogs.length === 0 ? (
                <p className="text-xs text-slate-500">{logsLoading ? 'Loading…' : 'No emails sent from this session yet.'}</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {emailLogs.map((log) => (
                    <li key={log.id} className="rounded-lg border border-slate-200 p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-slate-900">{log.subject}</span>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[log.status]}`}>{log.status}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <time dateTime={log.dispatchedAt}>{new Date(log.dispatchedAt).toLocaleString()}</time>
                        {log.previewUrl && /^https?:\/\//.test(log.previewUrl) && (
                          <a href={log.previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline">
                            Preview <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <button type="button" onClick={handleSignOut} disabled={busy} className={secondaryButton}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const GoogleButton: React.FC<{ onClick: () => void; disabled: boolean }> = ({ onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={secondaryButton}>
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
    Continue with Google
  </button>
);

export default UserAuthModal;
