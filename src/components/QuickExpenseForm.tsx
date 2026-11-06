import React, { useState, useEffect } from 'react';
import {
  Utensils,
  ShoppingBag,
  Zap,
  Gamepad2,
  MoreHorizontal,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { EXPENSE_CATEGORIES, ExpenseCategory, ExpenseRecord } from '../types/ledger';
import { formatCurrency, roundCurrency } from '../utils/ledger';

interface QuickExpenseFormProps {
  selectedDate: string;
  onSelectDate?: (date: string) => void;
  dayExpenses: ExpenseRecord[];
  dailyAverageThreshold?: number;
  onAddExpense: (expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (id: string) => void;
}

const CATEGORY_ICONS: Record<ExpenseCategory, React.ReactNode> = {
  餐饮: <Utensils className="w-4 h-4" />,
  购物: <ShoppingBag className="w-4 h-4" />,
  充值缴费: <Zap className="w-4 h-4" />,
  休闲娱乐: <Gamepad2 className="w-4 h-4" />,
  其他支出: <MoreHorizontal className="w-4 h-4" />,
};

export const QuickExpenseForm: React.FC<QuickExpenseFormProps> = ({
  selectedDate,
  onSelectDate,
  dayExpenses,
  dailyAverageThreshold = 80,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('餐饮');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isRecordsExpanded, setIsRecordsExpanded] = useState(true);

  useEffect(() => {
    setDate(selectedDate);
  }, [selectedDate]);

  const parsedAmount = Number(amountStr);
  const validAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? roundCurrency(parsedAmount) : 0;

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (onSelectDate && newDate) {
      onSelectDate(newDate);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validAmount || validAmount <= 0) {
      setErrorMsg('请输入有效金额');
      return;
    }

    const cleanTitle = title.trim() || category;
    onAddExpense({
      date,
      amount: validAmount,
      category,
      title: cleanTitle,
    });

    setAmountStr('');
    setTitle('');
    setErrorMsg('');
    setIsRecordsExpanded(true);
    setFeedbackMsg(`已记账 -${formatCurrency(validAmount)}`);
    setTimeout(() => setFeedbackMsg(''), 2500);
  };

  const dayTotal = roundCurrency(
    dayExpenses.reduce((sum, item) => sum + item.amount, 0)
  );
  const isOverDailyAvg = dayTotal > dailyAverageThreshold;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* 左侧主便当卡 (Primary Bento Tile - 7 cols): 记一笔表单 */}
      <section aria-label="记一笔" className="lg:col-span-7 liquid-glass p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="type-title">记一笔</h3>
          {feedbackMsg && (
            <span role="status" className="type-caption !text-[#93B259] font-semibold">
              {feedbackMsg}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            role="radiogroup"
            aria-label="选择支出类型"
            className="grid grid-cols-3 sm:grid-cols-5 gap-2.5"
          >
            {EXPENSE_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCategory(cat)}
                  className={`relative min-h-[54px] px-3 py-2 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    active
                      ? 'bg-[#93B259] text-white font-semibold shadow-sm'
                      : 'liquid-glass-subtle text-[var(--ef-fg)] hover:opacity-90'
                  }`}
                >
                  <span className="relative z-10">{CATEGORY_ICONS[cat]}</span>
                  <span className="relative z-10 whitespace-nowrap type-caption !text-current">
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="expense-amount-input" className="type-caption block">
                金额 (元)
              </label>
              <input
                id="expense-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full min-h-[44px] px-4 py-2 liquid-glass-subtle text-[var(--ef-fg-strong)] font-mono tabular-nums text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#93B259]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="expense-date-input" className="type-caption block">
                日期
              </label>
              <input
                id="expense-date-input"
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2 liquid-glass-subtle text-[var(--ef-fg-strong)] font-mono tabular-nums type-body focus:outline-none focus:ring-2 focus:ring-[#93B259]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="expense-title-input" className="type-caption block">
              备注说明
            </label>
            <input
              id="expense-title-input"
              type="text"
              placeholder="选填，如：午餐"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2 liquid-glass-subtle text-[var(--ef-fg-strong)] type-body focus:outline-none focus:ring-2 focus:ring-[#93B259]"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="type-caption !text-[#D14343] dark:!text-[#E67E80]">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full min-h-[48px] px-6 py-3 rounded-2xl bg-[#93B259] hover:bg-[#82A248] text-white type-body !text-white font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>确认记账</span>
          </button>
        </form>
      </section>

      {/* 右侧次级便当盒组合 (Secondary Bento Stack - 5 cols): 当日统计小卡 + 可折叠本日记录卡 */}
      <div className="lg:col-span-5 space-y-4">
        {/* 紧凑当日指标便当格 */}
        <div
          className={`p-4 flex items-center justify-between ${
            isOverDailyAvg ? 'liquid-glass-alert' : 'liquid-glass-accent'
          }`}
        >
          <div className="space-y-1">
            <span className="type-caption block">{date} 合计支出</span>
            <span
              className={`type-display !text-2xl font-mono tabular-nums block ${
                isOverDailyAvg ? '!text-[#D14343] dark:!text-[#E67E80]' : ''
              }`}
            >
              {formatCurrency(dayTotal)}
            </span>
          </div>
          <div className="text-right space-y-1 font-mono tabular-nums">
            <span className="type-caption block">日均标准 {formatCurrency(dailyAverageThreshold)}</span>
            <span
              className={`type-caption font-bold block ${
                isOverDailyAvg
                  ? '!text-[#D14343] dark:!text-[#E67E80]'
                  : '!text-[#93B259]'
              }`}
            >
              {isOverDailyAvg
                ? `超日均 ${formatCurrency(roundCurrency(dayTotal - dailyAverageThreshold))}`
                : '额度内'}
            </span>
          </div>
        </div>

        {/* 可折叠 / 可展开的本日记账记录卡片 */}
        <section
          aria-label="本日记一笔记录"
          className="liquid-glass p-6"
        >
          <button
            type="button"
            onClick={() => setIsRecordsExpanded((prev) => !prev)}
            aria-expanded={isRecordsExpanded}
            data-testid="toggle-daily-records"
            className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="type-title">本日记账记录</span>
              <span className="type-caption font-mono tabular-nums">
                ({dayExpenses.length}笔)
              </span>
            </div>

            <div className="flex items-center gap-1 type-caption !text-[#93B259] font-semibold shrink-0">
              <span>{isRecordsExpanded ? '收起' : '展开'}</span>
              {isRecordsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {isRecordsExpanded && (
            <div
              data-testid="daily-records-content"
              className="mt-4 pt-4 border-t border-[var(--ef-border)] space-y-2 spatial-morph"
            >
              {dayExpenses.length === 0 ? (
                <p className="type-caption py-4 text-center">
                  {date} 暂无记账记录
                </p>
              ) : (
                dayExpenses.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 liquid-glass-subtle"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#93B259] shrink-0">
                        {CATEGORY_ICONS[item.category]}
                      </span>
                      <span className="type-body font-semibold !text-[var(--ef-fg-strong)] truncate">
                        {item.title}
                      </span>
                      <span className="type-caption whitespace-nowrap">
                        · {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="type-body font-bold font-mono tabular-nums !text-[var(--ef-fg-strong)]">
                        -{formatCurrency(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(item.id)}
                        aria-label={`删除 ${item.title}`}
                        className="min-h-[32px] min-w-[32px] rounded-xl hover:bg-[#D14343]/15 text-current hover:text-[#D14343] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
