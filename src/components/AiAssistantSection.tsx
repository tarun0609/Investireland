import React, { useState } from 'react';
import { askFinancialAI, AIChatMessage, AI_MAX_MESSAGE_CHARS } from '../services/aiService';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  HelpCircle, 
  ShieldCheck, 
  CheckCircle2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const QUICK_PROMPTS = [
  'Explain the €50,000 threshold and 1% fee.',
  'How will the new 2027 scheme replace 41% deemed disposal?',
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
      timestamp: '10:00 AM'
    },
    {
      id: 'msg-2',
      sender: 'assistant',
      text: 'Under Ireland’s Budget 2027 framework for the Personal Savings & Investment Account, the first €50,000 of account value or gains is 100% tax-free. If your portfolio grows to €65,000, you only pay a 1.0% annual charge on the €15,000 that sits above the threshold (€150/year). Crucially, the historical 41% exit tax and 8-year deemed disposal do not apply within this account.',
      timestamp: '10:00 AM',
      sourceCitation: 'Example answer — verify with gov.ie/finance and revenue.ie',
      isGrounded: false
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || isLoading) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await askFinancialAI(text, messages);
      const botMsg: AIChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceCitation: res.notice ? ` — ` : res.source,
        isGrounded: res.isGrounded,
        mode: res.mode
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] text-slate-400">
                  General information only &middot; not tax or financial advice &middot; verify on Revenue.ie
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Safety Rules Enforced
            </div>
          </div>

          {/* Messages Area */}
          <div className="p-4 sm:p-6 space-y-4 max-h-[380px] overflow-y-auto bg-slate-50/50">
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
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-emerald-700 text-white rounded-tr-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  
                  {m.sourceCitation && (
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
                  <span>Consulting official Irish fiscal knowledge engine...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-3 bg-slate-100/80 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 px-1">
              Sample Plain English Inquiries:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-xs bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer text-left font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              maxLength={AI_MAX_MESSAGE_CHARS}
              aria-label="Ask the InvestIreland assistant"
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about the €12,000 account, Indian mutual funds, US RSUs..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputQuery.trim() || isLoading}
              className="p-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-xs"
              title="Send inquiry"
              aria-label="Send inquiry"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
