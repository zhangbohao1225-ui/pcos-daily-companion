import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import {
  checkinTemplates,
  cycleSymptoms,
  dailyCheckins,
  healthProfiles,
  healthReports,
  menstrualCycles,
  reportSchedules,
} from "../drizzle/schema";
import { getDb } from "./db";

export const presetTemplates = [
  {
    kind: "nutrition" as const,
    name: "低糖 & 抗炎饮食",
    description: "记录今日饮食选择与维生素补充",
    icon: "Apple",
    recordMode: "choice" as const,
    scoreValue: 30,
    sortOrder: 1,
    metadata: { choices: ["green", "balanced", "high_sugar"], vitaminSupported: true },
  },
  {
    kind: "movement" as const,
    name: "运动记录",
    description: "轻运动也算，填写活动时长",
    icon: "Dumbbell",
    recordMode: "value" as const,
    unit: "分钟",
    goalValue: 30,
    scoreValue: 25,
    sortOrder: 2,
    metadata: { min: 0, max: 300 },
  },
  {
    kind: "mood" as const,
    name: "情绪记录",
    description: "用一个词记录今天的感受",
    icon: "Smile",
    recordMode: "choice" as const,
    scoreValue: 20,
    sortOrder: 3,
    metadata: { choices: ["uplifted", "calm", "sensitive"] },
  },
  {
    kind: "sleep" as const,
    name: "睡眠记录",
    description: "填写昨夜实际睡眠时长",
    icon: "Moon",
    recordMode: "value" as const,
    unit: "小时",
    goalValue: 8,
    scoreValue: 25,
    sortOrder: 4,
    metadata: { min: 0, max: 24 },
  },
] as const;

export async function ensureHealthWorkspace(userId: number, displayName?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");

  await db
    .insert(healthProfiles)
    .values({ userId, displayName: displayName ?? null })
    .onDuplicateKeyUpdate({ set: { displayName: displayName ?? null } });

  const existing = await db
    .select({ id: checkinTemplates.id })
    .from(checkinTemplates)
    .where(eq(checkinTemplates.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(checkinTemplates).values(
      presetTemplates.map(template => ({
        userId,
        source: "preset" as const,
        kind: template.kind,
        name: template.name,
        description: template.description,
        icon: template.icon,
        recordMode: template.recordMode,
        unit: "unit" in template ? template.unit ?? null : null,
        goalValue: "goalValue" in template ? template.goalValue ?? null : null,
        scoreValue: template.scoreValue,
        sortOrder: template.sortOrder,
        metadata: template.metadata,
      })),
    );
  }

  return getHealthProfile(userId);
}

export async function getHealthProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [profile] = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1);
  return profile;
}

export async function updateHealthProfile(
  userId: number,
  input: { displayName?: string; dailySleepTarget?: number; dailyMovementTarget?: number; timezone?: string },
) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");
  await db.update(healthProfiles).set(input).where(eq(healthProfiles.userId, userId));
  return getHealthProfile(userId);
}

export async function listTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(checkinTemplates)
    .where(and(eq(checkinTemplates.userId, userId), eq(checkinTemplates.isActive, true)))
    .orderBy(asc(checkinTemplates.sortOrder), asc(checkinTemplates.id));
}

export async function addCustomTemplate(
  userId: number,
  input: { name: string; recordMode: "toggle" | "value"; unit?: string; goalValue?: number },
) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");
  const existing = await listTemplates(userId);
  await db.insert(checkinTemplates).values({
    userId,
    source: "custom",
    kind: "custom",
    name: input.name,
    description: input.recordMode === "value" ? "记录一个属于你的数值目标" : "一个属于你的温柔小习惯",
    icon: "Sparkles",
    recordMode: input.recordMode,
    unit: input.recordMode === "value" ? input.unit ?? "次" : null,
    goalValue: input.recordMode === "value" ? input.goalValue ?? 1 : null,
    scoreValue: 10,
    sortOrder: existing.length + 1,
    metadata: {},
  });
  return listTemplates(userId);
}

export async function getTemplate(userId: number, templateId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [template] = await db
    .select()
    .from(checkinTemplates)
    .where(and(eq(checkinTemplates.userId, userId), eq(checkinTemplates.id, templateId)))
    .limit(1);
  return template;
}

export async function listCheckinsForDate(userId: number, recordDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.recordDate, recordDate)));
}

export async function upsertDailyCheckin(input: {
  userId: number;
  templateId: number;
  recordDate: string;
  completed: boolean;
  numericValue?: number | null;
  textValue?: string | null;
  note?: string | null;
  earnedScore: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");
  const completedAt = input.completed ? new Date() : null;
  await db
    .insert(dailyCheckins)
    .values({
      userId: input.userId,
      templateId: input.templateId,
      recordDate: input.recordDate,
      completed: input.completed,
      numericValue: input.numericValue === null || input.numericValue === undefined ? null : String(input.numericValue),
      textValue: input.textValue ?? null,
      note: input.note ?? null,
      earnedScore: input.earnedScore,
      completedAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        completed: input.completed,
        numericValue: input.numericValue === null || input.numericValue === undefined ? null : String(input.numericValue),
        textValue: input.textValue ?? null,
        note: input.note ?? null,
        earnedScore: input.earnedScore,
        completedAt,
      },
    });
  return listCheckinsForDate(input.userId, input.recordDate);
}

