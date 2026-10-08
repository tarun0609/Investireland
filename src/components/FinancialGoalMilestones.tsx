import React, { useState, useMemo } from 'react';
import { 
  FinancialGoalMilestone, 
  Holding, 
  Currency, 
  LifeStageCategory,
  AuthUser
} from '../types';
import { 
  LIFE_STAGE_PRESETS,
  getStoredGoalMilestones, 
  saveGoalMilestones, 
  resetGoalMilestonesToDefault,
  calculateTotalHoldingsValueEUR,
  computeGoalMilestoneSummary,
  autoAllocatePortfolioToGoals
} from '../services/goalMilestoneService';
import { formatCurrency, convertToEUR, convertFromEUR } from '../services/fiscalDataService';
import { sendMilestoneAutoEmail, getActiveUser } from '../services/authEmailService';
import { 
  Target, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Send, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Home, 
  ShieldCheck, 
  Coins, 
  GraduationCap, 
  Globe, 
  Compass, 
  Rocket, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Sliders, 
  X,
  Mail,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

interface FinancialGoalMilestonesProps {
  holdings: Holding[];
  currentCurrency: Currency;
  onOpenInvestmentAccount?: () => void;
  onOpenAuthModal?: () => void;
}

export const FinancialGoalMilestones: React.FC<FinancialGoalMilestonesProps> = ({
  holdings,
  currentCurrency,
  onOpenInvestmentAccount,
  onOpenAuthModal
}) => {
  const [goals, setGoals] = useState<FinancialGoalMilestone[]>(() => getStoredGoalMilestones());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeUser, setActiveUser] = useState<AuthUser>(() => getActiveUser());
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoalMilestone | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    loading: boolean;
    sent: boolean;
    previewUrl?: string | null;
    message?: string;
  }>({ loading: false, sent: false });

  // Add / Edit form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: LifeStageCategory;
    targetAmount: number;
    targetCurrency: Currency;
    targetYear: number;
    monthlyContributionEUR: number;
    priority: 'High' | 'Medium' | 'Flexible';
    notes: string;
  }>({
    title: 'Dublin / Irish Home Deposit',
    description: 'Central Bank 10% First Time Buyer deposit plus stamp duty',
    category: 'house_deposit',
    targetAmount: 85000,
    targetCurrency: 'EUR',
    targetYear: 2028,
    monthlyContributionEUR: 1000,
    priority: 'High',
    notes: 'Pairing with Irish Help to Buy (HTB) scheme refund'
  });

  // Calculate current total portfolio value in EUR
  const totalPortfolioEUR = useMemo(() => {
    return calculateTotalHoldingsValueEUR(holdings);
  }, [holdings]);

  // Summary statistics
  const summary = useMemo(() => {
    return computeGoalMilestoneSummary(goals, totalPortfolioEUR);
  }, [goals, totalPortfolioEUR]);

  // Filtered goals
  const filteredGoals = useMemo(() => {
    if (selectedCategory === 'all') return goals;
    return goals.filter(g => g.category === selectedCategory);
  }, [goals, selectedCategory]);

  const updateAndSaveGoals = (updated: FinancialGoalMilestone[]) => {
    setGoals(updated);
    saveGoalMilestones(updated);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all financial goal milestones back to official presets?')) {
      const defs = resetGoalMilestonesToDefault();
      setGoals(defs);
    }
  };

  const handleAutoAllocate = () => {
    const reallocated = autoAllocatePortfolioToGoals(goals, totalPortfolioEUR);
    updateAndSaveGoals(reallocated);
  };

  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    updateAndSaveGoals(updated);
  };

  const handleOpenAddModal = (presetCategory?: LifeStageCategory) => {
    const preset = LIFE_STAGE_PRESETS.find(p => p.category === presetCategory) || LIFE_STAGE_PRESETS[0];
    const currentYear = new Date().getFullYear();
    setFormData({
      title: preset.defaultTitle,
      description: preset.defaultDescription,
      category: preset.category,
      targetAmount: preset.recommendedEUR,
      targetCurrency: 'EUR',
      targetYear: currentYear + preset.typicalHorizonYears,
      monthlyContributionEUR: Math.round(preset.recommendedEUR / (preset.typicalHorizonYears * 12)),
      priority: preset.priority,
      notes: preset.irishFiscalTip
    });
    setEditingGoal(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (goal: FinancialGoalMilestone) => {
    setFormData({
      title: goal.title,
      description: goal.description,
      category: goal.category,
      targetAmount: goal.targetAmount,
      targetCurrency: goal.targetCurrency,
      targetYear: goal.targetYear,
      monthlyContributionEUR: goal.monthlyContributionEUR,
      priority: goal.priority,
      notes: goal.notes || ''
    });
    setEditingGoal(goal);
    setIsAddModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmountEUR = convertToEUR(formData.targetAmount, formData.targetCurrency);
    const categoryLabel = LIFE_STAGE_PRESETS.find(p => p.category === formData.category)?.categoryLabel || 'Life Goal';

    if (editingGoal) {
      // Edit existing
      const updated = goals.map(g => {
        if (g.id === editingGoal.id) {
          return {
            ...g,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            categoryLabel,
            targetAmount: formData.targetAmount,
            targetCurrency: formData.targetCurrency,
            targetAmountEUR,
            targetYear: formData.targetYear,
            monthlyContributionEUR: formData.monthlyContributionEUR,
            priority: formData.priority,
            notes: formData.notes
          };
        }
        return g;
      });
      updateAndSaveGoals(updated);
    } else {
      // Add new
      const newGoal: FinancialGoalMilestone = {
        id: `goal_${Date.now()}`,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        categoryLabel,
        targetAmount: formData.targetAmount,
        targetCurrency: formData.targetCurrency,
        targetAmountEUR,
        targetYear: formData.targetYear,
        currentAllocatedEUR: Math.min(totalPortfolioEUR * 0.25, targetAmountEUR * 0.4),
        monthlyContributionEUR: formData.monthlyContributionEUR,
        priority: formData.priority,
        isCompleted: false,
        notes: formData.notes,
        iconName: formData.category
      };
      updateAndSaveGoals([...goals, newGoal]);
    }
    setIsAddModalOpen(false);
  };

  const handleSendMilestoneEmail = async (goal?: FinancialGoalMilestone) => {
    setEmailStatus({ loading: true, sent: false });
    setIsEmailModalOpen(true);

    const currentUser = getActiveUser();
    setActiveUser(currentUser);

    const targetGoal = goal || goals[0];
    const goalTitle = targetGoal ? targetGoal.title : 'All Life Stage Milestones';
    const targetAmount = targetGoal ? targetGoal.targetAmountEUR : summary.totalTargetEUR;

    const res = await sendMilestoneAutoEmail({
      email: currentUser.email,
      name: currentUser.name,
      goalTitle,
      targetAmount,
      triggerType: 'MILESTONE_UPDATE'
    });

    if (res.success) {
      setEmailStatus({
        loading: false,
        sent: true,
        previewUrl: res.emailDispatch?.previewUrl,
        message: `Auto-response email sent to ${currentUser.email} with your milestone progress!`
      });
    } else {
      setEmailStatus({
        loading: false,
        sent: false,
        message: res.error || 'Failed to dispatch email'
      });
    }
  };

  const renderIcon = (category: LifeStageCategory) => {
    switch (category) {
      case 'house_deposit':
        return <Home className="w-4 h-4 text-emerald-600" />;
      case 'retirement':
        return <ShieldCheck className="w-4 h-4 text-blue-600" />;
      case 'emergency_buffer':
        return <Coins className="w-4 h-4 text-amber-600" />;
      case 'family_education':
        return <GraduationCap className="w-4 h-4 text-purple-600" />;
      case 'cross_border_repatriation':
        return <Globe className="w-4 h-4 text-indigo-600" />;
      case 'financial_independence':
        return <Compass className="w-4 h-4 text-teal-600" />;
      case 'entrepreneurship':
        return <Rocket className="w-4 h-4 text-rose-600" />;
      default:
        return <Target className="w-4 h-4 text-emerald-600" />;
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Target className="w-3.5 h-3.5" />
                Cross-Border Life Planning
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Portfolio benchmarked against Irish &amp; Global Milestones
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Financial Goal Milestones
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold">
                {goals.length} Goals Active
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Set specific target amounts for key life stages (House Deposit in Dublin, Retirement Nest Egg, Education, Emergency Buffer, and India Wealth) and track progress bars calibrated to your actual total holdings.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Goal</span>
            </button>

            <button
              onClick={handleAutoAllocate}
              title="Automatically distributes current total portfolio holdings across high-priority milestones"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer border border-slate-300"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <span>Auto-Allocate Holdings</span>
            </button>

            <button
              onClick={() => handleSendMilestoneEmail()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 transition-colors cursor-pointer border border-blue-200"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Email Progress Report</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Reset to default preset milestones"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Milestone Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Target Needed
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {formatCurrency(summary.totalTargetEUR, currentCurrency)}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Across all {summary.totalGoalsCount} life milestones
            </span>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Current Allocated
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
              {formatCurrency(summary.totalFundedEUR, currentCurrency)}
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
              {summary.overallProgressPct}% portfolio coverage
            </span>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Holdings Value
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {formatCurrency(totalPortfolioEUR, currentCurrency)}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Total cross-border portfolio
            </span>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Monthly Savings Pace
            </span>
            <div className="text-lg sm:text-xl font-black text-blue-700 mt-1">
              {formatCurrency(summary.monthlySavingsRequiredTotal, currentCurrency)}/mo
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Required to hit all dates
            </span>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 col-span-2 md:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Goals Achieved
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 flex items-center gap-1.5">
              <span>{summary.completedGoalsCount}</span>
              <span className="text-xs font-normal text-slate-400">of {summary.totalGoalsCount}</span>
              {summary.completedGoalsCount > 0 && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 inline ml-1" />
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Full target horizon: {summary.projectedFullFundingYear}
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-5 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              Cumulative Financial Milestone Progress
            </span>
            <span className="text-emerald-800">
              {formatCurrency(summary.totalFundedEUR, currentCurrency)} / {formatCurrency(summary.totalTargetEUR, currentCurrency)} ({summary.overallProgressPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-600 to-teal-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.overallProgressPct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Funding Gap Remaining: {formatCurrency(Math.max(0, summary.totalTargetEUR - summary.totalFundedEUR), currentCurrency)}</span>
            <span>Target Completion: 2026 – {summary.projectedFullFundingYear}</span>
          </div>
        </div>

      </div>

      {/* Life Stage Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Life Stages ({goals.length})
        </button>
        {LIFE_STAGE_PRESETS.map((p) => {
          const count = goals.filter(g => g.category === p.category).length;
          return (
            <button
              key={p.category}
              onClick={() => setSelectedCategory(p.category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === p.category
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {renderIcon(p.category)}
              <span>{p.categoryLabel}</span>
              {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Goals Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.map((goal) => {
          const progressPct = goal.targetAmountEUR > 0 
            ? Math.min(100, Math.round((goal.currentAllocatedEUR / goal.targetAmountEUR) * 1000) / 10)
            : 0;
          const isDone = progressPct >= 100 || goal.isCompleted;
          const shortfallEUR = Math.max(0, goal.targetAmountEUR - goal.currentAllocatedEUR);
          const yearsRemaining = Math.max(0, goal.targetYear - currentYear);
          const monthsRemaining = Math.max(1, yearsRemaining * 12);
          const suggestedMonthly = Math.round(shortfallEUR / monthsRemaining);

          return (
            <div 
              key={goal.id} 
              className={`bg-white rounded-2xl p-5 border transition-all hover:shadow-md ${
                isDone ? 'border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/20' : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {renderIcon(goal.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {goal.categoryLabel}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        goal.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        goal.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {goal.priority} Priority
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      {goal.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(goal)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Edit milestone"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete milestone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                {goal.description}
              </p>

              {/* Progress Bar & Amount */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-slate-900">
                      {formatCurrency(goal.currentAllocatedEUR, currentCurrency)}
                    </span>
                    <span className="text-xs text-slate-500">
                      of {formatCurrency(goal.targetAmountEUR, currentCurrency)}
                      {goal.targetCurrency !== 'EUR' && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({goal.targetCurrency === 'INR' ? '₹' : '$'}{goal.targetAmount.toLocaleString()})
                        </span>
                      )}
                    </span>
                  </div>
                  <span className={`text-xs font-black ${isDone ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {progressPct}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      isDone ? 'bg-emerald-600' :
                      progressPct > 60 ? 'bg-teal-600' :
                      progressPct > 30 ? 'bg-blue-600' : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.min(100, progressPct)}%` }}
                  />
                </div>

                {/* Sub metrics */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-2 text-[11px] text-slate-600 border-t border-slate-50">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Target Year</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {goal.targetYear} ({yearsRemaining === 0 ? 'This year' : `${yearsRemaining}y left`})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Shortfall</span>
                    <span className={`font-bold ${isDone ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isDone ? 'Fully Funded' : formatCurrency(shortfallEUR, currentCurrency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Required Pace</span>
                    <span className="font-bold text-slate-800">
                      {isDone ? '—' : `${formatCurrency(suggestedMonthly, currentCurrency)}/mo`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fiscal Tip & Irish Context */}
              {goal.notes && (
                <div className="mt-3.5 p-2.5 rounded-lg bg-slate-50 text-[11px] text-slate-600 leading-snug border border-slate-100 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{goal.notes}</span>
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleSendMilestoneEmail(goal)}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Email Milestone Plan</span>
                </button>

                {goal.category === 'house_deposit' && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Help to Buy Eligible
                  </span>
                )}

                {goal.category === 'retirement' && onOpenInvestmentAccount && (
                  <button
                    onClick={onOpenInvestmentAccount}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Budget 2027 PSIA</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Preset Quick-Add Life Stages Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">
              Explore Life Stage Templates
            </span>
            <h3 className="text-lg font-black text-white">
              Add More Life Stage Milestones
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Quickly create milestones backed by Irish Central Bank rules, Help to Buy grants, Revenue pension limits, and cross-border DTAA provisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {LIFE_STAGE_PRESETS.slice(0, 4).map((p) => (
              <button
                key={p.category}
                onClick={() => handleOpenAddModal(p.category)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer border border-white/10 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-300" />
                <span>+ {p.categoryLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ADD / EDIT MILESTONE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                🎯
              </span>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                {editingGoal ? 'Edit Milestone' : 'New Financial Goal Milestone'}
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900">
              {editingGoal ? 'Update Target Amount & Timeline' : 'Configure Life Stage Goal'}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Set target amounts and completion horizons to calibrate real-time progress bars.
            </p>

            <form onSubmit={handleSaveGoal} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Life Stage Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const cat = e.target.value as LifeStageCategory;
                    const preset = LIFE_STAGE_PRESETS.find(p => p.category === cat);
                    if (preset) {
                      setFormData(prev => ({
                        ...prev,
                        category: cat,
                        title: preset.defaultTitle,
                        description: preset.defaultDescription,
                        targetAmount: preset.recommendedEUR,
                        notes: preset.irishFiscalTip
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  {LIFE_STAGE_PRESETS.map((p) => (
                    <option key={p.category} value={p.category}>
                      {p.categoryLabel} — {p.defaultTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Amount *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={formData.targetAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Currency</label>
                  <select
                    value={formData.targetCurrency}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetCurrency: e.target.value as Currency }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="EUR">EUR (€) — Euro (Irish / EU)</option>
                    <option value="INR">INR (₹) — Indian Rupee</option>
                    <option value="USD">USD ($) — US Dollar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Year</label>
                  <input
                    type="number"
                    min={currentYear}
                    max={currentYear + 40}
                    value={formData.targetYear}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetYear: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="High">High (Core necessity)</option>
                    <option value="Medium">Medium (Key aspiration)</option>
                    <option value="Flexible">Flexible (Discretionary)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Irish Fiscal Tip / Grant Context</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer shadow-xs"
                >
                  {editingGoal ? 'Update Milestone' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMAIL AUTO-RESPONSE CONFIRMATION MODAL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-8 text-center">
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {emailStatus.loading ? (
              <div className="py-8">
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h4 className="font-extrabold text-slate-900 text-base">
                  Dispatching Milestone Blueprint...
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Connecting to mail transport and generating personalized auto-response...
                </p>
              </div>
            ) : emailStatus.sent ? (
              <div className="py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                  Auto-Response Delivered
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-3">
                  Email Sent Successfully!
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  We dispatched your full cross-border milestone roadmap to <strong className="text-slate-800">{activeUser.email}</strong>.
                </p>

                {emailStatus.previewUrl && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 text-left">
                    <span className="text-[11px] font-bold text-blue-900 block mb-1">
                      📬 Live Mailbox Preview URL (Ethereal SMTP):
                    </span>
                    <a
                      href={emailStatus.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                    >
                      <span>Open Delivered Email in Browser</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="mt-5 flex gap-2 justify-center">
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-slate-800"
                  >
                    Done
                  </button>
                  {onOpenAuthModal && (
                    <button
                      onClick={() => {
                        setIsEmailModalOpen(false);
                        onOpenAuthModal();
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-50"
                    >
                      Manage Email Credentials
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  Email Dispatch Notice
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  {emailStatus.message || 'Could not dispatch email. Please check your credentials.'}
                </p>
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
