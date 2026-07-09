import {
  boolean,
  jsonb,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { intranetSchema, users } from "./public";
import { meetingSessions } from "./admin";
import { tasks } from "./tarefas";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const announcementPriorityEnum = intranetSchema.enum(
  "announcement_priority",
  ["normal", "importante", "urgente"],
);

export const meetingDecisionStatusEnum = intranetSchema.enum(
  "meeting_decision_status",
  ["pendente", "em_andamento", "concluida"],
);

export const briefingFrequencyEnum = intranetSchema.enum("briefing_frequency", [
  "diario",
  "semanal",
]);

// ---------------------------------------------------------------------------
// intranet.announcements
// ---------------------------------------------------------------------------
export const announcements = intranetSchema.table("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: announcementPriorityEnum("priority").notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// intranet.dashboard_configs
// Uma linha por usuário — widgets guarda o arranjo completo (id, tipo,
// posição, config) salvo por WidgetConfigForm (P-5.4).
// ---------------------------------------------------------------------------
export const dashboardConfigs = intranetSchema.table("dashboard_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  widgets: jsonb("widgets")
    .$type<
      Array<{
        id: string;
        type: string;
        position: number;
        config: Record<string, unknown>;
      }>
    >()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// intranet.meeting_decisions
// Decisão de ata vinculada a admin.meeting_sessions; pode gerar uma tarefa em
// tarefas.tasks (MeetingDecisionForm, P-5.4).
// ---------------------------------------------------------------------------
export const meetingDecisions = intranetSchema.table("meeting_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingSessionId: uuid("meeting_session_id")
    .notNull()
    .references(() => meetingSessions.id),
  description: text("description").notNull(),
  responsibleId: uuid("responsible_id")
    .notNull()
    .references(() => users.id),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: meetingDecisionStatusEnum("status").notNull().default("pendente"),
  taskId: uuid("task_id").references(() => tasks.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// intranet.briefing_preferences
// Uma linha por usuário — opt-in de briefing diário/semanal
// (BriefingConfigForm, P-5.4).
// ---------------------------------------------------------------------------
export const briefingPreferences = intranetSchema.table(
  "briefing_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(false),
    frequency: briefingFrequencyEnum("frequency").notNull().default("diario"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// ---------------------------------------------------------------------------
// intranet.kpi_snapshots
// Cache de KPIs agregados — ESCRITO por cron horário (packages/jobs, cron
// registrado em P-5.8). O dashboard lê o snapshot mais recente e cai para
// query live apenas se não houver snapshot com menos de 2h.
// ---------------------------------------------------------------------------
export const kpiSnapshots = intranetSchema.table(
  "kpi_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    metricName: text("metric_name").notNull(),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
    period: text("period").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("kpi_snapshots_metric_period_uniq").on(
      table.metricName,
      table.period,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type NewDashboardConfig = typeof dashboardConfigs.$inferInsert;
export type MeetingDecision = typeof meetingDecisions.$inferSelect;
export type NewMeetingDecision = typeof meetingDecisions.$inferInsert;
export type BriefingPreference = typeof briefingPreferences.$inferSelect;
export type NewBriefingPreference = typeof briefingPreferences.$inferInsert;
export type KpiSnapshot = typeof kpiSnapshots.$inferSelect;
export type NewKpiSnapshot = typeof kpiSnapshots.$inferInsert;
