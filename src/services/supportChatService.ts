import { answerFromKnowledgeBase, matchSupportTopics, type SupportLink } from '../data/supportKnowledge';

// Same rule as entitlementService, kept local so the chat doesn't pull in Firebase.
const API_URL = String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export const SUPPORT_MAX_MESSAGE_CHARS = 1000;
const REQUEST_TIMEOUT_MS = 20_000;

/** True when the site is built with a Worker API URL, so AI answers can be tried. */
export const SUPPORT_AI_AVAILABLE = /^https:\/\//.test(API_URL) || /^http:\/\/localhost(:\d+)?$/.test(API_URL);

export interface SupportTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface SupportReply {
  text: string;
  links: SupportLink[];
  mode: 'AI' | 'FAQ';
}

const GREETING = /^(hi|hello|hey|hiya|howya|good (morning|afternoon|evening)|dia dhuit)\b[!. ]*$/i;
const THANKS = /^(thanks|thank you|thx|cheers|ta|great|perfect|ok(ay)?)\b[!. ]*$/i;

function quickReply(message: string): SupportReply | null {
  if (GREETING.test(message)) {
    return { text: 'Hi! Ask me about plans and billing, your account, importing holdings, our calculators or Irish investment tax.', links: [], mode: 'FAQ' };
  }
  if (THANKS.test(message)) return { text: "You're welcome! Anything else I can help with?", links: [], mode: 'FAQ' };
  return null;
}

/** Calls the Worker's AI chat. Returns null on any failure so the caller can fall back. */
export async function requestAiReply(
  message: string,
  history: SupportTurn[],
  context?: unknown,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  if (!SUPPORT_AI_AVAILABLE) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${API_URL}/chat`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.slice(0, SUPPORT_MAX_MESSAGE_CHARS),
        history: history.slice(-8).map((t) => ({ role: t.role, text: t.text.slice(0, SUPPORT_MAX_MESSAGE_CHARS) })),
        context,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { reply?: unknown } | null;
    return typeof data?.reply === 'string' && data.reply.trim() ? data.reply.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function askSupport(message: string, history: SupportTurn[] = [], fetchImpl: typeof fetch = fetch): Promise<SupportReply> {
  const trimmed = message.trim().slice(0, SUPPORT_MAX_MESSAGE_CHARS);
  const quick = quickReply(trimmed);
  if (quick) return quick;

  const ai = await requestAiReply(trimmed, history, undefined, fetchImpl);
  if (ai) {
    const best = matchSupportTopics(trimmed, 1)[0];
    return { text: ai, links: (best?.topic.links ?? []).slice(0, 3), mode: 'AI' };
  }
  const kb = answerFromKnowledgeBase(trimmed);
  return { text: kb.text, links: kb.links, mode: 'FAQ' };
}
