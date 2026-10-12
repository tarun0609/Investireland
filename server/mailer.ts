import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type MailTransportKind = 'SMTP_CONFIGURED' | 'ETHEREAL_TEST_ACCOUNT' | 'APP_FALLBACK';

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailSendResult {
  messageId: string;
  transport: MailTransportKind;
  /** True only when the message was handed to a real SMTP server. */
  delivered: boolean;
  previewUrl: string | null;
}

export type Mailer = (mail: OutgoingMail) => Promise<MailSendResult>;

/**
 * Creates the mail sender. Real delivery requires SMTP_USER/SMTP_PASS. Outside
 * production an Ethereal test inbox is used for previews; in production without
 * SMTP the message is rendered but not delivered (reported honestly).
 */
export function createMailer(env: NodeJS.ProcessEnv = process.env, isProduction = false): Mailer {
  let cached: { transporter: Transporter; kind: MailTransportKind } | null = null;
  const from = `"InvestIreland AI" <${env.SYSTEM_DISPATCHER_EMAIL || 'notifications@investirelandai.ie'}>`;
  const replyTo = env.REPLY_TO_EMAIL || 'hello@investirelandai.ie';

  const getTransport = async () => {
    if (cached) return cached;
    if (env.SMTP_USER && env.SMTP_PASS) {
      const port = env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 465;
      cached = {
        transporter: nodemailer.createTransport({
          host: env.SMTP_HOST || 'smtp.gmail.com',
          port,
          secure: port === 465,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        }),
        kind: 'SMTP_CONFIGURED',
      };
      return cached;
    }
    if (!isProduction) {
      try {
        const account = await nodemailer.createTestAccount();
        cached = {
          transporter: nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: { user: account.user, pass: account.pass },
          }),
          kind: 'ETHEREAL_TEST_ACCOUNT',
        };
        return cached;
      } catch (err) {
        console.warn('[mailer] Ethereal test account unavailable; emails will not be delivered.', err);
      }
    }
    cached = { transporter: nodemailer.createTransport({ jsonTransport: true }), kind: 'APP_FALLBACK' };
    return cached;
  };

  return async (mail: OutgoingMail) => {
    const { transporter, kind } = await getTransport();
    const info = await transporter.sendMail({ from, replyTo, ...mail });
    return {
      messageId: info.messageId || `msg_${Date.now()}`,
      transport: kind,
      delivered: kind === 'SMTP_CONFIGURED',
      previewUrl: kind === 'ETHEREAL_TEST_ACCOUNT' ? nodemailer.getTestMessageUrl(info) || null : null,
    };
  };
}
