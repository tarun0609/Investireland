import React, { useEffect, useId, useRef, useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Loader2,
  Mail
} from 'lucide-react';
import type { LifeStageCategory } from '../types';
import { MIN_PASSWORD_LENGTH, getSignedInUser, registerWithCredentials, type ResidencyCountry } from '../services/authEmailService';
import { CHECKOUT_PLANS, PROMO_MONTHS, isCheckoutPlan, type CheckoutPlan } from '../config/plans';
import { setPendingPlan, setPendingPromo } from '../services/entitlementService';

type PlanChoice = 'free' | CheckoutPlan;
const PROMO_RE = /^[A-Z0-9-]{4,32}$/;

const initialPlanChoice = (prefill: any): PlanChoice => {
  if (isCheckoutPlan(prefill?.checkoutPlan)) return prefill.checkoutPlan;
  if (prefill?.plan === 'Pro') return 'pro_annual';
  if (prefill?.plan === 'Family') return 'family_annual';
  return 'free';
};

interface EarlyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillData?: any;
  billingEnabled?: boolean;
}

const GOAL_OPTIONS: { value: LifeStageCategory; label: string }[] = [
  { value: 'financial_independence', label: 'Long-term investing (e.g. the new Investment Account)' },
  { value: 'house_deposit', label: 'Saving for a home deposit' },
  { value: 'retirement', label: 'Pension & retirement' },
  { value: 'cross_border_repatriation', label: 'Managing assets across countries' },
  { value: 'family_education', label: 'Family & education' },
  { value: 'emergency_buffer', label: 'Building an emergency buffer' },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const EarlyAccessModal: React.FC<EarlyAccessModalProps> = ({
  isOpen,
  onClose: closeModal,
  prefillData,
  billingEnabled = false
}) => {
  const [planChoice, setPlanChoice] = useState<PlanChoice>('free');
  const [promoCode, setPromoCode] = useState('');
  const submittedRef = useRef(false);
  // A plan picked here but not signed up for must not trigger checkout on a later sign-in.
  const onClose = () => {
    if (!submittedRef.current) setPendingPlan(null);
    closeModal();
  };
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<ResidencyCountry>('Ireland');
  const [hasOverseasAssets, setHasOverseasAssets] = useState<'yes' | 'no'>('yes');
  const [primaryGoal, setPrimaryGoal] = useState<LifeStageCategory>('financial_independence');
  const [password, setPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailReceipt, setEmailReceipt] = useState<any>(null);
  const signedInUser = getSignedInUser();

  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const uid = useId();
  const titleId = `${uid}-title`;

  // Escape to close, focus trap, body scroll lock and focus restore while open.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setFormError(null);
    submittedRef.current = false;
    setPlanChoice(initialPlanChoice(prefillData));
    setPromoCode('');
    if (getSignedInUser()) setIsSubmitted(false);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const raf = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('input, select, button:not([data-close])')?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms || isSending) return;
    setFormError(null);
    if (!email.trim() || !firstName.trim()) {
      setFormError('Please enter your first name and email address.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    const promo = promoCode.trim().toUpperCase();
    if (billingEnabled && promo && !PROMO_RE.test(promo)) {
      setFormError('Promo codes use letters, numbers and dashes, e.g. EARLY-AB12CD34.');
      return;
    }

    // Saved first: the app runs these as soon as the new account signs in, which can happen before register returns.
    if (billingEnabled) {
      setPendingPromo(promo || null);
      setPendingPlan(!promo && planChoice !== 'free' ? planChoice : null);
    }
    setIsSending(true);
    try {
      const res = await registerWithCredentials({
        name: firstName,
        email,
        password,
        country,
        primaryLifeStageGoal: primaryGoal,
        hasOverseasAssets: hasOverseasAssets === 'yes'
      });
      if (!res.success) {
        setPendingPromo(null);
        setPendingPlan(null);
        setFormError(res.error || 'Registration failed. Please try again.');
        return;
      }
      submittedRef.current = true;
      setPassword('');
      setEmailReceipt(res.emailDispatch ?? null);
      setVerificationSent(Boolean(res.verificationEmailSent));
      setIsSubmitted(true);
    } catch {
      setPendingPromo(null);
      setPendingPlan(null);
      setFormError('We could not reach the sign-up service. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const labelClass = 'block font-bold text-slate-700 mb-1';
  const inputClass = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm';
  const planLabel = typeof prefillData?.plan === 'string' ? prefillData.plan : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        
        <button
          type="button"
          data-close
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {signedInUser && !isSubmitted ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 id={titleId} className="text-2xl font-extrabold text-slate-900">
              You already have early access
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
              You're signed in as <strong className="text-slate-800 break-all">{signedInUser.email}</strong>, so there's nothing else to sign up for. Open the App Dashboard to use the beta tools.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Continue exploring
            </button>
          </div>
        ) : !isSubmitted ? (
          <div>
            <div className="flex items-center gap-2 mb-2 pr-8">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                IE
              </span>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                InvestIreland AI Beta
              </span>
            </div>

            <h3 id={titleId} className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Join Early Access
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Create a free account to save your portfolio and goals, and hear about new features for Ireland’s proposed Investment Account and cross-border tracking.
            </p>

            {planLabel && !billingEnabled && (
              <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 font-medium">
                Plan you're interested in: <strong>{planLabel}</strong>. Everything is free during the beta and no payment details are needed.
              </div>
            )}

            {typeof prefillData?.estimatedWealthSaved === 'number' && prefillData.estimatedWealthSaved > 0 && (
              <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-medium">
                Your calculator scenario showed an illustrative <strong>€{Math.round(prefillData.estimatedWealthSaved).toLocaleString()}</strong> difference under the proposed account. This is an estimate, not a guarantee.
              </div>
            )}

            {typeof prefillData?.readinessScore === 'number' && (
              <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-medium">
                Your readiness quiz result: <strong>{prefillData.readinessScore}/100</strong>{prefillData.readinessTitle ? ` (${prefillData.readinessTitle})` : ''}.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs" noValidate={false}>
              {formError && (
                <div role="alert" className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${uid}-name`} className={labelClass}>First name *</label>
                  <input
                    id={`${uid}-name`}
                    type="text"
                    required
                    maxLength={120}
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Liam or Sarah"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`${uid}-email`} className={labelClass}>Email address *</label>
                  <input
                    id={`${uid}-email`}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    aria-describedby={`${uid}-email-hint`}
                    className={inputClass}
                  />
                  <p id={`${uid}-email-hint`} className="mt-1 text-[10px] text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>We'll send a verification link.</span>
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor={`${uid}-password`} className={labelClass}>Create a password *</label>
                <input
                  id={`${uid}-password`}
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={`${uid}-password-hint`}
                  className={inputClass}
                />
                <p id={`${uid}-password-hint`} className="mt-1 text-[10px] text-slate-500">At least {MIN_PASSWORD_LENGTH} characters.</p>
              </div>

              <div>
                <label htmlFor={`${uid}-country`} className={labelClass}>Country of residence</label>
                <select
                  id={`${uid}-country`}
                  autoComplete="country-name"
                  value={country}
                  onChange={(e) => setCountry(e.target.value as ResidencyCountry)}
                  className={inputClass}
                >
                  <option value="Ireland">Ireland</option>
                  <option value="India">India (planning to relocate / NRI)</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Other EU">Other EU country</option>
                </select>
              </div>

              <fieldset>
                <legend className={labelClass}>Do you have assets outside Ireland?</legend>
                <div className="flex flex-col min-[400px]:flex-row gap-2 min-[400px]:gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`${uid}-overseas`}
                      value="yes"
                      checked={hasOverseasAssets === 'yes'}
                      onChange={() => setHasOverseasAssets('yes')}
                      className="accent-emerald-600"
                    />
                    <span>Yes (India, US, UK, etc.)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`${uid}-overseas`}
                      value="no"
                      checked={hasOverseasAssets === 'no'}
                      onChange={() => setHasOverseasAssets('no')}
                      className="accent-emerald-600"
                    />
                    <span>No (Irish assets only)</span>
                  </label>
                </div>
              </fieldset>

              <div>
                <label htmlFor={`${uid}-goal`} className={labelClass}>Primary goal</label>
                <select
                  id={`${uid}-goal`}
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value as LifeStageCategory)}
                  className={inputClass}
                >
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>

              {billingEnabled && (
                <fieldset>
                  <legend className={labelClass}>Choose your plan</legend>
                  <div className="grid grid-cols-1 gap-2">
                    {(['free', 'pro_annual', 'pro_monthly', 'family_annual'] as PlanChoice[]).map((id) => (
                      <label
                        key={id}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 cursor-pointer ${planChoice === id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`${uid}-plan`}
                            value={id}
                            checked={planChoice === id}
                            onChange={() => setPlanChoice(id)}
                            className="accent-emerald-600"
                          />
                          <span className="font-semibold text-slate-800">{id === 'free' ? 'Free (Early User)' : CHECKOUT_PLANS[id].label}</span>
                        </span>
                        <span className="font-mono text-slate-600">{id === 'free' ? '€0' : CHECKOUT_PLANS[id].price}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {promoCode.trim()
                      ? `Your promo code unlocks Pro free for ${PROMO_MONTHS} months once your email is verified, so no payment is needed.`
                      : planChoice === 'free'
                        ? 'You can upgrade any time from Plan & billing in the dashboard.'
                        : 'After creating your account you\u2019ll go to Stripe\u2019s secure checkout. You can cancel any time.'}
                  </p>
                </fieldset>
              )}

              {billingEnabled && (
                <div>
                  <label htmlFor={`${uid}-promo`} className={labelClass}>Promo code (optional)</label>
                  <input
                    id={`${uid}-promo`}
                    type="text"
                    maxLength={32}
                    autoComplete="off"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="EARLY-XXXXXXXX"
                    className={`${inputClass} font-mono uppercase`}
                  />
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 leading-relaxed">
                  <input
                    type="checkbox"
                    required
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <span>
                    I agree that InvestIreland AI can store my name, email and the answers above in my account, and email me about my account and early-access updates. InvestIreland AI is an educational tool and does not give financial advice.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSending || !agreedTerms || !firstName.trim() || !email.trim() || password.length < MIN_PASSWORD_LENGTH}
                aria-busy={isSending}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSending ? 'Creating account…' : billingEnabled && planChoice !== 'free' && !promoCode.trim() ? 'Create account & continue to payment' : 'Create free account'}</span>
                {!isSending && <ArrowRight className="w-4 h-4" />}
              </button>

            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 id={titleId} className="text-2xl font-extrabold text-slate-900 mt-3">
              You’re in, {firstName.trim()}!
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
              {verificationSent
                ? <>Your account is ready. Please confirm your address using the verification link we sent to <strong className="text-slate-800 break-all">{email}</strong>.</>
                : <>Your account is ready. We couldn't send a verification email just now; you can resend it from the Account panel in the App Dashboard.</>}
            </p>

            {emailReceipt?.previewUrl && /^https?:\/\//.test(emailReceipt.previewUrl) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-left max-w-sm mx-auto">
                <span className="text-[11px] font-bold text-blue-900 mb-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-700" />
                  Test mailbox preview (development only):
                </span>
                <a
                  href={emailReceipt.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                >
                  <span>Open Sent Email in Browser</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Continue exploring
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
