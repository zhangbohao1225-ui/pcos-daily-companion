export type CheckinKind = "nutrition" | "movement" | "mood" | "sleep" | "custom";
export type RecordMode = "toggle" | "value" | "choice";

export type MetricTemplate = {
  id: number;
  kind: CheckinKind;
  recordMode: RecordMode;
  scoreValue: number;
  goalValue?: number | null;
};

export type MetricCheckin = {
  templateId: number;
  completed: boolean;
  numericValue?: number | string | null;
  textValue?: string | null;
  earnedScore?: number | null;
};

export type DimensionMetric = {
  key: CheckinKind;
  label: string;
  achievedScore: number;
  possibleScore: number;
  score: number;
  completionRate: number;
};

export type DailyHealthMetric = {
  date: string;
  healthScore: number;
  completionRate: number;
  completedCount: number;
  totalCount: number;
  dimensions: DimensionMetric[];
  highSugar: number;
  sleepQuality: number | null;
  sleepHours: number | null;
};

export type WeeklyHealthMetric = {
  healthScore: number;
  completionRate: number;
  dimensions: DimensionMetric[];
  daily: DailyHealthMetric[];
  correlations: Array<{
    left: string;
    right: string;
    coefficient: number | null;
    strength: "暂无足够数据" | "较弱" | "中等" | "较强";
    direction: "正相关" | "负相关" | "无明显关系";
    explanation: string;
  }>;
};

const dimensionLabels: Record<CheckinKind, string> = {
  nutrition: "饮食营养",
  movement: "身体活动",
  mood: "情绪状态",
  sleep: "睡眠修复",
  custom: "自定义习惯",
};

const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function asNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function scoreCheckin(
  template: MetricTemplate,
  completed: boolean,
  numericValue?: number | string | null,
  textValue?: string | null,
): number {
  if (!completed) return 0;

  const maxScore = template.scoreValue;
  if (template.recordMode === "toggle") return maxScore;

  if (template.recordMode === "choice") {
    if (template.kind === "nutrition") {
      const multipliers: Record<string, number> = { green: 1, balanced: 0.72, high_sugar: 0 };
      return round(maxScore * (multipliers[textValue ?? "green"] ?? 1));
    }
    if (template.kind === "mood") {
      const multipliers: Record<string, number> = { uplifted: 1, calm: 0.88, sensitive: 0.5 };
      return round(maxScore * (multipliers[textValue ?? "calm"] ?? 0.8));
    }
    return maxScore;
  }

  const value = asNumber(numericValue);
  if (value === null) return 0;

  if (template.kind === "sleep") {
    if (value >= 7) return maxScore;
    if (value >= 6) return round(maxScore * 0.72);
    return round(maxScore * 0.42);
  }

  const target = Math.max(template.goalValue ?? 1, 1);
  return round(maxScore * clamp(value / target, 0, 1));
}

export function buildDailyHealthMetric(
  date: string,
  templates: MetricTemplate[],
  entries: MetricCheckin[],
): DailyHealthMetric {
  const entryByTemplateId = new Map(entries.map(entry => [entry.templateId, entry]));
  const groups = new Map<CheckinKind, { achieved: number; possible: number; completed: number; total: number }>();

  let highSugar = 0;
  let sleepQuality: number | null = null;
  let sleepHours: number | null = null;
  let totalScore = 0;
  let totalPossible = 0;
  let completedCount = 0;

  for (const template of templates) {
    const entry = entryByTemplateId.get(template.id);
    const completed = Boolean(entry?.completed);
    const score = entry?.earnedScore ?? scoreCheckin(template, completed, entry?.numericValue, entry?.textValue);
    const group = groups.get(template.kind) ?? { achieved: 0, possible: 0, completed: 0, total: 0 };

    group.achieved += Number(score);
    group.possible += template.scoreValue;
    group.completed += completed ? 1 : 0;
    group.total += 1;
    groups.set(template.kind, group);

    totalScore += Number(score);
    totalPossible += template.scoreValue;
    completedCount += completed ? 1 : 0;

    if (template.kind === "nutrition" && entry?.textValue === "high_sugar" && completed) highSugar = 1;
    if (template.kind === "sleep" && completed) {
      const value = asNumber(entry?.numericValue);
      sleepHours = value;
      sleepQuality = template.scoreValue ? round((Number(score) / template.scoreValue) * 100) : null;
    }
  }

  const dimensions = Array.from(groups.entries()).map(([key, group]) => ({
    key,
    label: dimensionLabels[key],
    achievedScore: round(group.achieved),
    possibleScore: group.possible,
    score: group.possible ? round((group.achieved / group.possible) * 100) : 0,
    completionRate: group.total ? round((group.completed / group.total) * 100) : 0,
  }));

  return {
    date,
    healthScore: totalPossible ? Math.round((totalScore / totalPossible) * 100) : 0,
    completionRate: templates.length ? Math.round((completedCount / templates.length) * 100) : 0,
    completedCount,
    totalCount: templates.length,
    dimensions,
    highSugar,
    sleepQuality,
    sleepHours,
  };
}

