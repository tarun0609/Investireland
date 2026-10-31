import React, { Suspense, lazy, useCallback, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { AppView } from '../config/calculators';

const SupportChatPanel = lazy(() => import('./SupportChatPanel').then((m) => ({ default: m.SupportChatPanel })));

interface SupportChatWidgetProps {
  onNavigateView: (view: AppView) => void;
  onNavigateSection: (sectionId: string) => void;
}

/** Floating "Help" button that opens the support chat on every page. */
export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({ onNavigateView, onNavigateSection }) => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  return (
    <>
      {loaded && (
        <Suspense fallback={null}>
          <SupportChatPanel
            open={open}
            onClose={close}
            onNavigateView={(view) => {
              setOpen(false);
              onNavigateView(view);
            }}
            onNavigateSection={(id) => {
              setOpen(false);
              onNavigateSection(id);
            }}
          />
        </Suspense>
      )}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => {
          setLoaded(true);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-controls="support-chat-panel"
        aria-label={open ? 'Close help chat' : 'Open help chat'}
        className="fixed bottom-4 right-4 z-40 flex cursor-pointer items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:bottom-6 sm:right-6 print:hidden"
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
        <span className={open ? 'sr-only' : 'hidden sm:inline'}>Help</span>
      </button>
    </>
  );
};
