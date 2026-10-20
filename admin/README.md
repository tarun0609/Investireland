# InvestIreland AI — Admin dashboard

A separate, admin-only Vite + React app (customers, plan grants, promo codes, email campaigns).
It talks to the API Worker's `/admin/*` endpoints; every request carries the signed-in admin's
Firebase ID token and the Worker checks the uid against `ADMIN_UIDS`.

## Local development

```bash
# repo-root .env
VITE_API_URL=http://127.0.0.1:8787   # or your deployed API / workers.dev URL

npx vite --config admin/vite.config.ts   # dev server
npm run build:admin                       # production build → admin/dist
```

The Firebase web config is read from `firebase-applet-config.json` (same as the main site), so no
`VITE_FIREBASE_*` variables are needed.

## Deploy to Cloudflare Pages (free)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.
2. Build settings:
   - Build command: `npm ci && npm run build:admin`
   - Build output directory: `admin/dist`
   - Environment variable: `VITE_API_URL` = your API base URL (e.g. `https://api.investirelandai.ie`)
   - (Optional) `NODE_VERSION` = `22`
3. Deploy. You get a URL like `https://investireland-admin.pages.dev`.
4. Firebase console → **Authentication → Settings → Authorized domains** → add the Pages domain
   (needed for Google sign-in popups).
5. API Worker settings (variables/secrets):
   - `ADMIN_ORIGIN` = the Pages URL (exact origin, no trailing slash) — used for CORS.
   - `ADMIN_UIDS` = your Firebase uid (Firebase console → Authentication → Users → *User UID*);
     comma-separate several.
6. Optional extra wall: **Cloudflare Zero Trust → Access → Applications → Self-hosted**, protect the
   Pages domain with a one-time-PIN email policy for your address (free for up to 50 users).

`public/_headers` sets `noindex`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` and other
security headers; `robots.txt` disallows all crawling. The referrer policy sends only the origin to
other sites, which lets a Firebase API key restricted by HTTP referrer work: add
`https://investireland-admin.pages.dev/*` to the key's allowed referrers in Google Cloud.
