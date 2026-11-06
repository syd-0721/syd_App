import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { DaySummary, ExpenseRecord } from '../types/ledger';
import {
  formatCurrency,
  getPreviousMonthKey,
  getNextMonthKey,
  roundCurrency,
} from '../utils/ledger';

interface ExpenseCalendarProps {
  monthKey: string;
  onChangeMonth: (newMonthKey: string) => void;
  allExpenses: ExpenseRecord[];
  daySummaries: DaySummary[];
  dailyAverageThreshold: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onDeleteExpense: (id: string) => void;
  onSaveOverbudgetNote: (date: string, explanation: string) => void;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = ({
  monthKey,
  onChangeMonth,
  allExpenses,
  daySummaries,
  dailyAverageThreshold,
  selectedDate,
  onSelectDate,
  onDeleteExpense,
  onSaveOverbudgetNote,
}) => {
  const selectedDay =
    daySummaries.find((d) => d.date === selectedDate) || daySummaries[0];

  const [noteInput, setNoteInput] = useState(selectedDay?.explanationNote ?? '');
  const [noteSavedToast, setNoteSavedToast] = useState(false);

  useEffect(() => {
    setNoteInput(selectedDay?.explanationNote ?? '');
    setNoteSavedToast(false);
  }, [selectedDate, selectedDay?.explanationNote]);

  // 汇总所有有记账记录的月份（含当前浏览月份），方便一键切换查看所有月份内容
  const recordedMonths = useMemo(() => {
    const map = new Map<string, number>();
    map.set(monthKey, 0);
    for (const exp of allExpenses) {
      const mk = exp.date.slice(0, 7);
      map.set(mk, roundCurrency((map.get(mk) ?? 0) + exp.amount));
    }
    return Array.from(map.entries())
      .map(([mk, total]) => ({ monthKey: mk, total }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allExpenses, monthKey]);

  const [yearStr, monthStr] = monthKey.split('-');
  const firstDayWeekday = new Date(Number(yearStr), Number(monthStr) - 1, 1).getDay();
  const leadingBlanks = Array.from({ length: firstDayWeekday }, (_, i) => i);

  const redCellCount = daySummaries.filter((d) => d.isRedCell).length;

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;
    onSaveOverbudgetNote(selectedDay.date, noteInput.trim());
    setNoteSavedToast(true);
    setTimeout(() => setNoteSavedToast(false), 2000);
  };

  return (
    <section
      aria-label="消费日历便当盒"
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
    >
      {/* 左侧主便当卡 (Primary Bento Tile - 8 cols): 多月份切换 + 月度日历矩阵 */}
      <div className="lg:col-span-8 liquid-glass p-3.5 sm:p-6 space-y-3 sm:space-y-4">
        {/* 顶部月份自由切换栏 */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeMonth(getPreviousMonthKey(monthKey))}
              aria-label="上个月"
              data-testid="calendar-prev-month"
              className="min-h-[34px] min-w-[34px] rounded-xl liquid-glass-subtle flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="type-title font-mono tabular-nums px-1.5 whitespace-nowrap">
              {monthKey}
            </h3>
            <button
              type="button"
              onClick={() => onChangeMonth(getNextMonthKey(monthKey))}
              aria-label="下个月"
              data-testid="calendar-next-month"
              className="min-h-[34px] min-w-[34px] rounded-xl liquid-glass-subtle flex items-center justify-center cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="type-caption font-mono tabular-nums whitespace-nowrap">
            日均 {formatCurrency(dailyAverageThreshold)}
          </span>
        </div>

        {/* 所有已记账月份快捷切换标签 */}
        {recordedMonths.length > 0 && (
          <div
            aria-label="所有月份切换"
            className="flex flex-wrap items-center gap-2 px-1"
          >
            {recordedMonths.map((m) => {
              const active = m.monthKey === monthKey;
              return (
                <button
                  key={m.monthKey}
                  type="button"
                  data-testid={`month-chip-${m.monthKey}`}
                  onClick={() => onChangeMonth(m.monthKey)}
                  className={`min-h-[32px] px-3 py-1 rounded-xl type-caption font-mono tabular-nums font-semibold whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#93B259] !text-white shadow-xs'
                      : 'liquid-glass-subtle hover:opacity-90'
                  }`}
                >
                  {m.monthKey} · {formatCurrency(m.total)}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center type-caption">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div
          role="grid"
          aria-label="月度每日消费日历"
          className="grid grid-cols-7 gap-1.5 sm:gap-2"
        >
          {leadingBlanks.map((blankIdx) => (
            <div
              key={`blank-${blankIdx}`}
              aria-hidden="true"
              className="min-h-[54px] sm:min-h-[64px] rounded-2xl opacity-20"
            />
          ))}

          {daySummaries.map((day) => {
            const isSelected = day.date === selectedDate;
            const hasNote = Boolean(day.explanationNote && day.explanationNote.trim());

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelectDate(day.date)}
                aria-label={`${day.date}，花费 ${day.spent} 元${day.isRedCell ? '，超支红格' : ''}`}
                aria-pressed={isSelected}
                data-testid={`calendar-day-${day.dayOfMonth}`}
                data-red-cell={day.isRedCell ? 'true' : 'false'}
                className={`min-h-[54px] sm:min-h-[64px] px-1 py-1.5 sm:p-2 rounded-2xl flex flex-col justify-between items-center cursor-pointer ${
                  isSelected
                    ? day.isRedCell
                      ? 'liquid-glass-alert !rounded-2xl ring-2 ring-[#D14343] dark:ring-[#E67E80]'
                      : 'liquid-glass !rounded-2xl ring-2 ring-[#93B259]'
                    : day.isRedCell
                      ? 'liquid-glass-alert !rounded-2xl hover:opacity-90'
                      : 'liquid-glass-subtle hover:opacity-90'
                }`}
              >
                <div className="w-full flex items-center justify-between px-0.5">
                  <span
                    className={`text-[11px] sm:text-xs font-bold font-mono tabular-nums leading-none ${
                      day.isRedCell
                        ? 'text-[#D14343] dark:text-[#E67E80]'
                        : 'text-[var(--ef-fg-strong)]'
                    }`}
                  >
                    {day.dayOfMonth}
                  </span>
                  {day.isRedCell && hasNote && (
                    <span
                      title="已填超支备注"
                      className="w-1.5 h-1.5 rounded-full bg-[#D14343] dark:bg-[#E67E80] shrink-0"
                    />
                  )}
                </div>

                <div
                  className={`text-[11px] sm:text-xs font-mono tabular-nums font-semibold whitespace-nowrap leading-none ${
                    day.isRedCell
                      ? 'text-[#D14343] dark:text-[#E67E80] font-bold'
                      : day.spent > 0
                        ? 'text-[var(--ef-fg-strong)]'
                        : 'opacity-40'
                  }`}
                >
                  ¥{day.spent}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧次级便当栈 (Secondary Bento Stack - 4 cols): 红格统计小卡 + 选中日期明细与备注大卡 */}
      <div className="lg:col-span-4 space-y-4">
        {/* 紧凑红格统计小卡 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="liquid-glass p-4 space-y-1">
            <span className="type-caption block whitespace-nowrap">日均标准</span>
            <span className="type-title font-mono tabular-nums block">
              {formatCurrency(dailyAverageThreshold)}
            </span>
          </div>
          <div className="liquid-glass-alert p-4 space-y-1">
            <span className="type-caption !text-[#D14343] dark:!text-[#E67E80] block whitespace-nowrap">
              超支红格
            </span>
            <span className="type-title font-mono tabular-nums !text-[#D14343] dark:!text-[#E67E80] block">
              {redCellCount} 天
            </span>
          </div>
        </div>

        {/* 选中日期明细与红格超支备注卡 */}
        {selectedDay && (
          <div
            key={selectedDay.date}
            data-testid="selected-day-detail"
            className={`p-5 sm:p-6 space-y-4 spatial-morph ${
              selectedDay.isRedCell ? 'liquid-glass-alert' : 'liquid-glass'
            }`}
          >
            <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
              <span
                className={`type-title ${
                  selectedDay.isRedCell
                    ? '!text-[#D14343] dark:!text-[#E67E80]'
                    : '!text-[var(--ef-fg-strong)]'
                }`}
              >
                {selectedDay.date}
              </span>
              <strong
                className={`type-title ${
                  selectedDay.isRedCell
                    ? '!text-[#D14343] dark:!text-[#E67E80]'
                    : '!text-[var(--ef-fg-strong)]'
                }`}
              >
                {formatCurrency(selectedDay.spent)}
              </strong>
            </div>

            {selectedDay.isRedCell && (
              <div className="type-caption !text-[#D14343] dark:!text-[#E67E80] font-semibold">
                超日均标准 {formatCurrency(selectedDay.overAmount)}
              </div>
            )}

            <div className="space-y-2">
              {selectedDay.expenses.length === 0 ? (
                <p className="type-caption py-4 text-center">当日无支出</p>
              ) : (
                selectedDay.expenses.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-3 liquid-glass-subtle"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="type-body font-semibold !text-[var(--ef-fg-strong)] whitespace-nowrap">
                        {item.title}
                      </span>
                      <span className="type-caption whitespace-nowrap">
                        · {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`type-body font-bold font-mono tabular-nums ${
                          selectedDay.isRedCell
                            ? '!text-[#D14343] dark:!text-[#E67E80]'
                            : '!text-[var(--ef-fg-strong)]'
                        }`}
                      >
                        -{formatCurrency(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(item.id)}
                        aria-label={`删除 ${item.title}`}
                        className="min-h-[30px] min-w-[30px] rounded-xl hover:bg-[#D14343]/15 text-current hover:text-[#D14343] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedDay.isRedCell && (
              <form
                onSubmit={handleSaveNote}
                data-testid="red-cell-note-form"
                className="pt-3 border-t border-[var(--ef-border)] space-y-2"
              >
                <div className="flex items-center justify-between type-caption !text-[#D14343] dark:!text-[#E67E80] font-semibold">
                  <label htmlFor="red-cell-explanation-input">红格超支备注</label>
                  {noteSavedToast && (
                    <span className="text-[#93B259] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      已保存
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    id="red-cell-explanation-input"
                    type="text"
                    placeholder="输入超支原因备注..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 liquid-glass-subtle type-body !text-[var(--ef-fg-strong)] focus:outline-none focus:ring-2 focus:ring-[#D14343]"
                  />
                  <button
                    type="submit"
                    className="w-full min-h-[38px] px-4 py-2 rounded-2xl bg-[#D14343] hover:bg-[#B83232] text-white type-caption !text-white font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>保存备注</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
