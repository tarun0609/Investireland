export interface Env {
  /** Firebase project id, e.g. "investirelandai". */
  FIREBASE_PROJECT_ID: string;
  /** Main site origins allowed to call user endpoints, comma separated. */
  APP_ORIGINS: string;
  /** Canonical site URL used in emails and Stripe redirects, e.g. https://www.investirelandai.ie */
  APP_URL: string;
  /** Origin of the separate admin site. */
  ADMIN_ORIGIN: string;
  /** Firebase uids allowed to use /admin endpoints, comma separated (secret). */
  ADMIN_UIDS: string;

  /** Google service account JSON with Cloud Datastore User role (secret). */
  GOOGLE_SERVICE_ACCOUNT: string;

  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_PRO_MONTHLY: string;
  STRIPE_PRICE_PRO_ANNUAL: string;
  STRIPE_PRICE_FAMILY_ANNUAL: string;

  BREVO_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME?: string;
  EMAIL_REPLY_TO?: string;
  /** Free Brevo plan allows 300 emails/day. */
  EMAIL_DAILY_LIMIT?: string;
  /** Random secret used to sign unsubscribe and household invite links (secret). */
  LINK_SIGNING_SECRET: string;

  /** Global cap on promo redemptions (default 1000). */
  PROMO_GLOBAL_CAP?: string;
}

export const splitList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
