import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing Manus OAuth. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const healthProfiles = mysqlTable(
  "health_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    displayName: varchar("displayName", { length: 120 }),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Shanghai"),
    dailySleepTarget: int("dailySleepTarget").notNull().default(8),
    dailyMovementTarget: int("dailyMovementTarget").notNull().default(30),
    onboardingCompleted: boolean("onboardingCompleted").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("health_profiles_user_id_unique").on(table.userId)],
);

export const checkinTemplates = mysqlTable(
  "checkin_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    source: mysqlEnum("source", ["preset", "custom"]).notNull().default("preset"),
    kind: mysqlEnum("kind", ["nutrition", "movement", "mood", "sleep", "custom"])
      .notNull()
      .default("custom"),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 255 }),
    icon: varchar("icon", { length: 32 }).notNull().default("Sparkles"),
    recordMode: mysqlEnum("recordMode", ["toggle", "value", "choice"])
      .notNull()
      .default("toggle"),
    unit: varchar("unit", { length: 24 }),
    goalValue: int("goalValue"),
    scoreValue: int("scoreValue").notNull().default(10),
    sortOrder: int("sortOrder").notNull().default(0),
    isActive: boolean("isActive").notNull().default(true),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("checkin_templates_user_id_idx").on(table.userId),
    index("checkin_templates_kind_idx").on(table.kind),
  ],
);

export const dailyCheckins = mysqlTable(
  "daily_checkins",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    templateId: int("templateId").notNull(),
    recordDate: varchar("recordDate", { length: 10 }).notNull(),
    completed: boolean("completed").notNull().default(false),
    numericValue: decimal("numericValue", { precision: 8, scale: 2 }),
    textValue: varchar("textValue", { length: 120 }),
    note: text("note"),
    earnedScore: int("earnedScore").notNull().default(0),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("daily_checkins_user_template_date_unique").on(
      table.userId,
      table.templateId,
      table.recordDate,
    ),
    index("daily_checkins_user_date_idx").on(table.userId, table.recordDate),
  ],
);

export const menstrualCycles = mysqlTable(
  "menstrual_cycles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    startDate: varchar("startDate", { length: 10 }).notNull(),
    endDate: varchar("endDate", { length: 10 }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("menstrual_cycles_user_start_idx").on(table.userId, table.startDate)],
);

export const cycleSymptoms = mysqlTable(
  "cycle_symptoms",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    cycleId: int("cycleId"),
    recordDate: varchar("recordDate", { length: 10 }).notNull(),
    pain: mysqlEnum("pain", ["pain", "no_pain"]),
    breastSwelling: mysqlEnum("breastSwelling", ["swollen", "not_swollen"]),
    acne: mysqlEnum("acne", ["acne", "clear"]),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("cycle_symptoms_user_date_unique").on(table.userId, table.recordDate),
    index("cycle_symptoms_cycle_idx").on(table.cycleId),
  ],
);

export const healthReports = mysqlTable(
  "health_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    reportType: mysqlEnum("reportType", ["weekly", "on_demand"]).notNull().default("weekly"),
    periodStart: varchar("periodStart", { length: 10 }).notNull(),
    periodEnd: varchar("periodEnd", { length: 10 }).notNull(),
    healthScore: int("healthScore").notNull(),
    completionRate: decimal("completionRate", { precision: 5, scale: 2 }).notNull(),
    metrics: json("metrics").notNull(),
    correlations: json("correlations").notNull(),
    content: text("content").notNull(),
    model: varchar("model", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("health_reports_user_period_idx").on(table.userId, table.periodEnd)],
);

export const reportSchedules = mysqlTable(
  "report_schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    cronExpression: varchar("cronExpression", { length: 64 }).notNull().default("0 0 1 * * 1"),
    isEnabled: boolean("isEnabled").notNull().default(false),
    lastRunAt: timestamp("lastRunAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("report_schedules_user_id_unique").on(table.userId),
    index("report_schedules_task_uid_idx").on(table.scheduleCronTaskUid),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CheckinTemplate = typeof checkinTemplates.$inferSelect;
export type DailyCheckin = typeof dailyCheckins.$inferSelect;
export type MenstrualCycle = typeof menstrualCycles.$inferSelect;
export type CycleSymptom = typeof cycleSymptoms.$inferSelect;
export type HealthReport = typeof healthReports.$inferSelect;
