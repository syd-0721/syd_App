import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthDaySummaries,
  calculateCategoryBreakdown,
  calculateDailyAverageDisposable,
  calculateDisposableSummary,
  calculateMoMComparison,
  calculateOverspendForecast,
  calculateTotalBudget,
  detectSpendingAnomalies,
  getActiveWeeklyWarnings,
} from './ledger';
import { ExpenseRecord, MonthlyBudget } from '../types/ledger';

const sampleBudget: MonthlyBudget = {
  monthKey: '2026-11',
  disposable: 2400,
  floating: 800,
  savings: 1800,
};

test('1. 三金相加等于总金额 (disposable + floating + savings = total)', () => {
  assert.equal(calculateTotalBudget(sampleBudget), 5000);
});

test('2. 单式记账法：花费直接从可支配金额中扣减', () => {
  const expenses: ExpenseRecord[] = [
    { id: '1', date: '2026-11-01', amount: 10, category: '餐饮', title: '早餐面条', createdAt: 1 },
    { id: '2', date: '2026-11-02', amount: 35.5, category: '购物', title: '生活日用', createdAt: 2 },
  ];
  const summary = calculateDisposableSummary(sampleBudget, expenses);
  assert.equal(summary.initialDisposable, 2400);
  assert.equal(summary.totalSpent, 45.5);
  assert.equal(summary.remainingDisposable, 2354.5);
  assert.equal(summary.isMonthOverBudget, false);
});

test('3. 周度预警机制：超过该月可支配金额 1/4 时触发常驻警告，降回额度内则解除警告', () => {
  const overBudgetExpenses: ExpenseRecord[] = [
    { id: '1', date: '2026-11-02', amount: 320, category: '购物', title: '秋冬外套', createdAt: 1 },
    { id: '2', date: '2026-11-05', amount: 330, category: '休闲娱乐', title: '聚餐演出', createdAt: 2 },
  ];

  const warnings = getActiveWeeklyWarnings(sampleBudget, overBudgetExpenses);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].weekIndex, 1);
  assert.equal(warnings[0].budget, 600);
  assert.equal(warnings[0].spent, 650);
  assert.equal(warnings[0].overAmount, 50);
  assert.equal(warnings[0].isOverBudget, true);

  const safeExpenses: ExpenseRecord[] = [
    { id: '1', date: '2026-11-02', amount: 320, category: '购物', title: '秋冬外套', createdAt: 1 },
    { id: '2', date: '2026-11-05', amount: 260, category: '休闲娱乐', title: '聚餐', createdAt: 2 },
  ];
  const clearedWarnings = getActiveWeeklyWarnings(sampleBudget, safeExpenses);
  assert.equal(clearedWarnings.length, 0);
});

test('4. 日历辅助机制：当日花费超过每日平均可支配金额时标记为红格，并支持红格备注', () => {
  assert.equal(calculateDailyAverageDisposable(sampleBudget), 80);

  const expenses: ExpenseRecord[] = [
    { id: '1', date: '2026-11-03', amount: 45, category: '餐饮', title: '工作餐', createdAt: 1 },
    { id: '2', date: '2026-11-05', amount: 128, category: '购物', title: '耳机配件', createdAt: 2 },
  ];
  const notes = {
    '2026-11-05': {
      date: '2026-11-05',
      explanation: '旧耳机损坏，购买替换配件属于刚需支出',
      updatedAt: 100,
    },
  };

  const days = buildMonthDaySummaries(sampleBudget, expenses, notes);
  const nov3 = days.find((d) => d.date === '2026-11-03')!;
  const nov5 = days.find((d) => d.date === '2026-11-05')!;

  assert.equal(nov3.isRedCell, false);
  assert.equal(nov3.spent, 45);

  assert.equal(nov5.isRedCell, true);
  assert.equal(nov5.spent, 128);
  assert.equal(nov5.overAmount, 48);
  assert.equal(nov5.explanationNote, '旧耳机损坏，购买替换配件属于刚需支出');
});

test('5. 支出分类汇总与环比上月建议生成（如餐饮环比增加20%建议自己做饭）', () => {
  const expenses: ExpenseRecord[] = [
    { id: 'p1', date: '2026-10-05', amount: 200, category: '餐饮', title: '上月餐饮', createdAt: 1 },
    { id: 'c1', date: '2026-11-05', amount: 240, category: '餐饮', title: '本月餐饮', createdAt: 2 },
  ];
  const mom = calculateMoMComparison('2026-11', expenses);
  const diningMom = mom.find((m) => m.category === '餐饮')!;
  assert.equal(diningMom.previousAmount, 200);
  assert.equal(diningMom.currentAmount, 240);
  assert.equal(diningMom.momPercentage, 20);
  assert.ok(diningMom.personalizedTip.includes('您本月在餐饮上的花费比上月增加了20%'));
  assert.ok(diningMom.personalizedTip.includes('自己做饭'));

  const breakdown = calculateCategoryBreakdown('2026-11', expenses);
  const dining = breakdown.find((b) => b.category === '餐饮')!;
  assert.equal(dining.amount, 240);
});

test('6. 异常支出识别与超支提前预测预警', () => {
  const expenses: ExpenseRecord[] = [
    { id: '1', date: '2026-11-01', amount: 60, category: '餐饮', title: '买菜做饭', createdAt: 1 },
    { id: '2', date: '2026-11-05', amount: 440, category: '购物', title: '人体工学椅配件', createdAt: 2 },
  ];
  const anomalies = detectSpendingAnomalies(sampleBudget, expenses, {});
  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0].title, '人体工学椅配件');

  const forecast = calculateOverspendForecast(sampleBudget, expenses, 5);
  assert.equal(forecast.currentDailyBurnRate, 100);
  assert.equal(forecast.projectedMonthEndSpent, 3000);
  assert.equal(forecast.willOverspend, true);
  assert.equal(forecast.estimatedExhaustionDay, 24);
  assert.ok(forecast.warningMessage.includes('超支提前预警'));
});
