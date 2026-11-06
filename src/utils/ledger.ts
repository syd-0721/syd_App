import {
  CategoryMoMItem,
  DailyOverbudgetNote,
  DaySummary,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  ExpenseRecord,
  MonthlyBudget,
  OverspendForecast,
  SpendingAnomaly,
  WeekStatus,
} from '../types/ledger';

export function calculateTotalBudget(budget: Pick<MonthlyBudget, 'disposable' | 'floating' | 'savings'>): number {
  const disposable = Number.isFinite(budget.disposable) ? Math.max(0, budget.disposable) : 0;
  const floating = Number.isFinite(budget.floating) ? Math.max(0, budget.floating) : 0;
  const savings = Number.isFinite(budget.savings) ? Math.max(0, budget.savings) : 0;
  return roundCurrency(disposable + floating + savings);
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getDaysInMonth(monthKey: string): number {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return 30;
  return new Date(year, month, 0).getDate();
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = Number(yearStr);
  let month = Number(monthStr);
  if (!year || !month) return '2026-10';
  month -= 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getNextMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = Number(yearStr);
  let month = Number(monthStr);
  if (!year || !month) return '2026-12';
  month += 1;
  if (month === 13) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function calculateDisposableSummary(
  budget: MonthlyBudget,
  expenses: ExpenseRecord[]
): {
  initialDisposable: number;
  totalSpent: number;
  remainingDisposable: number;
  isMonthOverBudget: boolean;
  usagePercentage: number;
} {
  const monthExpenses = expenses.filter((e) => e.date.startsWith(budget.monthKey));
  const totalSpent = roundCurrency(
    monthExpenses.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0)
  );
  const initialDisposable = roundCurrency(budget.disposable);
  const remainingDisposable = roundCurrency(initialDisposable - totalSpent);
  const usagePercentage =
    initialDisposable > 0 ? Math.min(999, Math.round((totalSpent / initialDisposable) * 1000) / 10) : 0;

  return {
    initialDisposable,
    totalSpent,
    remainingDisposable,
    isMonthOverBudget: remainingDisposable < 0,
    usagePercentage,
  };
}

export function getWeekIndexForDay(dayOfMonth: number): 1 | 2 | 3 | 4 {
  if (dayOfMonth <= 7) return 1;
  if (dayOfMonth <= 14) return 2;
  if (dayOfMonth <= 21) return 3;
  return 4;
}

export function calculateWeeklyStatuses(
  budget: MonthlyBudget,
  expenses: ExpenseRecord[]
): WeekStatus[] {
  const daysInMonth = getDaysInMonth(budget.monthKey);
  const weeklyBudget = roundCurrency(budget.disposable / 4);
  const monthExpenses = expenses.filter((e) => e.date.startsWith(budget.monthKey));

  const ranges: Array<{ weekIndex: 1 | 2 | 3 | 4; startDay: number; endDay: number; label: string }> = [
    { weekIndex: 1, startDay: 1, endDay: 7, label: '第一周' },
    { weekIndex: 2, startDay: 8, endDay: 14, label: '第二周' },
    { weekIndex: 3, startDay: 15, endDay: 21, label: '第三周' },
    { weekIndex: 4, startDay: 22, endDay: daysInMonth, label: '第四周' },
  ];

  return ranges.map(({ weekIndex, startDay, endDay, label }) => {
    const spent = roundCurrency(
      monthExpenses.reduce((sum, item) => {
        const day = Number(item.date.split('-')[2]);
        if (day >= startDay && day <= endDay) {
          return sum + item.amount;
        }
        return sum;
      }, 0)
    );

    const remaining = roundCurrency(weeklyBudget - spent);
    const isOverBudget = spent > weeklyBudget && weeklyBudget >= 0;
    const overAmount = isOverBudget ? roundCurrency(spent - weeklyBudget) : 0;

    return {
      weekIndex,
      label,
      dateRangeLabel: `${startDay}日–${endDay}日`,
      startDay,
      endDay,
      budget: weeklyBudget,
      spent,
      remaining,
      isOverBudget,
      overAmount,
    };
  });
}

export function getActiveWeeklyWarnings(
  budget: MonthlyBudget,
  expenses: ExpenseRecord[]
): WeekStatus[] {
  const weeks = calculateWeeklyStatuses(budget, expenses);
  return weeks.filter((w) => w.isOverBudget);
}

export function calculateDailyAverageDisposable(budget: MonthlyBudget): number {
  const days = getDaysInMonth(budget.monthKey);
  if (days <= 0 || budget.disposable <= 0) return 0;
  return roundCurrency(budget.disposable / days);
}

export function buildMonthDaySummaries(
  budget: MonthlyBudget,
  expenses: ExpenseRecord[],
  notes: Record<string, DailyOverbudgetNote>
): DaySummary[] {
  const daysInMonth = getDaysInMonth(budget.monthKey);
  const dailyThreshold = calculateDailyAverageDisposable(budget);
  const monthExpenses = expenses.filter((e) => e.date.startsWith(budget.monthKey));

  const summaries: DaySummary[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const date = `${budget.monthKey}-${dayStr}`;
    const dayExpenses = monthExpenses
      .filter((e) => e.date === date)
      .sort((a, b) => b.createdAt - a.createdAt);

    const spent = roundCurrency(dayExpenses.reduce((sum, item) => sum + item.amount, 0));
    const isRedCell = spent > 0 && spent > dailyThreshold;
    const overAmount = isRedCell ? roundCurrency(spent - dailyThreshold) : 0;
    const explanationNote = notes[date]?.explanation ?? '';

    summaries.push({
      date,
      dayOfMonth: day,
      spent,
      dailyAverageThreshold: dailyThreshold,
      isRedCell,
      overAmount,
      expenses: dayExpenses,
      explanationNote,
    });
  }

  return summaries;
}

export function calculateCategoryBreakdown(
  monthKey: string,
  expenses: ExpenseRecord[]
): Array<{ category: ExpenseCategory; amount: number; count: number; percentage: number }> {
  const monthExpenses = expenses.filter((e) => e.date.startsWith(monthKey));
  const totalSpent = monthExpenses.reduce((sum, item) => sum + item.amount, 0);

  return EXPENSE_CATEGORIES.map((category) => {
    const catItems = monthExpenses.filter((e) => e.category === category);
    const amount = roundCurrency(catItems.reduce((sum, item) => sum + item.amount, 0));
    const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0;
    return {
      category,
      amount,
      count: catItems.length,
      percentage,
    };
  });
}

const CATEGORY_SAVING_ADVICE: Record<ExpenseCategory, { up: string; steady: string }> = {
  餐饮: {
    up: '建议尝试自己做饭或自带便当以节省开支，同时减少高溢价外卖与下午茶频次。',
    steady: '餐饮支出节奏平稳，继续保持规律三餐与自带饮水习惯。',
  },
  购物: {
    up: '建议启用“48小时冷静期”清单法则，区分刚需补货与冲动消费，避免非必要囤货。',
    steady: '购物开支控制良好，维持按需采购节奏即可。',
  },
  充值缴费: {
    up: '建议盘点自动续费会员与通讯套餐，合并或取消低频使用的订阅服务。',
    steady: '固定缴费处于合理区间，可留意阶梯水电与话费优惠活动。',
  },
  休闲娱乐: {
    up: '建议优先选择公园徒步、居家观影或拼团运动等低成本高愉悦感活动替代高消费娱乐。',
    steady: '休闲娱乐支出适度，保持身心放松与预算平衡。',
  },
  其他支出: {
    up: '建议为突发零散支出设立单笔上限，必要时再向浮动金额申请支援。',
    steady: '其他杂项支出占比健康，账目清晰透明。',
  },
};

export function calculateMoMComparison(
  monthKey: string,
  expenses: ExpenseRecord[]
): CategoryMoMItem[] {
  const prevMonthKey = getPreviousMonthKey(monthKey);
  const currentExpenses = expenses.filter((e) => e.date.startsWith(monthKey));
  const prevExpenses = expenses.filter((e) => e.date.startsWith(prevMonthKey));
  const currentTotal = currentExpenses.reduce((s, e) => s + e.amount, 0);

  return EXPENSE_CATEGORIES.map((category) => {
    const curItems = currentExpenses.filter((e) => e.category === category);
    const prevItems = prevExpenses.filter((e) => e.category === category);
    const currentAmount = roundCurrency(curItems.reduce((s, e) => s + e.amount, 0));
    const previousAmount = roundCurrency(prevItems.reduce((s, e) => s + e.amount, 0));
    const diffAmount = roundCurrency(currentAmount - previousAmount);

    let momPercentage: number | null = null;
    if (previousAmount > 0) {
      momPercentage = Math.round(((currentAmount - previousAmount) / previousAmount) * 1000) / 10;
    } else if (currentAmount > 0) {
      momPercentage = 100;
    }

    const currentShare = currentTotal > 0 ? Math.round((currentAmount / currentTotal) * 1000) / 10 : 0;

    let personalizedTip = '';
    if (momPercentage !== null && momPercentage > 5) {
      personalizedTip = `您本月在${category}上的花费比上月增加了${momPercentage}%，${CATEGORY_SAVING_ADVICE[category].up}`;
    } else if (momPercentage !== null && momPercentage < -5) {
      personalizedTip = `您本月在${category}上的花费比上月减少了${Math.abs(momPercentage)}%，节约成效显著，请继续保持！`;
    } else {
      personalizedTip = `您本月在${category}上的花费与上月基本持平，${CATEGORY_SAVING_ADVICE[category].steady}`;
    }

    return {
      category,
      currentAmount,
      previousAmount,
      diffAmount,
      momPercentage,
      currentShare,
      count: curItems.length,
      personalizedTip,
    };
  });
}

export function detectSpendingAnomalies(
  budget: MonthlyBudget,
  expenses: ExpenseRecord[],
  notes: Record<string, DailyOverbudgetNote>
): SpendingAnomaly[] {
  const dailyAvg = calculateDailyAverageDisposable(budget);
  const monthExpenses = expenses.filter((e) => e.date.startsWith(budget.monthKey));
  if (dailyAvg <= 0) return [];

  return monthExpenses
    .filter((item) => item.amount > dailyAvg)
    .map((item) => ({
      id: item.id,
      date: item.date,
      title: item.title,
      category: item.category,
      amount: item.amount,
      dailyAverageThreshold: dailyAvg,
      ratioToDailyAvg: Math.round((item.amount / dailyAvg) * 10) / 10,
      explanationNote: notes[item.date]?.explanation,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function calculateOverspendForecast(
  budget: MonthlyBudget,
  expenses: ExpenseRecord[],
  referenceDayOfMonth?: number
): OverspendForecast {
  const totalDaysInMonth = getDaysInMonth(budget.monthKey);
  const monthExpenses = expenses.filter((e) => e.date.startsWith(budget.monthKey));
  const currentTotalSpent = roundCurrency(monthExpenses.reduce((s, e) => s + e.amount, 0));
  const remainingDisposable = roundCurrency(budget.disposable - currentTotalSpent);
  const idealDailyBudget = calculateDailyAverageDisposable(budget);

  let maxExpenseDay = 1;
  for (const exp of monthExpenses) {
    const day = Number(exp.date.split('-')[2]);
    if (day > maxExpenseDay) maxExpenseDay = day;
  }
  const elapsedDays = Math.min(
    totalDaysInMonth,
    Math.max(1, referenceDayOfMonth ?? maxExpenseDay)
  );
  const remainingDays = Math.max(0, totalDaysInMonth - elapsedDays);

  const currentDailyBurnRate = roundCurrency(currentTotalSpent / elapsedDays);
  const projectedMonthEndSpent = roundCurrency(currentDailyBurnRate * totalDaysInMonth);
  const projectedVariance = roundCurrency(budget.disposable - projectedMonthEndSpent);
  const willOverspend = projectedMonthEndSpent > budget.disposable || remainingDisposable < 0;

  const safeRemainingDailyAllowance =
    remainingDays > 0 && remainingDisposable > 0
      ? roundCurrency(remainingDisposable / remainingDays)
      : 0;

  let estimatedExhaustionDay: number | null = null;
  if (currentDailyBurnRate > 0 && willOverspend && budget.disposable > 0) {
    estimatedExhaustionDay = Math.min(
      totalDaysInMonth,
      Math.max(1, Math.ceil(budget.disposable / currentDailyBurnRate))
    );
  }

  let riskLevel: 'safe' | 'caution' | 'critical' = 'safe';
  let warningMessage = '';

  if (remainingDisposable < 0) {
    riskLevel = 'critical';
    warningMessage = `已超支预警：当前已累计消费 ${formatCurrency(currentTotalSpent)}，超出本月可支配金额 ${formatCurrency(Math.abs(remainingDisposable))}，建议立即动用浮动金额或暂停非刚需支出。`;
  } else if (willOverspend) {
    riskLevel = projectedMonthEndSpent > budget.disposable * 1.15 ? 'critical' : 'caution';
    const overEst = formatCurrency(Math.abs(projectedVariance));
    warningMessage = `超支提前预警：按当前日均消费 ${formatCurrency(currentDailyBurnRate)} 推算，预计月末总支出将达 ${formatCurrency(projectedMonthEndSpent)}（预计超支 ${overEst}，约在 ${estimatedExhaustionDay} 日耗尽可支配额度）。未来 ${remainingDays} 天建议将日均开销控制在 ${formatCurrency(safeRemainingDailyAllowance)} 以内。`;
  } else {
    riskLevel = 'safe';
    warningMessage = `预算节奏健康：当前日均消费 ${formatCurrency(currentDailyBurnRate)} 低于每日标准均值 ${formatCurrency(idealDailyBudget)}，预计月末可结余 ${formatCurrency(projectedVariance)} 转入节约金。`;
  }

  return {
    elapsedDays,
    totalDaysInMonth,
    remainingDays,
    currentTotalSpent,
    remainingDisposable,
    currentDailyBurnRate,
    idealDailyBudget,
    safeRemainingDailyAllowance,
    projectedMonthEndSpent,
    projectedVariance,
    willOverspend,
    riskLevel,
    estimatedExhaustionDay,
    warningMessage,
  };
}

export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = Number.isInteger(abs) ? abs.toString() : abs.toFixed(2).replace(/\.?0+$/, '');
  return `${amount < 0 ? '-' : ''}¥${formatted}`;
}
