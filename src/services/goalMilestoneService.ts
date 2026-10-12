import { FinancialGoalMilestone, GoalMilestoneSummary, LifeStageCategory, Currency, Holding } from '../types';
import { convertToEUR, convertFromEUR } from './fiscalDataService';
import { scopedStorageKey } from './storageScope';

const STORAGE_KEY = 'investireland_goal_milestones_v1';

export const LIFE_STAGE_PRESETS: {
  category: LifeStageCategory;
  categoryLabel: string;
  defaultTitle: string;
  defaultDescription: string;
  recommendedEUR: number;
  typicalHorizonYears: number;
  priority: 'High' | 'Medium' | 'Flexible';
  icon: string;
  irishFiscalTip: string;
}[] = [
  {
    category: 'house_deposit',
    categoryLabel: 'Home Purchase',
    defaultTitle: 'Dublin / Irish Home Deposit',
    defaultDescription: 'Central Bank of Ireland mortgage rules: 10% deposit for First-Time Buyers or 20% for Second-Time Buyers, plus legal fees & stamp duty (1%).',
    recommendedEUR: 85000,
    typicalHorizonYears: 3,
    priority: 'High',
    icon: 'Home',
    irishFiscalTip: 'Eligible for Irish Help to Buy (HTB) scheme relief up to €30,000 on new builds, plus First Home Scheme equity support.'
  },
  {
    category: 'retirement',
    categoryLabel: 'Retirement & Pension',
    defaultTitle: 'Retirement Comfort & Freedom',
    defaultDescription: 'Supplementary nest egg to combine with Irish State Pension (€289.30/wk) and employer PRSA/pensions for long-term financial peace.',
    recommendedEUR: 650000,
    typicalHorizonYears: 20,
    priority: 'High',
    icon: 'ShieldCheck',
    irishFiscalTip: 'Maximise Irish pension marginal income tax relief (up to 40% relief on €115,000 earnings cap) before routing overflow into the Budget 2027 Account.'
  },
  {
    category: 'emergency_buffer',
    categoryLabel: 'Emergency Safety Cushion',
    defaultTitle: '12-Month Liquid Buffer',
    defaultDescription: 'Essential living expenses held in instant-access accounts to protect against tech layoffs, medical contingencies, or unexpected rent spikes.',
    recommendedEUR: 30000,
    typicalHorizonYears: 1,
    priority: 'High',
    icon: 'Coins',
    irishFiscalTip: 'Held in instant-access savings; subject to 33% Irish DIRT tax deducted at source by EU/Irish banks.'
  },
  {
    category: 'family_education',
    categoryLabel: 'Education & Children',
    defaultTitle: 'Third-Level University Fund',
    defaultDescription: 'Underwrite 3-4 years of university student contribution fees, student accommodation in Dublin/Cork/Galway, or international study abroad.',
    recommendedEUR: 45000,
    typicalHorizonYears: 10,
    priority: 'Medium',
    icon: 'GraduationCap',
    irishFiscalTip: 'Irish student contribution charge is €2,000–€3,000/yr, but private student accommodation in Dublin averages €10,000–€14,000/yr.'
  },
  {
    category: 'cross_border_repatriation',
    categoryLabel: 'Cross-Border & Repatriation',
    defaultTitle: 'India / Overseas Wealth & Real Estate',
    defaultDescription: 'Real estate investment or parental support fund in India (₹1.1 Cr equivalent) or repatriation reserve for long-term dual-country living.',
    recommendedEUR: 120000,
    typicalHorizonYears: 5,
    priority: 'Medium',
    icon: 'Globe',
    irishFiscalTip: 'Under the Ireland-India DTAA (Article 6 & 13), cross-border funds and property transfers can claim Indian capital gains tax credits against Irish liabilities.'
  },
  {
    category: 'financial_independence',
    categoryLabel: 'FIRE & Sabbatical',
    defaultTitle: 'Financial Independence / Career Sabbatical',
    defaultDescription: 'Bridge fund covering 3-5 years of discretionary living or early partial retirement without relying on employer salary.',
    recommendedEUR: 250000,
    typicalHorizonYears: 8,
    priority: 'Flexible',
    icon: 'Compass',
    irishFiscalTip: 'Leverage the new Budget 2027 Personal Savings & Investment Account (€50,000 tax-free ceiling) to shelter growth from exit tax and 8-year deemed disposal.'
  },
  {
    category: 'entrepreneurship',
    categoryLabel: 'Business & Startup Venture',
    defaultTitle: 'Startup Seed Capital & Venture',
    defaultDescription: 'Seed fund to launch an Irish enterprise, qualify for Enterprise Ireland grants (New Frontiers / HPSU), or bootstrap a SaaS product.',
    recommendedEUR: 50000,
    typicalHorizonYears: 4,
    priority: 'Flexible',
    icon: 'Rocket',
    irishFiscalTip: 'Enterprise Ireland Matching Funds and EIIS (Employment and Investment Incentive) can provide income tax relief up to 50% on eligible investments.'
  }
];

