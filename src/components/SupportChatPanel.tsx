import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Bot, Mail, RotateCcw, Send, X } from 'lucide-react';
import type { AppView } from '../config/calculators';
import { CONTACT_EMAILS } from '../config/contact';
import { SUPPORT_DISCLAIMER, SUPPORT_SUGGESTIONS, type SupportLink } from '../data/supportKnowledge';
import { SUPPORT_MAX_MESSAGE_CHARS, askSupport, type SupportTurn } from '../services/supportChatService';
import type { PendingQuestion } from './SupportChatWidget';

interface ChatMessage extends SupportTurn {
  id: number;
  links?: SupportLink[];
  mode?: 'AI' | 'FAQ';
}

interface SupportChatPanelProps {
  open: boolean;
  onClose: () => void;
  pendingQuestion: PendingQuestion | null;
  onPendingHandled: () => void;
  onNavigateView: (view: AppView) => void;
  onNavigateSection: (sectionId: string) => void;
}

const WELCOME: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: "Hi! I'm the InvestIreland assistant. Ask me about Irish investment tax, our calculators, plans or your account.",
};

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const MOBILE_QUERY = '(max-width: 639px)';

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}

/** Tracks the visible viewport so the mobile sheet shrinks above the on-screen keyboard. */
function useVisualViewport(active: boolean): { top: number; height: number } | null {
  const [vp, setVp] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) {
      setVp(null);
      return;
    }
    const update = () => setVp({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [active]);
  return vp;
}

