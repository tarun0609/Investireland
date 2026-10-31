import React from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import { openChat } from './chatEvents';

const QUICK_PROMPTS = [
  'Explain the €50,000 threshold and 1% fee.',
  'How will the new 2027 scheme replace exit tax and deemed disposal?',
  'I have Indian mutual funds via SIPs. How does Irish tax work?',
  'Can I hold US company RSUs in the new Investment Account?',
];

/** Short homepage band that points to the floating assistant instead of embedding a second chat. */
export const AiAssistantSection: React.FC = () => (
  <section id="ai-assistant" aria-labelledby="ai-assistant-title" className="border-b border-slate-200 bg-slate-50 py-14 sm:py-16">
    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Plain-English assistant
      </p>
      <h2 id="ai-assistant-title" className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        Ask your money questions in plain English
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
        Get quick answers on Irish tax, the new Investment Account and cross-border holdings. It explains; it never tells you what to buy.
      </p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Example questions">
        {QUICK_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => openChat(prompt)}
              className="min-h-10 cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => openChat()}
        className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Open the assistant
      </button>
      <p className="mt-3 text-xs text-slate-600">General information only, not financial advice. Verify on Revenue.ie.</p>
    </div>
  </section>
);
