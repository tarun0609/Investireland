# SEO and indexing guide

This guide covers how the InvestIreland AI site is made crawlable and indexable, how to check that, and the steps to take after each deployment.

## Canonical origin

The one canonical origin is **`https://www.investirelandai.ie`**, set as `SITE_URL` in `src/config/site.ts`. Every canonical tag, `og:url`, JSON-LD URL, sitemap entry and the robots.txt `Sitemap:` line uses this origin.

| Indexable URL | Source |
| --- | --- |
| `https://www.investirelandai.ie/` | `index.html` (landing page; the dashboard is an in-app view at the same URL) |
| `https://www.investirelandai.ie/privacy` | `privacy.html`, generated at build time |

Every other path returns a real **404** (`public/404.html`, marked `noindex`). Unknown paths are not given an SPA fallback, so they cannot become soft-404s.

## Where metadata lives

| Concern | File |
| --- | --- |
| Site URL and per-page titles and descriptions (`HOME_SEO`, `PRIVACY_SEO`) | `src/config/site.ts` |
| Build-time head tags, JSON-LD, `<noscript>` content, `privacy.html`, `sitemap.xml` | `scripts/seoPlugin.ts` |
| Runtime head sync during client-side navigation | `src/utils/seo.ts` |
| Crawl rules | `public/robots.txt` (static) |
| Hosting redirects, 404 handling and security headers (production) | `staticwebapp.config.json` |
| The same behaviour for the Express server (`npm start`) | `server.ts` |
| Post-build validator | `scripts/validateSeo.ts` |

Structured data must describe only content that is visible on the page: the FAQ accordion, the free pricing tier and the published contact emails. Do not add reviews, ratings or claims that the page does not show.

## Adding a new public page

1. Add a `PageSeo` entry (path, title, description) in `src/config/site.ts`. Give it a unique title and description.
2. Add it to `SITEMAP_PAGES` in `scripts/seoPlugin.ts`.
3. Generate its HTML file in the plugin's `writeBundle` hook, as `privacy.html` is.
4. Handle the route in `src/App.tsx` and `src/utils/seo.ts`.
5. Link to it with a real `<a href="/new-page">`.
6. Run `npm run build && npm run seo:check`.

## Redirects and URL normalisation

The table shows what Azure Static Web Apps (`trailingSlash: "never"`) and the Express server do with URL variants.

| Request | Result |
| --- | --- |
| `/privacy/` | 301 → `/privacy` |
| `/privacy.html`, `/index.html`, `/index` | 301 → `/privacy`, `/` (SWA: `/index.html` → `/index` → `/`) |
| `/anything-else` | 404 with `404.html` |
| `/api/*` on the static host | 404 |

Query strings are preserved on these redirects.

The platform handles these redirects, outside the repository:

- **HTTP → HTTPS**: Azure Static Web Apps.
- **Apex → www**: Azure Static Web Apps, with `www` as the default domain.

With Cloudflare in DNS-only mode, `http://investirelandai.ie/` takes **two hops**: first to `https://investirelandai.ie/`, then to `https://www.investirelandai.ie/`. Google follows both hops, so this is acceptable. To make it a single hop:

1. Proxy the apex record through Cloudflare (orange cloud).
2. Add a Single Redirect rule: hostname `investirelandai.ie` → `https://www.investirelandai.ie${uri}`, status 301, preserving the query string.

## Validating locally

```bash
npm run check        # lint + tests + build + seo:check
npm run seo:check    # validate an existing dist/ only
```

`seo:check` fails the build if any of these is true:

- A page is missing its title or description, or a title or description is duplicated.
- A canonical is missing or wrong.
- A public page is `noindex`.
- `og:url` does not match the canonical.
- JSON-LD is invalid, or uses an off-origin URL.
- The sitemap lists the wrong URLs, or contains `lastmod`, `changefreq` or `priority`.
- robots.txt blocks public pages or does not reference the sitemap.
- `404.html` is not `noindex`.
- An internal link is broken, or a `#` placeholder link is present.

CI (`.github/workflows/ci.yml`) runs the same check.

## Post-deployment checklist

1. **Check the redirect variants.** Each of these should end at `https://www.investirelandai.ie/` with a 301 and a final 200:
   - `http://investirelandai.ie/`
   - `https://investirelandai.ie/`
   - `http://www.investirelandai.ie/`

   ```bash
   curl -sIL http://investirelandai.ie/ | grep -iE "^(HTTP|location)"
   ```
2. **Check the status codes.**
   - `/` and `/privacy` → 200.
   - `/privacy/` → 301.
   - `/does-not-exist` → 404.
3. **Check robots.txt and the sitemap.** `/robots.txt` and `/sitemap.xml` should return 200 with the expected content.
4. **Check the page source** (view-source) of `/` and `/privacy`. It should have:
   - the correct `<title>` and description;
   - a self-referencing canonical;
   - `index, follow`.
5. **In Google Search Console:**
   - Use the property `https://www.investirelandai.ie/`, or a Domain property.
   - Submit `https://www.investirelandai.ie/sitemap.xml` under *Sitemaps*.
   - Run *URL Inspection* on `/` and `/privacy`, then *Test live URL*. Confirm "URL is available to Google" and that the canonical Google selected matches the one you declared.
   - Click *Request indexing* for both URLs.
6. **Optional: Bing Webmaster Tools.** Import the site from Search Console and submit the same sitemap.

"Crawled - currently not indexed" is a quality and priority decision by Google. Technical fixes remove the blockers, but indexing can still take days to weeks. Original, useful content and genuine external links speed it up.
