import React, { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';

type ConsentChoice = 'granted' | 'denied';

interface ConsentApi {
  get: () => ConsentChoice | null;
  set: (choice: ConsentChoice) => void;
  open: () => void;
}

declare global {
  interface Window {
    investIrelandConsent?: ConsentApi;
  }
}

/** Reopens the cookie banner so visitors can change their choice. */
export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent('investireland:consent-open'));
}

interface CookieConsentBannerProps {
  onOpenPrivacy: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenPrivacy }) => {
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && !!window.investIrelandConsent && window.investIrelandConsent.get() === null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('investireland:consent-open', show);
    return () => window.removeEventListener('investireland:consent-open', show);
  }, []);

  if (!open || !window.investIrelandConsent) return null;

  const choose = (choice: ConsentChoice) => {
    window.investIrelandConsent?.set(choice);
    setOpen(false);
  };

  return (
    <section
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-md sm:rounded-2xl sm:border print:hidden"
    >
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            <strong className="text-slate-900">Can we use advertising cookies?</strong> With your OK, Google Ads sets cookies to tell us whether
            people reached us from our ads. We never share your portfolio figures. The site works the same either way.{' '}
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onOpenPrivacy();
              }}
              className="font-semibold text-emerald-700 underline"
            >
              Privacy &amp; Cookies
            </a>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => choose('denied')}
              className="flex-1 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => choose('granted')}
              className="flex-1 cursor-pointer rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
