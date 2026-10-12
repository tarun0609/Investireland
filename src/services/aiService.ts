import { apiFetch } from './apiClient';

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
  try {
    const data = await apiFetch<{ reply?: string; source?: string; mode?: AIResponseMode; reason?: string }>('/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: trimmed,
        history: history.slice(-10).map((m) => ({ sender: m.sender, text: m.text.slice(0, AI_MAX_MESSAGE_CHARS) })),
        context,
      }),
    });
    const mode = data.mode === 'MODEL' ? 'MODEL' : 'LOCAL_FALLBACK';
    return {
      reply: data.reply || 'No response generated.',
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
  if (q.includes('threshold') || q.includes('50000') || q.includes('50,000')) {
    return `Under the Budget 2027 framework announced by the Department of Finance, the €50,000 threshold represents a tax-free ceiling. Any investment gains or capital up to €50,000 within your Personal Savings & Investment Account incur zero tax. Above €50,000, a modest 1.0% annual charge applies strictly to the amount over €50,000. Crucially, the 8-year deemed disposal does not apply inside the scheme.\n\nSources: Department of Finance Budget 2027 Framework (gov.ie/finance). Note: Legislation is scheduled for enactment ahead of 1 July 2027.`;
  }
  if (q.includes('india') || q.includes('inr') || q.includes('rupee') || q.includes('mutual fund')) {
    return `For Indian professionals resident in Ireland, Indian investments (such as mutual fund SIPs, direct equities, and NRE/FCNR fixed deposits) form part of your worldwide asset base. Under the Ireland-India Double Taxation Avoidance Agreement (DTAA), any tax already paid in India can normally be offset against Irish tax liabilities. The new Irish Investment Account will provide a straightforward €12,000/year local vehicle to complement your Indian portfolio without compounding Irish 41% deemed disposal penalties.\n\nSources: Revenue Commissioners (revenue.ie) - Part 35 DTAA Guidance.`;
  }
  if (q.includes('etf') || q.includes('deemed disposal') || q.includes('41%')) {
    return `In the current FY26 Irish tax regime, ETFs are subject to a 41% exit tax with a mandatory "Deemed Disposal" event every 8 years (TCA 1997 s.739D). This forces investors to pay tax on paper gains every 8 years. Under the new FY27 Investment Account, investments within the account are exempt from deemed disposal up to the €50,000 threshold, fundamentally simplifying ETF investing for Irish households.\n\nSources: Revenue Tax and Duty Manual 27-01a.`;
  }
  if (q.includes('diversif') || q.includes('x-ray') || q.includes('portfolio')) {
    return `Your Financial X-Ray breaks down your real exposure across asset classes, currencies (EUR, INR, USD), and geography. If over 30% of your portfolio is in a single currency or company (e.g. US tech employer RSUs or Indian funds), you carry concentration risk. Balancing with an Irish Investment Account and cash reserves provides structural resilience.\n\nSources: Central Bank of Ireland Retail Investor Protection Guidelines.`;
  }
  return `Ireland's new Personal Savings & Investment Account (scheduled launch: 1 July 2027) introduces an annual contribution allowance of €12,000 with a €50,000 tax-free growth threshold and a 1% annual fee on amounts above €50,000. It is designed to remove the friction of the historical 41% exit tax and deemed disposal rules.\n\nSources: Department of Finance (gov.ie/finance) & Revenue Commissioners (revenue.ie).`;
}
