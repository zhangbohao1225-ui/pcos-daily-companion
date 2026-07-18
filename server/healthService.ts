import type { CheckinTemplate, DailyCheckin } from "../drizzle/schema";
import { buildDailyHealthMetric, analyzeWeeklyHealth, type MetricCheckin, type MetricTemplate } from "./healthMetrics";
import {
  getActiveCycle,
  getHealthProfile,
  getSymptomsForDate,
  listCheckinsForDate,
  listCheckinsInRange,
  getCyclesInRange,
  listSymptomsInRange,
  listTemplates,
} from "./healthDb";

function parseDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function createDateRange(startDate: string, endDate: string) {
  const result: string[] = [];
  const cursor = parseDate(startDate);
  const end = parseDate(endDate);
  while (cursor <= end) {
    result.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export function subtractDays(date: string, days: number) {
  const target = parseDate(date);
  target.setUTCDate(target.getUTCDate() - days);
  return formatDate(target);
}

function asMetricTemplates(templates: CheckinTemplate[]): MetricTemplate[] {
  return templates.map(template => ({
    id: template.id,
    kind: template.kind,
    recordMode: template.recordMode,
    scoreValue: template.scoreValue,
    goalValue: template.goalValue,
  }));
}

function asMetricEntries(entries: DailyCheckin[]): MetricCheckin[] {
  return entries.map(entry => ({
    templateId: entry.templateId,
    completed: entry.completed,
    numericValue: entry.numericValue,
    textValue: entry.textValue,
    earnedScore: entry.earnedScore,
  }));
}

export async function getDayDashboard(userId: number, date: string) {
  const [profile, templates, checkins, activeCycle, symptoms] = await Promise.all([
    getHealthProfile(userId),
    listTemplates(userId),
    listCheckinsForDate(userId, date),
    getActiveCycle(userId),
    getSymptomsForDate(userId, date),
  ]);
  const metric = buildDailyHealthMetric(date, asMetricTemplates(templates), asMetricEntries(checkins));
  return { profile, templates, checkins, metric, activeCycle, symptoms };
}

export async function getWeeklySummary(userId: number, endDate: string, days = 7) {
  const startDate = subtractDays(endDate, days - 1);
  const [templates, checkins] = await Promise.all([
    listTemplates(userId),
    listCheckinsInRange(userId, startDate, endDate),
  ]);
  const byDate = new Map<string, DailyCheckin[]>();
  for (const checkin of checkins) {
    const values = byDate.get(checkin.recordDate) ?? [];
    values.push(checkin);
    byDate.set(checkin.recordDate, values);
  }
  const metrics = createDateRange(startDate, endDate).map(date =>
    buildDailyHealthMetric(date, asMetricTemplates(templates), asMetricEntries(byDate.get(date) ?? [])),
  );
  return {
    periodStart: startDate,
    periodEnd: endDate,
    summary: analyzeWeeklyHealth(metrics),
  };
}

export async function getHistoryCalendarData(userId: number, startDate: string, endDate: string) {
  const [templates, checkins, cycles, symptoms] = await Promise.all([
    listTemplates(userId),
    listCheckinsInRange(userId, startDate, endDate),
    getCyclesInRange(userId, startDate, endDate),
    listSymptomsInRange(userId, startDate, endDate),
  ]);
  const byDate = new Map<string, DailyCheckin[]>();
  for (const checkin of checkins) {
    const values = byDate.get(checkin.recordDate) ?? [];
    values.push(checkin);
    byDate.set(checkin.recordDate, values);
  }
  const cycleDates = new Set<string>();
  for (const cycle of cycles) {
    const cycleEnd = cycle.endDate ?? endDate;
    const effectiveStart = cycle.startDate < startDate ? startDate : cycle.startDate;
    const effectiveEnd = cycleEnd > endDate ? endDate : cycleEnd;
    if (effectiveStart <= effectiveEnd) {
      createDateRange(effectiveStart, effectiveEnd).forEach(date => cycleDates.add(date));
    }
  }
  const symptomByDate = new Map(symptoms.map(symptom => [symptom.recordDate, symptom]));
  return createDateRange(startDate, endDate).map(date => ({
    date,
    metric: buildDailyHealthMetric(date, asMetricTemplates(templates), asMetricEntries(byDate.get(date) ?? [])),
    isPeriodDay: cycleDates.has(date),
    symptoms: symptomByDate.get(date) ?? null,
  }));
}
