import { describe, expect, it } from "vitest";
import { analyzeWeeklyHealth, buildDailyHealthMetric, makeWarmFallbackReport, pearsonCorrelation, scoreCheckin } from "./healthMetrics";

const templates = [
  { id: 1, kind: "nutrition" as const, recordMode: "choice" as const, scoreValue: 30, goalValue: null },
  { id: 2, kind: "movement" as const, recordMode: "value" as const, scoreValue: 25, goalValue: 30 },
  { id: 3, kind: "sleep" as const, recordMode: "value" as const, scoreValue: 25, goalValue: 8 },
];

describe("health metrics", () => {
  it("scores low-sugar nutrition, movement and sleep using their stated rules", () => {
    expect(scoreCheckin(templates[0], true, null, "green")).toBe(30);
    expect(scoreCheckin(templates[0], true, null, "high_sugar")).toBe(0);
    expect(scoreCheckin(templates[1], true, 15)).toBe(12.5);
    expect(scoreCheckin(templates[2], true, 7)).toBe(25);
  });

  it("creates a daily 0–100 health index from completed behaviours", () => {
    const metric = buildDailyHealthMetric("2026-07-18", templates, [
      { templateId: 1, completed: true, textValue: "green", earnedScore: 30 },
      { templateId: 2, completed: true, numericValue: 30, earnedScore: 25 },
      { templateId: 3, completed: true, numericValue: 7, earnedScore: 25 },
    ]);
    expect(metric.healthScore).toBe(100);
    expect(metric.completionRate).toBe(100);
    expect(metric.sleepQuality).toBe(100);
  });

  it("returns a negative coefficient for opposite-moving variables", () => {
    expect(pearsonCorrelation([0, 1, 0, 1], [100, 20, 90, 10])).toBeLessThan(-0.9);
  });

  it("labels correlation as observation and keeps a non-diagnostic safety note in the fallback report", () => {
    const daily = [
      buildDailyHealthMetric("2026-07-12", templates, [{ templateId: 1, completed: true, textValue: "green", earnedScore: 30 }]),
      buildDailyHealthMetric("2026-07-13", templates, [{ templateId: 1, completed: true, textValue: "high_sugar", earnedScore: 0 }]),
      buildDailyHealthMetric("2026-07-14", templates, [{ templateId: 1, completed: true, textValue: "green", earnedScore: 30 }]),
    ];
    const weekly = analyzeWeeklyHealth(daily);
    expect(weekly.correlations[0]?.explanation).toContain("继续");
    expect(makeWarmFallbackReport(weekly)).toContain("不构成医疗诊断");
  });
});
