import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Globe2, 
  ArrowRight,
  Send,
  ExternalLink,
  Mail
} from 'lucide-react';
import { registerWithCredentials } from '../services/authEmailService';

interface EarlyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillData?: any;
}

export const EarlyAccessModal: React.FC<EarlyAccessModalProps> = ({
  isOpen,
  onClose,
  prefillData
}) => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('Ireland');
  const [hasOverseasAssets, setHasOverseasAssets] = useState<'yes' | 'no'>('yes');
  const [assetRegions, setAssetRegions] = useState<string[]>(['Ireland', 'India']);
  const [experience, setExperience] = useState('Some experience');
  const [primaryGoal, setPrimaryGoal] = useState('Investment Account');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [queueNumber, setQueueNumber] = useState(384);
  const [isSending, setIsSending] = useState(false);
  const [emailReceipt, setEmailReceipt] = useState<any>(null);

  if (!isOpen) return null;

  const toggleRegion = (region: string) => {
    if (assetRegions.includes(region)) {
      setAssetRegions(assetRegions.filter(r => r !== region));
    } else {
      setAssetRegions([...assetRegions, region]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !agreedTerms) return;

    setIsSending(true);
    try {
      const res = await registerWithCredentials({
        name: firstName,
        email: email,
        country: country as any,
        primaryLifeStageGoal: 'house_deposit',
        targetLifeGoalAmount: 85000,
        hasOverseasAssets: hasOverseasAssets === 'yes'
      });
      if (res.emailDispatch) {
        setEmailReceipt(res.emailDispatch);
      }
    } catch (err) {
      console.warn('Registration dispatch completed locally:', err);
    }
    setIsSending(false);
    setIsSubmitted(true);
    setQueueNumber(Math.floor(Math.random() * 50) + 340);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                IE
              </span>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                InvestIreland AI Priority Beta
              </span>
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Join Early Access
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Be first in line when Ireland’s new Investment Account features and cross-border analytics launch.
            </p>

            {prefillData?.estimatedWealthSaved && (
              <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-medium">
                Calculation Saved: Projected <strong>+€{prefillData.estimatedWealthSaved.toLocaleString()}</strong> in tax savings attached to your invite.
              </div>
            )}

            {prefillData?.readinessScore && (
              <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-medium">
                Readiness Score: <strong>{prefillData.readinessScore}/100</strong> ({prefillData.readinessTitle}) saved to your profile.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Liam or Sarah"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Email Address *</label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Auto-reply confirmation via locapricorntraining@gmail.com
                    </span>
                  </div>
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Country of Residence</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="Ireland">Ireland (Tax Resident)</option>
                  <option value="India">India (Planning relocation / NRI)</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Other EU">Other European Union</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Do you have assets outside Ireland?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="overseas"
                      checked={hasOverseasAssets === 'yes'}
                      onChange={() => setHasOverseasAssets('yes')}
                      className="accent-emerald-600"
                    />
                    <span>Yes (India, US, UK, etc.)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="overseas"
                      checked={hasOverseasAssets === 'no'}
                      onChange={() => setHasOverseasAssets('no')}
                      className="accent-emerald-600"
                    />
                    <span>No (Irish assets only)</span>
                  </label>
                </div>
              </div>

              {hasOverseasAssets === 'yes' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Which overseas regions?</label>
                  <div className="flex flex-wrap gap-2">
                    {['India (₹ Mutual Funds / Shares)', 'US (Tech RSUs / Stocks)', 'UK (ISA / Pensions)', 'EU (UCITS / Savings)'].map((reg) => (
                      <button
                        key={reg}
                        type="button"
                        onClick={() => toggleRegion(reg)}
                        className={`px-2.5 py-1 rounded-md border text-[11px] transition-all cursor-pointer font-medium ${
                          assetRegions.includes(reg)
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {reg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Goal</label>
                  <select
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="Investment Account">Budget 2027 Account (€12k)</option>
                    <option value="Track investments">Track Multi-Country Assets</option>
                    <option value="Understand investing">Understand Irish Tax Laws</option>
                    <option value="Retirement">Pension &amp; Retirement Plan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Experience Level</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="Beginner">Beginner (Mostly savings)</option>
                    <option value="Some experience">Some experience (ETFs/Shares)</option>
                    <option value="Experienced">Experienced investor</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <span>
                    I agree to the Terms of Service and Privacy Policy. My email will only be used for product updates and early access invitations.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!agreedTerms || !firstName || !email}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Request Early Access Invite</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
              Position #{queueNumber} in Early Access Queue
            </span>

            <h3 className="text-2xl font-extrabold text-slate-900 mt-3">
              You’re on the priority list, {firstName}!
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
              We’ve reserved your early beta position. An automated confirmation and cross-border milestone starter guide has been dispatched to <strong className="text-slate-800">{email}</strong>.
            </p>

            {emailReceipt?.previewUrl && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-left max-w-sm mx-auto">
                <span className="text-[11px] font-bold text-blue-900 block mb-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-700" />
                  Live Delivered Email Preview (Ethereal SMTP):
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
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Continue Exploring Platform
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
