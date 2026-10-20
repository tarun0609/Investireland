import { PROMO_MONTHS, type PlanId } from '../../../src/config/plans';
import { randomCode } from './crypto';
import { emailsSentToday, dailyLimit, optOutPath, renderMarketingEmail, reserveEmailQuota, sendEmails, unsubscribeUrl, type Recipient } from './email';
import { splitList, type Env } from './env';
import { entitlementPath, updateEntitlement } from './entitlementStore';
import { addMonths, computeEffectivePlan, parseEntitlement } from './entitlements';
import type { VerifiedUser } from './firebaseAuth';
import type { FsDocument, Firestore } from './firestore';
import { HttpError, json } from './http';
import { PROMO_COUNTER_PATH, globalPromoCap, normalizePromoCode } from './promo';

const ADMIN_SESSION_MAX_AGE_S = 12 * 3600;
const MAX_AUDIENCE = 2000;

export function requireAdmin(env: Env, user: VerifiedUser, now = Date.now()) {
  if (!splitList(env.ADMIN_UIDS).includes(user.uid)) throw new HttpError(403, 'This account is not an administrator.', 'not_admin');
  if (!user.emailVerified) throw new HttpError(403, 'Verify your email address to use the admin dashboard.', 'email_unverified');
  if (now / 1000 - user.authTime > ADMIN_SESSION_MAX_AGE_S) throw new HttpError(401, 'For security, please sign in again.', 'reauth');
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function chunkedBatchGet(fs: Firestore, paths: string[], size = 300) {
  const out = new Map<string, FsDocument>();
  for (let i = 0; i < paths.length; i += size) for (const [k, v] of await fs.batchGet(paths.slice(i, i + size))) out.set(k, v);
  return out;
}

/* ---------- Overview ---------- */

export async function adminOverview(env: Env, fs: Firestore, now = new Date()) {
  const [totalUsers, active, counter, sentToday, recent] = await Promise.all([
    fs.count('users'),
    fs.query('entitlements', { where: [{ field: 'planExpiresAt', op: 'GREATER_THAN', value: now }], limit: 5000 }),
    fs.get(PROMO_COUNTER_PATH),
    emailsSentToday(fs, now),
    fs.query('users', { orderBy: [{ field: 'registeredAt', direction: 'DESCENDING' }], limit: 10 }),
  ]);
  const byPlan: Record<PlanId, number> = { free: 0, pro: 0, family: 0 };
  const bySource: Record<string, number> = {};
  for (const doc of active) {
    const eff = computeEffectivePlan(parseEntitlement(doc.data), now);
    if (eff.plan === 'free') continue;
    byPlan[eff.plan]++;
    bySource[eff.planSource ?? 'unknown'] = (bySource[eff.planSource ?? 'unknown'] ?? 0) + 1;
  }
  byPlan.free = Math.max(0, totalUsers - byPlan.pro - byPlan.family);
  return json({
    totalUsers,
    byPlan,
    bySource,
    promo: { redeemed: Number(counter?.data.redeemed ?? 0), cap: globalPromoCap(env) },
    email: { sentToday, dailyLimit: dailyLimit(env) },
    recentSignups: recent.map((d) => ({ uid: d.path.split('/')[1], name: str(d.data.name, 120), email: str(d.data.email, 254), country: str(d.data.country, 100), registeredAt: iso(d.data.registeredAt) })),
  });
}

/* ---------- Customers ---------- */

export async function adminListUsers(fs: Firestore, url: URL, now = new Date()) {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200);
  const email = url.searchParams.get('email')?.trim().toLowerCase();
  const cursor = url.searchParams.get('cursor');
  const users = email
    ? await fs.query('users', { where: [{ field: 'email', op: 'EQUAL', value: email }], limit: 5 })
    : await fs.query('users', { orderBy: [{ field: 'registeredAt', direction: 'DESCENDING' }], limit, ...(cursor ? { startAfter: [cursor] } : {}) });
  const uids = users.map((d) => d.path.split('/')[1]);
  const extra = await chunkedBatchGet(fs, [...uids.map(entitlementPath), ...uids.map(optOutPath)]);
  const rows = users.map((d) => {
    const uid = d.path.split('/')[1];
    const ent = parseEntitlement(extra.get(entitlementPath(uid))?.data);
    const eff = computeEffectivePlan(ent, now);
    return {
      uid,
      name: str(d.data.name, 120),
      email: str(d.data.email, 254),
      country: str(d.data.country, 100),
      registeredAt: iso(d.data.registeredAt),
      plan: eff.plan,
      planSource: eff.planSource,
      planExpiresAt: iso(eff.planExpiresAt),
      promoCode: ent.promo?.code ?? null,
      stripeStatus: ent.stripe?.status ?? null,
      cancelAtPeriodEnd: ent.stripe?.cancelAtPeriodEnd ?? false,
      householdRole: ent.householdRole ?? null,
      householdPartnerEmail: ent.householdPartnerEmail ?? null,
      marketingOptOut: extra.get(optOutPath(uid))?.data.optedOut === true,
    };
  });
  const last = users[users.length - 1];
  return json({ users: rows, nextCursor: !email && users.length === limit && last ? iso(last.data.registeredAt) : null });
}

