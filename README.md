# InvestIreland AI

A personal-finance planning web app for people living in Ireland, including those with Indian and US assets. It includes:

- a portfolio X-ray
- a budget calculator
- a cross-border tax estimator
- goal milestones
- a dividend tracker
- an AI assistant

> **Not financial or tax advice.** Calculations are estimates built on stated assumptions and a curated reference dataset. Market figures are illustrative sample data, not a live feed.

## Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS 4, Recharts, jsPDF (lazy-loaded)
- **Backend:** Express 4 (`server.ts` → `server/`), served with `tsx`. Uses helmet, express-rate-limit, the Firebase Admin SDK (ID-token verification), Nodemailer and Gemini.
- **Data:** Firebase Auth and Cloud Firestore, accessed directly from the browser and guarded by `firestore.rules`. Signed-out (guest) data is kept in `localStorage` only.
- **Optional:** Cloud Functions in `functions/` for a welcome email on user creation.

## Getting started

Requires Node.js 20.19 or later.

```bash
npm install
cp .env.example .env   # optional, every variable has a safe default
npm run dev            # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Express and Vite dev server with HMR |
| `npm run lint` | TypeScript type check |
| `npm test` | Vitest unit and API tests |
| `npm run build` | Production client build into `dist/` |
| `npm start` | Serve the API and `dist/` (set `NODE_ENV=production`) |
| `npm run check` | Lint, test and build: the same checks CI runs |

> **Lockfile:** `package-lock.json` / `bun.lock` predate the security-hardening dependencies (`helmet`, `express-rate-limit`, `vitest`). Run `npm install` against the public npm registry and commit the regenerated `package-lock.json`, then switch CI to `npm ci`.

## Firebase setup

1. In the Firebase console, enable the **Email/Password** and **Google** sign-in providers.
2. Add your production domain to **Authentication → Settings → Authorized domains**.
3. Deploy the security rules: `firebase deploy --only firestore:rules`. `firebase.json` targets the `(default)` Firestore database and `.firebaserc` selects the project.
4. `firebase-applet-config.json` holds the *public* web config. It is safe to ship; access control is enforced by Auth and `firestore.rules`.
5. Restrict the browser API key in Google Cloud Console (HTTP referrers and the APIs it can call), and consider enabling **App Check**.

### Production domain (investirelandai.ie)

1. Deploy the Node server (`npm run build`, then `NODE_ENV=production npm start`) to any host that runs Node 20+, such as Cloud Run, Render, Railway or Fly.io. Set the same variables as `.env` in the host's secret settings and use `APP_URL="https://investirelandai.ie"`.
2. Point the domain's DNS at the host. Follow the host's custom-domain instructions, which usually means an `A` record for `investirelandai.ie` and a `CNAME` for `www`. Serve the site over HTTPS only.
3. In Firebase, go to **Authentication → Settings → Authorized domains** and add `investirelandai.ie` and `www.investirelandai.ie`.
4. Restrict the browser API key to `https://investirelandai.ie/*`, `https://www.investirelandai.ie/*` and `http://localhost:3000/*`.

### Welcome emails: deploy only one mechanism

Two welcome-email paths exist. Use only one, or users will receive duplicates:

- **API (default):** the client calls `POST /api/emails/welcome` after registration. It is limited to one email per account for each server process.
- **Cloud Function:** `functions/index.ts` sends on Firestore user-document creation. It is idempotent through the `welcomeEmailSent` flag. If you deploy it, remove the `sendWelcomeEmail` call in `src/services/authEmailService.ts`.

Deploy the function with `cd functions && npm install && npm run deploy`. The build first copies the shared email template into `functions/shared/`.

## Security model

- **Authentication:** Firebase Auth. Passwords have a minimum length of 8 and are never handled by our server.
- **Authorization:**
  - Every user-scoped API route (`/api/emails/*`) requires a Firebase ID token (`Authorization: Bearer …`) verified with the Admin SDK.
  - Recipient addresses come from the verified token, never from the request body.
  - Milestone emails require a verified email address.
- **Firestore rules:**
  - Default deny; owner-only access.
  - Schema and size validation on every document.
  - The profile email must match the token email.
  - Email audit records and server-managed fields cannot be written by clients.
- **Hardening:**
  - helmet, with a strict CSP in production
  - 32 KB JSON body limit
  - per-IP rate limit for AI chat, and per-user limit for emails
  - generic error responses with no stack traces
  - all user values in email HTML are escaped and subjects are stripped of CR/LF
- **AI:** Gemini is used only for signed-in users, unless `ALLOW_ANONYMOUS_AI=true`. Responses are labelled with their mode: `MODEL`, `LOCAL_FALLBACK` or `OFFLINE`.
- **Secrets:** `.env*` files are git-ignored. `data/` (formerly plaintext user and email JSON) is no longer used or tracked.

### Known limitations

- The email log (`GET /api/emails`) and the one-welcome-email guard are **in memory**. They reset on restart and are not shared between instances. Persist them, for example to Firestore through the Admin SDK, before you scale out.
- Rate limits are also in memory per instance. Use a shared store such as Redis behind a load balancer.
- Tax calculations simplify several rules: deemed disposal is applied to the whole holding every 8 years, and deposit interest is treated as CGT rather than DIRT. Each result lists its assumptions.
- Fiscal reference data and FX fallbacks are curated by hand. Review `FISCAL_DATA_LAST_REVIEWED` in `src/services/fiscalDataService.ts` and `server/fiscalData.ts` regularly.

## Project layout

```
server.ts            # entry point: config, Vite middleware (dev) / static dist (prod)
server/              # createApp, auth middleware, mailer, email template, AI, fiscal data (+ tests)
src/                 # React app
  services/          # API client, auth, Firestore persistence, calculators (+ tests)
  components/        # UI
functions/           # optional Firebase Cloud Functions
firestore.rules      # Firestore security rules
```
