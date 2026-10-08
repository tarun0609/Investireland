import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';

interface SellixHeroViewProps {
  onBack: () => void;
}

export const SellixHeroView: React.FC<SellixHeroViewProps> = ({ onBack }) => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Return to Dashboard / Main Site floating pill */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 backdrop-blur-md text-xs font-semibold shadow-lg transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to InvestIreland</span>
        </button>
        <a
          href="/sellix.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 backdrop-blur-md text-xs font-semibold shadow-lg transition-all cursor-pointer"
          title="Open pure standalone self-contained HTML page in new tab"
        >
          <span>Open Standalone /sellix.html</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Render the self-contained iframe without modifying existing site */}
      <iframe
        src="/sellix.html"
        title="Sellix — Cross-border finance"
        className="w-full h-full border-0 block"
      />
    </div>
  );
};
