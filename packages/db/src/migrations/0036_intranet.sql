-- Migration: 0036_intranet
-- P-5.6 — Schema do Banco Intranet. Cria as tabelas do schema "intranet"
-- (já existente desde 0000_initial): announcements, dashboard_configs,
-- meeting_decisions (FK admin.meeting_sessions + tarefas.tasks), briefing_preferences,
-- kpi_snapshots (cache de KPIs agregados, escrito por cron horário — cron
-- registrado em P-5.8; dashboard lê o snapshot mais recente, cai para query
-- live só se não houver snapshot com menos de 2h).
--
-- Gerado com `drizzle-kit generate` a partir do snapshot 0015 (já em paridade
-- com schema/index.ts — sem drift a resolver aqui, diferente de 0031_tarefas.sql).
-- Renomeado de 0016_charming_korath.sql para 0036_intranet.sql para seguir a
-- numeração sequencial dos arquivos em disco (padrão já usado em 0031_tarefas.sql
-- vs. a tag interna do journal do drizzle-kit).
--
-- RLS deste schema fica para P-5.7 (GRANTs para authenticated incluídos lá,
-- mesmo padrão de 0033_tarefas_rls.sql).

CREATE TYPE "intranet"."announcement_priority" AS ENUM('normal', 'importante', 'urgente');--> statement-breakpoint
CREATE TYPE "intranet"."briefing_frequency" AS ENUM('diario', 'semanal');--> statement-breakpoint
CREATE TYPE "intranet"."meeting_decision_status" AS ENUM('pendente', 'em_andamento', 'concluida');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intranet"."announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"priority" "intranet"."announcement_priority" NOT NULL,
	"author_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intranet"."briefing_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"frequency" "intranet"."briefing_frequency" DEFAULT 'diario' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "briefing_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intranet"."dashboard_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"widgets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_configs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intranet"."kpi_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" text NOT NULL,
	"value" numeric(14, 2) NOT NULL,
	"period" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_snapshots_metric_period_uniq" UNIQUE("metric_name","period")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intranet"."meeting_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_session_id" uuid NOT NULL,
	"description" text NOT NULL,
	"responsible_id" uuid NOT NULL,
	"due_date" timestamp with time zone,
	"status" "intranet"."meeting_decision_status" DEFAULT 'pendente' NOT NULL,
	"task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intranet"."announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intranet"."briefing_preferences" ADD CONSTRAINT "briefing_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intranet"."dashboard_configs" ADD CONSTRAINT "dashboard_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intranet"."meeting_decisions" ADD CONSTRAINT "meeting_decisions_meeting_session_id_meeting_sessions_id_fk" FOREIGN KEY ("meeting_session_id") REFERENCES "admin"."meeting_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intranet"."meeting_decisions" ADD CONSTRAINT "meeting_decisions_responsible_id_users_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intranet"."meeting_decisions" ADD CONSTRAINT "meeting_decisions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tarefas"."tasks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
