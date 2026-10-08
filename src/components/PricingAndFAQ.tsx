import React, { useState } from 'react';
import { 
  Check, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Building2, 
  Users, 
  FileText
} from 'lucide-react';

export const PricingSection: React.FC<{ onOpenWaitlist: () => void }> = ({ onOpenWaitlist }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const plans = [
    {
      name: 'FREE',
      price: '€0',
      period: 'forever',
      description: 'Foundational financial literacy and basic Investment Account tracking.',
      features: [
        'Investment Account education & guides',
        'Basic FY26 vs FY27 calculator',
        'Basic personal financial dashboard',
        'Basic AI assistant questions (10/mo)',
        'Manual portfolio entry up to 5 holdings'
      ],
      popular: false,
      cta: 'Get Started Free'
    },
    {
      name: 'PRO',
      price: billingCycle === 'yearly' ? '€89' : '€9.99',
      period: billingCycle === 'yearly' ? '/year' : '/month',
      badge: billingCycle === 'yearly' ? 'Save 26%' : undefined,
      description: 'Comprehensive financial intelligence for professionals investing from Ireland.',
      features: [
        'Unlimited portfolio holdings (IE, IN, US, EU)',
        'Signature Financial X-Ray & deep diagnostics',
        'Advanced FY26 vs FY27 fiscal comparison model',
        'Unlimited AI assistant queries with official citations',
        'Cross-border India (₹) & US ($) asset intelligence',
        'Scenario planner & stress test simulations',
        'CSV portfolio import & automated mapping'
      ],
      popular: true,
      cta: 'Join Early Access'
    },
    {
      name: 'FAMILY',
      price: '€149',
      period: '/year',
      description: 'Designed for households managing dual cross-border portfolios.',
      features: [
        'Everything in Pro for two adult accounts',
        'Shared household dashboard & net worth',
        'Separate individual investment portfolios',
        'Combined household Financial X-Ray',
        'Joint contribution allowance tracking'
      ],
      popular: false,
      cta: 'Request Family Access'
    },
    {
      name: 'B2B INTELLIGENCE',
      price: 'Custom',
      period: 'enterprise',
      description: 'For Irish banks, investment platforms, employers, and fintechs.',
      features: [
        'InvestIreland Intelligence REST API',
        'Investment Account rules engine embed',
        'White-label financial literacy modules',
        'Enterprise employee financial wellbeing tool'
      ],
      popular: false,
      cta: 'Contact Advisory'
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Transparent Pricing
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Simple, honest plans for every investor.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            No commissions. No asset-under-management (AUM) fees. No hidden kickbacks.
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <span>Annual billing</span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                Save 26%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                p.popular
                  ? 'bg-slate-900 text-white border-slate-800 shadow-xl relative'
                  : 'bg-white text-slate-900 border-slate-200 shadow-xs'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`text-base font-bold ${p.popular ? 'text-white' : 'text-slate-900'}`}>
                    {p.name}
                  </h3>
                  {p.badge && (
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                      {p.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 my-3">
                  <span className={`text-3xl font-extrabold font-mono ${p.popular ? 'text-white' : 'text-slate-900'}`}>
                    {p.price}
                  </span>
                  <span className={`text-xs ${p.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                    {p.period}
                  </span>
                </div>

                <p className={`text-xs leading-relaxed mb-6 ${p.popular ? 'text-slate-300' : 'text-slate-600'}`}>
                  {p.description}
                </p>

                <ul className="space-y-2 border-t pt-4 text-xs border-slate-200/20">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${p.popular ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span className={p.popular ? 'text-slate-200' : 'text-slate-700'}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200/20">
                <button
                  onClick={onOpenWaitlist}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    p.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is InvestIreland AI?',
      a: 'InvestIreland AI is an educational and financial intelligence platform designed to help people in Ireland understand, organize, and monitor their investments across domestic and international accounts (Ireland, India, US, and EU).'
    },
    {
      q: 'Does InvestIreland AI manage my money or execute trades?',
      a: 'No. InvestIreland AI is strictly an educational, analytical, and portfolio tracking tool. We are not a broker, bank, investment manager, or custodian. We do not hold client funds or execute transactions.'
    },
    {
      q: 'Does InvestIreland AI provide regulated financial advice?',
      a: 'No. The product is designed exclusively for educational, factual, and analytical purposes. We do not offer personalised buy/sell advice or suitability assessments. You should always consult a Qualified Financial Adviser (QFA) or tax professional for personalised advice.'
    },
    {
      q: 'What is the new Investment Account announced in Budget 2027?',
      a: 'It is the newly announced Personal Savings & Investment Account framework. It introduces a €12,000 annual contribution allowance, a €50,000 tax-free growth ceiling, and a modest 1% annual fee on balances above €50,000, replacing Ireland’s 41% exit tax and deemed disposal within the scheme.'
    },
    {
      q: 'When does the new Investment Account open?',
      a: 'The announced commencement date is 1 July 2027, following legislative enactment in the Finance Bill.'
    },
    {
      q: 'Can Indian professionals track their mutual funds and shares here?',
      a: 'Yes. InvestIreland AI was specifically architected with cross-border professionals in mind. You can track Indian Mutual Funds in ₹ Lakhs, direct NSE/BSE shares, and US RSUs alongside Irish savings and pensions in a single consolidated Financial X-Ray.'
    },
    {
      q: 'Is everything final regarding the Budget 2027 legislation?',
      a: 'Detailed legislation and operational rules remain subject to pre-legislative scrutiny and parliamentary debate. InvestIreland AI pulls live updates directly from Oireachtas and Department of Finance publications to keep you informed of any modifications.'
    }
  ];

  return (
    <section id="faq" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
            Frequently Asked Questions
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Clear, unambiguous answers about InvestIreland AI and Ireland’s new financial framework.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm sm:text-base font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export const Footer: React.FC<{ onOpenWaitlist: () => void }> = ({ onOpenWaitlist }) => {
  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
          
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                IE
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">
                InvestIreland AI
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Understand. Track. Invest with clarity. Ireland’s premier financial intelligence platform for domestic and cross-border investors.
            </p>
            <div className="text-[11px] text-slate-400">
              Dublin, Ireland &middot; Grounded in Revenue.ie &amp; Dept of Finance
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#investment-account" className="hover:text-emerald-400">Investment Account</a></li>
              <li><a href="#calculator" className="hover:text-emerald-400">FY26 vs FY27 Calculator</a></li>
              <li><a href="#cross-border" className="hover:text-emerald-400">India &amp; US Assets</a></li>
              <li><a href="#financial-xray" className="hover:text-emerald-400">Financial X-Ray</a></li>
              <li><a href="#ai-assistant" className="hover:text-emerald-400">AI Financial Assistant</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Learn &amp; Sources
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#learn" className="hover:text-emerald-400">Budget 2027 Complete Guide</a></li>
              <li><a href="#learn" className="hover:text-emerald-400">41% Exit Tax &amp; Deemed Disposal</a></li>
              <li><a href="#cross-border" className="hover:text-emerald-400">Ireland-India DTAA Treatise</a></li>
              <li><a href="#govt-sources" className="hover:text-emerald-400">Official Government API</a></li>
              <li><a href="#readiness-quiz" className="hover:text-emerald-400">Readiness Score Quiz</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Company &amp; Legal
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#faq" className="hover:text-emerald-400">About InvestIreland</a></li>
              <li><a href="#faq" className="hover:text-emerald-400">Regulatory Position</a></li>
              <li><span className="hover:text-emerald-400 cursor-pointer" onClick={onOpenWaitlist}>Join Early Access</span></li>
              <li><span className="text-slate-400">Privacy Policy (GDPR-compliant)</span></li>
              <li><span className="text-slate-400">Terms of Service</span></li>
            </ul>
          </div>

        </div>

        {/* Regulatory Mandate Disclaimer (Spec Section 38 & 66) */}
        <div className="pt-8 space-y-3 text-[11px] text-slate-400 leading-relaxed">
          <p>
            <strong className="text-slate-300">Important Regulatory Notice:</strong> InvestIreland AI is an educational and financial-information intelligence platform. It does NOT provide regulated investment advice, execute trades, hold customer money, or guarantee investment performance. Under Central Bank of Ireland guidelines, investment brokers and intermediaries require authorization for advising on specific investment products or receiving/transmitting orders.
          </p>
          <p>
            Information relating to the proposed Irish Personal Savings &amp; Investment Account is based on the Budget 2027 framework announced by the Irish Government and remains subject to the enactment of the Finance Bill and statutory operational rules.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-xs">
            <span>&copy; 2026 InvestIreland AI Technologies. All rights reserved.</span>
            <span>Version 1.0 (October 2026)</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
