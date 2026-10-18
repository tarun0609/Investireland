import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SITE_URL, absoluteUrl } from '../src/config/site';
import { SITEMAP_PAGES } from './seoPlugin';

/** Reads a built file relative to the output directory, or returns null when it does not exist. */
export type ReadBuiltFile = (relativePath: string) => string | null;

const htmlFileForPath = (pagePath: string) => (pagePath === '/' ? 'index.html' : `${pagePath.slice(1)}.html`);

const attr = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].map((m) => m[1]);
const metaContent = (html: string, key: 'name' | 'property', value: string) =>
  attr(html, new RegExp(`<meta\\s+${key}="${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="([^"]*)"`, 'g'));

const collectUrls = (node: unknown, out: string[] = []): string[] => {
  if (typeof node === 'string') {
    if (/^https?:\/\//.test(node)) out.push(node);
  } else if (Array.isArray(node)) {
    node.forEach((child) => collectUrls(child, out));
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach((child) => collectUrls(child, out));
  }
  return out;
};

/**
 * Validates the built site for indexing readiness. Returns a list of human-readable problems
 * (empty when everything is valid).
 */
export function validateSeoOutput(read: ReadBuiltFile): string[] {
  const errors: string[] = [];
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const knownPaths = new Set(SITEMAP_PAGES.map((p) => p.path));

  for (const page of SITEMAP_PAGES) {
    const file = htmlFileForPath(page.path);
    const html = read(file);
    const label = `${page.path} (${file})`;
    if (html === null) {
      errors.push(`${label}: built HTML file is missing`);
      continue;
    }
    const expectedUrl = absoluteUrl(page.path);

    const title = attr(html, /<title>([^<]*)<\/title>/g);
    if (title.length !== 1 || !title[0].trim()) errors.push(`${label}: expected exactly one non-empty <title>`);
    else if (titles.has(title[0])) errors.push(`${label}: duplicate title shared with ${titles.get(title[0])}`);
    else titles.set(title[0], page.path);

    const description = metaContent(html, 'name', 'description');
    if (description.length !== 1 || !description[0].trim()) errors.push(`${label}: expected exactly one meta description`);
    else if (descriptions.has(description[0])) errors.push(`${label}: duplicate description shared with ${descriptions.get(description[0])}`);
    else descriptions.set(description[0], page.path);

    const canonicals = attr(html, /<link\s+rel="canonical"\s+href="([^"]*)"/g);
    if (canonicals.length !== 1 || canonicals[0] !== expectedUrl) {
      errors.push(`${label}: canonical must be exactly ${expectedUrl} (found ${canonicals.join(', ') || 'none'})`);
    }

    const robots = metaContent(html, 'name', 'robots');
    if (robots.some((value) => /noindex|none/i.test(value))) errors.push(`${label}: public page must not be noindex`);

    const ogUrl = metaContent(html, 'property', 'og:url');
    if (ogUrl[0] !== expectedUrl) errors.push(`${label}: og:url must be ${expectedUrl}`);
    for (const prop of ['og:title', 'og:description', 'og:image', 'og:site_name']) {
      if (!metaContent(html, 'property', prop)[0]) errors.push(`${label}: missing ${prop}`);
    }
    if (!/<link\s+rel="manifest"\s+href="\/site\.webmanifest"/.test(html)) errors.push(`${label}: missing web manifest link`);
    if (!/<link\s+rel="icon"/.test(html)) errors.push(`${label}: missing favicon link`);

    const jsonLdBlocks = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (jsonLdBlocks.length === 0) errors.push(`${label}: missing JSON-LD structured data`);
    for (const block of jsonLdBlocks) {
      try {
        const urls = collectUrls(JSON.parse(block)).filter((u) => !u.startsWith('https://schema.org'));
        const foreign = urls.filter((u) => !u.startsWith(`${SITE_URL}/`));
        if (foreign.length) errors.push(`${label}: JSON-LD URLs must use ${SITE_URL} (found ${foreign.join(', ')})`);
      } catch {
        errors.push(`${label}: JSON-LD is not valid JSON`);
      }
    }
  }

  const sitemap = read('sitemap.xml');
  if (sitemap === null) {
    errors.push('sitemap.xml is missing');
  } else {
    if (!sitemap.startsWith('<?xml') || !sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
      errors.push('sitemap.xml is not a valid sitemap urlset');
    }
    const locs = attr(sitemap, /<loc>([^<]*)<\/loc>/g).sort();
    const expected = SITEMAP_PAGES.map((p) => absoluteUrl(p.path)).sort();
    if (JSON.stringify(locs) !== JSON.stringify(expected)) {
      errors.push(`sitemap.xml must list exactly ${expected.join(', ')} (found ${locs.join(', ')})`);
    }
    if (/<(lastmod|changefreq|priority)>/.test(sitemap)) errors.push('sitemap.xml must not contain unverifiable lastmod/changefreq/priority');
  }

  const robotsTxt = read('robots.txt');
  if (robotsTxt === null) {
    errors.push('robots.txt is missing');
  } else {
    if (!robotsTxt.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) errors.push('robots.txt must reference the canonical sitemap URL');
    const disallows = attr(robotsTxt, /^Disallow:\s*(\S*)\s*$/gm);
    for (const rule of disallows) {
      if (rule === '/' || ['/assets', '/fonts', '/privacy'].some((p) => rule === p || rule.startsWith(`${p}/`))) {
        errors.push(`robots.txt must not block public pages or render resources (Disallow: ${rule})`);
      }
    }
  }

  const notFound = read('404.html');
  if (notFound === null) errors.push('404.html is missing');
  else if (!/<meta\s+name="robots"\s+content="noindex"/.test(notFound)) errors.push('404.html must be noindex');

  for (const file of [...SITEMAP_PAGES.map((p) => htmlFileForPath(p.path)), '404.html']) {
    const html = read(file);
    if (!html) continue;
    for (const href of attr(html, /<a\s[^>]*href="([^"]*)"/g)) {
      if (href === '#' || href === '') errors.push(`${file}: placeholder link href="${href}"`);
      if (!href.startsWith('/')) continue;
      const linkPath = href.split(/[?#]/)[0] || '/';
      if (!knownPaths.has(linkPath) && read(linkPath.slice(1)) === null) errors.push(`${file}: internal link ${href} has no target`);
    }
  }

  return errors;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const distDir = path.resolve(process.argv[2] ?? 'dist');
  const read: ReadBuiltFile = (relativePath) => {
    const full = path.join(distDir, relativePath);
    return fs.existsSync(full) && fs.statSync(full).isFile() ? fs.readFileSync(full, 'utf8') : null;
  };
  const errors = validateSeoOutput(read);
  if (errors.length) {
    console.error(`SEO validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`SEO validation passed for ${SITEMAP_PAGES.length} indexable pages in ${distDir}`);
}
