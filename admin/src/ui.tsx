import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
};

export function Button({ variant = 'primary', loading, children, className = '', disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

const planStyles: Record<string, string> = {
  pro: 'bg-emerald-100 text-emerald-800',
  family: 'bg-indigo-100 text-indigo-800',
  free: 'bg-slate-100 text-slate-700',
};

export function PlanBadge({ plan }: { plan: string | null | undefined }) {
  const p = plan || 'free';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${planStyles[p] || 'bg-amber-100 text-amber-800'}`}>{p}</span>;
}

export function Progress({ value, max, label }: { value: number; max: number; label: ReactNode }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm text-slate-600">
        <span>{label}</span>
        <span className="font-medium text-slate-900">
          {value.toLocaleString('en-IE')} / {max.toLocaleString('en-IE')}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
