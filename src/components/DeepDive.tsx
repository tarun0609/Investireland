import React, { Suspense, useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const OPEN_SECTION_EVENT = 'ii:open-section';

/** Ask a collapsed deep-dive panel that hosts `sectionId` to expand. */
export function requestOpenSection(sectionId: string): void {
  window.dispatchEvent(new CustomEvent<{ id: string }>(OPEN_SECTION_EVENT, { detail: { id: sectionId } }));
}

interface DeepDiveProps {
  /** id of the section rendered inside; used for nav links and `/#id` URLs. */
  sectionId: string;
  title: string;
  summary: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const hashTarget = () => (typeof window === 'undefined' ? '' : decodeURIComponent(window.location.hash.slice(1)));

/**
 * Collapsible homepage panel. Content mounts only once opened, so heavy
 * sections (and their lazy chunks) stay off the initial page load.
 */
export const DeepDive: React.FC<DeepDiveProps> = ({ sectionId, title, summary, icon, children }) => {
  const [open, setOpen] = useState(() => hashTarget() === sectionId);
  const contentId = useId();

  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<{ id: string }>).detail?.id === sectionId) setOpen(true);
    };
    const onHash = () => {
      if (hashTarget() === sectionId) setOpen(true);
    };
    window.addEventListener(OPEN_SECTION_EVENT, onOpen);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener(OPEN_SECTION_EVENT, onOpen);
      window.removeEventListener('hashchange', onHash);
    };
  }, [sectionId]);

  return (
    <div data-deep-dive={sectionId} className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-4 px-5 py-4 sm:px-6 sm:py-5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base sm:text-lg font-bold text-slate-900">{title}</span>
            <span className="block text-sm text-slate-600">{summary}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>
      <div id={contentId} hidden={!open} className="border-t border-slate-200">
        {open && (
          <Suspense
            fallback={
              <div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-slate-600">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
                Loading…
              </div>
            }
          >
            {children}
          </Suspense>
        )}
      </div>
    </div>
  );
};
