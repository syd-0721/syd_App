import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  ShieldCheck,
  RefreshCw,
  Lightbulb,
  Flame,
} from 'lucide-react';
import {
  AIAnalysisResult,
  CategoryMoMItem,
  DaySummary,
  ExpenseCategory,
  MonthlyBudget,
  OverspendForecast,
  SpendingAnomaly,
  WeekStatus,
} from '../types/ledger';
import { calculateDisposableSummary, formatCurrency } from '../utils/ledger';
import { DeepSeekUserConfig } from './SettingsPanel';

interface AIReportPanelProps {
  budget: MonthlyBudget;
  disposableSummary: ReturnType<typeof calculateDisposableSummary>;
  weeklyWarnings: WeekStatus[];
  momComparison: CategoryMoMItem[];
  anomalies: SpendingAnomaly[];
  forecast: OverspendForecast;
  daySummaries: DaySummary[];
  deepseekConfig?: DeepSeekUserConfig;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  餐饮: '#93B259',
  购物: '#D67D22',
  充值缴费: '#3A94C5',
  休闲娱乐: '#DF69BA',
  其他支出: '#8C979A',
};

export const AIReportPanel: React.FC<AIReportPanelProps> = ({
  budget,
  disposableSummary,
  weeklyWarnings,
  momComparison,
  anomalies,
  forecast,
  daySummaries,
  deepseekConfig,
}) => {
  const redDays = daySummaries.filter((d) => d.isRedCell);

  const buildLocalPreview = useCallback((): AIAnalysisResult => {
    const tips = momComparison
      .filter((m) => m.currentAmount > 0 || m.previousAmount > 0)
      .map((m) => m.personalizedTip)
      .slice(0, 3);

    return {
      provider: 'DeepSeek',
      healthScore: forecast.willOverspend ? 66 : 90,
      headline: forecast.willOverspend ? '首周超支，建议控支' : '预算稳健，结余充足',
      summary: '',
      overspendWarning: forecast.warningMessage,
      consumptionPatternInsight: '',
      anomalyReview: '',
      personalizedSavingTips:
        tips.length > 0
          ? tips
          : ['您本月在餐饮上的花费比上月增加了20%，建议尝试自己做饭以节省开支。'],
      generatedAt: '刚刚',
    };
  }, [momComparison, forecast]);

  const [aiResult, setAiResult] = useState<AIAnalysisResult>(() => buildLocalPreview());
  const [isLoading, setIsLoading] = useState(false);

  const runDeepSeekAnalysis = useCallback(async () => {
    const fallbackPreview = buildLocalPreview();
    setAiResult(fallbackPreview);
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget,
          disposableSummary,
          weeklyWarnings,
          momComparison,
          anomalies,
          forecast,
          redDays,
          deepseekConfig,
        }),
      });
      if (response.ok) {
        const data: AIAnalysisResult = await response.json();
        setAiResult(data);
        setIsLoading(false);
        return;
      }
    } catch {
      // If running in standalone Android APK without /api/ai-analyze, try direct DeepSeek call if user configured an API key
    }

    if (deepseekConfig?.apiKey?.trim()) {
      try {
        const baseUrl = (deepseekConfig.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
        const endpoint = baseUrl.endsWith('/v1')
          ? `${baseUrl}/chat/completions`
          : `${baseUrl}/v1/chat/completions`;
        const dsRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${deepseekConfig.apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: deepseekConfig.model || 'deepseek-chat',
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content:
                  '你是记账AI助手。仅输出纯JSON：{"healthScore":75,"headline":"12字内结论","personalizedSavingTips":["建议1","建议2","建议3"]}，字符串内严禁使用双引号。',
              },
              {
                role: 'user',
                content: JSON.stringify({
                  month: budget.monthKey,
                  disposable: budget.disposable,
                  spent: disposableSummary.totalSpent,
                  willOverspend: forecast.willOverspend,
                  categories: momComparison.map((m) => ({
                    c: m.category,
                    cur: m.currentAmount,
                    mom: m.momPercentage,
                  })),
                }),
              },
            ],
          }),
        });
        if (dsRes.ok) {
          const dsData = await dsRes.json();
          const content: string = dsData?.choices?.[0]?.message?.content || '';
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            setAiResult({
              ...fallbackPreview,
              healthScore: Number(parsed.healthScore) || fallbackPreview.healthScore,
              headline: parsed.headline || fallbackPreview.headline,
              personalizedSavingTips:
                Array.isArray(parsed.personalizedSavingTips) &&
                parsed.personalizedSavingTips.length > 0
                  ? parsed.personalizedSavingTips
                  : fallbackPreview.personalizedSavingTips,
            });
          }
        }
      } catch {
        // keep local preview on error
      }
    }
    setIsLoading(false);
  }, [
    buildLocalPreview,
    budget,
    disposableSummary,
    weeklyWarnings,
    momComparison,
    anomalies,
    forecast,
    redDays,
    deepseekConfig,
  ]);

  useEffect(() => {
    runDeepSeekAnalysis();
  }, [
    budget.monthKey,
    budget.disposable,
    disposableSummary.totalSpent,
    deepseekConfig?.apiKey,
    deepseekConfig?.model,
  ]);

  const maxCategoryValue = Math.max(
    ...momComparison.map((m) => Math.max(m.currentAmount, m.previousAmount)),
    100
  );

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <section aria-label="AI收支分析便当盒" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* 便当格 1 (Top-Left 8 cols): 月末超支预测主预警卡 */}
      <div
        data-testid="overspend-forecast-card"
        className={`lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between gap-4 ${
          forecast.willOverspend ? 'liquid-glass-alert' : 'liquid-glass-accent'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {forecast.willOverspend ? (
              <AlertOctagon className="w-5 h-5 text-[#D14343] dark:text-[#E67E80] shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-[#93B259] shrink-0" />
            )}
            <span className="type-title whitespace-nowrap">
              {forecast.willOverspend ? '月末超支预警' : '月末结余预测'}
            </span>
          </div>
          <span className="type-caption font-mono tabular-nums whitespace-nowrap">
            {forecast.willOverspend && forecast.estimatedExhaustionDay
              ? `预计 ${forecast.estimatedExhaustionDay} 日耗尽`
              : `日均标准 ${formatCurrency(forecast.idealDailyBudget)}`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1 font-mono tabular-nums">
          <div className="liquid-glass-subtle p-3">
            <span className="type-caption block whitespace-nowrap">预计总支</span>
            <span
              className={`type-title mt-1 block whitespace-nowrap ${
                forecast.willOverspend
                  ? '!text-[#D14343] dark:!text-[#E67E80]'
                  : '!text-[var(--ef-fg-strong)]'
              }`}
            >
              {formatCurrency(Math.round(forecast.projectedMonthEndSpent))}
            </span>
          </div>

          <div className="liquid-glass-subtle p-3">
            <span className="type-caption block whitespace-nowrap">当前日均</span>
            <span className="type-title mt-1 block whitespace-nowrap">
              {formatCurrency(Math.round(forecast.currentDailyBurnRate))}
            </span>
          </div>

          <div className="liquid-glass-subtle p-3">
            <span className="type-caption block whitespace-nowrap">安全日均</span>
            <span className="type-title !text-[#93B259] mt-1 block whitespace-nowrap">
              {formatCurrency(Math.round(forecast.safeRemainingDailyAllowance))}
            </span>
          </div>
        </div>
      </div>

      {/* 便当格 2 (Top-Right 4 cols): DeepSeek 健康评分焦点小卡 */}
      <div className="lg:col-span-4 liquid-glass p-5 sm:p-6 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#93B259]" />
            <span className="type-title">健康评分</span>
          </div>
          <button
            type="button"
            onClick={runDeepSeekAnalysis}
            disabled={isLoading}
            className="min-h-[34px] px-3 py-1 rounded-2xl bg-[#93B259] hover:bg-[#82A248] disabled:opacity-60 text-white type-caption !text-white font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? '分析中' : '刷新'}</span>
          </button>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="type-display font-mono tabular-nums !text-[#93B259] shrink-0">
            {aiResult.healthScore}
            <small className="type-caption ml-1">分</small>
          </span>
          <span className="type-caption text-right font-medium !text-[var(--ef-fg-strong)]">
            {aiResult.headline.length > 12 ? aiResult.headline.slice(0, 12) : aiResult.headline}
          </span>
        </div>
      </div>

      {/* 便当格 3 (Bottom-Left 7 cols): 分类环形图 + 环比双轨条 */}
      <div className="lg:col-span-7 liquid-glass p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="type-title whitespace-nowrap">分类占比与环比</h3>
          <span className="type-caption whitespace-nowrap">彩条: 本月 · 灰条: 上月</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          <div className="sm:col-span-4 flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeWidth="14"
                />
                {momComparison.map((item) => {
                  const pct = item.currentShare;
                  if (pct <= 0) return null;
                  const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                  cumulativePercent += pct;
                  return (
                    <circle
                      key={item.category}
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke={CATEGORY_COLORS[item.category]}
                      strokeWidth="14"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="type-caption">已花</span>
                <span className="type-body font-bold font-mono tabular-nums !text-[var(--ef-fg-strong)]">
                  {formatCurrency(disposableSummary.totalSpent)}
                </span>
              </div>
            </div>
          </div>

          <div className="sm:col-span-8 space-y-3" data-testid="mom-comparison-list">
            {momComparison.map((item) => {
              const curWidth = Math.min(
                100,
                Math.round((item.currentAmount / maxCategoryValue) * 100)
              );
              const prevWidth = Math.min(
                100,
                Math.round((item.previousAmount / maxCategoryValue) * 100)
              );
              const isUp = (item.momPercentage ?? 0) > 0;

              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between type-caption font-mono tabular-nums">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                      />
                      <span className="font-sans font-semibold text-[var(--ef-fg-strong)]">
                        {item.category}
                      </span>
                      <span>{item.currentShare}%</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--ef-fg-strong)]">
                        {formatCurrency(item.currentAmount)}
                      </span>
                      <span className="opacity-65">/{formatCurrency(item.previousAmount)}</span>
                      {item.momPercentage !== null && (
                        <span
                          className={`flex items-center font-bold ${
                            isUp
                              ? 'text-[#D14343] dark:text-[#E67E80]'
                              : 'text-[#93B259]'
                          }`}
                        >
                          {isUp ? (
                            <TrendingUp className="w-3 h-3 mr-0.5" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-0.5" />
                          )}
                          {isUp ? `+${item.momPercentage}%` : `${item.momPercentage}%`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-current/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${curWidth}%`,
                          backgroundColor: CATEGORY_COLORS[item.category],
                        }}
                      />
                    </div>
                    <div className="w-full h-1 rounded-full bg-current/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-current/35 transition-all"
                        style={{ width: `${prevWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 便当格 4 (Bottom-Right 5 cols): 异常单笔与个性化节约建议 */}
      <div
        data-testid="deepseek-ai-result"
        className="lg:col-span-5 liquid-glass p-6 flex flex-col justify-between gap-4"
      >
        {anomalies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 type-caption !text-[#D14343] dark:!text-[#E67E80] font-semibold">
              <Flame className="w-3.5 h-3.5" />
              <span>异常大额支出</span>
            </div>
            {anomalies.slice(0, 2).map((anom) => (
              <div
                key={anom.id}
                className="flex items-center justify-between type-caption font-mono tabular-nums p-3 liquid-glass-subtle"
              >
                <span className="truncate pr-2 !text-[var(--ef-fg-strong)]">
                  {anom.date.slice(5)} {anom.title}
                </span>
                <span className="!text-[#D14343] dark:!text-[#E67E80] font-bold shrink-0">
                  {formatCurrency(anom.amount)} · {anom.ratioToDailyAvg}x
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 type-title">
            <Lightbulb className="w-4 h-4 text-[#93B259]" />
            <span>DeepSeek 节约建议</span>
          </div>
          <ul className="space-y-2">
            {aiResult.personalizedSavingTips.slice(0, 3).map((tip, idx) => (
              <li
                key={idx}
                className="p-3 liquid-glass-subtle type-caption !text-[var(--ef-fg)] leading-relaxed"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
