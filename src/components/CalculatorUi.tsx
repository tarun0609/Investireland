import React, { useEffect, useId, useState } from 'react';
import { ArrowLeft, BookOpen, Calculator, ChevronRight, Info } from 'lucide-react';
import {
  CALCULATOR_TAX_NOTE,
  CALCULATOR_TOOLS,
  CALCULATORS_HUB,
  GUIDE_PAGES,
  calculatorPageForView,
  formatIsoDate,
  type CalculatorPage,
  type CalculatorView,
  type ContentSection,
  type PageKind,
} from '../config/calculators';
import { SITE_NAME } from '../config/site';
import { CGT_ANNUAL_EXEMPTION, CGT_RATE, DIRT_RATE, EXIT_TAX_RATE, TAX_RULES_SOURCE, pct as ratePct } from '../config/irishTax';
import { isModifiedClick } from '../utils/links';
import type { TaxTreatment } from '../services/investmentEngine';

export const eur = (value: number, decimals = 0): string =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);

export const pct = (value: number, decimals = 1): string => `${(value * 100).toFixed(decimals)}%`;

/** Link to another calculator page that uses client-side navigation but still works as a normal link. */
export const CalculatorLink: React.FC<{
  view: CalculatorView;
  path: string;
  onNavigate: (view: CalculatorView) => void;
  className?: string;
  children: React.ReactNode;
}> = ({ view, path, onNavigate, className, children }) => (
  <a
    href={path}
    className={className}
    onClick={(e) => {
      if (isModifiedClick(e)) return;
      e.preventDefault();
      onNavigate(view);
    }}
  >
    {children}
  </a>
);

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  help?: string;
}

