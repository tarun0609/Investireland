import { describe, expect, it } from 'vitest';
import { FAQS } from '../src/data/faqs';
import { HOME_SEO, PRIVACY_SEO } from '../src/config/site';
import { renderHead, renderNoscript, renderPrivacyDocument, renderSitemap, seoPlugin, structuredData } from './seoPlugin';

const extractJsonLd = (html: string) => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(match).not.toBeNull();
  return JSON.parse(match![1]);
};

const template = `<html><head><!-- seo:head --></head><body><!-- seo:noscript --><div id="root"></div></body></html>`;
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

  it('renders a valid sitemap with only the canonical public URLs and no fake dates', () => {
    const xml = renderSitemap();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.match(/<loc>/g)).toHaveLength(2);
    expect(xml).toContain('<loc>https://www.investirelandai.ie/</loc>');
    expect(xml).toContain('<loc>https://www.investirelandai.ie/privacy</loc>');
    expect(xml).not.toMatch(/lastmod|changefreq|priority/);
  });
});
