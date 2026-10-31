import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bot, Loader2, Mail, Send, X } from 'lucide-react';
import type { AppView } from '../config/calculators';
import { CONTACT_EMAILS } from '../config/contact';
import { SUPPORT_DISCLAIMER, SUPPORT_SUGGESTIONS, type SupportLink } from '../data/supportKnowledge';
import { SUPPORT_MAX_MESSAGE_CHARS, askSupport, type SupportTurn } from '../services/supportChatService';

interface ChatMessage extends SupportTurn {
  id: number;
  links?: SupportLink[];
  mode?: 'AI' | 'FAQ';
}

interface SupportChatPanelProps {
  open: boolean;
  onClose: () => void;
  onNavigateView: (view: AppView) => void;
  onNavigateSection: (sectionId: string) => void;
}

const WELCOME: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: "Hi, I'm the InvestIreland help assistant. Ask me about plans, your account, importing holdings, our calculators or Irish investment tax.",
};

export const SupportChatPanel: React.FC<SupportChatPanelProps> = ({ open, onClose, onNavigateView, onNavigateSection }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async (text: string) => {
    const question = text.trim().slice(0, SUPPORT_MAX_MESSAGE_CHARS);
    if (!question || busy) return;
    const history = messages.filter((m) => m.id !== 0).map(({ role, text: t }) => ({ role, text: t }));
    setMessages((prev) => [...prev, { id: nextId.current++, role: 'user', text: question }]);
    setInput('');
    setBusy(true);
    try {
      const reply = await askSupport(question, history);
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', text: reply.text, links: reply.links, mode: reply.mode }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const followLink = (link: SupportLink) => {
    if (link.view) onNavigateView(link.view);
    else if (link.section) onNavigateSection(link.section);
  };

  const askedSomething = messages.some((m) => m.role === 'user');

  return (
    <div
      id="support-chat-panel"
      role="dialog"
      aria-label="Help chat"
      hidden={!open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className={`${open ? 'flex' : 'hidden'} fixed inset-x-2 bottom-20 z-40 max-h-[min(36rem,calc(100dvh-11rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-96 print:hidden`}
    >
      <div className="flex items-center justify-between gap-3 bg-emerald-800 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold leading-tight">InvestIreland help</p>
            <p className="text-[11px] text-emerald-100">Instant answers · educational only</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close help chat" className="cursor-pointer rounded-lg p-1 hover:bg-emerald-700">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div ref={listRef} role="log" aria-live="polite" aria-busy={busy} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-700 px-3 py-2 text-sm text-white'
                  : 'max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800'
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
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        <Mail className="h-3 w-3" aria-hidden="true" /> {link.label}
                      </a>
                    ) : (
                      <button
                        key={link.label}
                        type="button"
                        onClick={() => followLink(link)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        {link.label} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                    )
                  )}
                </div>
              )}
              {m.mode && (
                <p className="mt-1.5 text-[10px] uppercase tracking-wide text-slate-400">{m.mode === 'AI' ? 'AI answer · may contain mistakes' : 'From our help articles'}</p>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-500" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking…
          </div>
        )}
        {!askedSomething && (
          <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Suggested questions">
            {SUPPORT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-slate-200 bg-white p-3"
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
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Type your question…"
            className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-slate-500">
          {SUPPORT_DISCLAIMER} Never share passwords, PAN or card details. Need a person?{' '}
          <a href={`mailto:${CONTACT_EMAILS.support}`} className="font-semibold text-emerald-700 underline">
            {CONTACT_EMAILS.support}
          </a>
        </p>
      </form>
    </div>
  );
};
