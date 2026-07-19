import { makeWarmFallbackReport, type WeeklyHealthMetric } from "./healthMetrics";
import { getReportForPeriod, saveHealthReport } from "./healthDb";
import { getWeeklySummary } from "./healthService";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

type DeepSeekResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

function compactSummary(summary: WeeklyHealthMetric) {
  return {
    healthScore: summary.healthScore,
    completionRate: summary.completionRate,
    dimensions: summary.dimensions.map(item => ({ label: item.label, score: item.score, completionRate: item.completionRate })),
    daily: summary.daily.map(item => ({ date: item.date, healthScore: item.healthScore, completionRate: item.completionRate, sleepHours: item.sleepHours, highSugar: item.highSugar })),
    correlations: summary.correlations.map(item => ({ left: item.left, right: item.right, coefficient: item.coefficient, strength: item.strength, direction: item.direction, explanation: item.explanation })),
  };
}

async function generateWithDeepSeek(input: {
  displayName?: string | null;
  periodStart: string;
  periodEnd: string;
  summary: WeeklyHealthMetric;
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek API Key 未配置");

  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: 0.65,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: "你是Suta健康陪伴应用的温柔健康记录助手。只根据用户提供的记录做观察，不诊断疾病、不承诺疗效、不夸大因果，也不替代医生。用简体中文，写成约 3 个短段落：先肯定具体努力；再用温和、谨慎的语言解释一项趋势或关联（明确它是观察性线索）；最后给出一个轻量、可执行的下周建议。结尾必须提示：如有持续不适，请咨询专业医生。避免居高临下、羞耻感和绝对化表达。",
        },
        {
          role: "user",
          content: `请为${input.displayName ? ` ${input.displayName}` : "这位用户"}生成 ${input.periodStart} 至 ${input.periodEnd} 的一周健康洞察。以下是仅供观察的汇总数据：\n${JSON.stringify(compactSummary(input.summary))}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek 报告请求失败 (${response.status})${detail ? `: ${detail.slice(0, 220)}` : ""}`);
  }
  const payload = await response.json() as DeepSeekResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("DeepSeek 未返回报告内容");
  return content;
}

export async function generateWeeklyHealthReport(input: {
  userId: number;
  endDate: string;
  displayName?: string | null;
  reportType?: "weekly" | "on_demand";
  force?: boolean;
}) {
  const reportType = input.reportType ?? "weekly";
  if (!input.force) {
    const existing = await getReportForPeriod(input.userId, input.endDate, reportType);
    if (existing) return existing;
  }

  const weekly = await getWeeklySummary(input.userId, input.endDate);
  let content = makeWarmFallbackReport(weekly.summary);
  let model = "规则化健康小结（DeepSeek 后备）";

  try {
    content = await generateWithDeepSeek({
      displayName: input.displayName,
      periodStart: weekly.periodStart,
      periodEnd: weekly.periodEnd,
      summary: weekly.summary,
    });
    model = DEEPSEEK_MODEL;
  } catch (error) {
    console.error("[HealthReport] DeepSeek generation failed, using safe fallback:", error);
  }

  const report = await saveHealthReport({
    userId: input.userId,
    reportType,
    periodStart: weekly.periodStart,
    periodEnd: weekly.periodEnd,
    healthScore: weekly.summary.healthScore,
    completionRate: weekly.summary.completionRate,
    metrics: compactSummary(weekly.summary),
    correlations: weekly.summary.correlations,
    content,
    model,
  });

  if (!report) throw new Error("报告保存失败");
  return report;
}
