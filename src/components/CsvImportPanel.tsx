import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2 } from 'lucide-react';
import type { Holding } from '../types';
import { formatCurrency } from '../services/fiscalDataService';
import {
  CsvImportError,
  HOLDINGS_CSV_TEMPLATE,
  MAX_IMPORT_FILE_BYTES,
  parseHoldingsCsv,
  planImport,
  type ImportPlanItem,
  type ImportResult,
} from '../services/csvImportService';

interface CsvImportPanelProps {
  holdings: Holding[];
  /** Saves the plan; resolves to the number of items that failed to save. */
  onImport: (items: ImportPlanItem[]) => Promise<number>;
  onAddManually: () => void;
  onDone: () => void;
}

const formatUnits = (n: number) => n.toLocaleString('en-IE', { maximumFractionDigits: 6 });

function downloadTemplate() {
  const blob = new Blob([HOLDINGS_CSV_TEMPLATE + '\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'investireland-holdings-template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const CsvImportPanel: React.FC<CsvImportPanelProps> = ({ holdings, onImport, onAddManually, onDone }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ added: number; updated: number; failed: number } | null>(null);

  const plan = useMemo(() => (result ? planImport(holdings, result.holdings) : []), [holdings, result]);

  const reset = () => {
    setFileName(null);
    setResult(null);
    setError(null);
    setDone(null);
  };

  const handleFile = async (file: File) => {
    reset();
    setFileName(file.name);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError('Please choose a .csv file. Excel and PDF statements aren\u2019t supported yet; export them as CSV first.');
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setError('This file is too large. The limit is 2 MB.');
      return;
    }
    try {
      setResult(parseHoldingsCsv(await file.text()));
    } catch (err) {
      setError(err instanceof CsvImportError ? err.message : 'This file couldn\u2019t be read. Check that it is a CSV export.');
    }
  };

  const handleConfirm = async () => {
    if (plan.length === 0) return;
    setBusy(true);
    try {
      const failed = await onImport(plan);
      setDone({
        added: plan.filter((p) => p.action === 'add').length,
        updated: plan.filter((p) => p.action === 'update').length,
        failed,
      });
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs max-w-3xl mx-auto">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3">
          <FileUp className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Import Holdings from CSV</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
          Import a DEGIRO portfolio export, a Trading 212 history export, or our simple template. The file is read in your
          browser and is never uploaded. You review everything before it is saved.
        </p>
      </div>

      {done ? (
        <div className="mt-8 p-5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-900 space-y-3" role="status">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-5 h-5" />
            Imported {done.added} new and updated {done.updated} existing holding{done.added + done.updated === 1 ? '' : 's'}.
          </div>
          {done.failed > 0 && (
            <p className="text-rose-700">{done.failed} holding{done.failed === 1 ? '' : 's'} couldn&rsquo;t be saved. Please try again.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onDone} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl cursor-pointer">
              View holdings
            </button>
            <button type="button" onClick={reset} className="px-4 py-2 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl cursor-pointer">
              Import another file
            </button>
          </div>
        </div>
      ) : !result ? (
        <>
          <div className="mt-8 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center transition-all bg-slate-50/50">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleFile(file);
              }}
              className="sr-only"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer block">
              <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span className="text-sm font-bold text-slate-800 block">Choose a CSV file</span>
              <span className="text-xs text-slate-400 mt-1 block">Up to 2 MB &middot; stays on this device</span>
            </label>
          </div>

          {error && (
            <div role="alert" className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span><span className="font-bold break-all">{fileName}:</span> {error}</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="font-bold text-slate-800 mb-1">DEGIRO</div>
              Portfolio &rarr; download icon &rarr; <span className="font-semibold">CSV</span>. Imports units, closing prices and cash.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="font-bold text-slate-800 mb-1">Trading 212</div>
              History &rarr; Export history &rarr; pick all dates. Buys and sells are netted into positions at your last trade price.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="font-bold text-slate-800 mb-1">Any other account</div>
              <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Download the template
              </button>
              , fill it in with a spreadsheet and import it.
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-500 text-center">
            Indian CAS PDFs (CAMS/KFintech, NSDL/CDSL) and Excel files aren&rsquo;t supported yet.{' '}
            <button type="button" onClick={onAddManually} className="font-bold text-emerald-800 hover:underline cursor-pointer">Add holdings manually</button>{' '}
            or use the template.
          </p>
        </>
      ) : (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800">
            <span className="break-all">{fileName}</span>
            <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{result.formatLabel}</span>
          </div>

          {result.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2 px-3">Asset</th>
                  <th className="py-2 px-3 text-right">Units</th>
                  <th className="py-2 px-3 text-right">Price</th>
                  <th className="py-2 px-3 text-right">Value</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan.map(({ holding: h, action }) => (
                  <tr key={h.id}>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900 break-words max-w-[240px]">{h.assetName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{[h.ticker, h.isin, h.assetType].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatUnits(h.units)}</td>
                    <td className="py-2 px-3 text-right font-mono whitespace-nowrap">{formatCurrency(h.unitPrice, h.currency, 2)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">{formatCurrency(h.currentValue, h.currency, 2)}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${action === 'add' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                        {action === 'add' ? 'New' : 'Update'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button type="button" onClick={reset} disabled={busy} className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer disabled:opacity-50">
              Choose another file
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy || plan.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Import {plan.length} holding{plan.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
