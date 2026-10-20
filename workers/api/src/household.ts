import { randomToken, sha256Hex, timingSafeEqual } from './crypto';
import { reserveEmailQuota, sendEmails } from './email';
import type { Env } from './env';
import { entitlementPath } from './entitlementStore';
import { entitlementFields, ownerFamilyExpiry, parseEntitlement } from './entitlements';
import type { VerifiedUser } from './firebaseAuth';
import type { Firestore } from './firestore';
import { HttpError, escapeHtml, json } from './http';

export const householdPath = (ownerUid: string) => `households/${ownerUid}`;
const INVITE_DAYS = 7;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

function requireVerified(user: VerifiedUser) {
  if (!user.emailVerified || !user.email) throw new HttpError(403, 'Please verify your email address first.', 'email_unverified');
}

/** Owner invites the second adult. The raw token only ever exists in the emailed link; Firestore stores its hash. */
export async function inviteHouseholdMember(env: Env, fs: Firestore, user: VerifiedUser, body: Record<string, unknown>, fetchFn: typeof fetch = fetch, now = new Date()) {
  requireVerified(user);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
  if (email === user.email) throw new HttpError(400, 'Invite the other adult in your household, not yourself.');

  const ent = parseEntitlement((await fs.get(entitlementPath(user.uid)))?.data);
  if (ent.householdRole === 'member') throw new HttpError(409, 'You are already a member of another household.');
  if (!ownerFamilyExpiry(ent, now)) throw new HttpError(402, 'Household sharing needs an active Family plan.', 'needs_family');
  if (ent.householdPartner) throw new HttpError(409, 'Your household already has two adults. Remove the current member first.');

  const token = randomToken(24);
  const expiresAt = new Date(now.getTime() + INVITE_DAYS * 86_400_000);
  await reserveEmailQuota(env, fs, 1, now);
  await fs.commit([
    fs.set(householdPath(user.uid), { ownerUid: user.uid, ownerEmail: user.email, inviteEmail: email, inviteTokenHash: await sha256Hex(token), inviteExpiresAt: expiresAt, memberUid: null, updatedAt: now }, { merge: false }),
  ]);

  const link = `${env.APP_URL}/?household=${encodeURIComponent(`${user.uid}.${token}`)}`;
  await sendEmails(
    env,
    [{ email }],
    {
      subject: 'You\u2019ve been invited to an InvestIreland AI Family plan',
      htmlFor: () =>
        `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#0f172a;max-width:560px">
<p>${escapeHtml(user.email)} has invited you to share their InvestIreland AI Family plan.</p>
<p>You\u2019ll get every Pro feature, and you\u2019ll each be able to see the other\u2019s holdings in a combined household view.</p>
<p><a href="${escapeHtml(link)}" style="background:#047857;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Accept the invitation</a></p>
<p style="font-size:13px;color:#64748b">Sign in (or create a free account) with <b>${escapeHtml(email)}</b>. The link expires in ${INVITE_DAYS} days. If you weren\u2019t expecting this, ignore this email.</p></div>`,
      textFor: () => `${user.email} has invited you to share their InvestIreland AI Family plan.\n\nAccept: ${link}\n\nSign in with ${email}. The link expires in ${INVITE_DAYS} days.`,
      tags: ['household-invite'],
    },
    fetchFn,
  );
  return json({ invited: email, expiresAt: expiresAt.toISOString() });
}

export async function acceptHouseholdInvite(fs: Firestore, user: VerifiedUser, body: Record<string, unknown>, now = new Date()) {
  requireVerified(user);
  const raw = typeof body.invite === 'string' ? body.invite.trim() : '';
  const match = /^([A-Za-z0-9_-]{1,128})\.([A-Za-z0-9_-]{16,64})$/.exec(raw);
  if (!match) throw new HttpError(400, 'This invitation link is not valid.');
  const [, ownerUid, token] = match;
  if (ownerUid === user.uid) throw new HttpError(400, 'You can\u2019t accept your own invitation.');
  const tokenHash = await sha256Hex(token);

  return fs.runTransaction(async (tx) => {
    const docs = await fs.batchGet([householdPath(ownerUid), entitlementPath(ownerUid), entitlementPath(user.uid)], tx);
    const house = docs.get(householdPath(ownerUid))?.data as Record<string, any> | undefined;
    if (!house || typeof house.inviteTokenHash !== 'string' || !timingSafeEqual(house.inviteTokenHash, tokenHash)) {
      throw new HttpError(404, 'This invitation is no longer valid. Ask for a new one.', 'invalid_invite');
    }
    if (!(house.inviteExpiresAt instanceof Date) || house.inviteExpiresAt <= now) throw new HttpError(410, 'This invitation has expired. Ask for a new one.', 'expired');
    if (house.inviteEmail !== user.email) throw new HttpError(403, `This invitation was sent to a different email address. Sign in as ${house.inviteEmail}.`, 'wrong_email');

    const owner = parseEntitlement(docs.get(entitlementPath(ownerUid))?.data);
    const member = parseEntitlement(docs.get(entitlementPath(user.uid))?.data);
    const expiry = ownerFamilyExpiry(owner, now);
    if (!expiry) throw new HttpError(410, 'The Family plan for this household is no longer active.', 'owner_not_family');
    if (owner.householdPartner) throw new HttpError(409, 'This household already has two adults.');
    if (member.householdRole) throw new HttpError(409, 'You are already part of a household. Leave it first.');

    owner.householdRole = 'owner';
    owner.householdPartner = user.uid;
    owner.householdPartnerEmail = user.email;
    member.householdRole = 'member';
    member.householdPartner = ownerUid;
    member.householdPartnerEmail = typeof house.ownerEmail === 'string' ? house.ownerEmail : null;
    member.householdAccess = { ownerUid, expiresAt: expiry };

    return {
      writes: [
        fs.set(entitlementPath(ownerUid), entitlementFields(ownerUid, owner, now), { merge: false }),
        fs.set(entitlementPath(user.uid), entitlementFields(user.uid, member, now), { merge: false }),
        fs.set(householdPath(ownerUid), { memberUid: user.uid, inviteTokenHash: null, inviteExpiresAt: null, joinedAt: now, updatedAt: now }),
      ],
      result: { joined: ownerUid },
    };
  });
}

/** Either adult can end the household; both sides are cleared together. Also cancels a pending invite. */
export async function leaveHousehold(fs: Firestore, user: VerifiedUser, now = new Date()) {
  return fs.runTransaction(async (tx) => {
    const me = parseEntitlement((await fs.get(entitlementPath(user.uid), tx))?.data);
    const ownerUid = me.householdRole === 'member' ? me.householdPartner : user.uid;
    const writes = [];
    if (me.householdPartner) {
      const partnerUid = me.householdPartner;
      const partner = parseEntitlement((await fs.get(entitlementPath(partnerUid), tx))?.data);
      if (partner.householdPartner === user.uid) {
        partner.householdRole = null;
        partner.householdPartner = null;
        partner.householdPartnerEmail = null;
        partner.householdAccess = null;
        writes.push(fs.set(entitlementPath(partnerUid), entitlementFields(partnerUid, partner, now), { merge: false }));
      }
    }
    me.householdRole = null;
    me.householdPartner = null;
    me.householdPartnerEmail = null;
    me.householdAccess = null;
    writes.push(fs.set(entitlementPath(user.uid), entitlementFields(user.uid, me, now), { merge: false }));
    if (ownerUid) writes.push(fs.remove(householdPath(ownerUid)));
    return { writes, result: { left: true } };
  });
}
