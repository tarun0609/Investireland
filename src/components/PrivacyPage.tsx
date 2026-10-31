import React, { useEffect } from 'react';
import { ArrowLeft, Cookie, Database, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { CONTACT_EMAILS } from '../config/contact';

interface PrivacyPageProps {
  onBack: () => void;
}

const LAST_UPDATED = '1 November 2026';

const storageRows: { name: string; where: string; purpose: string; when: string }[] = [
  {
    name: 'Firebase Authentication session',
    where: 'Browser IndexedDB',
    purpose: 'Keeps you signed in after you choose to log in (email/password or Google).',
    when: 'Only after you sign in',
  },
  {
    name: 'investireland_* keys',
    where: 'Browser localStorage',
    purpose: 'Saves the holdings, contributions, goals, dividends and display name you enter as a guest so they are still there next visit.',
    when: 'Only when you use the dashboard',
  },
  {
    name: 'Google sign-in pop-up',
    where: 'accounts.google.com',
    purpose: 'Google sets its own cookies inside its sign-in window, under Google’s privacy policy.',
    when: 'Only if you click “Continue with Google”',
  },
];

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex cursor-pointer items-center gap-1.5 rounded-lg text-sm font-semibold text-emerald-700 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to website
      </button>

      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Privacy &amp; Cookies</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated {LAST_UPDATED}</p>

      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-relaxed text-emerald-900">
        <p className="flex items-start gap-2 font-semibold">
          <Cookie className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          No advertising, analytics or tracking cookies.
        </p>
        <p className="mt-1">
          We only store what is strictly necessary for features you ask to use, so we don’t show a cookie consent banner. If we ever add
          optional cookies, we will ask for your consent first and give you an equally easy way to refuse.
        </p>
      </div>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" /> Who we are
        </h2>
        <p>
          InvestIreland AI is an independent personal project providing general financial education for people living in Ireland. It has a
          free plan and optional paid plans (Pro and Family). It is not regulated by the Central Bank of Ireland and does not give financial
          advice.
        </p>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Database className="h-5 w-5 text-emerald-600" aria-hidden="true" /> What we collect and why
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account details</strong> (name, email, sign-in method), only if you create an account, so you can sign in and save your
            data (legal basis: contract).
          </li>
          <li>
            <strong>Early-access answers</strong> (country, goal) and email, only if you request early access, to send you product updates you
            asked for (legal basis: consent, which you can withdraw at any time).
          </li>
          <li>
            <strong>Portfolio figures you type in or import</strong> (holdings, contributions, goals). Guests’ data stays in their own browser.
            Signed-in users’ data is stored in Google Firebase and can only be read by that account. CSV files and CAS PDF statements you import are read in your
            browser and are never uploaded; only the holdings you confirm are saved. The password of a protected statement (for NSDL/CDSL, your
            PAN) is used only to open the file on your device and is never stored or sent anywhere.
          </li>
          <li>
            <strong>Plan and billing details</strong> (your plan, renewal date, any promo code you redeemed, and your Stripe customer and
            subscription IDs) if you choose a paid plan or redeem a code, to provide the features you paid for (legal basis: contract). Card
            details are entered on Stripe&rsquo;s own checkout page and never reach us. We keep payment records as long as tax law requires.
          </li>
          <li>
            <strong>Family household sharing</strong>: on the Family plan, the two adults in a household can each view (but not change) the
            other&rsquo;s holdings. Sharing starts only when the invited person accepts and stops as soon as either of you leaves the household or
            the plan ends.
          </li>
          <li>
            <strong>Email preferences</strong>: we send account and billing emails when needed. Product news is sent only if you haven&rsquo;t
            opted out; every such email has an unsubscribe link, and you can switch it off any time in Plan &amp; billing.
          </li>
          <li>
            <strong>Help chat and AI assistant questions</strong>: answers from our help articles are worked out in your browser and nothing is
            sent. If AI answers are switched on, your question, the last few messages of the conversation (and, for the portfolio assistant,
            a short summary of your figures) are sent through our API to Google&rsquo;s Gemini service to write a reply. We don&rsquo;t keep chat
            messages; they disappear when you close or reload the page. Please don&rsquo;t include passwords, PAN, card or other personal
            details (legal basis: legitimate interests in answering your question).
          </li>
          <li>
            <strong>Technical logs</strong> (IP address, browser, time) kept briefly by our hosting and DNS providers to deliver and protect the
            site (legal basis: legitimate interests).
          </li>
        </ul>
        <p>We never sell your data and never use it for advertising.</p>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-bold text-slate-900">Service providers</h2>
        <p>
          Google Firebase (authentication and database), Microsoft Azure Static Web Apps (hosting), Cloudflare (DNS, and Cloudflare Workers
          for our billing, account and chat API at api.investirelandai.ie), Stripe (payments, only if you choose a paid plan), Google Gemini (AI
          chat answers, only when AI answers are switched on), Brevo (sending account
          and product emails) and Gmail (account emails). Some may process data outside the EEA under the EU Standard Contractual Clauses or the EU–US Data Privacy Framework. Fonts are
          served from our own site, so no data is sent to Google Fonts.
        </p>
        <p>
          To show current exchange rates, your browser downloads the euro reference rates directly from the European Central Bank
          (data-api.ecb.europa.eu) at most every few hours. No portfolio data is sent; like any website, the ECB receives your IP address and
          browser details under its own privacy statement.
        </p>
        <p>
          If you hold Indian mutual funds or ETFs, your browser looks up their latest published prices (NAV) from mfapi.in, a free public
          service, at most once a day. Only the fund names are sent, never your units, values or account details; mfapi.in also receives your
          IP address and browser details.
        </p>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Cookie className="h-5 w-5 text-emerald-600" aria-hidden="true" /> Cookies and browser storage
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">What</th>
                <th scope="col" className="px-3 py-2 font-semibold">Where</th>
                <th scope="col" className="px-3 py-2 font-semibold">Purpose</th>
                <th scope="col" className="px-3 py-2 font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {storageRows.map((row) => (
                <tr key={row.name}>
                  <td className="px-3 py-2 font-semibold text-slate-800">{row.name}</td>
                  <td className="px-3 py-2">{row.where}</td>
                  <td className="px-3 py-2">{row.purpose}</td>
                  <td className="px-3 py-2">{row.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          All of these are strictly necessary for a feature you requested, so under the ePrivacy rules (S.I. No. 336 of 2011) they do not need
          consent. You can remove them at any time by signing out and clearing this site’s data in your browser settings.
        </p>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Trash2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> Your rights
        </h2>
        <p>
          Under the GDPR you can ask to access, correct, export or delete your data, object to processing, or withdraw consent. We keep account
          data until you ask us to delete it, and early-access emails until you unsubscribe.
        </p>
        <p className="flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>
            To make a request, email{' '}
            <a href={`mailto:${CONTACT_EMAILS.support}?subject=Data%20protection%20request`} className="font-semibold text-emerald-700 underline hover:text-emerald-900">
              {CONTACT_EMAILS.support}
            </a>{' '}
            from the address linked to your account. We reply within one month. You can also complain to the Data Protection
            Commission at{' '}
            <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline hover:text-emerald-900">
              dataprotection.ie
            </a>
            .
          </span>
        </p>
      </section>
    </main>
  );
};
