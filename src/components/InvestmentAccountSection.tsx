import React, { useEffect, useRef, useState } from 'react';
import { 
  Calendar, 
  Coins, 
  ShieldCheck, 
  Percent, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  HelpCircle,
  FileDown,
  Download,
  History,
  Plus,
  UserCheck,
  Printer,
  Sparkles
} from 'lucide-react';
import { Currency, InvestmentAccountState } from '../types';
import { getActiveUser } from '../services/activeUserStore';
import { INITIAL_INVESTMENT_ACCOUNT_STATE } from '../data/mockData';
import { InvestmentAccountPdfModal } from './InvestmentAccountPdfModal';

interface InvestmentAccountSectionProps {
  onOpenWaitlist: () => void;
  onExploreCalculator: () => void;
  investmentAccount?: InvestmentAccountState;
  currentCurrency?: Currency;
  onAddContribution?: (amount: number, provider: string) => void;
}

export const InvestmentAccountSection: React.FC<InvestmentAccountSectionProps> = ({
  onOpenWaitlist,
  onExploreCalculator,
  investmentAccount: propInvestmentAccount,
  currentCurrency = 'EUR',
  onAddContribution
}) => {
  const activeUser = getActiveUser();
  const [localAccount, setLocalAccount] = useState<InvestmentAccountState>(() => {
    return propInvestmentAccount || INITIAL_INVESTMENT_ACCOUNT_STATE;
  });
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isDirectDownloading, setIsDirectDownloading] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const isExportingRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Use props if provided, otherwise local state
  const currentAccount = propInvestmentAccount || localAccount;

  const historyList = Array.isArray(currentAccount.history) ? currentAccount.history : [];
  const annualLimit = currentAccount.annualLimit || 12000;
  const annualContrib = currentAccount.annualContributions || 0;
  const remainingAllowance = Math.max(0, annualLimit - annualContrib);
  const accountValue = currentAccount.accountValue || 0;
  const threshold = currentAccount.taxFreeThreshold || 50000;
  const remainingShelter = Math.max(0, threshold - accountValue);
  const allowancePercent = Math.min(100, Math.round((annualContrib / annualLimit) * 100));
  const allowanceFull = remainingAllowance <= 0;

  // Direct 1-click PDF download handler
  const handleQuickExportPdf = async () => {
    // Guard against rapid repeated clicks before the disabled state re-renders
    if (isExportingRef.current) return;
    isExportingRef.current = true;
    setIsDirectDownloading(true);
    setExportError(null);
    try {
      const { generateInvestmentAccountPdf } = await import('../services/pdfExportService');
      const doc = generateInvestmentAccountPdf({
        userName: activeUser?.name || 'Investor',
        userEmail: activeUser?.email,
        taxResidencyStatus: activeUser?.taxResidencyStatus || 'Self-declared tax residency',
        investmentAccount: currentAccount,
        currentCurrency,
        customNotes: 'Exported from InvestIreland Investment Account statutory overview module.'
      });

      const today = new Date().toISOString().split('T')[0];
      doc.save(`InvestIreland_InvestmentAccount_Summary_${today}.pdf`);
      setDownloadSuccessToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setDownloadSuccessToast(false), 4000);
    } catch (err) {
      console.error('Quick PDF export error:', err);
      setExportError('Sorry, the PDF could not be generated. Please try again.');
    } finally {
      isExportingRef.current = false;
      setIsDirectDownloading(false);
    }
  };

  // Quick helper to record a sample deposit if user wants to see transaction history change in real time
  const handleAddSampleDeposit = () => {
    const depositAmount = 1000;
    const provider = 'Davy Select (Direct Debit)';
    if (onAddContribution) {
      onAddContribution(depositAmount, provider);
    } else {
      // Mirror the app-level rule: never record more than the remaining annual allowance
      const allowed = Math.min(depositAmount, remainingAllowance);
      if (allowed <= 0) return;
      const updated: InvestmentAccountState = {
        ...currentAccount,
        accountValue: accountValue + allowed,
        annualContributions: annualContrib + allowed,
        history: [
          {
            id: `tx_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: allowed,
            provider,
            type: 'Contribution'
          },
          ...historyList
        ]
      };
      setLocalAccount(updated);
    }
  };

  return (
    <section id="investment-account" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Historic Reform in Irish Personal Finance
            </span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 hidden sm:inline-flex items-center gap-1 font-mono">
              Budget 2027 &bull; 1 July 2027
            </span>
          </div>

          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Get ready for Ireland’s new Investment Account.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            The new account is scheduled to open on <strong className="text-slate-900">1 July 2027</strong>. The announced framework includes a <strong className="text-slate-900">€12,000 annual contribution limit</strong> and a <strong className="text-slate-900">€50,000 tax-free threshold</strong>, with a <strong className="text-slate-900">1% annual charge</strong> strictly on value above that threshold.
          </p>
        </div>

        {/* 4 Core Framework Metric Cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
              €12,000
            </div>
            <div className="text-sm font-bold text-slate-800 mt-2">
              Maximum annual contribution
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-normal">
              Contribute up to €1,000 per month or lump sum annually to shelter gains.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
              €50,000
            </div>
            <div className="text-sm font-bold text-slate-800 mt-2">
              Announced tax-free threshold
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-normal">
              Capital growth and holdings up to €50k compound completely exempt from tax.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <Percent className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
              1%
            </div>
            <div className="text-sm font-bold text-slate-800 mt-2">
              Annual charge above threshold
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-normal">
              Applied exclusively to the marginal balance exceeding €50,000.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              1 July 2027
            </div>
            <div className="text-sm font-bold text-slate-800 mt-2">
              Planned launch date
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-normal">
              Subject to pre-legislative scrutiny and parliamentary enactment in the Finance Bill.
            </p>
          </div>

        </div>

        {/* ======================================================== */}
        {/* INTERACTIVE USER INVESTMENT ACCOUNT & PDF EXPORT DOSSIER */}
        {/* ======================================================== */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/20 shadow-xl relative overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl -z-10 opacity-70"></div>

          {/* Top Banner & Export Actions Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Your 2027 Account State &amp; Transaction Ledger
                </span>
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Holder: <strong>{activeUser.name}</strong></span>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
                Budget 2027 Investment Account Ledger &amp; PDF Export
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Generate and download a formatted PDF summary of your annual allowance, tax-free headroom, and complete transaction log.
              </p>
            </div>

            {/* Prominent Export to PDF Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleQuickExportPdf}
                disabled={isDirectDownloading}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
                title="Directly download Investment Account Summary PDF"
              >
                {isDirectDownloading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-emerald-200" />
                    <span>Export to PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/50 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="Customize PDF options and preview document before export"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Customize &amp; Preview</span>
              </button>

              <button
                type="button"
                onClick={handleAddSampleDeposit}
                disabled={allowanceFull}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title={allowanceFull ? 'The annual contribution allowance has been reached' : 'Add a sample €1,000 planned deposit (capped at your remaining allowance)'}
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Record €1k Deposit</span>
              </button>
            </div>
          </div>

          {/* Download Success Notice */}
          {downloadSuccessToast && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Investment Account Summary PDF generated and downloaded to your device!</span>
            </div>
          )}
          {exportError && (
            <div role="alert" className="mt-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {/* Account Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Account Value</span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded">
                  Pre-Launch
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono mt-1">
                €{accountValue.toLocaleString('en-IE')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Accumulated capital growth &amp; early planned deposit assets
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Annual Allowance Cap</span>
                <span className="text-[10px] font-mono font-bold text-slate-600">
                  {allowancePercent}% utilized
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-800 font-mono mt-1">
                €{annualContrib.toLocaleString('en-IE')} <span className="text-sm font-normal text-slate-500">/ €{annualLimit.toLocaleString('en-IE')}</span>
              </div>
              
              {/* Allowance progress bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${allowancePercent}%` }}
                />
              </div>

              <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center justify-between">
                <span>€{remainingAllowance.toLocaleString('en-IE')} allowance remaining</span>
                <span className="text-[10px] text-slate-500">Max €1,000/mo</span>
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Tax-Free Shelter Room</span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                  0% Exit Tax
                </span>
              </div>
              <div className="text-3xl font-black text-teal-800 font-mono mt-1">
                €{remainingShelter.toLocaleString('en-IE')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Gains sheltered before marginal 1% annual fee applies
              </p>
            </div>

          </div>

          {/* Transaction & Allocation History Ledger */}
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  Transaction &amp; Allocation History ({historyList.length} Entries)
                </h4>
              </div>
              <span className="text-xs text-slate-500">
                All ledger entries below will be formatted into your downloaded PDF summary.
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Date</th>
                      <th className="py-2.5 px-3.5">Transaction Type</th>
                      <th className="py-2.5 px-3.5">Provider / Custodian</th>
                      <th className="py-2.5 px-3.5">Statutory Classification</th>
                      <th className="py-2.5 px-3.5 text-right">Amount (EUR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                    {historyList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3.5 text-slate-600">{tx.date}</td>
                        <td className="py-2.5 px-3.5 font-sans font-bold text-slate-900">{tx.type}</td>
                        <td className="py-2.5 px-3.5 font-sans text-slate-600">{tx.provider}</td>
                        <td className="py-2.5 px-3.5 font-sans">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Qualifying Deposit (2027 Rules)</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-emerald-800 text-right">
                          €{Number(tx.amount).toLocaleString('en-IE')}
                        </td>
                      </tr>
                    ))}
                    {historyList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                          No transactions recorded yet. Click "Record €1k Deposit" or make a deposit in the dashboard.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {historyList.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3.5 font-sans text-xs">
                          Total Recorded Allocations in Ledger
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-emerald-900 text-xs">
                          €{historyList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toLocaleString('en-IE')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Quick PDF Export Banner Footer */}
          <div className="mt-6 p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <FileDown className="w-5 h-5 text-emerald-700 shrink-0" />
              <div className="text-slate-800">
                <span className="font-bold text-emerald-950 block">Need a printable dossier for your records or tax advisor?</span>
                <span className="text-slate-600 text-[11px]">The PDF includes your ledger, statutory citations (TCA 1997 s.739D) and links to Department of Finance guidance.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickExportPdf}
              disabled={isDirectDownloading}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDirectDownloading ? 'Preparing PDF...' : 'Download PDF Summary'}</span>
            </button>
          </div>

        </div>

        {/* Deep Dive: Clear distinctions (Spec Section 21) */}
        <div className="mt-12 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl p-6 sm:p-8 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-emerald-700 shrink-0" />
            <h3 className="text-lg font-bold text-slate-900">
              Crucial Definitions: What you must distinguish
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-emerald-700 uppercase">1. Contribution Limit</span>
              <h4 className="text-base font-bold text-slate-900 mt-1">€12,000 / tax year</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                The total amount of cash you can deposit into your account within a single tax year. Once reached, you must wait for the next tax year.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-teal-700 uppercase">2. Account Value</span>
              <h4 className="text-base font-bold text-slate-900 mt-1">Contributions + Growth</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                The total market value of your invested ETFs, stocks and cash. This can grow well past €50,000 or €100,000 without capping your contributions.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-amber-700 uppercase">3. Tax Threshold</span>
              <h4 className="text-base font-bold text-slate-900 mt-1">€50,000 Ceiling</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                The threshold before any tax charge applies. If your balance is €60,000, the 1% annual fee only applies to €10,000 (€100/year).
              </p>
            </div>
          </div>

          {/* Legislative Disclaimer (Spec Section 8) */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-start gap-3 text-xs text-slate-700">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Disclaimer:</strong> These figures reflect the Budget 2027 framework as announced by the Department of Finance and the Irish Government. Detailed legislation, administrative rules, and eligible provider specifications are subject to parliamentary debate and final enactment.
            </p>
          </div>
        </div>

        {/* Section CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onExploreCalculator}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all cursor-pointer"
          >
            <span>Simulate your savings in the Calculator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={handleQuickExportPdf}
            disabled={isDirectDownloading}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-black disabled:opacity-50 text-white shadow-sm transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>Export Account Summary (PDF)</span>
          </button>

          <button
            type="button"
            onClick={onOpenWaitlist}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-all cursor-pointer"
          >
            <span>Reserve Early Access</span>
          </button>
        </div>

      </div>

      {/* Export to PDF Customization & Preview Modal */}
      <InvestmentAccountPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        investmentAccount={currentAccount}
        currentCurrency={currentCurrency}
        defaultUserName={activeUser.name}
        userEmail={activeUser.email}
      />
    </section>
  );
};

