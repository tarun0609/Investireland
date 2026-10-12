import React, { useEffect, useRef, useState } from 'react';
import { askFinancialAI, AIChatMessage, AI_MAX_MESSAGE_CHARS } from '../services/aiService';
import { Sparkles, Send, User, ShieldCheck, RefreshCw } from 'lucide-react';

const formatTime = (date: Date = new Date()) =>
  date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false });

const MODE_LABELS: Record<string, string> = {
  MODEL: 'AI-generated answer',
  LOCAL_FALLBACK: 'Pre-written answer (AI model unavailable)',
  OFFLINE: 'Offline pre-written answer',
};

const hasSource = (source?: string) => !!source && source.trim() !== '' && source.trim() !== '—';

const QUICK_PROMPTS = [
  'Explain the €50,000 threshold and 1% fee.',
  'How will the new 2027 scheme replace 38% deemed disposal?',
  'I have Indian mutual funds via SIPs. How does Irish tax work?',
  'What is the difference between an ETF and a mutual fund?',
  'Can I hold US company RSUs in the new Investment Account?'
];

export const AiAssistantSection: React.FC = () => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'user',
      text: 'Explain how the €50,000 threshold works in plain English.',
      timestamp: '10:00'
    },
    {
      id: 'msg-2',
      sender: 'assistant',
      text: 'Under the proposed Budget 2027 Personal Savings & Investment Account (subject to legislation), the first €50,000 of account value is expected to be tax-free. If your portfolio grows to €65,000, you only pay a 1.0% annual charge on the €15,000 that sits above the threshold (€150/year). The current 38% exit tax and 8-year deemed disposal are not expected to apply within this account.',
      timestamp: '10:00',
      sourceCitation: 'Example answer — verify with gov.ie/finance and revenue.ie',
      isGrounded: false
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isSendingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const isMountedRef = useRef(true);
  const idCounterRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Keep the newest message in view (scroll only the chat container, not the page)
  useEffect(() => {
    const el = messagesEndRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++idCounterRef.current}`;

  const handleSendMessage = async (textToSend?: string) => {
    // Fall back to the DOM value so text set outside React's onChange (autofill, scripts) is still sent
    const raw = textToSend ?? (inputQuery || inputRef.current?.value || '');
    const text = raw.trim().slice(0, AI_MAX_MESSAGE_CHARS);
    if (!text || isSendingRef.current) return;
    isSendingRef.current = true;

    const userMsg: AIChatMessage = {
      id: nextId('user'),
      sender: 'user',
      text,
      timestamp: formatTime()
    };

    const history = [...messagesRef.current, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    if (inputRef.current) inputRef.current.value = '';
    setIsLoading(true);

    try {
      const res = await askFinancialAI(text, history);
      if (!isMountedRef.current) return;
      const botMsg: AIChatMessage = {
        id: nextId('bot'),
        sender: 'assistant',
        text: res.notice ? `${res.reply}\n\n(${res.notice})` : res.reply,
        timestamp: formatTime(),
        sourceCitation: hasSource(res.source) ? res.source : undefined,
        isGrounded: res.isGrounded,
        mode: res.mode
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      if (!isMountedRef.current) return;
      setMessages(prev => [...prev, {
        id: nextId('bot-error'),
        sender: 'assistant',
        text: 'Sorry, something went wrong while answering. Please try again.',
        timestamp: formatTime()
      }]);
    } finally {
      isSendingRef.current = false;
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleSendMessage();
  };

  return (
    <section id="ai-assistant" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Assisted Financial Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Ask your money questions in plain English.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            The AI explains what your numbers mean, breaks down complex Irish tax laws, and clarifies cross-border details without giving unsolicited or risky trading calls.
          </p>
        </div>

        {/* Interactive Chat Window */}
        <div className="mt-12 max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden">
          
          {/* Chat Window Chrome */}
          <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                AI
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>InvestIreland Plain English Assistant</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  General information only &middot; not tax or financial advice &middot; verify on Revenue.ie
                </div>
                <div className="text-[10px] text-slate-400">
                  Uses pre-written offline answers when the AI service is unavailable.
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono hidden sm:block shrink-0">
              No trading calls
            </div>
          </div>

          {/* Messages Area */}
          <div
            className="p-4 sm:p-6 space-y-4 max-h-[380px] overflow-y-auto bg-slate-50/50"
            role="log"
            aria-live="polite"
            aria-busy={isLoading}
            aria-label="Assistant conversation"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs mt-1">
                    AI
                  </div>
                )}

                <div
                  className={`max-w-[85%] min-w-0 break-words rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-emerald-700 text-white rounded-tr-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  
                  {m.sender === 'assistant' && m.mode && (
                    <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {MODE_LABELS[m.mode] ?? m.mode}
                    </div>
                  )}

                  {m.sender === 'assistant' && hasSource(m.sourceCitation) && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Source: {m.sourceCitation}</span>
                    </div>
                  )}

                  <div className={`text-[10px] mt-1 text-right ${m.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {m.timestamp}
                  </div>
                </div>

                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs">
                  AI
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-3 bg-slate-100/80 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 px-1">
              Sample Plain English Inquiries:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="text-xs bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer text-left font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              maxLength={AI_MAX_MESSAGE_CHARS}
              aria-label="Ask the InvestIreland assistant"
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault();
              }}
              placeholder="Ask about the €12,000 account, Indian mutual funds, US RSUs..."
              className="flex-1 min-w-0 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all cursor-pointer shadow-xs shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              title="Send inquiry"
              aria-label="Send inquiry"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

      </div>
    </section>
  );
};
