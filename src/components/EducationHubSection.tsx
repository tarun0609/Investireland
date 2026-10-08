import React, { useState } from 'react';
import { EDUCATIONAL_ARTICLES } from '../data/mockData';
import { 
  BookOpen, 
  ExternalLink, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  ArrowRight,
  X
} from 'lucide-react';

export const EducationHubSection: React.FC = () => {
  const [selectedArticle, setSelectedArticle] = useState<typeof EDUCATIONAL_ARTICLES[0] | null>(null);

  return (
    <section id="learn" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reviewed Financial Education</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Financial information without the jargon.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Every guide is authored for clarity, cross-checked against official Revenue and Department of Finance manuals, and dated for statutory accuracy.
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
                  <span className="text-slate-600 text-[11px] truncate max-w-[160px]">
                    {art.reviewer}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{art.source}</span>
                  </span>
                  <button
                    onClick={() => setSelectedArticle(art)}
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
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded">
                    {selectedArticle.category}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-2">
                    {selectedArticle.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>{selectedArticle.summary}</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Official Statutory Reference:</span>
                    <span className="font-bold text-slate-900">{selectedArticle.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Review Attribution:</span>
                    <span className="text-slate-800">{selectedArticle.reviewer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Last Code Verification:</span>
                    <span className="text-slate-800">{selectedArticle.lastUpdated}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={selectedArticle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
                >
                  <span>Verify on Official Government Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
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
