import { escapeHtml, sanitizeHeaderValue } from '../src/utils/escapeHtml';

export type AutoEmailTrigger = 'WELCOME_REGISTRATION' | 'MILESTONE_UPDATE';

export interface AutoEmailParams {
  userName: string;
  userEmail: string;
  country: string;
  primaryGoal?: string;
  targetAmount?: number;
  currency?: string;
  triggerType?: AutoEmailTrigger;
  appUrl?: string;
  now?: Date;
}

const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', GBP: '£', EUR: '€' };

export function formatMoney(amount: number, currency = 'EUR'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '€';
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${safe.toLocaleString('en-IE', { maximumFractionDigits: 0 })}`;
}

/**
 * Builds the transactional email sent by the API. All user-controlled values
 * are HTML-escaped and the subject is stripped of control characters.
 */
export function buildAutoResponseEmail(params: AutoEmailParams): { html: string; text: string; subject: string } {
  const {
    userName,
    userEmail,
    country,
    primaryGoal = 'Irish Home Deposit & Wealth Milestone',
    targetAmount = 85000,
    currency = 'EUR',
    triggerType = 'WELCOME_REGISTRATION',
    appUrl,
    now = new Date(),
  } = params;

  const isMilestone = triggerType === 'MILESTONE_UPDATE';
  const subject = sanitizeHeaderValue(
    isMilestone
      ? `InvestIreland milestone update: ${primaryGoal}`
      : `Welcome to InvestIreland AI, ${userName}`
  );

  const formattedAmount = formatMoney(targetAmount, currency);
  const name = escapeHtml(userName);
  const email = escapeHtml(userEmail);
  const residency = escapeHtml(country);
  const goal = escapeHtml(primaryGoal);
  const amount = escapeHtml(formattedAmount);
  const timestamp = escapeHtml(now.toUTCString());
  const dashboardUrl = appUrl && /^https?:\/\//i.test(appUrl) ? escapeHtml(appUrl) : null;

  const heading = isMilestone ? `Your milestone update, ${name}` : `Fáilte, ${name}!`;
  const intro = isMilestone
    ? `Here is the latest summary of your <strong>${goal}</strong> milestone.`
    : `Thanks for creating an <strong>InvestIreland AI</strong> account. Your profile is set up for <strong>${residency}</strong> tax residency.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;margin:0;padding:20px;color:#1e293b;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#065f46;padding:28px;color:#ffffff;">
      <h1 style="font-size:22px;font-weight:800;margin:0 0 6px 0;">${heading}</h1>
      <p style="font-size:13px;color:#a7f3d0;margin:0;">Ireland-first, cross-border financial intelligence.</p>
    </div>
    <div style="padding:28px;font-size:14px;line-height:1.6;">
      <p>Hello <strong>${name}</strong>,</p>
      <p>${intro}</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-size:13px;">
        <tr><td style="padding:8px 14px;color:#64748b;">Account</td><td style="padding:8px 14px;font-weight:700;">${name} &lt;${email}&gt;</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;">Tax residency</td><td style="padding:8px 14px;font-weight:700;">${residency}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;">Primary goal</td><td style="padding:8px 14px;font-weight:700;">${goal}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;">Target</td><td style="padding:8px 14px;font-weight:700;color:#047857;">${amount}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;">Sent</td><td style="padding:8px 14px;font-weight:700;">${timestamp}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:13px;color:#065f46;background:#ecfdf5;border-left:4px solid #10b981;padding:12px 16px;border-radius:8px;">
        Budget 2027 announced a Personal Savings &amp; Investment Account (scheduled from 1 July 2027): €12,000/yr contributions, a €50,000 tax-free threshold and a 1% annual charge on value above it. Final rules are subject to legislation.
      </p>
      ${dashboardUrl ? `<p style="margin-top:20px;"><a href="${dashboardUrl}" style="display:inline-block;background:#047857;color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">Open your dashboard</a></p>` : ''}
    </div>
    <div style="background:#0f172a;padding:20px 28px;font-size:11px;color:#94a3b8;line-height:1.5;">
      InvestIreland AI — educational and analytical information only, not regulated financial advice. Consult a Qualified Financial Adviser (QFA) or tax professional for advice on your circumstances.
    </div>
  </div>
</body>
</html>`;

  const text = [
    isMilestone ? `Milestone update for ${userName}` : `Welcome to InvestIreland AI, ${userName}!`,
    '',
    `Account: ${userName} (${userEmail})`,
    `Tax residency: ${country}`,
    `Primary goal: ${primaryGoal}`,
    `Target: ${formattedAmount}`,
    `Sent: ${now.toUTCString()}`,
    '',
    'Budget 2027 Personal Savings & Investment Account (scheduled 1 July 2027): €12,000/yr contributions, €50,000 tax-free threshold, 1% annual charge above it. Subject to legislation.',
    dashboardUrl ? `\nDashboard: ${appUrl}` : '',
    '',
    'Educational information only — not regulated financial advice.',
  ].join('\n').trim();

  return { html, text, subject };
}
