import React, { useState } from 'react';
import { Edit3, Check, X, Wallet, ShieldAlert, PiggyBank, Layers } from 'lucide-react';
import { MonthlyBudget } from '../types/ledger';
import {
  calculateDailyAverageDisposable,
  calculateDisposableSummary,
  calculateTotalBudget,
  formatCurrency,
  roundCurrency,
} from '../utils/ledger';

interface BudgetHeaderCardProps {
  budget: MonthlyBudget;
  onUpdateBudget: (updated: MonthlyBudget) => void;
  disposableSummary: ReturnType<typeof calculateDisposableSummary>;
}

export const BudgetHeaderCard: React.FC<BudgetHeaderCardProps> = ({
  budget,
  onUpdateBudget,
  disposableSummary,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [disposableInput, setDisposableInput] = useState(String(budget.disposable));
  const [floatingInput, setFloatingInput] = useState(String(budget.floating));
  const [savingsInput, setSavingsInput] = useState(String(budget.savings));
  const [errorMsg, setErrorMsg] = useState('');

  const totalAmount = calculateTotalBudget(budget);
  const weeklyAllowance = roundCurrency(budget.disposable / 4);
  const dailyAverage = calculateDailyAverageDisposable(budget);

  const openEditor = () => {
    setDisposableInput(String(budget.disposable));
    setFloatingInput(String(budget.floating));
    setSavingsInput(String(budget.savings));
    setErrorMsg('');
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number(disposableInput);
    const f = Number(floatingInput);
    const s = Number(savingsInput);

    if (!Number.isFinite(d) || d < 0 || !Number.isFinite(f) || f < 0 || !Number.isFinite(s) || s < 0) {
      setErrorMsg('金额不能为负数');
      return;
    }

    onUpdateBudget({
      ...budget,
      disposable: roundCurrency(d),
      floating: roundCurrency(f),
      savings: roundCurrency(s),
    });
    setIsEditing(false);
  };

  const progressWidth = Math.min(100, Math.max(0, disposableSummary.usagePercentage));

  const dispShare = totalAmount > 0 ? Math.round((budget.disposable / totalAmount) * 100) : 0;
  const floatShare = totalAmount > 0 ? Math.round((budget.floating / totalAmount) * 100) : 0;
  const saveShare = totalAmount > 0 ? Math.max(0, 100 - dispShare - floatShare) : 0;

  return (
    <section
      aria-label="月度三金概览便当盒"
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
    >
      {/* 主卡片 (Primary Bento Tile - 7 cols): 剩余可支配大字卡 + 消耗进度 + 主池额度 */}
      <div className="lg:col-span-7 liquid-glass p-5 sm:p-6 flex flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="type-caption block">{budget.monthKey} 剩余可支配</span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="type-display font-mono tabular-nums">
                {formatCurrency(disposableSummary.remainingDisposable)}
              </h2>
              <span className="type-caption font-mono tabular-nums whitespace-nowrap">
                已支 {formatCurrency(disposableSummary.totalSpent)} · {disposableSummary.usagePercentage}%
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={openEditor}
            className="min-h-[38px] px-3.5 py-2 rounded-2xl bg-[#93B259] hover:bg-[#82A248] text-white type-caption !text-white font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>修改三金</span>
          </button>
        </div>

        {/* 进度条与周/日标准限额 */}
        <div className="space-y-2">
          <div className="w-full h-3 rounded-full bg-current/10 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                disposableSummary.isMonthOverBudget
                  ? 'bg-[#D14343] dark:bg-[#E67E80]'
                  : 'bg-[#93B259]'
              }`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="flex items-center justify-between type-caption font-mono tabular-nums">
            <span className="whitespace-nowrap">周限额 {formatCurrency(weeklyAllowance)}</span>
            <span className="whitespace-nowrap">日均 {formatCurrency(dailyAverage)}</span>
          </div>
        </div>

        {/* 主次分明的内部子卡：可支配主池占宽幅 (7 cols)，旁侧展示总金额 (5 cols) */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7 liquid-glass-subtle p-4 flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <span className="type-caption block whitespace-nowrap">可支配金额</span>
              <span className="type-title font-mono tabular-nums block">
                {formatCurrency(budget.disposable)}
              </span>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-[#93B259]/15 flex items-center justify-center text-[#93B259] shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="sm:col-span-5 liquid-glass-accent p-4 flex items-center justify-between gap-2 !rounded-2xl">
            <div className="space-y-1 min-w-0">
              <span className="type-caption !text-[var(--ef-fg-strong)] block whitespace-nowrap">总金额</span>
              <span
                data-testid="total-budget-amount"
                className="type-title font-mono tabular-nums block"
              >
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <Layers className="w-4 h-4 text-[#93B259] shrink-0" />
          </div>
        </div>

        {/* 悬浮内嵌编辑区（连续展开动画） */}
        {isEditing && (
          <form
            onSubmit={handleSave}
            aria-label="编辑月初三金预算表单"
            className="pt-4 border-t border-[var(--ef-border)] space-y-3 spatial-morph"
          >
            {errorMsg && (
              <p role="alert" className="type-caption !text-[#D14343] dark:!text-[#E67E80]">
                {errorMsg}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="input-disposable" className="type-caption block whitespace-nowrap">
                  可支配
                </label>
                <input
                  id="input-disposable"
                  type="number"
                  step="0.01"
                  min="1"
                  value={disposableInput}
                  onChange={(e) => setDisposableInput(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 liquid-glass-subtle font-mono tabular-nums type-body !text-[var(--ef-fg-strong)] focus:outline-none focus:ring-2 focus:ring-[#93B259]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="input-floating" className="type-caption block whitespace-nowrap">
                  浮动
                </label>
                <input
                  id="input-floating"
                  type="number"
                  step="0.01"
                  min="0"
                  value={floatingInput}
                  onChange={(e) => setFloatingInput(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 liquid-glass-subtle font-mono tabular-nums type-body !text-[var(--ef-fg-strong)] focus:outline-none focus:ring-2 focus:ring-[#93B259]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="input-savings" className="type-caption block whitespace-nowrap">
                  节约
                </label>
                <input
                  id="input-savings"
                  type="number"
                  step="0.01"
                  min="0"
                  value={savingsInput}
                  onChange={(e) => setSavingsInput(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 liquid-glass-subtle font-mono tabular-nums type-body !text-[var(--ef-fg-strong)] focus:outline-none focus:ring-2 focus:ring-[#93B259]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[38px] px-4 py-2 liquid-glass-subtle type-caption !text-[var(--ef-fg-strong)] flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>取消</span>
              </button>
              <button
                type="submit"
                className="min-h-[38px] px-4 py-2 rounded-2xl bg-[#93B259] hover:bg-[#82A248] text-white type-caption !text-white font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>保存</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 右侧次级便当盒组合 (Secondary Asymmetric Bento Stack - 5 cols) */}
      <div className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-1 gap-4">
        {/* 节约金额卡 */}
        <div className="liquid-glass p-4 sm:p-6 flex flex-col justify-between gap-3 bento-interactive">
          <div className="flex items-center justify-between gap-2">
            <span className="type-caption whitespace-nowrap">节约金额 · {saveShare}%</span>
            <PiggyBank className="w-4 h-4 text-[#93B259] shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="type-title !text-xl sm:!text-2xl font-mono tabular-nums">
              {formatCurrency(budget.savings)}
            </span>
            <span className="type-caption text-[#93B259] whitespace-nowrap">储蓄</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-current/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#93B259]"
              style={{ width: `${saveShare}%` }}
            />
          </div>
        </div>

        {/* 浮动金额卡 */}
        <div className="liquid-glass p-4 sm:p-6 flex flex-col justify-between gap-3 bento-interactive">
          <div className="flex items-center justify-between gap-2">
            <span className="type-caption whitespace-nowrap">浮动金额 · {floatShare}%</span>
            <ShieldAlert className="w-4 h-4 text-[#D67D22] shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="type-title !text-xl sm:!text-2xl font-mono tabular-nums">
              {formatCurrency(budget.floating)}
            </span>
            <span className="type-caption whitespace-nowrap">备用</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-current/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#D67D22]"
              style={{ width: `${floatShare}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
