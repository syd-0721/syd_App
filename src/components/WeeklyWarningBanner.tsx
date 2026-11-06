import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { WeekStatus } from '../types/ledger';
import { formatCurrency } from '../utils/ledger';

interface WeeklyWarningBannerProps {
  weeks: WeekStatus[];
  activeWarnings: WeekStatus[];
  monthlyDisposable: number;
}

export const WeeklyWarningBanner: React.FC<WeeklyWarningBannerProps> = ({
  weeks,
  activeWarnings,
  monthlyDisposable,
}) => {
  const weeklyLimit = monthlyDisposable / 4;

  // Identify primary focal week (first over-budget week, or Week 1)
  const focalWeek = activeWarnings[0] || weeks[0];
  const secondaryWeeks = weeks.filter((w) => w.weekIndex !== focalWeek.weekIndex);

  return (
    <section aria-label="周度额度与超支预警便当盒" className="space-y-4">
      {/* 便当盒主次划分：重点关注周占 5 列大卡，其余三周占 7 列紧凑子网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 主周度焦点卡 (5 cols) */}
        <div
          role={activeWarnings.length > 0 ? 'alert' : undefined}
          data-testid={
            activeWarnings.length > 0 ? 'weekly-overbudget-warning' : 'weekly-safe-banner'
          }
          className={`lg:col-span-5 p-6 flex flex-col justify-between gap-3 ${
            focalWeek.isOverBudget ? 'liquid-glass-alert' : 'liquid-glass-accent'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {focalWeek.isOverBudget ? (
                <AlertTriangle className="w-4 h-4 text-[#D14343] dark:text-[#E67E80] shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#93B259] shrink-0" />
              )}
              <span className="type-title">
                {focalWeek.isOverBudget
                  ? `${focalWeek.label}超支预警`
                  : `${focalWeek.label}预算正常`}
              </span>
            </div>
            <span className="type-caption font-mono tabular-nums">
              {focalWeek.startDay}–{focalWeek.endDay}日
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <span
              className={`type-display !text-2xl ${
                focalWeek.isOverBudget
                  ? '!text-[#D14343] dark:!text-[#E67E80]'
                  : '!text-[var(--ef-fg-strong)]'
              }`}
            >
              {formatCurrency(focalWeek.spent)}
            </span>
            <span className="type-caption">
              周限额 {formatCurrency(weeklyLimit)} ·{' '}
              <strong
                className={
                  focalWeek.isOverBudget
                    ? 'text-[#D14343] dark:text-[#E67E80]'
                    : 'text-[#93B259]'
                }
              >
                {focalWeek.isOverBudget
                  ? `超 ${formatCurrency(focalWeek.overAmount)}`
                  : `余 ${formatCurrency(focalWeek.remaining)}`}
              </strong>
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-current/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                focalWeek.isOverBudget
                  ? 'bg-[#D14343] dark:bg-[#E67E80]'
                  : 'bg-[#93B259]'
              }`}
              style={{
                width: `${
                  focalWeek.budget > 0
                    ? Math.min(100, Math.round((focalWeek.spent / focalWeek.budget) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* 其余三周次级便当格 (7 cols -> 3 sub-tiles) */}
        <div className="lg:col-span-7 grid grid-cols-3 gap-3 sm:gap-4">
          {secondaryWeeks.map((week) => {
            const pct =
              week.budget > 0 ? Math.min(100, Math.round((week.spent / week.budget) * 100)) : 0;
            return (
              <div
                key={week.weekIndex}
                className={`p-3.5 sm:p-4 flex flex-col justify-between gap-2 bento-interactive ${
                  week.isOverBudget ? 'liquid-glass-alert' : 'liquid-glass'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="type-body font-bold !text-[var(--ef-fg-strong)] whitespace-nowrap">
                    {week.label}
                  </span>
                  <span className="hidden sm:inline type-caption font-mono tabular-nums whitespace-nowrap">
                    {week.startDay}-{week.endDay}日
                  </span>
                </div>

                <div className="space-y-0.5 font-mono tabular-nums">
                  <div
                    className={`type-title ${
                      week.isOverBudget
                        ? '!text-[#D14343] dark:!text-[#E67E80]'
                        : '!text-[var(--ef-fg-strong)]'
                    }`}
                  >
                    {formatCurrency(week.spent)}
                  </div>
                  <div className="type-caption">
                    <span
                      className={`whitespace-nowrap ${
                        week.isOverBudget
                          ? 'text-[#D14343] dark:text-[#E67E80] font-bold'
                          : 'text-[#93B259] font-semibold'
                      }`}
                    >
                      {week.isOverBudget
                        ? `超 ${formatCurrency(week.overAmount)}`
                        : `余 ${formatCurrency(week.remaining)}`}
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-current/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      week.isOverBudget
                        ? 'bg-[#D14343] dark:bg-[#E67E80]'
                        : 'bg-[#93B259]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
