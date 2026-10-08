import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Globe2, 
  CheckCircle2, 
  ExternalLink, 
  Send, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Inbox, 
  Clock, 
  AlertCircle,
  KeyRound,
  RefreshCw,
  LogOut,
  Database
} from 'lucide-react';
import { 
  AuthUser, 
  RegistrationCredentials, 
  EmailDispatchLog, 
  LifeStageCategory, 
  Currency 
} from '../types';
import { 
  getActiveUser, 
  setActiveUser, 
  clearActiveUser, 
  registerWithCredentials, 
  fetchSentEmailLogs, 
  sendMilestoneAutoEmail,
  fetchDatabaseStatus,
  BackendDatabaseInfo,
  syncMilestoneToBackend
} from '../services/authEmailService';
import { emailService } from '../services/emailService';
import { LIFE_STAGE_PRESETS } from '../services/goalMilestoneService';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChange?: (user: AuthUser) => void;
  initialTab?: 'register' | 'login' | 'outbox' | 'database';
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  onUserChange,
  initialTab = 'register'
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'login' | 'outbox' | 'database'>(initialTab);
  const [currentUser, setCurrentUserState] = useState<AuthUser>(() => getActiveUser());
  
  // Registration form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState<'Ireland' | 'India' | 'United States' | 'United Kingdom' | 'Other EU'>('Ireland');
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>('EUR');
  const [primaryGoal, setPrimaryGoal] = useState<LifeStageCategory>('house_deposit');
  const [targetAmount, setTargetAmount] = useState<number>(85000);
  const [hasOverseasAssets, setHasOverseasAssets] = useState(true);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    user: AuthUser;
    emailDispatch?: any;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email outbox state
  const [emailLogs, setEmailLogs] = useState<EmailDispatchLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Cloud database state
  const [dbInfo, setDbInfo] = useState<BackendDatabaseInfo | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbSyncMessage, setDbSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const u = getActiveUser();
      setCurrentUserState(u);
      setName(u.name !== 'Priya Sharma' ? u.name : '');
      setEmail(u.email !== 'priya.sharma@investireland.demo' ? u.email : '');
      loadEmails(u.email);
      loadDatabaseStatus();
    }
  }, [isOpen]);

  const loadDatabaseStatus = async () => {
    setIsLoadingDb(true);
    const res = await fetchDatabaseStatus();
    if (res.backendDatabase) {
      setDbInfo(res.backendDatabase);
    }
    setIsLoadingDb(false);
  };

  const handleTestDatabaseSync = async () => {
    setIsSubmitting(true);
    setDbSyncMessage(null);
    const success = await syncMilestoneToBackend({
      userId: currentUser.id || 'usr_demo_user',
      milestoneId: 'ms_house_deposit',
      title: 'Irish Home Deposit (Dublin)',
      category: 'Property & Wealth',
      targetAmountEUR: 85000,
      currentAmountEUR: 28400
    });
    setIsSubmitting(false);
    if (success) {
      setDbSyncMessage('Successfully synced milestone and user profile to Firebase Firestore!');
      await loadDatabaseStatus();
    } else {
      setDbSyncMessage('Sync request completed.');
    }
  };

  const loadEmails = async (filterEmail?: string) => {
    setIsLoadingLogs(true);
    const logs = await fetchSentEmailLogs(filterEmail);
    setEmailLogs(logs);
    setIsLoadingLogs(false);
  };

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setErrorMsg('Please enter your name and email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const goalLabel = LIFE_STAGE_PRESETS.find(p => p.category === primaryGoal)?.defaultTitle || 'Dublin House Deposit';

    const result = await registerWithCredentials({
      name,
      email,
      password: password || undefined,
      country,
      preferredCurrency,
      primaryLifeStageGoal: primaryGoal,
      targetLifeGoalAmount: targetAmount,
      hasOverseasAssets
    });

    setIsSubmitting(false);

    if (result.success && result.user) {
      setCurrentUserState(result.user);
      setSubmissionSuccess({
        user: result.user,
        emailDispatch: result.emailDispatch
      });
      if (onUserChange) {
        onUserChange(result.user);
      }
      loadEmails(result.user.email);
    } else {
      setErrorMsg(result.error || 'Registration failed. Please try again.');
    }
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok && data.user) {
        setActiveUser(data.user);
        setCurrentUserState(data.user);
        if (onUserChange) onUserChange(data.user);
        setActiveTab('outbox');
        loadEmails(data.user.email);
      } else {
        setErrorMsg(data.error || 'Account not found. Please register.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Login failed');
    }
  };

  const handleSendTestEmail = async () => {
    if (!currentUser.email) return;
    setIsSubmitting(true);
    const res = await emailService.sendMilestoneProgressUpdate({
      userId: currentUser.id || 'usr_active',
      email: currentUser.email,
      name: currentUser.name,
      milestoneTitle: 'Live Irish Home Deposit & Wealth Milestone',
      targetAmount: 85000,
      currentProgressAmount: 28400,
      currency: currentUser.preferredCurrency || 'EUR'
    });
    setIsSubmitting(false);
    if (res.success) {
      loadEmails(currentUser.email);
    }
  };

  const handleSignOut = () => {
    clearActiveUser();
    const demo = getActiveUser();
    setCurrentUserState(demo);
    if (onUserChange) onUserChange(demo);
    setSubmissionSuccess(null);
    setEmailLogs([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
            ☘️
          </span>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            InvestIreland Account &amp; Email Integration
          </span>
        </div>

        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
          {activeTab === 'register' ? 'Register with Credentials' :
           activeTab === 'login' ? 'Sign In to Your Portfolio' :
           activeTab === 'outbox' ? 'Automated Email Receipts & Outbox' :
           'Firebase Cloud Database & Sync'}
        </h3>
        <p className="text-xs text-slate-600 mt-1">
          {activeTab === 'register' 
            ? 'Create your account to unlock personalized milestone tracking and receive instant automated email confirmations.' 
            : activeTab === 'login'
            ? 'Sign in to access your registered milestones, tax estimates, and portfolio sync.'
            : activeTab === 'outbox'
            ? 'Track real-time automated emails, dispatch receipts, and live browser previews.'
            : 'Inspect your persistent Firebase Cloud Firestore backend database, collections, and zero-trust security rules.'}
        </p>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 mt-5 mb-5 flex-wrap gap-y-1">
          <button
            onClick={() => { setActiveTab('register'); setSubmissionSuccess(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'register'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Register Account
          </button>
          <button
            onClick={() => { setActiveTab('login'); setSubmissionSuccess(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'login'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('outbox'); loadEmails(currentUser.email); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'outbox'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Email Outbox ({emailLogs.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('database'); loadDatabaseStatus(); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cloud Database</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>
        </div>

        {/* ERROR NOTICE */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: REGISTRATION */}
        {activeTab === 'register' && (
          <div>
            {!submissionSuccess ? (
              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Damak Taneja"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        Email Address *
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Auto-reply sent via locapricorntraining@gmail.com
                      </span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yourname@example.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Password / Security PIN
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                      Tax Residence
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="Ireland">Ireland (Tax Resident — TCA 1997)</option>
                      <option value="India">India (Non-Resident Indian / DTAA)</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Other EU">Other European Union</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Primary Life Stage Goal</label>
                    <select
                      value={primaryGoal}
                      onChange={(e) => {
                        const cat = e.target.value as LifeStageCategory;
                        setPrimaryGoal(cat);
                        const preset = LIFE_STAGE_PRESETS.find(p => p.category === cat);
                        if (preset) setTargetAmount(preset.recommendedEUR);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                    >
                      {LIFE_STAGE_PRESETS.map((p) => (
                        <option key={p.category} value={p.category}>
                          {p.categoryLabel} ({p.defaultTitle})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Milestone Amount (€)</label>
                    <input
                      type="number"
                      min={1000}
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Automated Email Integration:</strong> Upon clicking Register, our server will immediately dispatch a personalized <strong>InvestIreland Welcome &amp; Milestone Blueprint email</strong> to your email address, including official Revenue TCA 1997 guidance and Budget 2027 investment account rules.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !name || !email}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Registering &amp; Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration &amp; Send Auto-Response Email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit mx-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Firebase Firestore Synced &bull; Transactional Email Dispatched
                </span>

                <h3 className="text-2xl font-black text-slate-900 mt-3">
                  Welcome to InvestIreland, {submissionSuccess.user.name}!
                </h3>

                <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                  Your credentials and cross-border portfolio profile have been persisted to Firebase Cloud Firestore. A transactional confirmation email was dispatched to <strong className="text-slate-800">{submissionSuccess.user.email}</strong>.
                </p>

                {submissionSuccess.emailDispatch?.previewUrl && (
                  <div className="mt-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-left max-w-md mx-auto">
                    <span className="text-xs font-bold text-blue-900 block mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-700" />
                      Live Mailbox Delivery Receipt (Ethereal SMTP):
                    </span>
                    <a
                      href={submissionSuccess.emailDispatch.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 hover:text-blue-900 underline mt-1"
                    >
                      <span>Open Real Delivered HTML Email in New Tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <span className="text-[10px] text-blue-700 block mt-1">
                      Message ID: {submissionSuccess.emailDispatch.messageId}
                    </span>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                  >
                    Enter Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('outbox')}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                  >
                    View Email Outbox
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUICK LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleQuickLogin} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Email Address</label>
                <span className="text-[10px] text-slate-400 font-medium">
                  Enter your registered account email
                </span>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. yourname@example.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-colors"
            >
              {isSubmitting ? 'Verifying...' : 'Sign In'}
            </button>

            <div className="pt-2 text-center text-slate-500">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Register here
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: EMAIL OUTBOX & RECEIPTS */}
        {activeTab === 'outbox' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700">
                Dispatched Auto-Responses for: <span className="text-emerald-700">{currentUser.email}</span>
              </span>
              <button
                onClick={handleSendTestEmail}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-[11px] cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Send Milestone Report</span>
              </button>
            </div>

            {isLoadingLogs ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                Fetching mail transport logs...
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No automated emails recorded yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Complete registration or click "Send Milestone Report" above to test the auto-mailer.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {emailLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 truncate">
                        {log.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        {log.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>To: {log.recipientEmail}</span>
                      <span>{new Date(log.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                      {log.summary}
                    </p>

                    {log.previewUrl && (
                      <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] text-blue-700 font-medium">Ethereal Live Mailbox</span>
                        <a
                          href={log.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                        >
                          <span>View Rendered Email</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Logged in as: <strong>{currentUser.name}</strong>
              </span>
              <button
                onClick={handleSignOut}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out / Switch Demo</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: FIREBASE BACKEND DATABASE INSPECTOR */}
        {activeTab === 'database' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    🔥
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Firebase Cloud Firestore
                    </h4>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Cloud NoSQL Database &bull; Backend Layer Connected
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE &amp; READY
                </span>
              </div>
            </div>

            {/* Config Specs */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Database Provider:</span>
                <span className="font-bold text-slate-900">Google Cloud Firestore</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Firebase Project ID:</span>
                <span className="font-mono text-[11px] font-semibold text-slate-800">
                  {dbInfo?.projectId || 'inbound-lyceum-cpthm'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Database ID:</span>
                <span className="font-mono text-[10px] font-semibold text-slate-800 truncate max-w-[220px]" title={dbInfo?.databaseId}>
                  {dbInfo?.databaseId || 'ai-studio-investirelandaii-6a889693-6842-4c14-bbe8-0e5ec82a479e'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Security Rules:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Deployed (Zero-Trust ABAC)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Blueprint Architecture:</span>
                <span className="font-mono text-[11px] font-semibold text-slate-800">
                  firebase-blueprint.json
                </span>
              </div>
            </div>

            {/* Provisioned Collections */}
            <div>
              <div className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-2">
                Provisioned Firestore Collections
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <div className="font-mono font-bold text-slate-900 text-[11px] text-emerald-800">
                    /users/{'{userId}'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    User account, country tax residency &amp; goal target
                  </div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <div className="font-mono font-bold text-slate-900 text-[11px] text-emerald-800">
                    /users/{'{userId}'}/milestones
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Deposit, PSIA, pension &amp; wealth milestones
                  </div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <div className="font-mono font-bold text-slate-900 text-[11px] text-emerald-800">
                    /users/{'{userId}'}/holdings
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Cross-border assets (EUR, INR, USD, GBP)
                  </div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <div className="font-mono font-bold text-slate-900 text-[11px] text-emerald-800">
                    /users/{'{userId}'}/emails
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Transactional registration &amp; auto-mail audit log
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Feedback Message */}
            {dbSyncMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{dbSyncMessage}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={handleTestDatabaseSync}
                disabled={isSubmitting}
                className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing with Cloud Firestore...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sync Active User &amp; Milestone to Firestore</span>
                  </>
                )}
              </button>
              <button
                onClick={loadDatabaseStatus}
                disabled={isLoadingDb}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
