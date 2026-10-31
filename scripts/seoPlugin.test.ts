import { describe, expect, it } from 'vitest';
import { FAQS } from '../src/data/faqs';
import { HOME_HERO, HOME_SEO, PRIVACY_SEO } from '../src/config/site';
import {
  renderCalculatorDocument,
  renderHead,
  renderNoscript,
  renderPrivacyDocument,
  renderSitemap,
  seoPlugin,
  structuredData,
} from './seoPlugin';
import {
  ABOUT_PAGE,
  BEST_INVESTMENT_OPTIONS_GUIDE,
  CALCULATORS_HUB,
  CALCULATOR_PAGES,
  CALCULATOR_TOOLS,
  ETF_TAX_CALCULATOR,
} from '../src/config/calculators';

const extractJsonLd = (html: string) => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(match).not.toBeNull();
  return JSON.parse(match![1]);
};

const template = `<html><head><!-- seo:head --></head><body><!-- seo:noscript --><div id="root"><!-- seo:shell --></div></body></html>`;
const transform = (html: string) => {
  const hook = seoPlugin().transformIndexHtml as (html: string) => string;
  return hook(html);
};

describe('seoPlugin', () => {
  it('renders canonical, robots, social tags and parseable JSON-LD for the home page', () => {
    const head = renderHead(HOME_SEO);
    expect(head).toContain('<link rel="canonical" href="https://www.investirelandai.ie/" />');
    expect(head).toContain('content="index, follow');
    expect(head).toContain('property="og:image" content="https://www.investirelandai.ie/og-image.png"');
    expect(head).toContain('name="twitter:card" content="summary_large_image"');

    const data = extractJsonLd(head);
    const types = data['@graph'].map((node: { '@type': string }) => node['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'WebApplication', 'FAQPage']);
    const faq = data['@graph'].find((node: { '@type': string }) => node['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(FAQS.length);
  });

  it('uses WebPage + BreadcrumbList (no FAQPage) for the privacy page', () => {
    const types = structuredData(PRIVACY_SEO)['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'WebPage']);
  });

  it('escapes HTML-significant characters in head and JSON-LD', () => {
    const head = renderHead({ path: '/x', title: '</title><script>alert(1)</script>', description: '"quoted" & <b>' });
    expect(head).not.toContain('<script>alert(1)');
    expect(head).toContain('&quot;quoted&quot; &amp; &lt;b&gt;');
    const jsonBlock = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
    expect(jsonBlock).not.toContain('<');
  });

  it('injects head and noscript content into the HTML template and requires placeholders', () => {
    const html = transform(template);
    expect(html).not.toContain('<!-- seo:head -->');
    expect(html).toContain('<noscript>');
    expect(html.match(/<dt>/g)).toHaveLength(FAQS.length);
    expect(() => transform('<html><head></head><body></body></html>')).toThrow(/placeholder/);
  });

  it('builds a privacy document with its own canonical and noscript summary', () => {
    const privacy = renderPrivacyDocument(transform(template));
    expect(privacy).toContain('<link rel="canonical" href="https://www.investirelandai.ie/privacy" />');
    expect(privacy).not.toContain('href="https://www.investirelandai.ie/" />');
    expect(privacy).not.toContain('FAQPage');
    expect(privacy).toContain('<div id="root"></div>');
    expect(renderNoscript()).toContain('<dl>');
  });

  it('pre-renders a visible homepage hero with exactly one h1 and strips it from other pages', () => {
    const home = transform(template);
    expect(home).not.toContain('<!-- seo:shell -->');
    expect(home.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(home).toContain(HOME_HERO.subline);
    expect(home).toContain(`href="${CALCULATORS_HUB.path}"`);

    const calc = renderCalculatorDocument(home, ETF_TAX_CALCULATOR);
    expect(calc).toContain('<div id="root"></div>');
    expect(calc).not.toContain(HOME_HERO.subline);
    expect(calc.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it('renders a valid sitemap with only the canonical public URLs and only real page dates', () => {
    const xml = renderSitemap();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.match(/<loc>/g)).toHaveLength(2 + CALCULATOR_PAGES.length);
    expect(xml).toContain('<loc>https://www.investirelandai.ie/</loc>');
    expect(xml).toContain('<loc>https://www.investirelandai.ie/privacy</loc>');
    for (const page of CALCULATOR_PAGES) expect(xml).toContain(`<loc>https://www.investirelandai.ie${page.path}</loc>`);
    expect(xml).not.toMatch(/changefreq|priority/);
    for (const page of CALCULATOR_PAGES) {
      expect(xml).toContain(`<loc>https://www.investirelandai.ie${page.path}</loc>\n    <lastmod>${page.updated}</lastmod>`);
    }
    expect(xml).toContain('<loc>https://www.investirelandai.ie/</loc>\n  </url>');
  });

  it('builds calculator pages with their own head, FAQ schema, breadcrumbs and crawlable content', () => {
    const html = renderCalculatorDocument(transform(template), ETF_TAX_CALCULATOR);
    expect(html).toContain('<link rel="canonical" href="https://www.investirelandai.ie/etf-tax-calculator" />');
    expect(html).toContain(`<h1>${ETF_TAX_CALCULATOR.h1}</h1>`);
    expect(html).toContain(`href="${CALCULATORS_HUB.path}"`);

    const graph = extractJsonLd(html)['@graph'] as Record<string, any>[];
    const types = graph.map((n) => n['@type']);
    expect(types).toEqual(expect.arrayContaining(['WebPage', 'WebApplication', 'FAQPage']));
    const faq = graph.find((n) => n['@type'] === 'FAQPage')!;
    expect(faq.mainEntity).toHaveLength(ETF_TAX_CALCULATOR.faqs.length);
    const crumbs = graph.find((n) => n['@type'] === 'WebPage')!.breadcrumb.itemListElement.map((c: any) => c.name);
    expect(crumbs).toEqual(['Home', 'Calculators', ETF_TAX_CALCULATOR.name]);
  });

  it('lists every calculator on the hub page', () => {
    const graph = structuredData(CALCULATORS_HUB)['@graph'] as Record<string, any>[];
    const list = graph.find((n) => n['@type'] === 'ItemList')!;
    expect(list.itemListElement).toHaveLength(CALCULATOR_TOOLS.length);
  });

  it('marks guides as dated articles with a Home > guide breadcrumb', () => {
    const graph = structuredData(BEST_INVESTMENT_OPTIONS_GUIDE)['@graph'] as Record<string, any>[];
    const article = graph.find((n) => n['@type'] === 'Article')!;
    expect(article.headline).toBe(BEST_INVESTMENT_OPTIONS_GUIDE.h1);
    expect(article.dateModified).toBe(BEST_INVESTMENT_OPTIONS_GUIDE.updated);
    expect(graph.some((n) => n['@type'] === 'WebApplication')).toBe(false);
    const crumbs = graph.find((n) => n['@type'] === 'WebPage')!.breadcrumb.itemListElement.map((c: any) => c.name);
    expect(crumbs).toEqual(['Home', BEST_INVESTMENT_OPTIONS_GUIDE.name]);
  });

  it('renders guide content, tables and sources without JavaScript', () => {
    const html = renderCalculatorDocument('<head><!-- seo:start --><!-- seo:end --></head><body><!-- seo:noscript-start --><!-- seo:noscript-end --></body>', BEST_INVESTMENT_OPTIONS_GUIDE);
    expect(html).toContain('<table>');
    expect(html).toContain('<h2>Sources</h2>');
    expect(html).toContain(`datetime="${BEST_INVESTMENT_OPTIONS_GUIDE.updated}"`);
    for (const section of BEST_INVESTMENT_OPTIONS_GUIDE.sections ?? []) expect(html).toContain(section.heading.replace(/&/g, '&amp;').replace(/'/g, '&#39;'));
  });

  it('uses the AboutPage type for the about page', () => {
    const graph = structuredData(ABOUT_PAGE)['@graph'] as Record<string, any>[];
    expect(graph.some((n) => n['@type'] === 'AboutPage')).toBe(true);
  });
});
