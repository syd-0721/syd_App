/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Sparkles,
  Wallet,
  Settings,
  PlusCircle,
} from 'lucide-react';
import {
  DailyOverbudgetNote,
  ExpenseRecord,
  MonthlyBudget,
} from './types/ledger';
import {
  INITIAL_BUDGETS,
  INITIAL_EXPENSES,
  INITIAL_OVERBUDGET_NOTES,
} from './data/seedData';
import {
  buildMonthDaySummaries,
  calculateDailyAverageDisposable,
  calculateDisposableSummary,
  calculateMoMComparison,
  calculateOverspendForecast,
  calculateWeeklyStatuses,
  detectSpendingAnomalies,
  getActiveWeeklyWarnings,
} from './utils/ledger';
import { BudgetHeaderCard } from './components/BudgetHeaderCard';
import { WeeklyWarningBanner } from './components/WeeklyWarningBanner';
import { QuickExpenseForm } from './components/QuickExpenseForm';
import { ExpenseCalendar } from './components/ExpenseCalendar';
import { AIReportPanel } from './components/AIReportPanel';
import {
  SettingsPanel,
  ThemeMode,
  FontStyle,
  FontScale,
  DeepSeekUserConfig,
} from './components/SettingsPanel';

const STORAGE_KEYS = {
  BUDGETS: 'everledger_budgets_v2',
  EXPENSES: 'everledger_expenses_v2',
  NOTES: 'everledger_red_notes_v2',
  THEME: 'everledger_theme_v2',
  FONT_STYLE: 'everledger_font_style_v2',
  FONT_SCALE: 'everledger_font_scale_v2',
  DEEPSEEK_CONFIG: 'everledger_deepseek_config_v2',
};

type PageKey = 'ledger' | 'add' | 'calendar' | 'ai' | 'settings';

const PAGES: Array<{ key: PageKey; label: string; icon: React.ReactNode }> = [
  { key: 'ledger', label: '记账', icon: <Wallet className="w-4 h-4" /> },
  { key: 'add', label: '记一笔', icon: <PlusCircle className="w-4 h-4" /> },
  { key: 'calendar', label: '日历', icon: <Calendar className="w-4 h-4" /> },
  { key: 'ai', label: '分析', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'settings', label: '设置', icon: <Settings className="w-4 h-4" /> },
];

