import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { AppView } from '../config/calculators';
import { OPEN_CHAT_EVENT, type OpenChatDetail } from './chatEvents';

const loadPanel = () => import('./SupportChatPanel');
const SupportChatPanel = lazy(() => loadPanel().then((m) => ({ default: m.SupportChatPanel })));

const TEASER_KEY = 'investireland_chat_teaser_seen';
const TEASER_DELAY_MS = 6000;

interface SupportChatWidgetProps {
  onNavigateView: (view: AppView) => void;
  onNavigateSection: (sectionId: string) => void;
}

export interface PendingQuestion {
  id: number;
  text: string;
}

const teaserSeen = () => {
  try {
    return sessionStorage.getItem(TEASER_KEY) === '1';
  } catch {
    return true;
  }
};

const markTeaserSeen = () => {
  try {
    sessionStorage.setItem(TEASER_KEY, '1');
  } catch {
    /* storage unavailable: the teaser simply shows again next visit */
  }
};

/** Floating chat button (bottom-right on every page) that opens the help assistant in a popup panel. */
export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({ onNavigateView, onNavigateSection }) => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [pending, setPending] = useState<PendingQuestion | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const pendingId = useRef(0);

  const openPanel = useCallback((question?: string) => {
    setLoaded(true);
    setOpen(true);
    setTeaser(false);
    markTeaserSeen();
    const text = question?.trim();
    if (text) setPending({ id: ++pendingId.current, text });
  }, []);

  const wasOpen = useRef(false);
  const close = useCallback(() => setOpen(false), []);

  // Return focus after re-render: on mobile the launcher is display:none while the sheet is open.
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    const onOpen = (e: Event) => openPanel((e as CustomEvent<OpenChatDetail>).detail?.question);
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, [openPanel]);

  // A one-off nudge per browser session; it never opens the chat by itself.
  useEffect(() => {
    if (teaserSeen()) return;
    const timer = setTimeout(() => {
      if (teaserSeen()) return;
      markTeaserSeen();
      setTeaser(true);
    }, TEASER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const preload = () => {
    void loadPanel();
  };

  return (
    <>
      {loaded && (
        <Suspense fallback={null}>
          <SupportChatPanel
            open={open}
            onClose={close}
            pendingQuestion={pending}
            onPendingHandled={() => setPending(null)}
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

      {teaser && !open && (
        <div
          role="status"
          className="fixed bottom-[5.5rem] right-4 z-40 flex max-w-[16rem] items-start gap-1 rounded-2xl rounded-br-sm border border-slate-200 bg-white py-2 pl-3.5 pr-1 text-sm text-slate-800 shadow-lg motion-safe:animate-[ii-pop-in_0.3s_ease-out] sm:right-6 sm:bottom-24 print:hidden"
        >
          <button type="button" onClick={() => openPanel()} onMouseEnter={preload} className="cursor-pointer py-1 text-left font-medium hover:text-emerald-800">
            Questions about investing in Ireland? <span className="text-emerald-700 underline underline-offset-2">Ask me</span>
          </button>
          <button
            type="button"
            onClick={() => setTeaser(false)}
            aria-label="Dismiss chat suggestion"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : openPanel())}
        onMouseEnter={preload}
        onFocus={preload}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={loaded ? 'support-chat-panel' : undefined}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        title={open ? 'Close chat' : 'Ask a question'}
        className={`fixed bottom-4 right-4 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg shadow-emerald-900/25 transition hover:scale-105 hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-safe:animate-[ii-pulse_1.6s_ease-out_1s_1] motion-reduce:transition-none sm:bottom-6 sm:right-6 print:hidden ${open ? 'max-sm:hidden' : ''}`}
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <MessageCircle className="h-6 w-6" aria-hidden="true" />}
      </button>
    </>
  );
};
