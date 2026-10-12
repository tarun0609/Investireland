import React, { useState } from 'react';
import { Currency, InvestmentAccountState } from '../types';
import { getActiveUser } from '../services/authEmailService';
import { 
  FileDown, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Printer, 
  Eye, 
  Settings, 
  Calendar,
  Coins,
  History,
  Info,
  Download
} from 'lucide-react';

interface InvestmentAccountPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  investmentAccount: InvestmentAccountState;
  currentCurrency?: Currency;
  defaultUserName?: string;
  userEmail?: string;
}

export const InvestmentAccountPdfModal: React.FC<InvestmentAccountPdfModalProps> = ({
  isOpen,
  onClose,
  investmentAccount,
  currentCurrency = 'EUR',
  defaultUserName,
  userEmail
}) => {
  const activeUser = getActiveUser();
  const [userName, setUserName] = useState<string>(() => {
    return defaultUserName || activeUser?.name || 'Investor';
  });
  const [email, setEmail] = useState<string>(() => {
    return userEmail || (activeUser?.email !== 'priya.sharma@investireland.demo' ? activeUser?.email : 'investor@investireland.ie') || 'investor@investireland.ie';
  });
  const [customNotes, setCustomNotes] = useState<string>(
    'Budget 2027 Personal Savings & Investment Account statutory readiness record & deposit allocation audit.'
  );
  const [includeStatutoryBreakdown, setIncludeStatutoryBreakdown] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const { generateInvestmentAccountPdf } = await import('../services/pdfExportService');
      const doc = generateInvestmentAccountPdf({
        userName,
        userEmail: email,
        taxResidencyStatus: activeUser?.taxResidencyStatus || 'Self-declared tax residency',
        investmentAccount,
        currentCurrency,
        customNotes,
        includeStatutoryBreakdown
      });

      const today = new Date().toISOString().split('T')[0];
      const fileName = `InvestIreland_InvestmentAccount_Summary_${today}.pdf`;
      doc.save(fileName);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate Investment Account PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const historyList = Array.isArray(investmentAccount.history) ? investmentAccount.history : [];
  const remainingAllowance = Math.max(0, (investmentAccount.annualLimit || 12000) - (investmentAccount.annualContributions || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl relative max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Export Investment Account (PSIA) PDF Summary
              </h3>
              <p className="text-xs text-slate-500">
                Official Department of Finance Budget 2027 scheme metrics &amp; transaction history ledger.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 text-xs">
          
          {/* Options & Metadata customization */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dossier Customization &amp; Investor Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Investor / Account Holder Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Custom Verification / Compliance Note
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Optional notes to print on footer..."
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStatutoryBreakdown}
                  onChange={(e) => setIncludeStatutoryBreakdown(e.target.checked)}
                  className="rounded text-emerald-600 cursor-pointer"
                />
                <span>Include Budget 2027 vs 2026 Statutory Tax Relief Breakdown (0% Exit Tax &amp; Deemed Disposal Exemption)</span>
              </label>
            </div>
          </div>

          {/* Document Preview Box */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50/50">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Document Preview Snapshot (A4 Sheet)</span>
              </span>
              <span>ISO 32000-1 PDF Standard</span>
            </div>

            <div className="p-4 space-y-4 bg-white text-slate-800">
              
              {/* Mini Header Mockup */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-[10px]">IE</span>
                    <span className="font-black text-slate-900 text-sm">InvestIreland AI</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                    Budget 2027 Personal Savings &amp; Investment Account (PSIA) Audit Ledger
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono">
                  <div>Date: {new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div className="font-bold text-slate-700">Holder: {userName}</div>
                </div>
              </div>

              {/* 4 Key Metrics Snapshot in Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Account Value</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono block mt-0.5">
                    €{(investmentAccount.accountValue || 0).toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[9px] text-emerald-700 uppercase font-bold block">2027 Allowance</span>
                  <span className="text-sm font-extrabold text-emerald-800 font-mono block mt-0.5">
                    €{(investmentAccount.annualContributions || 0).toLocaleString()} <span className="text-[10px] text-slate-400">/ €12k</span>
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[9px] text-teal-700 uppercase font-bold block">Tax-Free Room</span>
                  <span className="text-sm font-extrabold text-teal-800 font-mono block mt-0.5">
                    €{Math.max(0, (investmentAccount.taxFreeThreshold || 50000) - (investmentAccount.accountValue || 0)).toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[9px] text-amber-700 uppercase font-bold block">Annual Charge</span>
                  <span className="text-sm font-extrabold text-amber-800 font-mono block mt-0.5">
                    {(investmentAccount.accountValue || 0) > 50000 
                      ? `€${Math.round(((investmentAccount.accountValue || 0) - 50000) * 0.01).toLocaleString()}/yr`
                      : '€0.00 / yr'}
                  </span>
                </div>
              </div>

              {/* Transaction Ledger Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="w-3 h-3 text-emerald-600" />
                    <span>Transaction History Included in PDF ({historyList.length} items)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Remaining Headroom: €{remainingAllowance.toLocaleString()}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="py-1.5 px-2.5">Date</th>
                        <th className="py-1.5 px-2.5">Type</th>
                        <th className="py-1.5 px-2.5">Provider</th>
                        <th className="py-1.5 px-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {historyList.slice(0, 4).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-1 px-2.5 font-mono text-[10px]">{tx.date}</td>
                          <td className="py-1 px-2.5 font-medium">{tx.type}</td>
                          <td className="py-1 px-2.5 text-slate-500">{tx.provider}</td>
                          <td className="py-1 px-2.5 font-bold font-mono text-emerald-800 text-right">
                            €{Number(tx.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {historyList.length > 4 && (
                        <tr>
                          <td colSpan={4} className="py-1 px-2.5 text-center text-slate-400 text-[10px] bg-slate-50/50">
                            + {historyList.length - 4} additional historical entries will be printed in PDF table
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Statutory Note Banner */}
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-[10px] text-emerald-900 flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Statutory Basis:</strong> Enacting Department of Finance Budget 2027 Reform. Gains sheltered under this account avoid Ireland's traditional 41% Exit Tax on UCITS ETFs and 8-year Deemed Disposal rules (TCA 1997 s.739D).
                </span>
              </div>

            </div>
          </div>

          {/* Success Toast */}
          {downloadSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Investment Account Summary PDF generated and downloaded to your device!</span>
            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Sheet</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-emerald-200" />
                  <span>Download Investment Account PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
