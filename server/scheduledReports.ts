import type { Request, Response } from "express";
import { getHealthProfile, getReportScheduleByTaskUid, markReportScheduleRun } from "./healthDb";
import { generateWeeklyHealthReport } from "./reportService";
import { sdk } from "./_core/sdk";

function previousUtcDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function runWeeklyHealthReport(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const schedule = await getReportScheduleByTaskUid(user.taskUid);
    if (!schedule || !schedule.isEnabled) {
      return res.json({ ok: true, skipped: "orphan-or-disabled" });
    }

    const profile = await getHealthProfile(schedule.userId);
    const report = await generateWeeklyHealthReport({
      userId: schedule.userId,
      endDate: previousUtcDate(),
      displayName: profile?.displayName,
      reportType: "weekly",
    });
    await markReportScheduleRun(user.taskUid);

    return res.json({ ok: true, reportId: report.id, periodEnd: report.periodEnd });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ScheduledWeeklyHealthReport] failed", error);
    return res.status(500).json({
      error: message,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