/* ---------- Promo codes ---------- */

const promoView = (d: FsDocument) => ({
  code: d.path.split('/')[1],
  plan: d.data.plan,
  months: d.data.months,
  maxRedemptions: d.data.maxRedemptions,
  redemptions: Number(d.data.redemptions ?? 0),
  active: d.data.active === true,
  note: d.data.note ?? '',
  createdAt: iso(d.data.createdAt),
  expiresAt: iso(d.data.expiresAt),
  lastRedeemedAt: iso(d.data.lastRedeemedAt),
});

export async function adminListPromos(env: Env, fs: Firestore) {
  const [codes, counter] = await Promise.all([fs.query('promoCodes', { orderBy: [{ field: 'createdAt', direction: 'DESCENDING' }], limit: 200 }), fs.get(PROMO_COUNTER_PATH)]);
  return json({ codes: codes.map(promoView), redeemed: Number(counter?.data.redeemed ?? 0), cap: globalPromoCap(env) });
}

export async function adminCreatePromo(env: Env, fs: Firestore, admin: VerifiedUser, body: Record<string, unknown>, now = new Date()) {
  const code = body.code ? normalizePromoCode(body.code) : `EARLY-${randomCode(8)}`;
  if (!code) throw new HttpError(400, 'Codes must be 4\u201332 letters, numbers or dashes.');
  const cap = globalPromoCap(env);
  const maxRedemptions = Number(body.maxRedemptions ?? 1);
  if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > cap) throw new HttpError(400, `Max redemptions must be between 1 and ${cap}.`);
  const months = Number(body.months ?? PROMO_MONTHS);
  if (!Number.isInteger(months) || months < 1 || months > 24) throw new HttpError(400, 'Months must be between 1 and 24.');
  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    expiresAt = new Date(String(body.expiresAt));
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) throw new HttpError(400, 'The expiry date must be in the future.');
  }
  const doc = { plan: 'pro', months, maxRedemptions, redemptions: 0, active: true, note: str(body.note, 200), createdAt: now, createdBy: admin.uid, expiresAt };
  try {
    await fs.commit([fs.set(`promoCodes/${code}`, doc, { merge: false, exists: false })]);
  } catch (err) {
    if (err instanceof HttpError && err.code === 'conflict') throw new HttpError(409, 'That code already exists.');
    throw err;
  }
  return json({ code, ...doc, createdAt: now.toISOString(), expiresAt: expiresAt?.toISOString() ?? null }, 201);
}

export async function adminSetPromoActive(fs: Firestore, body: Record<string, unknown>, now = new Date()) {
  const code = normalizePromoCode(body.code);
  if (!code || typeof body.active !== 'boolean') throw new HttpError(400, 'Send a code and active: true or false.');
  try {
    await fs.commit([fs.set(`promoCodes/${code}`, { active: body.active, updatedAt: now }, { exists: true })]);
  } catch (err) {
    if (err instanceof Error && /NOT_FOUND|404/.test(err.message)) throw new HttpError(404, 'That code does not exist.');
    throw err;
  }
  return json({ code, active: body.active });
}

/* ---------- Manual grants ---------- */

export async function adminGrant(fs: Firestore, admin: VerifiedUser, body: Record<string, unknown>, now = new Date()) {
  const uid = str(body.uid, 128);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new HttpError(400, 'Missing user id.');
  const plan = body.plan;
  if (plan !== 'pro' && plan !== 'family' && plan !== 'none') throw new HttpError(400, 'Plan must be pro, family or none.');
  const months = Number(body.months ?? 12);
  if (plan !== 'none' && (!Number.isInteger(months) || months < 1 || months > 36)) throw new HttpError(400, 'Months must be between 1 and 36.');
  if (!(await fs.get(`users/${uid}`))) throw new HttpError(404, 'No user with that id.');

  const { entitlement } = await updateEntitlement(fs, uid, (ent) => {
    ent.grant = plan === 'none' ? null : { plan, expiresAt: addMonths(now, months), note: str(body.note, 200) || `Granted by ${admin.email}` };
  }, now);
  const eff = computeEffectivePlan(entitlement, now);
  return json({ uid, plan: eff.plan, planSource: eff.planSource, planExpiresAt: iso(eff.planExpiresAt) });
}

