export type ExpenseCategory =
  | '餐饮'
  | '购物'
  | '充值缴费'
  | '休闲娱乐'
  | '其他支出';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  '餐饮',
  '购物',
  '充值缴费',
  '休闲娱乐',
  '其他支出',
];

export interface MonthlyBudget {
  monthKey: string; // Format: YYYY-MM
  disposable: number; // 可支配金额
  floating: number; // 浮动金额
  savings: number; // 节约金额
}

export interface ExpenseRecord {
  id: string;
  date: string; // Format: YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  title: string;
  createdAt: number;
}

export interface DailyOverbudgetNote {
  date: string; // Format: YYYY-MM-DD
  explanation: string;
  updatedAt: number;
}

export interface WeekStatus {
  weekIndex: 1 | 2 | 3 | 4;
  label: string;
  dateRangeLabel: string;
  startDay: number;
  endDay: number;
  budget: number; // 1/4 of monthly disposable
  spent: number;
  remaining: number;
  isOverBudget: boolean;
  overAmount: number;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  spent: number;
  dailyAverageThreshold: number;
  isRedCell: boolean; // spent > dailyAverageThreshold
  overAmount: number;
  expenses: ExpenseRecord[];
  explanationNote: string;
}

export interface CategoryMoMItem {
  category: ExpenseCategory;
  currentAmount: number;
  previousAmount: number;
  diffAmount: number;
  momPercentage: number | null;
  currentShare: number;
  count: number;
  personalizedTip: string;
}

export interface SpendingAnomaly {
  id: string;
  date: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  dailyAverageThreshold: number;
  ratioToDailyAvg: number;
  explanationNote?: string;
}

export interface OverspendForecast {
  elapsedDays: number;
  totalDaysInMonth: number;
  remainingDays: number;
  currentTotalSpent: number;
  remainingDisposable: number;
  currentDailyBurnRate: number;
  idealDailyBudget: number;
  safeRemainingDailyAllowance: number;
  projectedMonthEndSpent: number;
  projectedVariance: number;
  willOverspend: boolean;
  riskLevel: 'safe' | 'caution' | 'critical';
  estimatedExhaustionDay: number | null;
  warningMessage: string;
}

export interface AIAnalysisResult {
  provider: string;
  healthScore: number;
  headline: string;
  summary: string;
  overspendWarning: string;
  consumptionPatternInsight: string;
  anomalyReview: string;
  personalizedSavingTips: string[];
  generatedAt: string;
}
