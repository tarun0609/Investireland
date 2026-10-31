import React, { useEffect, useId, useRef, useState } from 'react';
import { Currency, InvestmentAccountState } from '../types';
import { getActiveUser } from '../services/activeUserStore';
import {
  FileDown,
  X,
  CheckCircle2,
  Info,
  Printer,
  Eye,
  Settings,
  History,
  Download,
  AlertTriangle
} from 'lucide-react';

interface InvestmentAccountPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  investmentAccount: InvestmentAccountState;
  currentCurrency?: Currency;
  defaultUserName?: string;
  userEmail?: string;
}

const DEMO_EMAIL = 'priya.sharma@investireland.demo';

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

export const InvestmentAccountPdfModal: React.FC<InvestmentAccountPdfModalProps> = ({
  isOpen,
  onClose,
  investmentAccount,
  currentCurrency = 'EUR',
  defaultUserName,
  userEmail
}) => {
  const activeUser = getActiveUser();
  const [userName, setUserName] = useState<string>(() => defaultUserName || activeUser?.name || 'Investor');
  const [email, setEmail] = useState<string>(() => {
    const candidate = userEmail || activeUser?.email || '';
    return candidate === DEMO_EMAIL ? '' : candidate;
  });
  const [customNotes, setCustomNotes] = useState<string>('');
  const [includeStatutoryBreakdown, setIncludeStatutoryBreakdown] = useState(true);
  const [busyAction, setBusyAction] = useState<'download' | 'print' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const titleId = useId();
  const nameId = useId();
  const emailId = useId();
  const notesId = useId();
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

  const historyList = Array.isArray(investmentAccount.history) ? investmentAccount.history : [];
  const annualLimit = Number(investmentAccount.annualLimit) || 12000;
  const annualContrib = Number(investmentAccount.annualContributions) || 0;
  const accountValue = Number(investmentAccount.accountValue) || 0;
  const threshold = Number(investmentAccount.taxFreeThreshold) || 50000;
  const chargeRate = Number(investmentAccount.excessAnnualChargeRate) || 0.01;
  const remainingAllowance = Math.max(0, annualLimit - annualContrib);
  const excess = Math.max(0, accountValue - threshold);
  const trimmedName = userName.trim() || 'Investor';
  const trimmedEmail = email.trim();
  const emailInvalid = trimmedEmail !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    if (!mountedRef.current) return;
    setFeedback({ type, message });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      if (mountedRef.current) setFeedback(null);
    }, 4000);
  };

  const runAction = async (action: 'download' | 'print') => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyAction(action);
    setFeedback(null);
    try {
      const { generateInvestmentAccountPdf } = await import('../services/pdfExportService');
      const doc = generateInvestmentAccountPdf({
        userName: trimmedName,
        userEmail: emailInvalid ? undefined : trimmedEmail || undefined,
        taxResidencyStatus: activeUser?.taxResidencyStatus || 'Self-declared tax residency',
        investmentAccount,
        currentCurrency,
        customNotes: customNotes.trim(),
        includeStatutoryBreakdown
      });
      if (!mountedRef.current) return;

      const nameSegment = safeFileSegment(trimmedName);
      const fileName = `InvestIreland_InvestmentAccount_Summary_${nameSegment ? `${nameSegment}_` : ''}${localDateStamp()}.pdf`;

      if (action === 'download') {
        doc.save(fileName);
        showFeedback('success', 'Investment Account PDF generated. Check your downloads folder.');
      } else {
        doc.autoPrint();
        const url = doc.output('bloburl');
        const win = window.open(url, '_blank');
        if (!win) {
          doc.save(fileName);
          showFeedback('success', 'Pop-up blocked, so the PDF was downloaded instead. Open it to print.');
        } else {
          showFeedback('success', 'PDF opened in a new tab for printing.');
        }
        setTimeout(() => URL.revokeObjectURL(String(url)), 60_000);
      }
    } catch (err) {
      console.error('Failed to generate Investment Account PDF:', err);
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id={titleId} className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Export Investment Account (PSIA) PDF Summary
              </h3>
              <p className="text-xs text-slate-500">
                Your tracked figures for the announced scheme &amp; logged transactions (estimates).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 text-xs min-w-0">

          {/* Options & Metadata customization */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5 text-emerald-600" />
              <span>Report Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={nameId} className="font-semibold text-slate-700 block mb-1">
                  Account holder name
                </label>
                <input
                  id={nameId}
                  type="text"
                  value={userName}
                  maxLength={80}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Investor"
                  className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor={emailId} className="font-semibold text-slate-700 block mb-1">
                  Email (optional)
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  maxLength={120}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={emailInvalid}
                  className={`w-full px-3 py-1.5 bg-white rounded-lg border text-xs font-medium focus:ring-1 focus:ring-emerald-500 ${emailInvalid ? 'border-rose-400' : 'border-slate-300'}`}
                />
                {emailInvalid && (
                  <p className="text-[10px] text-rose-600 mt-1">Doesn't look like a valid email, so it will be left off the PDF.</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor={notesId} className="font-semibold text-slate-700 block mb-1">
                Personal note (optional)
              </label>
              <input
                id={notesId}
                type="text"
                value={customNotes}
                maxLength={500}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Optional note to print on the PDF..."
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStatutoryBreakdown}
                  onChange={(e) => setIncludeStatutoryBreakdown(e.target.checked)}
                  className="rounded text-emerald-600 cursor-pointer mt-0.5"
                />
                <span>Include proposed scheme rules vs standard fund tax (exit tax &amp; deemed disposal)</span>
              </label>
            </div>
          </div>

          {/* Document Preview Box */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50/50">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-slate-600">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Preview (simplified)</span>
              </span>
              <span>A4 PDF</span>
            </div>

            <div className="p-3 sm:p-4 space-y-4 bg-white text-slate-800">

              {/* Mini Header Mockup */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white font-black text-[10px]">IE</span>
                    <span className="font-black text-slate-900 text-sm">InvestIreland AI</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                    Investment Account (PSIA) Tracker &amp; Transaction Log
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono min-w-0">
                  <div>Date: {new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div className="font-bold text-slate-700 truncate max-w-[140px] sm:max-w-[220px]" title={trimmedName}>Holder: {trimmedName}</div>
                </div>
              </div>

              {/* 4 Key Metrics Snapshot in Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 min-w-0">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Account Value</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono block mt-0.5 truncate">
                    {fmtEUR(accountValue)}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 min-w-0">
                  <span className="text-[9px] text-emerald-700 uppercase font-bold block">Annual Allowance</span>
                  <span className="text-sm font-extrabold text-emerald-800 font-mono block mt-0.5 truncate">
                    {fmtEUR(annualContrib)} <span className="text-[10px] text-slate-500">/ {fmtEUR(annualLimit)}</span>
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 min-w-0">
                  <span className="text-[9px] text-teal-700 uppercase font-bold block">Threshold Headroom</span>
                  <span className="text-sm font-extrabold text-teal-800 font-mono block mt-0.5 truncate">
                    {fmtEUR(Math.max(0, threshold - accountValue))}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 min-w-0">
                  <span className="text-[9px] text-amber-700 uppercase font-bold block">Est. Annual Charge</span>
                  <span className="text-sm font-extrabold text-amber-800 font-mono block mt-0.5 truncate">
                    {fmtEUR(excess * chargeRate)}/yr
                  </span>
                </div>
              </div>

              {/* Transaction Ledger Table Preview */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="w-3 h-3 text-emerald-600" />
                    <span>Transactions in PDF ({historyList.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Remaining allowance: {fmtEUR(remainingAllowance)}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
                  <table className="w-full min-w-[360px] text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th scope="col" className="py-1.5 px-2.5">Date</th>
                        <th scope="col" className="py-1.5 px-2.5">Type</th>
                        <th scope="col" className="py-1.5 px-2.5">Provider</th>
                        <th scope="col" className="py-1.5 px-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {historyList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-2 px-2.5 text-center text-slate-500 text-[10px]">
                            No transactions logged yet.
                          </td>
                        </tr>
                      )}
                      {historyList.slice(0, 4).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-1 px-2.5 font-mono text-[10px] whitespace-nowrap">{tx.date}</td>
                          <td className="py-1 px-2.5 font-medium">{tx.type}</td>
                          <td className="py-1 px-2.5 text-slate-500 max-w-[140px] truncate" title={tx.provider}>{tx.provider}</td>
                          <td className="py-1 px-2.5 font-bold font-mono text-emerald-800 text-right whitespace-nowrap">
                            {fmtEUR(Number(tx.amount) || 0)}
                          </td>
                        </tr>
                      ))}
                      {historyList.length > 4 && (
                        <tr>
                          <td colSpan={4} className="py-1 px-2.5 text-center text-slate-500 text-[10px] bg-slate-50/50">
                            + {historyList.length - 4} more {historyList.length - 4 === 1 ? 'entry' : 'entries'} in the PDF
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scheme Note Banner */}
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-[10px] text-emerald-900 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Announced scheme:</strong> as proposed, gains inside the account would not be subject to the standard exit tax on funds/ETFs or the 8-year deemed disposal rule (TCA 1997 s.739D). Rules are subject to final legislation.
                </span>
              </div>

            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => runAction('print')}
            disabled={isBusy}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>{busyAction === 'print' ? 'Preparing...' : 'Print'}</span>
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => runAction('download')}
              disabled={isBusy}
              aria-busy={busyAction === 'download'}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {busyAction === 'download' ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-emerald-200" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
