import React, { useEffect, useId, useRef, useState } from 'react';
import { EDUCATIONAL_ARTICLES } from '../data/mockData';
import { 
  BookOpen, 
  ExternalLink, 
  Clock, 
  Calendar, 
  FileText, 
  ArrowRight,
  X
} from 'lucide-react';

export const EducationHubSection: React.FC = () => {
  const [selectedArticle, setSelectedArticle] = useState<typeof EDUCATIONAL_ARTICLES[0] | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isModalOpen = selectedArticle !== null;

  useEffect(() => {
    if (!isModalOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedArticle(null);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isModalOpen]);

  return (
    <section id="education" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Plain-English Guides</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Financial information without the jargon.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Short, dated summaries with links to the official Revenue and Government sources they are based on. Rules change, so always check the source before acting.
          </p>
        </div>

        {/* Articles Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {EDUCATIONAL_ARTICLES.map((art) => (
            <div
              key={art.slug}
              className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded font-mono text-[10px]">
                    {art.category}
                  </span>
                  <span className="text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{art.readTime}</span>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                  {art.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {art.summary}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    <span>Updated: {art.lastUpdated}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <span className="text-[11px] text-slate-700 font-medium flex items-center gap-1 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Based on: {art.source}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(art)}
                    aria-label={`Read summary: ${art.title}`}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Read Summary</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Read Article Modal */}
        {selectedArticle && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedArticle(null);
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded">
                    {selectedArticle.category}
                  </span>
                  <h3 id={titleId} className="text-xl font-bold text-slate-900 mt-2">
                    {selectedArticle.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  aria-label="Close guide"
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>{selectedArticle.summary}</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <span className="font-semibold text-slate-600">Source to check:</span>
                    <span className="font-bold text-slate-900">{selectedArticle.source}</span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <span className="font-semibold text-slate-600">Last updated:</span>
                    <span className="text-slate-800">{selectedArticle.lastUpdated}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    General information written by the InvestIreland AI team, not independently reviewed, and not tax or financial advice. Proposed measures are subject to final legislation.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={selectedArticle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
                >
                  <span>Check the official source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Close Guide
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
