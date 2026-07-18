import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  addCustomTemplate,
  endCycle,
  ensureHealthWorkspace,
  getTemplate,
  startCycle,
  updateHealthProfile,
  upsertDailyCheckin,
  upsertSymptoms,
  getLatestReport,
  getReportSchedule,
  upsertReportSchedule,
} from "../healthDb";
import { scoreCheckin } from "../healthMetrics";
import { getDayDashboard, getHistoryCalendarData, getWeeklySummary } from "../healthService";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { generateWeeklyHealthReport } from "../reportService";
import { protectedProcedure, router } from "../_core/trpc";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD");

export const healthRouter = router({
  dashboard: protectedProcedure.input(z.object({ date: dateSchema })).query(async ({ ctx, input }) => {
    await ensureHealthWorkspace(ctx.user.id, ctx.user.name);
    return getDayDashboard(ctx.user.id, input.date);
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().trim().min(1).max(120).optional(),
        timezone: z.string().trim().min(1).max(64).optional(),
        dailySleepTarget: z.number().int().min(4).max(12).optional(),
        dailyMovementTarget: z.number().int().min(1).max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureHealthWorkspace(ctx.user.id, ctx.user.name);
      return updateHealthProfile(ctx.user.id, input);
    }),

  addCustomTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(120),
        recordMode: z.enum(["toggle", "value"]),
        unit: z.string().trim().min(1).max(24).optional(),
        goalValue: z.number().int().min(1).max(10000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureHealthWorkspace(ctx.user.id, ctx.user.name);
      return addCustomTemplate(ctx.user.id, input);
    }),

  saveCheckin: protectedProcedure
    .input(
      z.object({
        templateId: z.number().int().positive(),
        recordDate: dateSchema,
        completed: z.boolean(),
        numericValue: z.number().min(0).max(10000).nullable().optional(),
        textValue: z.string().trim().max(120).nullable().optional(),
        note: z.string().trim().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = await getTemplate(ctx.user.id, input.templateId);
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "未找到该打卡项" });
      }
      const earnedScore = scoreCheckin(template, input.completed, input.numericValue, input.textValue);
      await upsertDailyCheckin({ ...input, userId: ctx.user.id, earnedScore });
      return getDayDashboard(ctx.user.id, input.recordDate);
    }),

  startPeriod: protectedProcedure.input(z.object({ recordDate: dateSchema })).mutation(async ({ ctx, input }) => {
    await ensureHealthWorkspace(ctx.user.id, ctx.user.name);
    return startCycle(ctx.user.id, input.recordDate);
  }),

  endPeriod: protectedProcedure.input(z.object({ recordDate: dateSchema })).mutation(async ({ ctx, input }) => {
    return endCycle(ctx.user.id, input.recordDate);
  }),

  saveSymptoms: protectedProcedure
    .input(
      z.object({
        recordDate: dateSchema,
        pain: z.enum(["pain", "no_pain"]).optional(),
        breastSwelling: z.enum(["swollen", "not_swollen"]).optional(),
        acne: z.enum(["acne", "clear"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => upsertSymptoms(ctx.user.id, input)),

  week: protectedProcedure.input(z.object({ endDate: dateSchema })).query(({ ctx, input }) => {
    return getWeeklySummary(ctx.user.id, input.endDate);
  }),

  history: protectedProcedure
    .input(z.object({ startDate: dateSchema, endDate: dateSchema }))
    .query(({ ctx, input }) => getHistoryCalendarData(ctx.user.id, input.startDate, input.endDate)),

  latestReport: protectedProcedure.query(async ({ ctx }) => {
    await ensureHealthWorkspace(ctx.user.id, ctx.user.name);
    return getLatestReport(ctx.user.id);
  }),

  generateWeeklyReport: protectedProcedure
    .input(z.object({ endDate: dateSchema, force: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ensureHealthWorkspace(ctx.user.id, ctx.user.name);
      return generateWeeklyHealthReport({
        userId: ctx.user.id,
        endDate: input.endDate,
        displayName: ctx.user.name,
        reportType: "on_demand",
        force: input.force,
      });
    }),

  reportSchedule: protectedProcedure.query(async ({ ctx }) => {
    await ensureHealthWorkspace(ctx.user.id, ctx.user.name);
    return getReportSchedule(ctx.user.id);
  }),

  configureWeeklyReport: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (process.env.NODE_ENV !== "production") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "自动周报需要在网站发布后开启。" });
      }
      await ensureHealthWorkspace(ctx.user.id, ctx.user.name);
      const cron = "0 0 1 * * 1";
      const current = await getReportSchedule(ctx.user.id);
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";

      if (current?.scheduleCronTaskUid) {
        await updateHeartbeatJob(current.scheduleCronTaskUid, { enable: input.enabled }, sessionToken);
        return upsertReportSchedule({
          userId: ctx.user.id,
          scheduleCronTaskUid: current.scheduleCronTaskUid,
          cronExpression: current.cronExpression,
          isEnabled: input.enabled,
        });
      }

      if (!input.enabled) {
        return upsertReportSchedule({ userId: ctx.user.id, scheduleCronTaskUid: null, cronExpression: cron, isEnabled: false });
      }

      const job = await createHeartbeatJob({
        name: `weekly-health-report-${ctx.user.id}`,
        cron,
        path: "/api/scheduled/weekly-health-report",
        payload: { kind: "weekly-health-report" },
        description: "每周一生成个人健康洞察报告（UTC 01:00 / 中国标准时间 09:00）",
      }, sessionToken);
      return upsertReportSchedule({ userId: ctx.user.id, scheduleCronTaskUid: job.taskUid, cronExpression: cron, isEnabled: true });
    }),
});