export default function App() {
  const [currentMonthKey, setCurrentMonthKey] = useState<string>('2026-11');
  const [[activePageIndex, direction], setPageState] = useState<[number, number]>([0, 1]);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);

  const navigateToPage = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(PAGES.length - 1, nextIndex));
    if (clamped === activePageIndex) return;
    setPageState([clamped, clamped > activePageIndex ? 1 : -1]);
  };

  useEffect(() => {
    let rafId: number | null = null;
    const updateHeaderState = () => {
      const y = window.scrollY;
      setIsHeaderCollapsed((prev) => {
        if (!prev && y > 36) return true;
        if (prev && y <= 6) return false;
        return prev;
      });
      rafId = null;
    };

    const handleScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateHeaderState);
      }
    };

    updateHeaderState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [fontStyle, setFontStyle] = useState<FontStyle>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FONT_STYLE);
      return (saved as FontStyle) || 'sans';
    } catch {
      return 'sans';
    }
  });

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FONT_SCALE);
      return (saved as FontScale) || 'md';
    } catch {
      return 'md';
    }
  });

  const [deepseekConfig, setDeepseekConfig] = useState<DeepSeekUserConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEEPSEEK_CONFIG);
      return saved
        ? JSON.parse(saved)
        : { apiKey: '', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' };
    } catch {
      return { apiKey: '', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' };
    }
  });

  const [budgets, setBudgets] = useState<Record<string, MonthlyBudget>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
    } catch {
      return INITIAL_BUDGETS;
    }
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [overbudgetNotes, setOverbudgetNotes] = useState<Record<string, DailyOverbudgetNote>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTES);
      return saved ? JSON.parse(saved) : INITIAL_OVERBUDGET_NOTES;
    } catch {
      return INITIAL_OVERBUDGET_NOTES;
    }
  });

  const [selectedDate, setSelectedDate] = useState<string>('2026-11-05');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontStyle);
    try {
      localStorage.setItem(STORAGE_KEYS.FONT_STYLE, fontStyle);
    } catch {
      // ignore
    }
  }, [fontStyle]);

  useEffect(() => {
    document.documentElement.setAttribute('data-scale', fontScale);
    try {
      localStorage.setItem(STORAGE_KEYS.FONT_SCALE, fontScale);
    } catch {
      // ignore
    }
  }, [fontScale]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DEEPSEEK_CONFIG, JSON.stringify(deepseekConfig));
    } catch {
      // ignore
    }
  }, [deepseekConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    } catch {
      // ignore
    }
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch {
      // ignore
    }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(overbudgetNotes));
    } catch {
      // ignore
    }
  }, [overbudgetNotes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        navigateToPage(activePageIndex - 1);
      } else if (e.key === 'ArrowRight') {
        navigateToPage(activePageIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePageIndex]);

  const touchStartXRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > 60) {
      if (deltaX < 0 && activePageIndex < PAGES.length - 1) {
        navigateToPage(activePageIndex + 1);
      } else if (deltaX > 0 && activePageIndex > 0) {
        navigateToPage(activePageIndex - 1);
      }
    }
    touchStartXRef.current = null;
  };

  const currentBudget: MonthlyBudget = useMemo(() => {
    if (budgets[currentMonthKey]) {
      return budgets[currentMonthKey];
    }
    const existingList = Object.values(budgets);
    if (existingList.length > 0) {
      const template = existingList[0];
      return {
        monthKey: currentMonthKey,
        disposable: template.disposable,
        floating: template.floating,
        savings: template.savings,
      };
    }
    return {
      monthKey: currentMonthKey,
      disposable: 0,
      floating: 0,
      savings: 0,
    };
  }, [budgets, currentMonthKey]);

  const disposableSummary = useMemo(
    () => calculateDisposableSummary(currentBudget, expenses),
    [currentBudget, expenses]
  );

  const weeklyStatuses = useMemo(
    () => calculateWeeklyStatuses(currentBudget, expenses),
    [currentBudget, expenses]
  );

  const activeWeeklyWarnings = useMemo(
    () => getActiveWeeklyWarnings(currentBudget, expenses),
    [currentBudget, expenses]
  );

  const dailyAverageThreshold = useMemo(
    () => calculateDailyAverageDisposable(currentBudget),
    [currentBudget]
  );

  const daySummaries = useMemo(
    () => buildMonthDaySummaries(currentBudget, expenses, overbudgetNotes),
    [currentBudget, expenses, overbudgetNotes]
  );

  const selectedDayExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.date === selectedDate)
        .sort((a, b) => b.createdAt - a.createdAt),
    [expenses, selectedDate]
  );

  const momComparison = useMemo(
    () => calculateMoMComparison(currentMonthKey, expenses),
    [currentMonthKey, expenses]
  );

  const anomalies = useMemo(
    () => detectSpendingAnomalies(currentBudget, expenses, overbudgetNotes),
    [currentBudget, expenses, overbudgetNotes]
  );

  const forecast = useMemo(
    () => calculateOverspendForecast(currentBudget, expenses),
    [currentBudget, expenses]
  );

  const handleChangeMonth = (newMonthKey: string) => {
    setCurrentMonthKey(newMonthKey);
    // 切换月份后，优先选中该月有消费记录的最近一天，否则选中该月 01 日
    const monthExps = expenses
      .filter((e) => e.date.startsWith(newMonthKey))
      .sort((a, b) => b.date.localeCompare(a.date));
    if (monthExps.length > 0) {
      setSelectedDate(monthExps[0].date);
    } else {
      setSelectedDate(`${newMonthKey}-01`);
    }
  };

  const handleUpdateBudget = (updated: MonthlyBudget) => {
    setBudgets((prev) => ({
      ...prev,
      [updated.monthKey]: updated,
    }));
  };

  const handleAddExpense = (newExp: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    const record: ExpenseRecord = {
      ...newExp,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    setExpenses((prev) => [record, ...prev]);

    const expMonth = newExp.date.slice(0, 7);
    if (expMonth !== currentMonthKey) {
      setCurrentMonthKey(expMonth);
    }
    setSelectedDate(newExp.date);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveOverbudgetNote = (date: string, explanation: string) => {
    setOverbudgetNotes((prev) => ({
      ...prev,
      [date]: {
        date,
        explanation,
        updatedAt: Date.now(),
      },
    }));
  };

  const handleResetAllToZero = () => {
    setBudgets({
      [currentMonthKey]: {
        monthKey: currentMonthKey,
        disposable: 0,
        floating: 0,
        savings: 0,
      },
    });
    setExpenses([]);
    setOverbudgetNotes({});
    setSelectedDate(`${currentMonthKey}-01`);
  };

  const activePage = PAGES[activePageIndex].key;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen flex flex-col pb-28"
    >
      {/* 固定高度占位层：确保页眉收缩/展开时绝不改变页面总滚动高度，彻底消除滚动高度反馈跳动 */}
      <div aria-hidden="true" className="h-[76px] sm:h-[84px] shrink-0" />

      {/* Layer 2 Collapsible Large-Title Header: 固定定位 + 迟滞防抖阈值 + GPU Transform 缩放 */}
      <header
        data-testid="collapsible-header"
        data-collapsed={isHeaderCollapsed ? 'true' : 'false'}
        className={`fixed top-0 left-0 right-0 z-30 transition-[height,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] px-4 sm:px-8 flex items-center justify-between gap-6 ${
          isHeaderCollapsed
            ? 'h-[54px] liquid-glass-floating border-b border-[var(--ef-border)]'
            : 'h-[76px] sm:h-[84px] bg-[var(--ef-bg)]/85 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            navigateToPage(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="relative flex items-center gap-2.5 whitespace-nowrap shrink-0 h-full"
        >
          <img
            src="/app-icon.png"
            alt="Eg 东方账"
            className={`w-10 h-10 rounded-xl border border-[var(--ef-border)] object-cover shadow-2xs origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isHeaderCollapsed ? 'scale-[0.78]' : 'scale-100'
            }`}
          />
          <div className="relative flex flex-col items-start justify-center h-full">
            <span
              data-testid="header-aux-label"
              aria-hidden={isHeaderCollapsed ? 'true' : undefined}
              className={`font-mono text-[11px] font-semibold tracking-[0.18em] text-[#93B259] leading-none transition-[opacity,transform] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left ${
                isHeaderCollapsed
                  ? 'opacity-0 -translate-y-2 scale-90 pointer-events-none'
                  : 'opacity-100 translate-y-0 scale-100'
              }`}
            >
              {'\u00A0Eg\u00A0'}
            </span>
            <span
              data-testid="header-main-title"
              className={`text-2xl sm:text-[26px] font-extrabold tracking-tight text-[var(--ef-fg-strong)] leading-tight origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isHeaderCollapsed
                  ? '-translate-y-[7px] scale-[0.70]'
                  : 'translate-y-0.5 scale-100'
              }`}
            >
              东方账
            </span>
          </div>
        </a>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigateToPage(1)}
            className={`type-caption !text-white font-semibold bg-[#93B259] hover:bg-[#82A248] rounded-2xl whitespace-nowrap shrink-0 cursor-pointer shadow-xs min-h-[38px] px-4 py-2 origin-right transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isHeaderCollapsed ? 'scale-90' : 'scale-100'
            }`}
          >
            记一笔
          </button>
        </div>
      </header>

      {/* Main Content Container (Unified 16px / 24px spacing scale) */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* 常驻周超支悬浮提示条 */}
        {activePage !== 'ledger' && activeWeeklyWarnings.length > 0 && (
          <div
            role="alert"
            className="liquid-glass-alert px-4 py-3 flex items-center justify-between gap-3 spatial-morph"
          >
            <span className="type-body font-bold !text-[#9E2A2B] dark:!text-[#F29B9C]">
              周超支常驻警告：{activeWeeklyWarnings[0].label}已超支 ¥{activeWeeklyWarnings[0].overAmount}
            </span>
            <button
              type="button"
              onClick={() => navigateToPage(0)}
              className="type-caption underline !text-[#9E2A2B] dark:!text-[#F29B9C] cursor-pointer whitespace-nowrap"
            >
              查看详情
            </button>
          </div>
        )}

        {/* 6. 连续空间动画：保持不同页面之间的左右空间位移关系 */}
        <div
          key={activePage}
          className={`space-y-4 ${
            direction >= 0 ? 'spatial-slide-right' : 'spatial-slide-left'
          }`}
        >
          {activePage === 'ledger' && (
            <div className="space-y-4">
              <BudgetHeaderCard
                budget={currentBudget}
                onUpdateBudget={handleUpdateBudget}
                disposableSummary={disposableSummary}
              />

              <WeeklyWarningBanner
                weeks={weeklyStatuses}
                activeWarnings={activeWeeklyWarnings}
                monthlyDisposable={currentBudget.disposable}
              />
            </div>
          )}

          {activePage === 'add' && (
            <QuickExpenseForm
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              dayExpenses={selectedDayExpenses}
              dailyAverageThreshold={dailyAverageThreshold}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activePage === 'calendar' && (
            <ExpenseCalendar
              monthKey={currentMonthKey}
              onChangeMonth={handleChangeMonth}
              allExpenses={expenses}
              daySummaries={daySummaries}
              dailyAverageThreshold={dailyAverageThreshold}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onDeleteExpense={handleDeleteExpense}
              onSaveOverbudgetNote={handleSaveOverbudgetNote}
            />
          )}

          {activePage === 'ai' && (
            <AIReportPanel
              budget={currentBudget}
              disposableSummary={disposableSummary}
              weeklyWarnings={activeWeeklyWarnings}
              momComparison={momComparison}
              anomalies={anomalies}
              forecast={forecast}
              daySummaries={daySummaries}
              deepseekConfig={deepseekConfig}
            />
          )}

          {activePage === 'settings' && (
            <SettingsPanel
              theme={theme}
              onChangeTheme={setTheme}
              fontStyle={fontStyle}
              onChangeFontStyle={setFontStyle}
              fontScale={fontScale}
              onChangeFontScale={setFontScale}
              deepseekConfig={deepseekConfig}
              onChangeDeepseekConfig={setDeepseekConfig}
              onResetAllToZero={handleResetAllToZero}
            />
          )}
        </div>
      </main>

      {/* Layer 2 Floating Capsule Navigation Dock (整体悬浮胶囊导航 + 大范围低透明度双层柔和阴影) */}
      <nav
        aria-label="底部页面导航"
        data-testid="floating-capsule-nav"
        className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[calc(100%-48px)] sm:max-w-md z-40 rounded-full liquid-glass-capsule-dock p-1.5"
      >
        <div className="relative grid grid-cols-5 items-center h-13">
          {/* Continuous sliding capsule indicator */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0.5 left-0 w-1/5 rounded-full bg-[#93B259]/20 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${activePageIndex * 100}%)` }}
          />
          {PAGES.map((p, idx) => {
            const isActive = activePageIndex === idx;
            return (
              <button
                key={p.key}
                type="button"
                data-testid={`bottom-tab-${p.key}`}
                onClick={() => navigateToPage(idx)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative z-10 min-h-[44px] flex flex-col items-center justify-center rounded-full cursor-pointer ${
                  isActive
                    ? 'text-[#93B259] font-bold'
                    : 'text-[var(--ef-fg)] opacity-75 hover:opacity-100'
                }`}
              >
                {p.icon}
                <span className="type-caption !text-current mt-0.5 whitespace-nowrap">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