/* ---------- Email campaigns ---------- */

const AUDIENCES = ['test', 'all', 'free', 'pro', 'family', 'paid'] as const;
type Audience = (typeof AUDIENCES)[number];

async function collectAudience(fs: Firestore, audience: Exclude<Audience, 'test'>, now: Date): Promise<Recipient[]> {
  const users: FsDocument[] = [];
  let cursor: string | null = null;
  while (users.length < MAX_AUDIENCE + 1) {
    const page: FsDocument[] = await fs.query('users', { orderBy: [{ field: 'registeredAt', direction: 'ASCENDING' }], limit: 500, ...(cursor ? { startAfter: [cursor] } : {}) });
    users.push(...page);
    if (page.length < 500) break;
    cursor = iso(page[page.length - 1].data.registeredAt);
    if (!cursor) break;
  }
  if (users.length > MAX_AUDIENCE) throw new HttpError(413, `This audience has more than ${MAX_AUDIENCE} people. Upgrade the sender before emailing everyone.`);
  const uids = users.map((d) => d.path.split('/')[1]);
  const extra = await chunkedBatchGet(fs, [...uids.map(entitlementPath), ...uids.map(optOutPath)]);
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const d of users) {
    const uid = d.path.split('/')[1];
    const email = str(d.data.email, 254).toLowerCase();
    if (!email || seen.has(email) || extra.get(optOutPath(uid))?.data.optedOut === true) continue;
    const plan = computeEffectivePlan(parseEntitlement(extra.get(entitlementPath(uid))?.data), now).plan;
    if (audience === 'all' || audience === plan || (audience === 'paid' && plan !== 'free')) {
      seen.add(email);
      out.push({ uid, email, name: str(d.data.name, 70) });
    }
  }
  return out;
}

export async function adminSendEmail(env: Env, fs: Firestore, admin: VerifiedUser, body: Record<string, unknown>, apiOrigin: string, fetchFn: typeof fetch = fetch, now = new Date()) {
  const audience = body.audience as Audience;
  if (!AUDIENCES.includes(audience)) throw new HttpError(400, `Audience must be one of ${AUDIENCES.join(', ')}.`);
  const subject = str(body.subject, 150).replace(/[\r\n]+/g, ' ');
  const text = str(body.body, 10_000);
  if (subject.length < 3 || text.length < 10) throw new HttpError(400, 'Add a subject and a message.');

  const recipients: Recipient[] = audience === 'test' ? [{ email: admin.email, uid: admin.uid, name: 'Admin test' }] : await collectAudience(fs, audience, now);
  if (body.dryRun === true) return json({ audience, recipients: recipients.length });
  if (recipients.length === 0) throw new HttpError(400, 'Nobody matches that audience.');
  await reserveEmailQuota(env, fs, recipients.length, now);

  const links = new Map<string, string>();
  const linkFor = async (r: Recipient) => {
    if (!r.uid) return null;
    if (!links.has(r.uid)) links.set(r.uid, await unsubscribeUrl(env, apiOrigin, r.uid));
    return links.get(r.uid)!;
  };
  const sent = await sendEmails(
    env,
    recipients,
    {
      subject: audience === 'test' ? `[TEST] ${subject}` : subject,
      htmlFor: async (r) => renderMarketingEmail(text, await linkFor(r), env.APP_URL).html,
      textFor: async (r) => renderMarketingEmail(text, await linkFor(r), env.APP_URL).text,
      headersFor: async (r): Promise<Record<string, string>> => {
        const link = await linkFor(r);
        return link ? { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : {};
      },
      tags: ['campaign', audience],
    },
    fetchFn,
  );
  const id = `${now.toISOString().replace(/[:.]/g, '-')}-${randomCode(4)}`;
  await fs.commit([
    fs.set(`emailCampaigns/${id}`, { audience, subject, body: text, requested: recipients.length, sent, sentBy: admin.uid, sentAt: now }, { merge: false }),
  ]);
  return json({ id, audience, requested: recipients.length, sent });
}

export async function adminListCampaigns(fs: Firestore) {
  const docs = await fs.query('emailCampaigns', { orderBy: [{ field: 'sentAt', direction: 'DESCENDING' }], limit: 50 });
  return json({
    campaigns: docs.map((d) => ({ id: d.path.split('/')[1], audience: d.data.audience, subject: d.data.subject, requested: d.data.requested, sent: d.data.sent, sentAt: iso(d.data.sentAt) })),
  });
}