export async function listCheckinsInRange(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.userId, userId), gte(dailyCheckins.recordDate, startDate), lte(dailyCheckins.recordDate, endDate)));
}

export async function getActiveCycle(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [cycle] = await db
    .select()
    .from(menstrualCycles)
    .where(and(eq(menstrualCycles.userId, userId), eq(menstrualCycles.isActive, true)))
    .orderBy(desc(menstrualCycles.startDate))
    .limit(1);
  return cycle;
}

export async function startCycle(userId: number, startDate: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");
  const active = await getActiveCycle(userId);
  if (active) return active;
  await db.insert(menstrualCycles).values({ userId, startDate, isActive: true });
  return getActiveCycle(userId);
}

export async function endCycle(userId: number, endDate: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");
  const active = await getActiveCycle(userId);
  if (!active) throw new Error("当前没有进行中的经期记录");
  await db
    .update(menstrualCycles)
    .set({ endDate, isActive: false })
    .where(and(eq(menstrualCycles.id, active.id), eq(menstrualCycles.userId, userId)));
  const [cycle] = await db.select().from(menstrualCycles).where(eq(menstrualCycles.id, active.id)).limit(1);
  return cycle;
}

export async function upsertSymptoms(
  userId: number,
  input: {
    recordDate: string;
    pain?: "pain" | "no_pain";
    breastSwelling?: "swollen" | "not_swollen";
    acne?: "acne" | "clear";
  },
) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");
  const activeCycle = await getActiveCycle(userId);
  await db
    .insert(cycleSymptoms)
    .values({ userId, cycleId: activeCycle?.id ?? null, ...input })
    .onDuplicateKeyUpdate({
      set: {
        cycleId: activeCycle?.id ?? null,
        pain: input.pain ?? null,
        breastSwelling: input.breastSwelling ?? null,
        acne: input.acne ?? null,
      },
    });
  const [symptom] = await db
    .select()
    .from(cycleSymptoms)
    .where(and(eq(cycleSymptoms.userId, userId), eq(cycleSymptoms.recordDate, input.recordDate)))
    .limit(1);
  return symptom;
}

export async function getSymptomsForDate(userId: number, recordDate: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [symptom] = await db
    .select()
    .from(cycleSymptoms)
    .where(and(eq(cycleSymptoms.userId, userId), eq(cycleSymptoms.recordDate, recordDate)))
    .limit(1);
  return symptom;
}

export async function getCyclesInRange(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(menstrualCycles)
    .where(and(eq(menstrualCycles.userId, userId), lte(menstrualCycles.startDate, endDate)))
    .orderBy(desc(menstrualCycles.startDate));
}

export async function listSymptomsInRange(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cycleSymptoms)
    .where(and(eq(cycleSymptoms.userId, userId), gte(cycleSymptoms.recordDate, startDate), lte(cycleSymptoms.recordDate, endDate)));
}

export async function listReports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(healthReports).where(eq(healthReports.userId, userId)).orderBy(desc(healthReports.createdAt));
}

export async function getReportSchedule(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [schedule] = await db.select().from(reportSchedules).where(eq(reportSchedules.userId, userId)).limit(1);
  return schedule;
}

export async function saveHealthReport(input: {
  userId: number;
  reportType: "weekly" | "on_demand";
  periodStart: string;
  periodEnd: string;
  healthScore: number;
  completionRate: number;
  metrics: Record<string, unknown>;
  correlations: Array<Record<string, unknown>>;
  content: string;
  model?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");
  await db.insert(healthReports).values({
    ...input,
    completionRate: String(input.completionRate),
    model: input.model ?? null,
  });
  const [report] = await db
    .select()
    .from(healthReports)
    .where(eq(healthReports.userId, input.userId))
    .orderBy(desc(healthReports.id))
    .limit(1);
  return report;
}

export async function getLatestReport(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [report] = await db
    .select()
    .from(healthReports)
    .where(eq(healthReports.userId, userId))
    .orderBy(desc(healthReports.createdAt), desc(healthReports.id))
    .limit(1);
  return report;
}

export async function getReportScheduleByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [schedule] = await db
    .select()
    .from(reportSchedules)
    .where(eq(reportSchedules.scheduleCronTaskUid, taskUid))
    .limit(1);
  return schedule;
}

export async function upsertReportSchedule(input: {
  userId: number;
  scheduleCronTaskUid: string | null;
  cronExpression: string;
  isEnabled: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");
  await db
    .insert(reportSchedules)
    .values(input)
    .onDuplicateKeyUpdate({
      set: {
        scheduleCronTaskUid: input.scheduleCronTaskUid,
        cronExpression: input.cronExpression,
        isEnabled: input.isEnabled,
      },
    });
  return getReportSchedule(input.userId);
}

export async function markReportScheduleRun(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库当前不可用");
  await db
    .update(reportSchedules)
    .set({ lastRunAt: new Date() })
    .where(eq(reportSchedules.scheduleCronTaskUid, taskUid));
}

export async function getReportForPeriod(
  userId: number,
  periodEnd: string,
  reportType: "weekly" | "on_demand" = "weekly",
) {
  const db = await getDb();
  if (!db) return undefined;
  const [report] = await db
    .select()
    .from(healthReports)
    .where(and(
      eq(healthReports.userId, userId),
      eq(healthReports.periodEnd, periodEnd),
      eq(healthReports.reportType, reportType),
    ))
    .orderBy(desc(healthReports.id))
    .limit(1);
  return report;
}
