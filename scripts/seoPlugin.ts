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
  HOME_HERO,
} from '../src/config/site';
import {
  CALCULATORS_HUB,
  CALCULATOR_PAGES,
  CALCULATOR_TAX_NOTE,
  CALCULATOR_TOOLS,
  GUIDE_PAGES,
  ABOUT_PAGE,
  calculatorPageForView,
  formatIsoDate,
  type CalculatorPage,
  type ContentSection,
} from '../src/config/calculators';

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

const faqPage = (id: string, url: string, faqs: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  '@id': id,
  url,
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

const calculatorPageFor = (page: PageSeo): CalculatorPage | undefined => CALCULATOR_PAGES.find((p) => p.path === page.path);

function calculatorStructuredData(page: CalculatorPage, url: string): Record<string, unknown>[] {
  const crumbs = [{ name: 'Home', item: `${SITE_URL}/` }];
  if (page.kind === 'tool') crumbs.push({ name: 'Calculators', item: absoluteUrl(CALCULATORS_HUB.path) });
  crumbs.push({ name: page.name, item: url });

  const nodes: Record<string, unknown>[] = [
    {
      '@type': page.kind === 'about' ? 'AboutPage' : 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'en-IE',
      dateModified: page.updated,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      ...(page.kind === 'about' ? { mainEntity: { '@id': `${SITE_URL}/#organization` } } : {}),
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
      },
    },
  ];

  if (page.kind === 'hub') {
    nodes.push({
      '@type': 'ItemList',
      '@id': `${url}#calculators`,
      itemListElement: CALCULATOR_TOOLS.map((tool, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: tool.name,
        url: absoluteUrl(tool.path),
      })),
    });
  } else if (page.kind === 'guide') {
    nodes.push({
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: page.h1,
      description: page.description,
      image: SITE_OG_IMAGE,
      inLanguage: 'en-IE',
      dateModified: page.updated,
      mainEntityOfPage: { '@id': `${url}#webpage` },
      author: { '@id': `${SITE_URL}/#organization` },
      publisher: { '@id': `${SITE_URL}/#organization` },
    });
  } else if (page.kind === 'tool') {
    nodes.push({
      '@type': 'WebApplication',
      '@id': `${url}#app`,
      name: `${page.name} Ireland`,
      url,
      description: page.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      inLanguage: 'en-IE',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      publisher: { '@id': `${SITE_URL}/#organization` },
    });
  }
  if (page.faqs.length > 0) nodes.push(faqPage(`${url}#faq`, url, page.faqs));
  return nodes;
}

