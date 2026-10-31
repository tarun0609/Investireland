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
  title: 'Ireland Investment Calculators & Tracker | InvestIreland AI',
  description:
    'Free Irish investing calculators and a portfolio tracker. Compare 35% exit tax with the new Investment Account and track Irish, US and Indian holdings.',
};

export const PRIVACY_SEO: PageSeo = {
  path: '/privacy',
  title: 'Privacy & Cookies – InvestIreland AI',
  description:
    'How InvestIreland AI collects, uses and protects your data under GDPR, which cookies and local storage we use, and how to use your data protection rights.',
};

export const absoluteUrl = (path: string) => `${SITE_URL}${path === '/' ? '/' : path}`;

/** Organisation / site facts reused by structured data. */
export const SITE_FACTS = {
  areaServed: 'IE',
  contactEmail: CONTACT_EMAILS.enquiries,
  supportEmail: CONTACT_EMAILS.support,
} as const;

/** Homepage hero copy, shared by HeroSection and the pre-rendered shell so they always match. */
export const HOME_HERO = {
  h1Lead: 'Your money.',
  h1Rest: 'Finally made easier to understand.',
  subline: 'Free Irish tax calculators and a simple tracker for your savings, pension and investments in Ireland, India and the US.',
};