export const INITIAL_DEFAULT_GOALS: FinancialGoalMilestone[] = [
  {
    id: 'goal-house-dublin',
    title: 'Dublin House Deposit & Stamp Duty',
    description: 'Central Bank 10% First Time Buyer deposit on a €650k home in Dublin suburbs + legal fees and 1% stamp duty.',
    category: 'house_deposit',
    categoryLabel: 'Home Purchase',
    targetAmount: 85000,
    targetCurrency: 'EUR',
    targetAmountEUR: 85000,
    targetYear: 2028,
    currentAllocatedEUR: 52000,
    monthlyContributionEUR: 1200,
    priority: 'High',
    isCompleted: false,
    notes: 'Planning to pair with Irish Help to Buy (HTB) scheme (€30,000 tax refund) if buying new development in Kildare/Meath/Dublin.',
    iconName: 'Home'
  },
  {
    id: 'goal-retirement-nestegg',
    title: 'Retirement Nest Egg & Freedom',
    description: 'Long-term tax-sheltered compounding combining employer PRSA with the upcoming Budget 2027 €50k investment scheme.',
    category: 'retirement',
    categoryLabel: 'Retirement & Pension',
    targetAmount: 650000,
    targetCurrency: 'EUR',
    targetAmountEUR: 650000,
    targetYear: 2045,
    currentAllocatedEUR: 89600,
    monthlyContributionEUR: 1000,
    priority: 'High',
    isCompleted: false,
    notes: 'Maximise 40% tax relief on pension contributions up to Revenue age brackets.',
    iconName: 'ShieldCheck'
  },
  {
    id: 'goal-emergency-fund',
    title: '12-Month Emergency Liquid Buffer',
    description: 'Fully liquid buffer held across Irish & European banks to withstand layoffs, medical expenses, or market volatility.',
    category: 'emergency_buffer',
    categoryLabel: 'Emergency Safety Cushion',
    targetAmount: 30000,
    targetCurrency: 'EUR',
    targetAmountEUR: 30000,
    targetYear: 2026,
    currentAllocatedEUR: 30000,
    monthlyContributionEUR: 200,
    priority: 'High',
    isCompleted: true,
    notes: 'Fully funded! Held in AIB/PTSB instant access and Trade Republic 3.25% ECB rate.',
    iconName: 'Coins'
  },
  {
    id: 'goal-india-repatriation',
    title: 'India Real Estate & Family Ancestral Fund',
    description: 'Target ₹1.1 Crore corpus earmarked for ancestral home in Bengaluru / Gurgaon or family support in India.',
    category: 'cross_border_repatriation',
    categoryLabel: 'Cross-Border & Repatriation',
    targetAmount: 11000000,
    targetCurrency: 'INR',
    targetAmountEUR: 119000, // converted at ~92.45 INR/EUR
    targetYear: 2030,
    currentAllocatedEUR: 41200,
    monthlyContributionEUR: 800,
    priority: 'Medium',
    isCompleted: false,
    notes: 'Held across Parag Parikh Flexi Cap Fund and direct NRE deposits under DTAA guidelines.',
    iconName: 'Globe'
  },
  {
    id: 'goal-children-education',
    title: 'Children Third-Level University Fund',
    description: 'Dedicated fund for university tuition, student accommodation, or international master’s degree.',
    category: 'family_education',
    categoryLabel: 'Education & Children',
    targetAmount: 45000,
    targetCurrency: 'EUR',
    targetAmountEUR: 45000,
    targetYear: 2035,
    currentAllocatedEUR: 16500,
    monthlyContributionEUR: 350,
    priority: 'Medium',
    isCompleted: false,
    notes: 'Compounding through low-cost global equity UCITS ETFs inside Zurich / Irish life child savings policy.',
    iconName: 'GraduationCap'
  }
];

const SAMPLE_GOAL_IDS = new Set(INITIAL_DEFAULT_GOALS.map(g => g.id));

/** True when every goal is one of the illustrative sample goals (i.e. not the user's own data). */
export function isSampleGoalData(goals: FinancialGoalMilestone[]): boolean {
  return goals.length > 0 && goals.every(g => SAMPLE_GOAL_IDS.has(g.id));
}

function isValidGoal(g: any): g is FinancialGoalMilestone {
  return !!g && typeof g === 'object' &&
    typeof g.id === 'string' && g.id.length > 0 &&
    typeof g.title === 'string' &&
    Number.isFinite(g.targetAmountEUR) && g.targetAmountEUR >= 0 &&
    Number.isFinite(g.currentAllocatedEUR) &&
    Number.isFinite(g.targetYear);
}

export function getStoredGoalMilestones(): FinancialGoalMilestone[] {
  try {
    const raw = localStorage.getItem(scopedStorageKey(STORAGE_KEY));
    if (!raw) {
      return INITIAL_DEFAULT_GOALS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // An empty array is a deliberate choice (the user removed every goal), so respect it.
      return parsed.filter(isValidGoal).map(g => ({
        ...g,
        targetAmount: Number.isFinite(g.targetAmount) ? g.targetAmount : g.targetAmountEUR,
        targetCurrency: g.targetCurrency || 'EUR',
        monthlyContributionEUR: Number.isFinite(g.monthlyContributionEUR) ? g.monthlyContributionEUR : 0,
        priority: g.priority === 'High' || g.priority === 'Medium' || g.priority === 'Flexible' ? g.priority : 'Medium',
        isCompleted: !!g.isCompleted
      }));
    }
  } catch (err) {
    console.warn('Error reading stored goal milestones, resetting to defaults:', err);
  }
  return INITIAL_DEFAULT_GOALS;
}

