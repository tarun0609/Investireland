import React, { useState, useEffect } from 'react';
import { FiscalDataResponse } from '../types';
import { fetchOfficialFiscalData, FALLBACK_FISCAL_DATA } from '../services/fiscalDataService';
import { 
  ShieldCheck, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Database, 
  Terminal, 
  Clock, 
  FileCheck,
  AlertCircle
} from 'lucide-react';

export const GovtSourcesSection: React.FC = () => {
  const [fiscalData, setFiscalData] = useState<FiscalDataResponse>(FALLBACK_FISCAL_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('—');
  const [showJsonInspector, setShowJsonInspector] = useState<boolean>(false);

  const handleSyncFromGovtAPI = async () => {
    setIsLoading(true);
    const start = performance.now();
    try {
      const data = await fetchOfficialFiscalData();
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setFiscalData(data);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSyncFromGovtAPI();
  }, []);

  return (
    <section id="govt-sources" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-200">
            <Database className="w-3.5 h-3.5" />
            <span>Official Government Source of Truth</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Reference Fiscal Data with Official Source Links
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            The figures below are a curated reference dataset, last reviewed on {fiscalData.lastVerifiedTimestamp.slice(0, 10)}. They are not fetched live from government systems. Always confirm current rules on the linked official sites before acting.
          </p>
        </div>

        {/* Live API Health & Telemetry Strip */}
        <div className="mt-10 bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Reference data endpoint &middot; /api/fiscal-data
                </div>
                <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mt-0.5">
                  <span>Official Irish Statutory Source Feed</span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
                    STATUS: REFERENCE DATASET
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">
                Response: <strong className="text-white">{latencyMs === null ? '—' : `ms`}</strong> &middot; Loaded: <strong className="text-white">{lastSyncTime}</strong>
              </span>

              <button
                onClick={handleSyncFromGovtAPI}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Querying...' : 'Reload reference data'}</span>
              </button>
            </div>
          </div>

          {/* Key Fiscal Parameters Pulled Live */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs font-mono">
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">FY27 SCHEME CAP</span>
              <span className="text-emerald-400 text-base font-bold">
                €{fiscalData.regime.fy27.annualContributionLimit.toLocaleString()} / year
              </span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">TAX-FREE THRESHOLD</span>
              <span className="text-emerald-400 text-base font-bold">
                €{fiscalData.regime.fy27.taxFreeThreshold.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">EXCESS ANNUAL CHARGE</span>
              <span className="text-emerald-400 text-base font-bold">
                {(fiscalData.regime.fy27.annualChargeAboveThreshold * 100).toFixed(1)}% p.a.
              </span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">FY26 ETF EXIT TAX</span>
              <span className="text-rose-400 text-base font-bold">
                {(fiscalData.regime.fy26.exitTaxRate * 100).toFixed(0)}% (8-yr Deemed)
              </span>
            </div>
          </div>

          {/* Inspector Toggle */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showJsonInspector ? 'Hide raw JSON' : 'Inspect raw reference JSON'}</span>
            </button>
          </div>

          {showJsonInspector && (
            <div className="mt-3 p-3 bg-black/80 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
              <pre>{JSON.stringify(fiscalData, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Source Hierarchy Cards (Spec Section 30) */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Official Regulatory Authorities &amp; Statutory References
            </h3>
            <span className="text-xs font-medium text-slate-500">
              Hierarchy: Statutory Authorities &rarr; Regulators &rarr; Parliamentary Bills
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fiscalData.officialSources.map((source) => (
              <div 
                key={source.id}
                className="bg-slate-50 p-5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-mono text-[10px]">
                      {source.status}
                    </span>
                    <span className="text-slate-500 font-mono">
                      Reference
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {source.agency}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {source.title}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">
                    Published: {source.publicationDate}
                  </span>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
