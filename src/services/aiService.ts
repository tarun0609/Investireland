import { apiFetch } from './apiClient';
import { CGT_RATE, EXIT_TAX_RATE, EXIT_TAX_RATE_2026, pct } from '../config/irishTax';
import { SUPPORT_AI_AVAILABLE, requestAiReply } from './supportChatService';

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sourceCitation?: string;
  isGrounded?: boolean;
  mode?: AIResponseMode;
}

export type AIResponseMode = 'MODEL' | 'LOCAL_FALLBACK' | 'OFFLINE';

export const AI_MAX_MESSAGE_CHARS = 2000;

export interface AIReply {
  reply: string;
  source: string;
  isGrounded: boolean;
  mode: AIResponseMode;
  notice?: string;
}

export async function askFinancialAI(
  message: string,
  history: AIChatMessage[] = [],
  context?: unknown
): Promise<AIReply> {
  const trimmed = message.trim().slice(0, AI_MAX_MESSAGE_CHARS);
  // In production the site is static, so model answers come from the Worker API when it is configured.
  if (SUPPORT_AI_AVAILABLE) {
    const reply = await requestAiReply(
      trimmed,
      history.slice(-8).map((m) => ({ role: m.sender, text: m.text })),
      context
    );
    if (reply) return { reply, source: 'Gemini (guided by Irish official-source rules)', isGrounded: false, mode: 'MODEL' };
    return {
      reply: getClientKnowledgeFallback(trimmed),
      source: 'Offline summary (AI service unavailable)',
      isGrounded: false,
      mode: 'OFFLINE',
      notice: 'The AI service is unavailable, so this is a pre-written summary.',
    };
  }
  try {
    const data = await apiFetch<{ reply?: string; source?: string; mode?: AIResponseMode; reason?: string }>('/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: trimmed,
        history: history.slice(-10).map((m) => ({ sender: m.sender, text: m.text.slice(0, AI_MAX_MESSAGE_CHARS) })),
        context,
      }),
    });
    if (!data || typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error('AI service returned an empty reply');
    }
    const mode = data.mode === 'MODEL' ? 'MODEL' : 'LOCAL_FALLBACK';
    return {
      reply: data.reply,
      source: data.source || 'InvestIreland knowledge base',
      isGrounded: false,
      mode,
      notice: mode === 'MODEL' ? undefined : data.reason,
    };
  } catch (err) {
    console.warn('AI service unavailable; using offline answers:', err);
    return {
      reply: getClientKnowledgeFallback(trimmed),
      source: 'Offline summary (AI service unavailable)',
      isGrounded: false,
      mode: 'OFFLINE',
      notice: 'The AI service is unavailable, so this is a pre-written summary.',
    };
  }
}
function getClientKnowledgeFallback(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('threshold') || q.includes('50000') || q.includes('50,000') || q.includes('50k')) {
    return `Under the Budget 2027 framework announced by the Department of Finance, the €50,000 threshold represents a tax-free ceiling. Any investment gains or capital up to €50,000 within your Personal Savings & Investment Account incur zero tax. Above €50,000, a 1.0% annual charge applies only to the amount over €50,000. Crucially, the 8-year deemed disposal does not apply inside the scheme.\n\nSources: Department of Finance Budget 2027 Framework (gov.ie/finance). Note: Legislation is scheduled for enactment ahead of 1 July 2027.`;
  }
  if (q.includes('rsu') || /\b(usa|us (company|stocks?|shares|employer))\b/.test(q) || q.includes('american') || q.includes('401k') || q.includes('espp')) {
    return `US company RSUs and ESPP shares are generally not something you can move into an Irish investment account: they vest into your broker account and are taxed through Irish payroll (income tax, USC and PRSI) at vest. Later gains when you sell are normally subject to Irish CGT (${pct(CGT_RATE)} following Budget 2027). The proposed €12,000/year Investment Account is funded with cash contributions, so selling some vested shares and contributing the proceeds is one way to diversify away from employer concentration. Check the final scheme rules once legislation is published.\n\nSources: Revenue Commissioners (revenue.ie) - Share-based remuneration guidance. General information only, not tax advice.`;
  }
  if (q.includes('etf') || q.includes('deemed disposal') || q.includes('41%') || q.includes('38%') || q.includes('35%') || q.includes('exit tax')) {
    return `Under current Irish rules, ETFs are subject to exit tax (${pct(EXIT_TAX_RATE_2026)} in 2026, falling to ${pct(EXIT_TAX_RATE)} from 1 January 2027 under Budget 2027) with a mandatory "Deemed Disposal" event every 8 years (TCA 1997 s.739D), which Budget 2027 retains. This forces investors to pay tax on paper gains every 8 years. Under the proposed FY27 Investment Account, deemed disposal does not apply to investments held inside the account; instead, gains are tax-free up to the €50,000 threshold, with a 1% annual charge on value above it.\n\nMutual funds vs ETFs: both are pooled funds. ETFs trade on an exchange throughout the day and usually have lower fees; traditional mutual funds are priced once a day. In Ireland, EU-domiciled ETFs and funds are generally taxed under the same exit-tax rules.\n\nSources: Revenue Tax and Duty Manual Part 27-01a.`;
  }
  if (q.includes('india') || q.includes('inr') || q.includes('rupee') || q.includes('sip') || q.includes('mutual fund')) {
    return `For Indian professionals resident in Ireland, Indian investments (such as mutual fund SIPs, direct equities, and NRE/FCNR fixed deposits) form part of your worldwide asset base. Under the Ireland-India Double Taxation Avoidance Agreement (DTAA), any tax already paid in India may be creditable against Irish tax on the same income or gains, subject to the treaty's conditions. The new Irish Investment Account will provide a straightforward €12,000/year local vehicle to complement your Indian portfolio. Irish tax treatment of Indian mutual funds can be complex, so confirm with Revenue or a tax adviser.\n\nSources: Revenue Commissioners (revenue.ie) - Part 35 DTAA Guidance.`;
  }
  if (q.includes('diversif') || q.includes('x-ray') || q.includes('portfolio')) {
    return `Your Financial X-Ray breaks down your real exposure across asset classes, currencies (EUR, INR, USD), and geography. If over 30% of your portfolio is in a single currency or company (e.g. US tech employer RSUs or Indian funds), you carry concentration risk. Balancing with an Irish Investment Account and cash reserves provides structural resilience.\n\nSources: Central Bank of Ireland Retail Investor Protection Guidelines.`;
  }
  return `Ireland's proposed Personal Savings & Investment Account (expected launch: 1 July 2027, subject to legislation) introduces an annual contribution allowance of €12,000 with a €50,000 tax-free growth threshold and a 1% annual fee on amounts above €50,000. It is designed to remove the friction of exit tax (${pct(EXIT_TAX_RATE)} from 2027) and deemed disposal rules.\n\nSources: Department of Finance (gov.ie/finance) & Revenue Commissioners (revenue.ie).`;
}
