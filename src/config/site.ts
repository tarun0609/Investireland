import { CONTACT_EMAILS } from './contact';

/** Canonical public origin. www is the primary (default) domain in Azure Static Web Apps. */
export const SITE_URL = 'https://www.investirelandai.ie';
export const SITE_NAME = 'InvestIreland AI';
export const SITE_LOCALE = 'en_IE';
export const SITE_THEME_COLOR = '#047857';
export const SITE_OG_IMAGE = `${SITE_URL}/og-image.png`;

export interface PageSeo {
  path: string;
  title: string;
  description: string;
}

export const HOME_SEO: PageSeo = {
  path: '/',
  title: "InvestIreland AI – Ireland's Investment Account Calculator & Portfolio Tracker",
  description:
    "Free educational tools for Ireland's proposed Investment Account (Budget 2027): compare 38% exit tax vs the new €50,000 tax-free threshold, track Irish, EU, US and Indian investments, and read sourced guides.",
};

export const PRIVACY_SEO: PageSeo = {
  path: '/privacy',
  title: 'Privacy & Cookies – InvestIreland AI',
  description:
    'How InvestIreland AI collects, uses and protects your data under GDPR, which cookies and local storage we use, and how to exercise your data protection rights.',
};

export const absoluteUrl = (path: string) => `${SITE_URL}${path === '/' ? '/' : path}`;

/** Organisation / site facts reused by structured data. */
export const SITE_FACTS = {
  areaServed: 'IE',
  contactEmail: CONTACT_EMAILS.enquiries,
  supportEmail: CONTACT_EMAILS.support,
} as const;
