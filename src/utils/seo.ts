import { HOME_SEO, PRIVACY_SEO, absoluteUrl, type PageSeo } from '../config/site';
import { CALCULATOR_PAGES, calculatorPageForView, isCalculatorView, type AppView } from '../config/calculators';

const INDEXABLE_PATHS = new Set([HOME_SEO.path, PRIVACY_SEO.path, ...CALCULATOR_PAGES.map((p) => p.path)]);

const setMeta = (selector: string, content: string) => {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
};

export const normalisePath = (pathname: string) => pathname.replace(/\/+$/, '') || '/';

/**
 * Keeps head metadata in sync with client-side navigation. The static HTML already carries
 * the right tags for each indexable page; this mirrors them after pushState navigation and
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

export const seoForView = (view: AppView): PageSeo => {
  if (view === 'privacy') return PRIVACY_SEO;
  if (isCalculatorView(view)) return calculatorPageForView(view);
  return HOME_SEO;
};