/** Numeric input that can be cleared and retyped; out-of-range values are clamped on blur. */
export const NumberField: React.FC<NumberFieldProps> = ({ label, value, onChange, min = 0, max = 1e9, step = 1, prefix, suffix, help }) => {
  const id = useId();
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText((current) => (parseFloat(current) === value ? current : String(value)));
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const typed = parseFloat(text);
  const invalid = !Number.isFinite(typed) || typed < min || typed > max;
  const fmt = (n: number) => n.toLocaleString('en-IE');
  const describedBy = [help ? `${id}-help` : '', invalid ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
      </label>
      <div
        className={`flex items-center rounded-lg border bg-white focus-within:ring-2 ${
          invalid ? 'border-red-500 focus-within:ring-red-100' : 'border-slate-300 focus-within:border-emerald-600 focus-within:ring-emerald-100'
        }`}
      >
        {prefix && <span className="pl-3 text-sm text-slate-500" aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={text}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setText(e.target.value);
            // Only publish in-range values while typing, so partial entries like "6" (on the way to 66)
            // are not replaced by the minimum. Out-of-range values are clamped on blur.
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={() => {
            const n = parseFloat(text);
            const next = Number.isFinite(n) ? clamp(n) : value;
            setText(String(next));
            if (next !== value) onChange(next);
          }}
          className="w-full min-w-0 bg-transparent px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
        />
        {suffix && <span className="pr-3 text-sm text-slate-500" aria-hidden="true">{suffix}</span>}
      </div>
      {invalid && (
        <p id={`${id}-error`} className="mt-1 text-[11px] font-semibold leading-snug text-red-700" role="status">
          Enter a number from {fmt(min)} to {fmt(max)}. Results use the last valid value.
        </p>
      )}
      {help && (
        <p id={`${id}-help`} className="mt-1 text-[11px] leading-snug text-slate-500">
          {help}
        </p>
      )}
    </div>
  );
};

const TREATMENT_OPTIONS: { value: TaxTreatment; label: string; detail: string }[] = [
  { value: 'etf_fund', label: 'ETF / fund', detail: `${ratePct(EXIT_TAX_RATE)} exit tax + deemed disposal` },
  { value: 'individual_shares', label: 'Shares', detail: `${ratePct(CGT_RATE)} CGT, €${CGT_ANNUAL_EXEMPTION.toLocaleString('en-IE')} exemption` },
  { value: 'deposit', label: 'Deposit', detail: `${ratePct(DIRT_RATE)} DIRT on interest` },
  { value: 'none', label: 'No tax', detail: 'e.g. inside a pension' },
];

export const TreatmentPicker: React.FC<{
  value: TaxTreatment;
  onChange: (value: TaxTreatment) => void;
  options?: TaxTreatment[];
  label?: string;
}> = ({ value, onChange, options, label = 'How is it taxed?' }) => {
  const id = useId();
  const shown = TREATMENT_OPTIONS.filter((o) => !options || options.includes(o.value));
  return (
    <fieldset>
      <legend id={id} className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {shown.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
              value === o.value ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="block text-xs font-bold">{o.label}</span>
            <span className="block text-[11px] text-slate-500">{o.detail}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
};

export const ResultCard: React.FC<{
  label: string;
  value: string;
  detail?: React.ReactNode;
  tone?: 'default' | 'positive' | 'negative' | 'highlight';
}> = ({ label, value, detail, tone = 'default' }) => {
  const toneClass = {
    default: 'bg-white border-slate-200',
    positive: 'bg-emerald-50 border-emerald-200',
    negative: 'bg-rose-50 border-rose-200',
    highlight: 'bg-slate-900 border-slate-900 text-white',
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wider ${tone === 'highlight' ? 'text-emerald-300' : 'text-slate-600'}`}>{label}</div>
      <div className={`mt-1 text-2xl font-extrabold tracking-tight ${tone === 'highlight' ? 'text-white' : 'text-slate-900'}`}>{value}</div>
      {detail && <div className={`mt-1 text-xs leading-snug ${tone === 'highlight' ? 'text-slate-300' : 'text-slate-600'}`}>{detail}</div>}
    </div>
  );
};

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

/** Small dependency-free line chart. `labels` and every series' `values` must have the same length. */
export const LineChart: React.FC<{ labels: (string | number)[]; series: ChartSeries[]; title: string }> = ({ labels, series, title }) => {
  const width = 640;
  const height = 240;
  const pad = { top: 12, right: 12, bottom: 28, left: 64 };
  const all = series.flatMap((s) => s.values).filter(Number.isFinite);
  const maxY = Math.max(1, ...all);
  const minY = Math.min(0, ...all);
  const n = Math.max(1, labels.length - 1);
  const x = (i: number) => pad.left + (i / n) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - minY) / (maxY - minY || 1)) * (height - pad.top - pad.bottom);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => minY + t * (maxY - minY));
  const labelEvery = Math.max(1, Math.ceil(labels.length / 8));
  const compact = (v: number) =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(v);

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-900">{title}</span>
        <span className="flex flex-wrap gap-3 text-[11px] text-slate-600">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: s.color }} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${title} chart. See the table below for exact figures.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={pad.left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#64748b">
              {compact(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % labelEvery === 0 || i === labels.length - 1 ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize={10} fill="#64748b">
              {l}
            </text>
          ) : null
        )}
        {series.map((s) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeDasharray={s.dashed ? '6 4' : undefined}
            strokeLinejoin="round"
            points={s.values.map((v, i) => `${x(i)},${y(Number.isFinite(v) ? v : 0)}`).join(' ')}
          />
        ))}
      </svg>
    </figure>
  );
};

export const Assumptions: React.FC<{ items: string[] }> = ({ items }) => (
  <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
    <div className="mb-1 flex items-center gap-1.5 font-bold">
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
      Assumptions
    </div>
    <ul className="list-disc space-y-1 pl-4">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
      <li>{CALCULATOR_TAX_NOTE}</li>
      <li>Returns are not guaranteed and the value of investments can go down. This is an educational estimate, not financial advice.</li>
    </ul>
  </aside>
);

interface CalculatorLayoutProps {
  page: CalculatorPage;
  onNavigate: (view: CalculatorView | 'landing') => void;
  children?: React.ReactNode;
}

const PageLinkList: React.FC<{
  pages: CalculatorPage[];
  onNavigate: (view: CalculatorView) => void;
  columns?: string;
}> = ({ pages, onNavigate, columns = 'sm:grid-cols-2 lg:grid-cols-4' }) => (
  <ul className={`mt-4 grid gap-3 ${columns}`}>
    {pages.map((t) => (
      <li key={t.view}>
        <CalculatorLink
          view={t.view}
          path={t.path}
          onNavigate={onNavigate}
          className="flex h-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 hover:border-emerald-600 hover:text-emerald-800"
        >
          {t.name}
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </CalculatorLink>
      </li>
    ))}
  </ul>
);

/** Renders a plain-text content section from the page config (also rendered statically by the SEO plugin). */
export const ContentSectionView: React.FC<{ section: ContentSection; onNavigate: (view: CalculatorView) => void }> = ({ section, onNavigate }) => (
  <section aria-labelledby={`s-${section.id}`} className="mt-10 max-w-3xl">
    <h2 id={`s-${section.id}`} className="text-xl font-extrabold text-slate-900">
      {section.heading}
    </h2>
    {section.paragraphs?.map((p) => (
      <p key={p} className="mt-3 text-[15px] leading-relaxed text-slate-700">
        {p}
      </p>
    ))}
    {section.bullets && (
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">
        {section.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    )}
    {section.table && (
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white" tabIndex={0} role="region" aria-label="Scrollable table">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="p-3 text-left text-xs font-semibold text-slate-500">{section.table.caption}</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              {section.table.headers.map((h, i) => (
                <th key={i} scope="col" className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {section.table.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, j) =>
                  j === 0 ? (
                    <th key={j} scope="row" className="px-3 py-2 align-top font-semibold text-slate-900">
                      {cell}
                    </th>
                  ) : (
                    <td key={j} className="px-3 py-2 align-top">
                      {cell}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    {section.links && section.links.length > 0 && (
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-slate-500">Related:</span>
        {section.links.map((view) => {
          const target = calculatorPageForView(view);
          return (
            <CalculatorLink key={view} view={view} path={target.path} onNavigate={onNavigate} className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
              {target.name}
            </CalculatorLink>
          );
        })}
      </p>
    )}
  </section>
);

const BADGE: Record<PageKind, string> = {
  hub: 'Free · Irish tax rules · No sign-up',
  tool: 'Free · Irish tax rules · No sign-up',
  guide: 'Guide · Irish tax rules explained',
  about: 'About us',
};

/**
 * Shared page shell: breadcrumb, heading, intro, the interactive part (children), content sections,
 * FAQs, sources and links to related guides and calculators. On guides the interactive part follows
 * the first section; on calculators it comes first with the explanation underneath.
 */
export const CalculatorLayout: React.FC<CalculatorLayoutProps> = ({ page, onNavigate, children }) => {
  const isHub = page.kind === 'hub';
  const otherTools = CALCULATOR_TOOLS.filter((t) => t.view !== page.view);
  const otherGuides = GUIDE_PAGES.filter((g) => g.view !== page.view);
  const sections = page.sections ?? [];
  const [leadSections, restSections] = page.kind === 'guide' ? [sections.slice(0, 1), sections.slice(1)] : [[], sections];
  const crumbParent = page.kind === 'tool' ? CALCULATORS_HUB : null;
  const updatedLabel = formatIsoDate(page.updated);

  return (
    <main className="bg-[#F8FAFC]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <a
                href="/"
                className="hover:text-emerald-700"
                onClick={(e) => {
                  if (isModifiedClick(e)) return;
                  e.preventDefault();
                  onNavigate('landing');
                }}
              >
                Home
              </a>
            </li>
            {crumbParent && (
              <>
                <li aria-hidden="true">
                  <ChevronRight className="h-3 w-3" />
                </li>
                <li>
                  <CalculatorLink view={crumbParent.view} path={crumbParent.path} onNavigate={onNavigate} className="hover:text-emerald-700">
                    Calculators
                  </CalculatorLink>
                </li>
              </>
            )}
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
            <li aria-current="page" className="font-semibold text-slate-700">
              {isHub ? 'Calculators' : page.name}
            </li>
          </ol>
        </nav>

        <header className="mb-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            {page.kind === 'guide' ? <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> : <Calculator className="h-3.5 w-3.5" aria-hidden="true" />}
            {BADGE[page.kind]}
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{page.h1}</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">{page.intro}</p>
          {page.kind !== 'hub' && (
            <p className="mt-3 text-xs text-slate-500">
              Last updated <time dateTime={page.updated}>{updatedLabel}</time> · By {SITE_NAME} ·{' '}
              <CalculatorLink view="about" path="/about" onNavigate={onNavigate} className="font-semibold text-emerald-700 hover:underline">
                About us
              </CalculatorLink>
            </p>
          )}
        </header>

        {leadSections.map((section) => (
          <ContentSectionView key={section.id} section={section} onNavigate={onNavigate} />
        ))}

        {children && <div className={page.kind === 'guide' ? 'mt-10' : undefined}>{children}</div>}

        {restSections.map((section) => (
          <ContentSectionView key={section.id} section={section} onNavigate={onNavigate} />
        ))}

        {page.faqs.length > 0 && (
          <section aria-labelledby="calc-faq" className="mt-12 max-w-3xl">
            <h2 id="calc-faq" className="text-xl font-extrabold text-slate-900">
              Frequently asked questions
            </h2>
            <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {page.faqs.map((faq) => (
                <details key={faq.q} className="group p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
                    <span className="flex items-start justify-between gap-3">
                      {faq.q}
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true" />
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {page.sources && page.sources.length > 0 && (
          <section aria-labelledby="calc-sources" className="mt-12 max-w-3xl">
            <h2 id="calc-sources" className="text-xl font-extrabold text-slate-900">
              Sources
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {page.sources.map((src) => (
                <li key={src.url + src.label}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline-offset-2 hover:underline">
                    {src.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Tax rules last reviewed {updatedLabel} and based on {TAX_RULES_SOURCE}, which may change before becoming law. This page is educational information, not financial advice.
            </p>
          </section>
        )}

        {otherGuides.length > 0 && (
          <section aria-labelledby="calc-guides" className="mt-12">
            <h2 id="calc-guides" className="text-xl font-extrabold text-slate-900">
              Irish investing guides
            </h2>
            <PageLinkList pages={otherGuides} onNavigate={onNavigate} columns="sm:grid-cols-2 lg:grid-cols-3" />
          </section>
        )}

        {!isHub && (
          <section aria-labelledby="calc-related" className="mt-12">
            <h2 id="calc-related" className="text-xl font-extrabold text-slate-900">
              {page.kind === 'tool' ? 'More Irish calculators' : 'Free Irish calculators'}
            </h2>
            <PageLinkList pages={otherTools} onNavigate={onNavigate} />
            <div className="mt-6">
              <CalculatorLink
                view="calculators"
                path={CALCULATORS_HUB.path}
                onNavigate={onNavigate}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All calculators
              </CalculatorLink>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

/** Two-column calculator body: inputs on the left, results on the right. */
export const CalculatorGrid: React.FC<{ inputs: React.ReactNode; results: React.ReactNode }> = ({ inputs, results }) => (
  <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
    <section aria-label="Your details" className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:sticky lg:top-20">
      {inputs}
    </section>
    <section aria-label="Results" aria-live="polite" className="min-w-0 space-y-4">
      {results}
    </section>
  </div>
);

export const DataTable: React.FC<{
  caption: string;
  headers: string[];
  rows: (string | number)[][];
  highlightRows?: Set<number>;
  defaultOpen?: boolean;
}> = ({
  caption,
  headers,
  rows,
  highlightRows,
  defaultOpen = false,
}) => (
  <details open={defaultOpen} className="rounded-xl border border-slate-200 bg-white">
    <summary className="cursor-pointer p-4 text-sm font-bold text-slate-900">{caption}</summary>
    <div className="max-h-96 overflow-auto border-t border-slate-100" tabIndex={0} role="region" aria-label="Scrollable table">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
          {rows.map((row, i) => (
            <tr key={i} className={highlightRows?.has(i) ? 'bg-amber-50' : undefined}>
              {row.map((cell, j) => (
                <td key={j} className={`whitespace-nowrap px-3 py-2 ${j === 0 ? 'font-bold text-slate-900' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </details>
);
