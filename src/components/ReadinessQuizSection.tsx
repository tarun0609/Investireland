import React, { useState } from 'react';
import { QUIZ_QUESTIONS, calculateQuizScore } from '../data/mockData';
import { QuizResult } from '../types';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  HelpCircle,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

interface ReadinessQuizSectionProps {
  onOpenWaitlist: (data?: any) => void;
}

export const ReadinessQuizSection: React.FC<ReadinessQuizSectionProps> = ({
  onOpenWaitlist
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  // Selected option index per question (scores can repeat, so they can't identify the choice)
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const currentQ = QUIZ_QUESTIONS[currentQuestionIndex];

  const handleSelectOption = (score: number, optionIndex: number) => {
    if (result) return;
    const updatedAnswers = { ...answers, [currentQ.id]: score };
    setAnswers(updatedAnswers);
    setSelectedOptions(prev => ({ ...prev, [currentQ.id]: optionIndex }));

    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      // Use the rendered index (not prev + 1) so a fast double-click can't skip a question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      const finalResult = calculateQuizScore(updatedAnswers);
      setResult(finalResult);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const answeredCount = QUIZ_QUESTIONS.filter(q => answers[q.id] !== undefined).length;
  const progressPct = Math.round((answeredCount / QUIZ_QUESTIONS.length) * 100);

  const handleRestart = () => {
    setAnswers({});
    setSelectedOptions({});
    setCurrentQuestionIndex(0);
    setResult(null);
  };

  return (
    <section className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>60-Second Assessment</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How invested are you?
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Take this quick interactive diagnostic to see your Educational Investment Readiness Score and identify your highest-impact financial levers.
          </p>
        </div>

        <div className="mt-10 bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8">
          
          {!result ? (
            <div>
              {/* Progress Tracker */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Question {currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}</span>
                <span>{progressPct}% Complete</span>
              </div>
              <div
                className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6"
                role="progressbar"
                aria-label="Quiz progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
              >
                <div 
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Current Question */}
              <div className="mb-6">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  {currentQ.subtitle}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  {currentQ.question}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOptions[currentQ.id] === idx;
                  return (
                  <button
                    key={`${currentQ.id}-${idx}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectOption(opt.score, idx)}
                    className={`w-full text-left p-4 rounded-xl border hover:border-emerald-500 hover:bg-emerald-50/40 transition-all cursor-pointer group flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isSelected ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 group-hover:border-emerald-600 group-hover:bg-emerald-600 ${
                      isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full bg-white group-hover:opacity-100 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-950">
                        {opt.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {opt.detail}
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>

              {currentQuestionIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  &larr; Previous question
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-50 border-2 border-emerald-500/40 text-emerald-700 font-extrabold text-3xl font-mono mb-4 shadow-xs">
                {result.score}<span className="text-xs text-slate-500 font-sans font-normal">/100</span>
              </div>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                Educational Investment Readiness Score
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {result.title}
              </h3>
              
              <p className="mt-3 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                {result.verdict}
              </p>

              {/* Actionable Recommendations */}
              <div className="mt-6 text-left max-w-lg mx-auto bg-slate-50 p-5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Tailored Action Steps:
                </span>
                <ul className="space-y-2 text-xs text-slate-700">
                  {result.recommendations.map((rec, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenWaitlist({ readinessScore: result.score, readinessTitle: result.title })}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
                >
                  <span>Save Score &amp; Join Early Access</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Quiz</span>
                </button>
              </div>

              <p className="mt-4 text-[11px] text-slate-400">
                This is an educational indicator designed to inform self-directed investors, not a statutory suitability assessment or financial advice.
              </p>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
