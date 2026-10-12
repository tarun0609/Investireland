import React, { useEffect, useId, useRef, useState } from 'react';
import { Currency, Holding, InvestmentAccountState, FinancialXRayData } from '../types';
import { convertToEUR } from '../services/fiscalDataService';
import {
  FileDown,
  X,
  CheckCircle2,
  ShieldCheck,
  Printer,
  Eye,
  Settings,
  AlertTriangle
} from 'lucide-react';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: Holding[];
  investmentAccount: InvestmentAccountState;
  xray: FinancialXRayData;
  currentCurrency: Currency;
  defaultUserName?: string;
}

const fmtEUR = (value: number) => {
  const n = Number.isFinite(value) ? Math.round(value) : 0;
  return `${n < 0 ? '-' : ''}€${Math.abs(n).toLocaleString('en-IE')}`;
};

const localDateStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const safeFileSegment = (name: string) =>
  name.normalize('NFKD').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  holdings,
  investmentAccount,
  xray,
  currentCurrency,
  defaultUserName = 'Investor'
}) => {
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem('investireland_user_name') || defaultUserName;
    } catch {
      return defaultUserName;
    }
  });
  const [includeAiNotes, setIncludeAiNotes] = useState(true);
  const [includeCrossBorder, setIncludeCrossBorder] = useState(true);
  const [busyAction, setBusyAction] = useState<'download' | 'print' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const titleId = useId();
  const nameInputId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const safeHoldings = Array.isArray(holdings) ? holdings : [];
  const annualLimit = Number(investmentAccount.annualLimit) || 0;
  const annualContrib = Number(investmentAccount.annualContributions) || 0;
  const usedPct = annualLimit > 0 ? Math.min(100, Math.round((annualContrib / annualLimit) * 100)) : 0;
  const threshold = Number(investmentAccount.taxFreeThreshold) || 0;
  const headroom = Math.max(0, threshold - (Number(investmentAccount.accountValue) || 0));
  const diagnosis = (xray.aiDiagnosis || '').trim();
  const trimmedName = userName.trim() || 'Investor';

  const showFeedback = (type: 'success' | 'error', message: string) => {
    if (!mountedRef.current) return;
    setFeedback({ type, message });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      if (mountedRef.current) setFeedback(null);
    }, 4000);
  };

  const buildDoc = async () => {
    const { generatePortfolioPdf } = await import('../services/pdfExportService');
    return generatePortfolioPdf({
      userName: trimmedName,
      holdings: safeHoldings,
      investmentAccount,
      xray,
      currentCurrency,
      includeAiNotes,
      includeCrossBorder
    });
  };

  const runAction = async (action: 'download' | 'print') => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyAction(action);
    setFeedback(null);
    try {
      const doc = await buildDoc();
      if (!mountedRef.current) return;
      if (action === 'download') {
        const nameSegment = safeFileSegment(trimmedName);
        doc.save(`InvestIreland_Portfolio_Summary_${nameSegment ? `${nameSegment}_` : ''}${localDateStamp()}.pdf`);
        showFeedback('success', 'PDF summary generated. Check your downloads folder.');
      } else {
        doc.autoPrint();
        const url = doc.output('bloburl');
        const win = window.open(url, '_blank');
        if (!win) {
          doc.save(`InvestIreland_Portfolio_Summary_${localDateStamp()}.pdf`);
          showFeedback('success', 'Pop-up blocked, so the PDF was downloaded instead. Open it to print.');
        } else {
          showFeedback('success', 'PDF opened in a new tab for printing.');
        }
        setTimeout(() => URL.revokeObjectURL(String(url)), 60_000);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showFeedback('error', 'Could not generate the PDF. Please try again.');
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusyAction(null);
    }
  };

  const isBusy = busyAction !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-7 border border-slate-200 shadow-2xl relative max-h-[92vh] flex flex-col outline-none min-w-0"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id={titleId} className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Export Portfolio PDF Summary
              </h3>
              <p className="text-xs text-slate-500">
                Create a printable summary of your portfolio and tax estimates.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 text-xs min-w-0">

          {/* Customization Options Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5 text-emerald-600" />
              <span>Report Options</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={nameInputId} className="font-semibold text-slate-700 block mb-1">
                  Name on report
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  value={userName}
                  maxLength={80}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Investor"
                  className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAiNotes}
                    onChange={(e) => setIncludeAiNotes(e.target.checked)}
                    className="rounded text-emerald-600 cursor-pointer"
                  />
                  <span>Include AI-generated portfolio notes</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCrossBorder}
                    onChange={(e) => setIncludeCrossBorder(e.target.checked)}
                    className="rounded text-emerald-600 cursor-pointer"
                  />
                  <span>Include cross-border (India/US) breakdown</span>
                </label>
              </div>
            </div>
          </div>

          {/* Document Preview Box */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50/50">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-slate-600">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Preview (page 1, simplified)</span>
              </span>
              <span>A4 PDF</span>
            </div>

            <div className="p-3 sm:p-5 bg-white space-y-4 text-slate-800 font-sans">

              {/* Header Preview */}
              <div className="flex justify-between items-start gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 bg-emerald-600 text-white rounded font-bold text-xs flex items-center justify-center shrink-0">
                    IE
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm">InvestIreland AI</div>
                    <div className="text-[10px] text-slate-500">Portfolio Summary (estimates)</div>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono min-w-0">
                  <div>Date: {new Date().toLocaleDateString('en-IE')}</div>
                  <div className="truncate max-w-[140px] sm:max-w-[220px]" title={trimmedName}>User: {trimmedName}</div>
                </div>
              </div>

              {/* Summary Cards Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {[
                  { label: 'TOTAL ASSETS', value: xray.totalAssetsEUR },
                  { label: 'CASH', value: xray.liquidity.cashEUR },
                  { label: 'INVESTMENTS', value: xray.liquidity.liquidInvestmentsEUR },
                  { label: 'PENSION (LOCKED)', value: xray.liquidity.pensionAndLockedEUR }
                ].map((card) => (
                  <div key={card.label} className="bg-slate-50 p-2 rounded border border-slate-200 min-w-0">
                    <div className="text-[9px] text-slate-500 font-bold">{card.label}</div>
                    <div className="text-xs font-extrabold font-mono text-slate-900 mt-0.5 truncate">
                      {fmtEUR(card.value)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Investment Account Status Preview */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <div className="font-bold text-emerald-950 text-[11px] mb-1">
                  Announced Investment Account (PSIA) tracker:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-emerald-900">
                  <div>
                    &bull; Annual allowance: <strong>{fmtEUR(annualContrib)} / {fmtEUR(annualLimit)}</strong> ({usedPct}% used)
                  </div>
                  <div>
                    &bull; Headroom to {fmtEUR(threshold)} threshold: <strong>{fmtEUR(headroom)}</strong>
                  </div>
                </div>
              </div>

              {/* Holdings Snapshot */}
              <div>
                <div className="font-bold text-slate-800 text-[11px] mb-1.5 flex flex-wrap justify-between gap-1">
                  <span>Holdings ({safeHoldings.length} {safeHoldings.length === 1 ? 'item' : 'items'})</span>
                  <span className="text-slate-500 font-mono text-[10px]">Values in EUR (reference FX)</span>
                </div>
                <div className="border border-slate-200 rounded overflow-hidden text-[10px]">
                  <div className="bg-slate-900 text-white font-bold p-1.5 flex justify-between gap-2">
                    <span>Asset / Region</span>
                    <span>Value (EUR)</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-24 overflow-y-auto">
                    {safeHoldings.length === 0 ? (
                      <div className="p-2 text-center text-slate-500">
                        No holdings yet. Add holdings to include them in the PDF.
                      </div>
                    ) : (
                      safeHoldings.map((h) => (
                        <div key={h.id} className="p-1.5 flex justify-between gap-2">
                          <span className="truncate min-w-0" title={h.assetName}>
                            {h.assetName} ({h.country})
                          </span>
                          <span className="font-mono font-bold shrink-0">
                            {fmtEUR(convertToEUR(Number(h.currentValue) || 0, h.currency))}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* AI Diagnosis Snippet */}
              {includeAiNotes && diagnosis && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-700 italic">
                  "{diagnosis.length > 150 ? `${diagnosis.substring(0, 150).trimEnd()}...` : diagnosis}"
                </div>
              )}

              {/* Disclaimer Note */}
              <div className="text-[9px] text-slate-600 border-t border-slate-100 pt-1.5 flex flex-wrap items-center justify-between gap-1">
                <span>Estimates only, based on simplified Irish tax rules. Not tax advice.</span>
                <span>investireland.ai</span>
              </div>

            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`p-3 rounded-xl flex items-center gap-2 font-medium border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Generated in your browser. Nothing is uploaded.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => runAction('print')}
              disabled={isBusy}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>{busyAction === 'print' ? 'Preparing...' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={() => runAction('download')}
              disabled={isBusy}
              aria-busy={busyAction === 'download'}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer flex-1 sm:flex-initial justify-center"
            >
              {busyAction === 'download' ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{busyAction === 'download' ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