export const SupportChatPanel: React.FC<SupportChatPanelProps> = ({
  open,
  onClose,
  pendingQuestion,
  onPendingHandled,
  onNavigateView,
  onNavigateSection,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const busyRef = useRef(false);
  const conversation = useRef(0);
  const isMobile = useIsMobile();
  const viewport = useVisualViewport(open && isMobile);

  useEffect(() => {
    if (!open) return;
    // On phones, don't pop the keyboard straight away; focus the dialog so screen readers land in it.
    if (isMobile) panelRef.current?.focus();
    else inputRef.current?.focus();
  }, [open, isMobile]);

  // Lock page scroll behind the full-height sheet on phones.
  useEffect(() => {
    if (!open || !isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, isMobile]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages, busy, failed, viewport?.height]);

  const ask = useCallback(async (question: string, history: SupportTurn[]) => {
    const convo = conversation.current;
    busyRef.current = true;
    setBusy(true);
    setFailed(null);
    try {
      const reply = await askSupport(question, history);
      if (convo !== conversation.current) return;
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', text: reply.text, links: reply.links, mode: reply.mode }]);
    } catch (err) {
      console.warn('Chat reply failed', err);
      if (convo === conversation.current) setFailed(question);
    } finally {
      if (convo === conversation.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }, []);

  const historyOf = (list: ChatMessage[]) => list.filter((m) => m.id !== 0).map(({ role, text }) => ({ role, text }));

  const send = useCallback(
    (text: string) => {
      const question = text.trim().slice(0, SUPPORT_MAX_MESSAGE_CHARS);
      if (!question || busyRef.current) return;
      const history = historyOf(messages);
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'user', text: question }]);
      setInput('');
      void ask(question, history);
    },
    [ask, messages]
  );

  const retry = () => {
    if (!failed || busyRef.current) return;
    // The question is already the last user message, so it isn't added again.
    void ask(failed, historyOf(messages).slice(0, -1));
  };

  const newChat = () => {
    conversation.current++;
    busyRef.current = false;
    setBusy(false);
    setFailed(null);
    setInput('');
    setMessages([WELCOME]);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!open || !pendingQuestion) return;
    if (busyRef.current) setInput(pendingQuestion.text);
    else send(pendingQuestion.text);
    onPendingHandled();
    // Only react to a new question being handed over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingQuestion?.id]);

  const followLink = (link: SupportLink) => {
    if (link.view) onNavigateView(link.view);
    else if (link.section) onNavigateSection(link.section);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const askedSomething = messages.some((m) => m.role === 'user');
  const sheetStyle: React.CSSProperties | undefined = isMobile && viewport ? { top: viewport.top, height: viewport.height } : undefined;

  return (
    <>
      {open && isMobile && <div className="fixed inset-0 z-50 bg-slate-900/40 print:hidden" aria-hidden="true" onClick={onClose} />}
      <div
        id="support-chat-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-chat-title"
        tabIndex={-1}
        hidden={!open}
        onKeyDown={onKeyDown}
        style={sheetStyle}
        className={`${open ? 'flex' : 'hidden'} fixed inset-x-0 bottom-0 top-0 z-50 flex-col overflow-hidden bg-white outline-none motion-safe:animate-[ii-sheet-up_0.25s_ease-out] sm:inset-x-auto sm:top-auto sm:bottom-24 sm:right-6 sm:h-[min(560px,calc(100dvh-8rem))] sm:w-[380px] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl sm:motion-safe:animate-[ii-pop-in_0.2s_ease-out] print:hidden`}
      >
        <div className="flex items-center gap-3 bg-emerald-800 px-4 py-3 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="support-chat-title" className="text-sm font-bold leading-tight">
              InvestIreland assistant
            </h2>
            <p className="text-xs text-emerald-100">Answers in seconds</p>
          </div>
          <button
            type="button"
            onClick={newChat}
            disabled={!askedSomething && !busy}
            aria-label="Start a new chat"
            title="New chat"
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold hover:bg-emerald-700 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>New chat</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg hover:bg-emerald-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-900">General information only, not financial advice.</p>

        <div
          ref={listRef}
          role="log"
          aria-live="polite"
          aria-busy={busy}
          aria-label="Conversation"
          className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 px-3 py-4"
        >
          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-700 px-3.5 py-2 text-[15px] leading-relaxed text-white sm:text-sm'
                    : 'max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2 text-[15px] leading-relaxed text-slate-800 sm:text-sm'
                }
              >
                <span className="sr-only">{m.role === 'user' ? 'You said: ' : 'Assistant: '}</span>
                <p className="whitespace-pre-line break-words">{m.text}</p>
                {m.links && m.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.links.map((link) =>
                      link.href ? (
                        <a
                          key={link.label}
                          href={link.href}
                          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          <Mail className="h-3 w-3" aria-hidden="true" /> {link.label}
                        </a>
                      ) : (
                        <button
                          key={link.label}
                          type="button"
                          onClick={() => followLink(link)}
                          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          {link.label} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )
                    )}
                  </div>
                )}
                {m.mode && (
                  <p className="mt-1.5 text-[11px] uppercase tracking-wide text-slate-500">
                    {m.mode === 'AI' ? 'AI answer · may contain mistakes' : 'From our help articles'}
                  </p>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start" role="status">
              <span className="sr-only">The assistant is typing…</span>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-slate-400 motion-safe:animate-[ii-typing_1.2s_ease-in-out_infinite]"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {failed && !busy && (
            <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p>Sorry, I couldn't answer that just now.</p>
                <button type="button" onClick={retry} className="mt-1 inline-flex min-h-8 cursor-pointer items-center gap-1 font-semibold text-rose-800 underline underline-offset-2">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
                </button>
              </div>
            </div>
          )}

          {!askedSomething && (
            <div className="pt-1">
              <p className="mb-2 px-1 text-xs font-semibold text-slate-600">Try asking:</p>
              <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
                {SUPPORT_SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => send(s)}
                      className="min-h-9 cursor-pointer rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-sm font-medium text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-slate-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2">
            <label htmlFor="support-chat-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="support-chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={SUPPORT_MAX_MESSAGE_CHARS}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Type your question…"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:text-sm"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-slate-600">
            {SUPPORT_DISCLAIMER} Never share passwords or card details. Need a person?{' '}
            <a href={`mailto:${CONTACT_EMAILS.support}`} className="font-semibold text-emerald-800 underline">
              {CONTACT_EMAILS.support}
            </a>
          </p>
        </form>
      </div>
    </>
  );
};
