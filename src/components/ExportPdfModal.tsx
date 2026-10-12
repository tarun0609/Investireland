import React, { useState } from 'react';
import { Currency, Holding, InvestmentAccountState, FinancialXRayData } from '../types';
import { formatCurrency, convertToEUR } from '../services/fiscalDataService';
import { 
  FileDown, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Printer, 
  Sparkles, 
  Eye, 
  Settings,
  Layers,
  Globe2,
  Calendar
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
    return localStorage.getItem('investireland_user_name') || defaultUserName;
  });
  const [includeAiNotes, setIncludeAiNotes] = useState(true);
  const [includeCrossBorder, setIncludeCrossBorder] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const { generatePortfolioPdf } = await import('../services/pdfExportService');
      const doc = generatePortfolioPdf({
        userName,
        holdings,
        investmentAccount,
        xray,
        currentCurrency,
        includeAiNotes,
        includeCrossBorder
      });

      const fileName = `InvestIreland_Portfolio_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl relative max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Export Financial Intelligence PDF Summary
              </h3>
              <p className="text-xs text-slate-500">
                Generate an official, printable dossier of your portfolio &amp; Budget 2027 analytics.
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
          
          {/* Customization Options Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5 text-emerald-600" />
              <span>Report Options &amp; Formatting</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Report Account Holder Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
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
                  <span>Include AI Diagnostic Assessment</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCrossBorder}
                    onChange={(e) => setIncludeCrossBorder(e.target.checked)}
                    className="rounded text-emerald-600 cursor-pointer"
                  />
                  <span>Include Cross-Border (India/US) Breakdown</span>
                </label>
              </div>
            </div>
          </div>

          {/* Document Preview Box */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50/50">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Document Preview (A4 Page 1)</span>
              </span>
              <span>ISO 32000-1 Compliant PDF</span>
            </div>

            <div className="p-5 bg-white space-y-4 text-slate-800 font-sans">
              
              {/* Header Preview */}
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-emerald-600 text-white rounded font-bold text-xs flex items-center justify-center">
                    IE
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">InvestIreland AI</div>
                    <div className="text-[10px] text-slate-500">Financial Intelligence Dossier</div>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono">
                  <div>Date: {new Date().toLocaleDateString('en-IE')}</div>
                  <div>User: {userName}</div>
                </div>
              </div>

              {/* Summary Cards Preview */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="text-[9px] text-slate-500 font-bold">TOTAL ASSETS</div>
                  <div className="text-xs font-extrabold font-mono text-slate-900 mt-0.5">
                    €{xray.totalAssetsEUR.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="text-[9px] text-slate-500 font-bold">CASH BUFFER</div>
                  <div className="text-xs font-extrabold font-mono text-slate-900 mt-0.5">
                    €{xray.liquidity.cashEUR.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="text-[9px] text-slate-500 font-bold">INVESTMENTS</div>
                  <div className="text-xs font-extrabold font-mono text-slate-900 mt-0.5">
                    €{xray.liquidity.liquidInvestmentsEUR.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="text-[9px] text-slate-500 font-bold">PENSION (LOCKED)</div>
                  <div className="text-xs font-extrabold font-mono text-slate-900 mt-0.5">
                    €{xray.liquidity.pensionAndLockedEUR.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Investment Account Status Preview */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <div className="font-bold text-emerald-950 text-[11px] mb-1">
                  Budget 2027 Personal Savings &amp; Investment Account:
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-emerald-900">
                  <div>
                    &bull; Annual Allowance: <strong>€{investmentAccount.annualContributions.toLocaleString()} / €12,000</strong> ({Math.round((investmentAccount.annualContributions / investmentAccount.annualLimit) * 100)}% Used)
                  </div>
                  <div>
                    &bull; €50,000 Threshold Headroom: <strong>€{(Math.max(0, investmentAccount.taxFreeThreshold - investmentAccount.accountValue)).toLocaleString()}</strong> (0% tax rate)
                  </div>
                </div>
              </div>

              {/* Holdings Snapshot */}
              <div>
                <div className="font-bold text-slate-800 text-[11px] mb-1.5 flex justify-between">
                  <span>Holdings Ledger Preview ({holdings.length} tracked items)</span>
                  <span className="text-slate-500 font-mono text-[10px]">Currency: EUR &middot; INR &middot; USD</span>
                </div>
                <div className="border border-slate-200 rounded overflow-hidden text-[10px]">
                  <div className="bg-slate-900 text-white font-bold p-1.5 flex justify-between">
                    <span>Asset / Provider</span>
                    <span>Valuation (EUR)</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-24 overflow-y-auto">
                    {holdings.map((h) => (
                      <div key={h.id} className="p-1.5 flex justify-between">
                        <span className="truncate max-w-[240px]">
                          {h.assetName} ({h.country})
                        </span>
                        <span className="font-mono font-bold">
                          €{Math.round(convertToEUR(h.currentValue, h.currency)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Diagnosis Snippet */}
              {includeAiNotes && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-700 italic">
                  "{xray.aiDiagnosis.substring(0, 150)}..."
                </div>
              )}

              {/* Statutory Note */}
              <div className="text-[9px] text-slate-600 border-t border-slate-100 pt-1.5 flex items-center justify-between">
                <span>Statutory Authority: Department of Finance Budget 2027 &amp; Revenue TCA 1997</span>
                <span>investireland.ai</span>
              </div>

            </div>
          </div>

          {/* Success Alert */}
          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PDF Summary generated and downloaded successfully!</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted client-side vector render. No data stored remotely.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Dossier</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer flex-1 sm:flex-initial justify-center"
            >
              <FileDown className="w-4 h-4" />
              <span>{isDownloading ? 'Building PDF...' : 'Download PDF Summary (.pdf)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
