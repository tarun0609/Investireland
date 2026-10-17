import { HOME_SEO, PRIVACY_SEO, absoluteUrl, type PageSeo } from '../config/site';

const INDEXABLE_PATHS = new Set([HOME_SEO.path, PRIVACY_SEO.path]);

const setMeta = (selector: string, content: string) => {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
};

export const normalisePath = (pathname: string) => pathname.replace(/\/+$/, '') || '/';

/**
 * Keeps head metadata in sync with client-side navigation. The static HTML already carries
 * the right tags for "/" and "/privacy"; this mirrors them after pushState navigation and
 * keeps unknown SPA-fallback URLs out of the index (avoiding soft-404 duplicates).
 */
export function applyPageSeo(page: PageSeo, pathname: string): void {
  if (typeof document === 'undefined') return;
  const indexable = INDEXABLE_PATHS.has(normalisePath(pathname));
  const url = absoluteUrl(page.path);

  document.title = page.title;
  setMeta('meta[name="description"]', page.description);
  setMeta('meta[property="og:title"]', page.title);
  setMeta('meta[property="og:description"]', page.description);
  setMeta('meta[property="og:url"]', url);
  setMeta('meta[name="twitter:title"]', page.title);
  setMeta('meta[name="twitter:description"]', page.description);
  setMeta('meta[name="robots"]', indexable ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex, follow');
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url);
}

export const seoForView = (view: 'landing' | 'app' | 'privacy'): PageSeo => (view === 'privacy' ? PRIVACY_SEO : HOME_SEO);