/** Months from now until the end of the goal's target year (minimum 1). */
export function monthsUntilTargetYearEnd(targetYear: number, now: Date = new Date()): number {
  const months = (targetYear - now.getFullYear()) * 12 + (12 - now.getMonth());
  return Math.max(1, months);
}

export function saveGoalMilestones(goals: FinancialGoalMilestone[]): void {
  try {
    localStorage.setItem(scopedStorageKey(STORAGE_KEY), JSON.stringify(goals));
  } catch (err) {
    console.error('Failed to save goal milestones to localStorage:', err);
  }
}

export function resetGoalMilestonesToDefault(): FinancialGoalMilestone[] {
  saveGoalMilestones(INITIAL_DEFAULT_GOALS);
  return INITIAL_DEFAULT_GOALS;
}

/**
 * Calculates current total portfolio value in EUR from holdings
 */
export function calculateTotalHoldingsValueEUR(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => {
    const holdingValEUR = convertToEUR(h.currentValue, h.currency);
    return sum + holdingValEUR;
  }, 0);
}

/**
 * Computes portfolio-wide milestone analytics
 */
export function computeGoalMilestoneSummary(
  goals: FinancialGoalMilestone[],
  _totalPortfolioEUR: number
): GoalMilestoneSummary {
  const totalGoalsCount = goals.length;
  const completedGoalsCount = goals.filter(g => g.currentAllocatedEUR >= g.targetAmountEUR || g.isCompleted).length;
  
  const totalTargetEUR = goals.reduce((acc, g) => acc + g.targetAmountEUR, 0);
  const totalFundedEUR = goals.reduce((acc, g) => acc + Math.min(g.currentAllocatedEUR, g.targetAmountEUR), 0);
  
  // Progress reflects the amounts actually allocated to goals, matching the funded/target figures shown.
  const overallProgressPct = totalTargetEUR > 0 
    ? Math.min(100, Math.round((totalFundedEUR / totalTargetEUR) * 1000) / 10)
    : 0;

  const currentYear = new Date().getFullYear();
  const openGoals = goals.filter(g => !g.isCompleted && g.currentAllocatedEUR < g.targetAmountEUR);
  const maxTargetYear = openGoals.reduce((max, g) => Math.max(max, g.targetYear), currentYear);

  const monthlySavingsRequiredTotal = openGoals.reduce((sum, g) => {
    const remaining = Math.max(0, g.targetAmountEUR - g.currentAllocatedEUR);
    return sum + (remaining / monthsUntilTargetYearEnd(g.targetYear));
  }, 0);

  return {
    totalGoalsCount,
    completedGoalsCount,
    totalTargetEUR,
    totalFundedEUR,
    overallProgressPct,
    projectedFullFundingYear: maxTargetYear,
    monthlySavingsRequiredTotal: Math.round(monthlySavingsRequiredTotal)
  };
}

/**
 * Dynamically re-distributes total portfolio holdings across goals
 * based on priority weighting (High: 3x, Medium: 2x, Flexible: 1x)
 */
export function autoAllocatePortfolioToGoals(
  goals: FinancialGoalMilestone[],
  totalPortfolioEUR: number
): FinancialGoalMilestone[] {
  if (goals.length === 0 || totalPortfolioEUR <= 0) return goals;

  // Waterfall allocation: High priority first, then Medium, then Flexible
  let remainingPool = totalPortfolioEUR;

  const highPriority = goals.filter(g => g.priority === 'High');
  const mediumPriority = goals.filter(g => g.priority === 'Medium');
  const flexiblePriority = goals.filter(g => g.priority === 'Flexible');

  const allocatedMap = new Map<string, number>();

  const allocateGroup = (group: FinancialGoalMilestone[]) => {
    for (const goal of group) {
      if (remainingPool <= 0) {
        allocatedMap.set(goal.id, 0);
        continue;
      }
      const need = goal.targetAmountEUR;
      const grant = Math.min(remainingPool, need);
      allocatedMap.set(goal.id, Math.round(grant));
      remainingPool -= grant;
    }
  };

  allocateGroup(highPriority);
  allocateGroup(mediumPriority);
  allocateGroup(flexiblePriority);

  // Any surplus beyond all targets stays unallocated rather than inflating a goal past 100%.
  return goals.map(g => {
    const allocated = allocatedMap.get(g.id) ?? g.currentAllocatedEUR;
    return {
      ...g,
      currentAllocatedEUR: allocated,
      // Keep goals the user explicitly marked as complete.
      isCompleted: g.isCompleted || (g.targetAmountEUR > 0 && allocated >= g.targetAmountEUR)
    };
  });
}