export function pearsonCorrelation(left: number[], right: number[]): number | null {
  if (left.length !== right.length || left.length < 3) return null;
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const leftVariance = left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0);
  const rightVariance = right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0);
  const denominator = Math.sqrt(leftVariance * rightVariance);
  if (denominator === 0) return null;
  return round(numerator / denominator);
}

export function analyzeWeeklyHealth(daily: DailyHealthMetric[]): WeeklyHealthMetric {
  const populated = daily.filter(metric => metric.totalCount > 0);
  const dimensionsByKey = new Map<CheckinKind, DimensionMetric[]>();

  for (const metric of populated) {
    for (const dimension of metric.dimensions) {
      const values = dimensionsByKey.get(dimension.key) ?? [];
      values.push(dimension);
      dimensionsByKey.set(dimension.key, values);
    }
  }

  const dimensions = Array.from(dimensionsByKey.entries()).map(([key, values]) => ({
    key,
    label: dimensionLabels[key],
    achievedScore: round(values.reduce((sum, item) => sum + item.achievedScore, 0) / values.length),
    possibleScore: round(values.reduce((sum, item) => sum + item.possibleScore, 0) / values.length),
    score: round(values.reduce((sum, item) => sum + item.score, 0) / values.length),
    completionRate: round(values.reduce((sum, item) => sum + item.completionRate, 0) / values.length),
  }));

  const paired = populated.filter(item => item.sleepQuality !== null);
  const coefficient = pearsonCorrelation(
    paired.map(item => item.highSugar),
    paired.map(item => item.sleepQuality ?? 0),
  );
  const magnitude = coefficient === null ? 0 : Math.abs(coefficient);
  const strength = coefficient === null ? "暂无足够数据" : magnitude >= 0.6 ? "较强" : magnitude >= 0.35 ? "中等" : "较弱";
  const direction = coefficient === null || magnitude < 0.2 ? "无明显关系" : coefficient < 0 ? "负相关" : "正相关";
  const explanation = coefficient === null
    ? "继续累积至少 3 天同时含有饮食与睡眠记录的数据后，这里会呈现更可靠的关联观察。"
    : direction === "负相关"
      ? "本周记录显示，高糖饮食出现时，睡眠修复评分往往更低。这是观察性提示，可继续记录以确认你的个人节律。"
      : direction === "正相关"
        ? "本周记录中，高糖饮食与睡眠修复分数同向变化。样本较少时不宜推断因果，建议持续观察。"
        : "目前未发现高糖饮食与睡眠修复之间明显的线性关系，继续记录会让结论更稳健。";

  return {
    healthScore: populated.length ? Math.round(populated.reduce((sum, item) => sum + item.healthScore, 0) / populated.length) : 0,
    completionRate: populated.length ? Math.round(populated.reduce((sum, item) => sum + item.completionRate, 0) / populated.length) : 0,
    dimensions,
    daily,
    correlations: [{
      left: "高糖饮食",
      right: "睡眠修复",
      coefficient,
      strength,
      direction,
      explanation,
    }],
  };
}

export function makeWarmFallbackReport(summary: WeeklyHealthMetric): string {
  const best = [...summary.dimensions].sort((a, b) => b.score - a.score)[0];
  const focus = [...summary.dimensions].sort((a, b) => a.score - b.score)[0];
  const opening = summary.healthScore >= 80
    ? "这一周的你，正在以稳定而温柔的方式照顾自己。"
    : summary.healthScore >= 60
      ? "这一周已经有不少值得肯定的小完成，它们正慢慢汇成对身体的支持。"
      : "这一周不必追求满分，愿意停下来记录自己，本身就是很有力量的一步。";
  const strength = best ? `你在「${best.label}」维度的表现尤其稳定，达标率为 ${best.score}%。` : "继续记录几天后，你的优势维度会更清晰。";
  const nextStep = focus && focus.score < 75
    ? `下周可以先从「${focus.label}」开始，为自己设定一个轻一点、但更容易坚持的目标。`
    : "下周不妨继续维持现在的节奏，并给每一次完成留出一点庆祝。";
  return `${opening}\n\n${strength}${nextStep}\n\n这些内容用于支持日常自我观察，并不构成医疗诊断或治疗建议；如有持续不适，请及时咨询专业医生。`;
}
