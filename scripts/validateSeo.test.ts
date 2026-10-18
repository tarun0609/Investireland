import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { renderPrivacyDocument, renderSitemap, seoPlugin } from './seoPlugin';
import { validateSeoOutput, type ReadBuiltFile } from './validateSeo';

const root = path.resolve(import.meta.dirname, '..');
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const buildFiles = (): Record<string, string> => {
  const transform = seoPlugin().transformIndexHtml as (html: string) => string;
  const indexHtml = transform(readSource('index.html'));
  return {
    'index.html': indexHtml,
    'privacy.html': renderPrivacyDocument(indexHtml),
    'sitemap.xml': renderSitemap(),
    'robots.txt': readSource('public/robots.txt'),
    '404.html': readSource('public/404.html'),
    'site.webmanifest': readSource('public/site.webmanifest'),
  };
};

const reader = (files: Record<string, string>): ReadBuiltFile => (p) => files[p] ?? null;

describe('validateSeoOutput', () => {
  it('passes for the real index.html, public files and generated pages', () => {
    expect(validateSeoOutput(reader(buildFiles()))).toEqual([]);
  });

  it('flags noindex, wrong canonical, duplicate titles and broken sitemap', () => {
    const files = buildFiles();
    files['privacy.html'] = files['index.html']
      .replace('index, follow', 'noindex, follow')
      .replace('href="https://www.investirelandai.ie/"', 'href="https://investirelandai.ie/"');
    files['sitemap.xml'] = files['sitemap.xml'].replace('</urlset>', '<url><loc>https://www.investirelandai.ie/nope</loc><lastmod>2020-01-01</lastmod></url></urlset>');
    const errors = validateSeoOutput(reader(files)).join('\n');
    expect(errors).toMatch(/\/privacy.*must not be noindex/);
    expect(errors).toMatch(/\/privacy.*canonical must be exactly https:\/\/www\.investirelandai\.ie\/privacy/);
    expect(errors).toMatch(/duplicate title/);
    expect(errors).toMatch(/sitemap\.xml must list exactly/);
    expect(errors).toMatch(/lastmod/);
  });

  it('flags robots.txt that blocks the site or omits the sitemap, and a 404 page without noindex', () => {
    const files = buildFiles();
    files['robots.txt'] = 'User-agent: *\nDisallow: /\n';
    files['404.html'] = '<html><head><title>x</title></head></html>';
    const errors = validateSeoOutput(reader(files)).join('\n');
    expect(errors).toMatch(/Disallow: \//);
    expect(errors).toMatch(/must reference the canonical sitemap/);
    expect(errors).toMatch(/404\.html must be noindex/);
  });

  it('flags placeholder and broken internal links', () => {
    const files = buildFiles();
    files['404.html'] = files['404.html'].replace('href="/privacy"', 'href="/missing-page"').replace('href="/"', 'href="#"');
    const errors = validateSeoOutput(reader(files)).join('\n');
    expect(errors).toMatch(/internal link \/missing-page has no target/);
    expect(errors).toMatch(/placeholder link/);
  });
});

describe('hosting configuration', () => {
  const config = JSON.parse(readSource('staticwebapp.config.json'));

  it('normalises URL variants and returns real 404s instead of an SPA fallback', () => {
    expect(config.trailingSlash).toBe('never');
    expect(config.navigationFallback).toBeUndefined();
    expect(config.responseOverrides['404'].rewrite).toBe('/404.html');
    const indexRoute = config.routes.find((r: { route: string }) => r.route === '/index');
    expect(indexRoute).toMatchObject({ redirect: '/', statusCode: 301 });
  });

  it('keeps security headers in place', () => {
    const headers = config.globalHeaders;
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('robots.txt allows public pages and references the canonical sitemap', () => {
    const robots = readSource('public/robots.txt');
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toContain('Sitemap: https://www.investirelandai.ie/sitemap.xml');
    expect(robots).not.toMatch(/^Disallow: \/\s*$/m);
  });
});
