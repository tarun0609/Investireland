import { hmacBase64Url, timingSafeEqual } from './crypto';
import type { Env } from './env';
import type { Firestore } from './firestore';
import { HttpError, escapeHtml, html } from './http';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
/** Keeps each Brevo call small; one call counts as one Worker subrequest. */
export const BREVO_BATCH_SIZE = 50;

export interface Recipient {
  email: string;
  name?: string;
  uid?: string;
}

export interface OutgoingEmail {
  subject: string;
  /** Builds the HTML for one recipient (lets every message carry its own unsubscribe link). */
  htmlFor: (r: Recipient) => Promise<string> | string;
  textFor: (r: Recipient) => Promise<string> | string;
  headersFor?: (r: Recipient) => Promise<Record<string, string>> | Record<string, string>;
  tags?: string[];
}

export const dailyLimit = (env: Pick<Env, 'EMAIL_DAILY_LIMIT'>) => {
  const n = Number(env.EMAIL_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 300;
};

const dayKey = (now: Date) => now.toISOString().slice(0, 10);
export const emailCounterPath = (now: Date) => `counters/email-${dayKey(now)}`;

/** Reserves send quota for today in a transaction so the Brevo free-plan limit is never exceeded. */
export async function reserveEmailQuota(env: Env, fs: Firestore, count: number, now = new Date()): Promise<void> {
  if (count <= 0) return;
  const path = emailCounterPath(now);
  const limit = dailyLimit(env);
  await fs.runTransaction(async (tx) => {
    const sent = Number((await fs.get(path, tx))?.data.sent ?? 0);
    if (sent + count > limit) {
      throw new HttpError(429, `Daily email limit reached (${sent}/${limit} sent today). Try again tomorrow or send to fewer people.`, 'email_quota');
    }
    return { writes: [fs.increment(path, 'sent', count, { limit, day: dayKey(now) })], result: undefined };
  });
}

export async function emailsSentToday(fs: Firestore, now = new Date()): Promise<number> {
  return Number((await fs.get(emailCounterPath(now)))?.data.sent ?? 0);
}

/** Sends one message per recipient using Brevo message versions. Returns how many were accepted. */
export async function sendEmails(env: Env, recipients: Recipient[], email: OutgoingEmail, fetchFn: typeof fetch = fetch): Promise<number> {
  if (!env.BREVO_API_KEY || !env.EMAIL_FROM) throw new HttpError(503, 'Email is not configured yet.');
  let accepted = 0;
  for (let i = 0; i < recipients.length; i += BREVO_BATCH_SIZE) {
    const batch = recipients.slice(i, i + BREVO_BATCH_SIZE);
    const to = (r: Recipient) => [{ email: r.email, ...(r.name ? { name: r.name.slice(0, 70) } : {}) }];
    const common = {
      sender: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME || 'InvestIreland AI' },
      ...(env.EMAIL_REPLY_TO ? { replyTo: { email: env.EMAIL_REPLY_TO } } : {}),
      subject: email.subject,
      ...(email.tags?.length ? { tags: email.tags } : {}),
    };
    let body: Record<string, unknown>;
    if (batch.length === 1) {
      // A single message can carry its own text part and headers (e.g. one-click List-Unsubscribe).
      const r = batch[0];
      body = {
        ...common,
        to: to(r),
        htmlContent: await email.htmlFor(r),
        textContent: await email.textFor(r),
        ...(email.headersFor ? { headers: await email.headersFor(r) } : {}),
      };
    } else {
      // Brevo message versions can only override recipients, subject, params and htmlContent.
      const versions = await Promise.all(batch.map(async (r) => ({ to: to(r), htmlContent: await email.htmlFor(r) })));
      body = { ...common, htmlContent: versions[0].htmlContent, messageVersions: versions };
    }
    const res = await fetchFn(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error('Brevo error', res.status, (await res.text().catch(() => '')).slice(0, 300));
      if (accepted === 0) throw new HttpError(502, 'The email provider rejected the request. Check the Brevo settings.');
      break;
    }
    accepted += batch.length;
  }
  return accepted;
}

/* ---------- Unsubscribe links ---------- */

export const optOutPath = (uid: string) => `emailOptOuts/${uid}`;
const unsubMessage = (uid: string) => `unsubscribe:${uid}`;

export async function unsubscribeUrl(env: Env, apiOrigin: string, uid: string): Promise<string> {
  const t = await hmacBase64Url(env.LINK_SIGNING_SECRET, unsubMessage(uid));
  return `${apiOrigin}/email/unsubscribe?u=${encodeURIComponent(uid)}&t=${t}`;
}

async function verifyUnsubscribe(env: Env, uid: string | null, token: string | null): Promise<string | null> {
  if (!uid || !token || !/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !env.LINK_SIGNING_SECRET) return null;
  const expected = await hmacBase64Url(env.LINK_SIGNING_SECRET, unsubMessage(uid));
  return timingSafeEqual(token, expected) ? uid : null;
}

const page = (title: string, body: string) =>
  html(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#0f172a}button{background:#047857;color:#fff;border:0;border-radius:.5rem;padding:.7rem 1.2rem;font-size:1rem;cursor:pointer}</style></head>
<body><h1>${escapeHtml(title)}</h1>${body}</body></html>`);

/**
 * GET shows a confirmation button (so link scanners can't unsubscribe people);
 * POST performs the opt-out and also serves RFC 8058 one-click requests from mail clients.
 */
export async function handleUnsubscribe(env: Env, fs: Firestore, request: Request, now = new Date()): Promise<Response> {
  const url = new URL(request.url);
  const uid = await verifyUnsubscribe(env, url.searchParams.get('u'), url.searchParams.get('t'));
  if (!uid) return page('Link not valid', '<p>This unsubscribe link is invalid or incomplete. You can also reply to any email to be removed.</p>');
  if (request.method === 'GET') {
    return page(
      'Unsubscribe from InvestIreland AI emails',
      `<p>You will stop receiving product updates and announcements. Important account emails (such as billing receipts) may still be sent.</p>
<form method="post" action="${escapeHtml(url.pathname + url.search)}"><button type="submit">Unsubscribe</button></form>`,
    );
  }
  await fs.commit([fs.set(optOutPath(uid), { uid, optedOut: true, updatedAt: now }, { merge: false })]);
  return page('You have been unsubscribed', '<p>You won\u2019t receive marketing emails from InvestIreland AI any more.</p>');
}

/** Wraps admin-written plain text in a simple, safe HTML layout with an unsubscribe footer. */
export function renderMarketingEmail(bodyText: string, unsubscribeLink: string | null, appUrl: string) {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const footer = unsubscribeLink
    ? `<p style="font-size:12px;color:#64748b;margin-top:32px">You received this because you have an InvestIreland AI account. <a href="${escapeHtml(unsubscribeLink)}">Unsubscribe</a>.</p>`
    : '';
  const htmlBody = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#0f172a;max-width:560px">${paragraphs}<p style="margin-top:24px"><a href="${escapeHtml(appUrl)}">InvestIreland AI</a></p>${footer}</div>`;
  const text = `${bodyText}\n\n${appUrl}${unsubscribeLink ? `\n\nUnsubscribe: ${unsubscribeLink}` : ''}`;
  return { html: htmlBody, text };
}
