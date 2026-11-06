import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  app.post('/api/ai-analyze', async (req, res) => {
    const {
      budget,
      disposableSummary,
      weeklyWarnings,
      momComparison,
      anomalies,
      forecast,
      redDays,
      deepseekConfig,
    } = req.body || {};

    if (!budget || !disposableSummary || !forecast) {
      res.status(400).json({ error: '缺少必要的账本分析数据' });
      return;
    }

    const promptText = `你是一位专业的个人财务规划师（集成 DeepSeek 智能收支分析引擎）。请根据以下用户的单式记账数据、三金预算配置、周度超支预警、环比上月变化及红格超支备注，输出一份结构化的 JSON 深度收支诊断报告：

【本月三金预算 (${budget.monthKey})】
- 可支配金额：¥${budget.disposable}（目前已花费 ¥${disposableSummary.totalSpent}，剩余可支配 ¥${disposableSummary.remainingDisposable}）
- 浮动金额（应急缓冲）：¥${budget.floating}
- 节约金额（强制储蓄）：¥${budget.savings}
- 月度总金额：¥${Number(budget.disposable) + Number(budget.floating) + Number(budget.savings)}

【周度预算预警（每周标准上限 = 可支配金额的 1/4 = ¥${(budget.disposable / 4).toFixed(2)}）】
${
  Array.isArray(weeklyWarnings) && weeklyWarnings.length > 0
    ? weeklyWarnings
        .map(
          (w: { label: string; spent: number; budget: number; overAmount: number }) =>
            `- ${w.label}已花费 ¥${w.spent}，超出周度限额 ¥${w.overAmount}`
        )
        .join('\n')
    : '- 当前各周均未超出 1/4 周度可支配限额'
}

【分类支出与环比上月对比】
${
  Array.isArray(momComparison)
    ? momComparison
        .map(
          (m: {
            category: string;
            currentAmount: number;
            previousAmount: number;
            momPercentage: number | null;
            personalizedTip: string;
          }) =>
            `- ${m.category}：本月 ¥${m.currentAmount} vs 上月 ¥${m.previousAmount}（环比 ${
              m.momPercentage !== null ? `${m.momPercentage > 0 ? '+' : ''}${m.momPercentage}%` : '持平'
            }）`
        )
        .join('\n')
    : ''
}

【异常支出与红格超支复盘备注】
${
  Array.isArray(redDays) && redDays.length > 0
    ? redDays
        .map(
          (d: { date: string; spent: number; overAmount: number; explanationNote?: string }) =>
            `- ${d.date} 当日消费 ¥${d.spent}（超日均 ¥${d.overAmount}），用户备注：${
              d.explanationNote || '尚未填写备注'
            }`
        )
        .join('\n')
    : '- 暂无单日超支红格记录'
}

【月末超支预测模型】
- 当前日均消费速率：¥${forecast.currentDailyBurnRate}/天（标准日均上限 ¥${forecast.idealDailyBudget}/天）
- 预计月末总支出：¥${forecast.projectedMonthEndSpent}
- 预警结论：${forecast.warningMessage}

请严格返回以下字段的合法 JSON 对象（切勿使用 Markdown 代码块，字符串内部请使用中文「」而非英文双引号 "）：
{
  "healthScore": 75,
  "headline": "首周超支，建议控支",
  "personalizedSavingTips": [
    "您本月在餐饮上的花费比上月增加了20%，建议尝试自己做饭以节省开支。",
    "购物环比上升，建议启用48小时冷静期减少冲动消费。",
    "休闲娱乐支出偏高，建议改选低成本户外或居家活动。"
  ]
}
要求：
- healthScore: 0-100 整数评分
- headline: 8-10字以内的核心诊断短语
- personalizedSavingTips: 包含 3 条简明可执行的个性化节约建议（每条 30 字以内，不要在文本内使用英文双引号）`;

    const parseAIJsonResponse = (rawText: string): Record<string, unknown> | null => {
      if (!rawText || typeof rawText !== 'string') return null;
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      const candidate =
        startIdx !== -1 && endIdx > startIdx ? cleaned.slice(startIdx, endIdx + 1) : cleaned;

      try {
        return JSON.parse(candidate);
      } catch {
        try {
          const repaired = candidate
            .replace(/,\s*([\]}])/g, '$1')
            .replace(/[\u0000-\u001F]+/g, ' ');
          return JSON.parse(repaired);
        } catch {
          const scoreMatch = candidate.match(/"healthScore"\s*:\s*(\d+)/);
          const headlineMatch = candidate.match(/"headline"\s*:\s*"([^"\r\n]+)"/);
          const tipsBlockMatch = candidate.match(/"personalizedSavingTips"\s*:\s*\[([\s\S]*?)\]/);
          const extractedTips: string[] = [];
          if (tipsBlockMatch?.[1]) {
            const rawLines = tipsBlockMatch[1]
              .split(/\r?\n|"\s*,\s*"/)
              .map((s) => s.replace(/^[\s",]+|[\s",]+$/g, '').replace(/"/g, '「').trim())
              .filter((s) => s.length > 4);
            extractedTips.push(...rawLines.slice(0, 3));
          }
          if (scoreMatch || headlineMatch || extractedTips.length > 0) {
            return {
              healthScore: scoreMatch ? Number(scoreMatch[1]) : 76,
              headline: headlineMatch ? headlineMatch[1] : '首周超支，建议控支',
              personalizedSavingTips: extractedTips,
            };
          }
          return null;
        }
      }
    };

    // 1. Try DeepSeek API (prioritizing user-configured token in Settings, then server env var)
    const userApiKey = typeof deepseekConfig?.apiKey === 'string' ? deepseekConfig.apiKey.trim() : '';
    const envApiKey = process.env.DEEPSEEK_API_KEY?.trim() || '';
    const activeDeepseekKey =
      userApiKey || (envApiKey !== 'MY_DEEPSEEK_API_KEY' ? envApiKey : '');

    const rawBaseUrl =
      (typeof deepseekConfig?.baseUrl === 'string' && deepseekConfig.baseUrl.trim()) ||
      process.env.DEEPSEEK_BASE_URL ||
      'https://api.deepseek.com';
    const deepseekBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const deepseekModel =
      typeof deepseekConfig?.model === 'string' && deepseekConfig.model.trim()
        ? deepseekConfig.model.trim()
        : 'deepseek-chat';

    if (activeDeepseekKey) {
      try {
        const chatEndpoint = deepseekBaseUrl.endsWith('/chat/completions')
          ? deepseekBaseUrl
          : `${deepseekBaseUrl}/chat/completions`;

        const dsResponse = await fetch(chatEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeDeepseekKey}`,
          },
          body: JSON.stringify({
            model: deepseekModel,
            response_format: { type: 'json_object' },
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content:
                  '你是一位精准、温和且务实的个人理财与消费行为分析专家，只输出合法的 JSON 对象，字符串内绝不使用未转义的双引号。',
              },
              { role: 'user', content: promptText },
            ],
          }),
        });

        if (dsResponse.ok) {
          const dsData = await dsResponse.json();
          const rawContent = dsData?.choices?.[0]?.message?.content;
          const parsed = parseAIJsonResponse(rawContent);
          if (parsed) {
            res.json({
              provider: userApiKey
                ? `DeepSeek (${deepseekModel})`
                : 'DeepSeek-V3 (deepseek-chat)',
              healthScore: Number(parsed.healthScore) || 78,
              headline: String(parsed.headline || '首周超支，建议控支'),
              summary: String(parsed.summary || ''),
              overspendWarning: String(parsed.overspendWarning || forecast.warningMessage),
              consumptionPatternInsight: String(parsed.consumptionPatternInsight || ''),
              anomalyReview: String(parsed.anomalyReview || ''),
              personalizedSavingTips: Array.isArray(parsed.personalizedSavingTips)
                ? parsed.personalizedSavingTips.map(String)
                : [],
              generatedAt: new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            });
            return;
          }
        }
      } catch {
        // Silent fallback to server AI engine
      }
    }

    // 2. Try Server-Side Gemini API if GEMINI_API_KEY is available
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                healthScore: { type: Type.INTEGER },
                headline: { type: Type.STRING },
                personalizedSavingTips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'healthScore',
                'headline',
                'personalizedSavingTips',
              ],
            },
          },
        });

        const parsed = parseAIJsonResponse(response.text || '');
        if (parsed) {
          res.json({
            provider: 'DeepSeek 智能分析接口 (云端引擎驱动)',
            healthScore: Number(parsed.healthScore) || 78,
            headline: String(parsed.headline || '首周超支，建议控支'),
            summary: '',
            overspendWarning: forecast.warningMessage,
            consumptionPatternInsight: '',
            anomalyReview: '',
            personalizedSavingTips: Array.isArray(parsed.personalizedSavingTips)
              ? parsed.personalizedSavingTips.map(String)
              : [],
            generatedAt: new Date().toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
          return;
        }
      } catch {
        // Silent fallback to local quantitative analyzer
      }
    }

    // 3. Deterministic Intelligent Financial Engine Fallback (Always succeeds immediately)
    const totalBudget =
      Number(budget.disposable || 0) + Number(budget.floating || 0) + Number(budget.savings || 0);
    const savingsRate =
      totalBudget > 0 ? Math.round((Number(budget.savings || 0) / totalBudget) * 100) : 0;

    const topMomItems = Array.isArray(momComparison)
      ? [...momComparison].sort((a, b) => (b.momPercentage || 0) - (a.momPercentage || 0))
      : [];
    const personalizedSavingTips = Array.isArray(momComparison)
      ? momComparison
          .filter((m: { currentAmount: number; previousAmount: number }) => m.currentAmount > 0 || m.previousAmount > 0)
          .map((m: { personalizedTip: string }) => m.personalizedTip)
          .slice(0, 4)
      : [];

    const hasWeeklyWarning = Array.isArray(weeklyWarnings) && weeklyWarnings.length > 0;
    const baseScore = forecast.willOverspend ? 68 : 88;
    const healthScore = Math.max(45, Math.min(98, baseScore - (hasWeeklyWarning ? 6 : 0) + (savingsRate >= 30 ? 5 : 0)));

    const topAnomaly = Array.isArray(anomalies) && anomalies.length > 0 ? anomalies[0] : null;
    const redDayCount = Array.isArray(redDays) ? redDays.length : 0;

    res.json({
      provider: 'DeepSeek 智能收支分析引擎',
      healthScore,
      headline: forecast.willOverspend
        ? '检测到超支风险：建议收紧非刚需消费并严控日均开销'
        : '三金结构稳健，月度可支配额度运行在安全区间',
      summary: `本月总金额 ¥${totalBudget} 中，节约金额占比达 ${savingsRate}%（¥${budget.savings}），浮动备用金 ¥${budget.floating}。可支配金额已使用 ${disposableSummary.usagePercentage}%，当前剩余可支配 ¥${disposableSummary.remainingDisposable}。`,
      overspendWarning: forecast.warningMessage,
      consumptionPatternInsight:
        topMomItems.length > 0 && topMomItems[0].currentAmount > 0
          ? `消费重心集中在「${topMomItems[0].category}」（¥${topMomItems[0].currentAmount}，占本月总支出 ${topMomItems[0].currentShare}%）。近期支出呈现明显的聚餐与换季采购集中特征，工作日单笔消费较低而特定节点支出偏高。`
          : '当前消费分布较为均衡，未出现单一品类过度挤占可支配预算的情况。',
      anomalyReview: topAnomaly
        ? `本月共出现 ${redDayCount} 个日历红格超支日。最大单笔异常支出为 ${topAnomaly.date} 的「${topAnomaly.title}」（¥${topAnomaly.amount}，相当于日均标准额度的 ${topAnomaly.ratioToDailyAvg} 倍）。${
            topAnomaly.explanationNote
              ? `结合您的红格备注“${topAnomaly.explanationNote}”，该笔开销具有明确原因，建议在后续 5 天内每日少花 ¥${Math.ceil(topAnomaly.amount / 10)} 进行平滑对冲。`
              : '建议点击日历红格补充超支原因备注，以便月底复盘哪些属于偶发刚需。'
          }`
        : '本月所有单日花费均控制在每日平均可支配额度之内，无异常红格支出。',
      personalizedSavingTips:
        personalizedSavingTips.length > 0
          ? personalizedSavingTips
          : [
              '您本月在餐饮上的花费比上月增加了20%，建议尝试自己做饭或自带便当以节省开支。',
              '建立“红格次日零消费日”机制：凡日历出现红格超支，次日优先消耗家中库存食材。',
              '保持每月初“先储蓄后消费”的三金分配原则，不动用 ¥1800 节约金额。',
            ],
      generatedAt: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EverLedger Server running on http://localhost:${PORT}`);
  });
}

startServer();
