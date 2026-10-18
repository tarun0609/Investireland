import fs from 'fs';
import path from 'path';
import type { Plugin, ResolvedConfig } from 'vite';
import { FAQS } from '../src/data/faqs';
import {
  HOME_SEO,
  PRIVACY_SEO,
  SITE_FACTS,
  SITE_LOCALE,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_THEME_COLOR,
  SITE_URL,
  absoluteUrl,
  type PageSeo,
} from '../src/config/site';

const HEAD_START = '<!-- seo:start -->';
const HEAD_END = '<!-- seo:end -->';
const HEAD_PLACEHOLDER = '<!-- seo:head -->';
const BODY_PLACEHOLDER = '<!-- seo:noscript -->';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Prevent "</script>" or "<!--" inside data from breaking out of the JSON-LD block.
const jsonLd = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const organization = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon-512.png`,
  email: SITE_FACTS.contactEmail,
  areaServed: SITE_FACTS.areaServed,
  contactPoint: [
    { '@type': 'ContactPoint', contactType: 'customer support', email: SITE_FACTS.supportEmail, availableLanguage: 'English' },
    { '@type': 'ContactPoint', contactType: 'general enquiries', email: SITE_FACTS.contactEmail, availableLanguage: 'English' },
  ],
};

const website = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: 'en-IE',
  publisher: { '@id': `${SITE_URL}/#organization` },
};

export function structuredData(page: PageSeo): { '@context': string; '@graph': Record<string, unknown>[] } {
  const url = absoluteUrl(page.path);
  const graph: Record<string, unknown>[] = [organization, website];

  if (page.path === '/') {
    graph.push(
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: page.description,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any (web browser)',
        inLanguage: 'en-IE',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        url: `${SITE_URL}/`,
        mainEntity: FAQS.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      }
    );
  } else {
    graph.push({
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'en-IE',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: page.title, item: url },
        ],
      },
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function renderHead(page: PageSeo): string {
  const url = absoluteUrl(page.path);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  return [
    HEAD_START,
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    `<meta name="theme-color" content="${SITE_THEME_COLOR}" />`,
    `<meta name="application-name" content="${SITE_NAME}" />`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
    `<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="${SITE_LOCALE}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${SITE_OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeHtml(`${SITE_NAME} – Ireland's Investment Account explained`)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${SITE_OG_IMAGE}" />`,
    jsonLd(structuredData(page)),
    HEAD_END,
  ].join('\n    ');
}

const NOSCRIPT_START = '<!-- seo:noscript-start -->';
const NOSCRIPT_END = '<!-- seo:noscript-end -->';

function renderPrivacyNoscript(): string {
  return `${NOSCRIPT_START}<noscript>
      <main style="max-width:48rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.6">
        <h1>${escapeHtml(PRIVACY_SEO.title)}</h1>
        <p>${escapeHtml(PRIVACY_SEO.description)}</p>
        <p>For data protection requests, email <a href="mailto:${SITE_FACTS.supportEmail}">${SITE_FACTS.supportEmail}</a>. Please enable JavaScript to read the full policy.</p>
        <p><a href="/">Back to ${escapeHtml(SITE_NAME)}</a></p>
      </main>
    </noscript>${NOSCRIPT_END}`;
}

/** Crawlable summary for clients that do not run JavaScript (many AI answer-engine crawlers). */
export function renderNoscript(): string {
  const faqs = FAQS.map((f) => `<dt><strong>${escapeHtml(f.q)}</strong></dt><dd>${escapeHtml(f.a)}</dd>`).join('');
  return `${NOSCRIPT_START}<noscript>
      <main style="max-width:48rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.6">
        <h1>${escapeHtml(SITE_NAME)}: Ireland's Investment Account calculator and portfolio tracker</h1>
        <p>${escapeHtml(HOME_SEO.description)}</p>
        <h2>What you can do</h2>
        <ul>
          <li>Compare the current 38% exit tax and 8-year deemed disposal with the proposed Investment Account (€12,000 annual limit, €50,000 tax-free threshold, 1% charge above it).</li>
          <li>Estimate the impact of FY26 vs FY27 rules with the budget calculator and scenario planner.</li>
          <li>Track Irish, EU, US and Indian holdings in one place with indicative currency conversion.</li>
          <li>Read guides that link to official sources such as gov.ie, the Department of Finance and Revenue.</li>
        </ul>
        <h2>Frequently asked questions</h2>
        <dl>${faqs}</dl>
        <p>${escapeHtml(SITE_NAME)} is an educational tool, not a regulated financial adviser. Contact: <a href="mailto:${SITE_FACTS.contactEmail}">${SITE_FACTS.contactEmail}</a>. <a href="/privacy">Privacy &amp; Cookies</a>.</p>
        <p>Please enable JavaScript to use the interactive calculators.</p>
      </main>
    </noscript>${NOSCRIPT_END}`;
}

const replaceBetween = (html: string, startMarker: string, endMarker: string, replacement: string) => {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1) throw new Error(`[seo] built index.html is missing ${startMarker}.`);
  return html.slice(0, start) + replacement + html.slice(end + endMarker.length);
};

/** Builds the static /privacy document from the built home document. */
export function renderPrivacyDocument(indexHtml: string): string {
  const withHead = replaceBetween(indexHtml, HEAD_START, HEAD_END, renderHead(PRIVACY_SEO));
  return replaceBetween(withHead, NOSCRIPT_START, NOSCRIPT_END, renderPrivacyNoscript());
}

/** Indexable public URLs. Keep in sync with the routes the app serves with HTTP 200. */
export const SITEMAP_PAGES: PageSeo[] = [HOME_SEO, PRIVACY_SEO];

// lastmod/changefreq/priority are intentionally omitted: no accurate per-page modification date exists,
// and Google ignores changefreq/priority.
export function renderSitemap(): string {
  const body = SITEMAP_PAGES.map((page) => `  <url>\n    <loc>${absoluteUrl(page.path)}</loc>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** Injects SEO/AEO metadata, and at build time emits /privacy.html and sitemap.xml. */
export function seoPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'investireland-seo',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml(html) {
      if (!html.includes(HEAD_PLACEHOLDER) || !html.includes(BODY_PLACEHOLDER)) {
        throw new Error('[seo] index.html is missing the seo:head or seo:noscript placeholder.');
      }
      return html.replace(HEAD_PLACEHOLDER, renderHead(HOME_SEO)).replace(BODY_PLACEHOLDER, renderNoscript());
    },
    writeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir);
      const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      fs.writeFileSync(path.join(outDir, 'privacy.html'), renderPrivacyDocument(indexHtml));
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), renderSitemap());
    },
  };
}