export function structuredData(page: PageSeo): { '@context': string; '@graph': Record<string, unknown>[] } {
  const url = absoluteUrl(page.path);
  const graph: Record<string, unknown>[] = [organization, website];
  const calculator = calculatorPageFor(page);

  if (calculator) {
    graph.push(...calculatorStructuredData(calculator, url));
  } else if (page.path === '/') {
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
      faqPage(`${SITE_URL}/#faq`, `${SITE_URL}/`, FAQS)
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
const SHELL_PLACEHOLDER = '<!-- seo:shell -->';
const SHELL_START = '<!-- seo:shell-start -->';
const SHELL_END = '<!-- seo:shell-end -->';

/**
 * Visible pre-rendered homepage hero inside #root, so the first paint (and any crawler) gets real
 * text before JavaScript runs. React replaces it on mount; the markup mirrors Navbar + HeroSection
 * so nothing moves when that happens.
 */
export function renderHomeShell(): string {
  return `${SHELL_START}<header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex items-center justify-between gap-2 h-16"><a href="/" class="flex items-center gap-2 sm:gap-2.5 shrink-0 rounded-xl"><span aria-hidden="true" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white"><span class="font-extrabold text-sm tracking-tight">IE</span></span><span class="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">${escapeHtml(SITE_NAME)}</span></a></div></div></header>`
    + `<main><section aria-labelledby="hero-heading" class="relative overflow-hidden pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-32 bg-gradient-to-b from-emerald-50/60 via-white to-white border-b border-slate-200/60"><div class="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">`
    + `<p class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-emerald-900"><span class="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true"></span>Built for people investing in Ireland</p>`
    + `<h1 id="hero-heading" class="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.1]">${escapeHtml(HOME_HERO.h1Lead)} <span class="text-emerald-800">${escapeHtml(HOME_HERO.h1Rest)}</span></h1>`
    + `<p class="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed">${escapeHtml(HOME_HERO.subline)}</p>`
    + `<div class="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4"><a href="${CALCULATORS_HUB.path}" class="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-emerald-700 text-white shadow-md">Try the calculators</a><button type="button" class="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-white text-slate-800 border border-slate-300 shadow-xs">Open my tracker</button></div>`
    + `<p class="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">Educational tools, not financial advice.</p>`
    + `</div></section></main>${SHELL_END}`;
}

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
        <h2>${escapeHtml(SITE_NAME)}: Ireland's Investment Account calculator and portfolio tracker</h2>
        <p>${escapeHtml(HOME_SEO.description)}</p>
        <h2>What you can do</h2>
        <ul>
          <li>Compare exit tax (38% in 2026, 35% from 2027) and 8-year deemed disposal with the proposed Investment Account (€12,000 annual limit, €50,000 tax-free threshold, 1% charge above it).</li>
          <li>Estimate the impact of FY26 vs FY27 rules with the budget calculator and scenario planner.</li>
          <li>Track Irish, EU, US and Indian holdings in one place with indicative currency conversion.</li>
          <li>Read guides that link to official sources such as gov.ie, the Department of Finance and Revenue.</li>
        </ul>
        <h2>Free Irish calculators</h2>
        <ul>${CALCULATOR_TOOLS.map((t) => `<li><a href="${t.path}">${escapeHtml(t.name)} Ireland</a></li>`).join('')}<li><a href="${CALCULATORS_HUB.path}">All calculators</a></li></ul>
        <h2>Guides</h2>
        <ul>${GUIDE_PAGES.map((g) => `<li><a href="${g.path}">${escapeHtml(g.name)}</a></li>`).join('')}<li><a href="${ABOUT_PAGE.path}">About ${escapeHtml(SITE_NAME)}</a></li></ul>
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

// Other pages are lazy-loaded views, so they keep an empty #root rather than the homepage hero.
const removeShell = (html: string) => (html.includes(SHELL_START) ? replaceBetween(html, SHELL_START, SHELL_END, '') : html);

function renderSection(section: ContentSection): string {
  const paragraphs = (section.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const bullets = section.bullets?.length ? `<ul>${section.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '';
  const table = section.table
    ? `<table><caption>${escapeHtml(section.table.caption)}</caption><thead><tr>${section.table.headers
        .map((h) => `<th scope="col">${escapeHtml(h)}</th>`)
        .join('')}</tr></thead><tbody>${section.table.rows
        .map((row) => `<tr>${row.map((cell, i) => (i === 0 ? `<th scope="row">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`)).join('')}</tr>`)
        .join('')}</tbody></table>`
    : '';
  const links = section.links?.length
    ? `<p>Related: ${section.links
        .map((view) => {
          const target = calculatorPageForView(view);
          return `<a href="${target.path}">${escapeHtml(target.name)}</a>`;
        })
        .join(' · ')}</p>`
    : '';
  return `<h2>${escapeHtml(section.heading)}</h2>${paragraphs}${bullets}${table}${links}`;
}

/** Crawlable fallback for a calculator, guide or about page: the full text content, FAQs, sources and links. */
export function renderCalculatorNoscript(page: CalculatorPage): string {
  const highlights = page.highlights.length
    ? `<ul>${page.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
    : '';
  const tools = page.kind === 'hub'
    ? `<ul>${CALCULATOR_TOOLS.map((t) => `<li><a href="${t.path}">${escapeHtml(t.name)}</a>: ${escapeHtml(t.description)}</li>`).join('')}</ul>`
    : '';
  const faqs = page.faqs.length
    ? `<h2>Frequently asked questions</h2><dl>${page.faqs.map((f) => `<dt><strong>${escapeHtml(f.q)}</strong></dt><dd>${escapeHtml(f.a)}</dd>`).join('')}</dl>`
    : '';
  const sections = (page.sections ?? []).map(renderSection).join('');
  const sources = page.sources?.length
    ? `<h2>Sources</h2><ul>${page.sources.map((src) => `<li><a href="${escapeHtml(src.url)}" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>`).join('')}</ul>`
    : '';
  const updated = page.kind === 'hub' ? '' : `<p>Last updated <time datetime="${page.updated}">${escapeHtml(formatIsoDate(page.updated))}</time>.</p>`;
  const related = CALCULATOR_PAGES.filter((p) => p.path !== page.path)
    .map((p) => `<li><a href="${p.path}">${escapeHtml(p.name)}</a></li>`)
    .join('');
  return `${NOSCRIPT_START}<noscript>
      <main style="max-width:48rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.6">
        <h1>${escapeHtml(page.h1)}</h1>
        <p>${escapeHtml(page.intro)}</p>
        ${updated}${highlights}${tools}${sections}${faqs}${sources}
        <p>${escapeHtml(CALCULATOR_TAX_NOTE)} Educational information and estimates, not financial advice.</p>
        <h2>More calculators and guides</h2>
        <ul>${related}</ul>
        <p><a href="/">Back to ${escapeHtml(SITE_NAME)}</a> · <a href="/privacy">Privacy &amp; Cookies</a></p>
        ${page.kind === 'about' ? '' : '<p>Please enable JavaScript to use the interactive calculator.</p>'}
      </main>
    </noscript>${NOSCRIPT_END}`;
}

export function renderCalculatorDocument(indexHtml: string, page: CalculatorPage): string {
  const withHead = replaceBetween(indexHtml, HEAD_START, HEAD_END, renderHead(page));
  return removeShell(replaceBetween(withHead, NOSCRIPT_START, NOSCRIPT_END, renderCalculatorNoscript(page)));
}

/** Builds the static /privacy document from the built home document. */
export function renderPrivacyDocument(indexHtml: string): string {
  const withHead = replaceBetween(indexHtml, HEAD_START, HEAD_END, renderHead(PRIVACY_SEO));
  return removeShell(replaceBetween(withHead, NOSCRIPT_START, NOSCRIPT_END, renderPrivacyNoscript()));
}

/** Indexable public URLs. Keep in sync with the routes the app serves with HTTP 200. */
export const SITEMAP_PAGES: PageSeo[] = [HOME_SEO, ...CALCULATOR_PAGES, PRIVACY_SEO];

// lastmod comes from each calculator/guide page's reviewed date (shown on the page as "Last updated").
// It is omitted for pages without an accurate date. Google ignores changefreq/priority.
export function renderSitemap(): string {
  const body = SITEMAP_PAGES.map((page) => {
    const updated = calculatorPageFor(page)?.updated;
    const lastmod = updated ? `\n    <lastmod>${updated}</lastmod>` : '';
    return `  <url>\n    <loc>${absoluteUrl(page.path)}</loc>${lastmod}\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** Injects SEO/AEO metadata, and at build time emits /privacy.html, the calculator pages and sitemap.xml. */
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
      return html
        .replace(HEAD_PLACEHOLDER, renderHead(HOME_SEO))
        .replace(BODY_PLACEHOLDER, renderNoscript())
        .replace(SHELL_PLACEHOLDER, renderHomeShell());
    },
    writeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir);
      const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      fs.writeFileSync(path.join(outDir, 'privacy.html'), renderPrivacyDocument(indexHtml));
      for (const page of CALCULATOR_PAGES) {
        fs.writeFileSync(path.join(outDir, `${page.path.slice(1)}.html`), renderCalculatorDocument(indexHtml, page));
      }
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), renderSitemap());
    },
  };
}
