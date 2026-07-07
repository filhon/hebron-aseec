-- Migration: 0031_tarefas
-- P-4.6 — Schema do Banco Tarefas. Cria o schema "tarefas" completo: workspaces
-- (6 fixos, seed abaixo — sem rota de criação, BRAIN §6.9), tasks, subtasks,
-- assignees, comments, attachments, time_entries, tags, task_tags,
-- task_templates, template_items, recurrence_rules, approval_requests,
-- task_events (log operacional do módulo).
--
-- Escrita à mão (não com o SQL bruto de `drizzle-kit generate`): o snapshot
-- rastreado em src/migrations/meta ficou parado em 0014 (migrations 0015-0030
-- foram aplicadas fora do fluxo do drizzle-kit — drift pré-existente, já
-- registrado em 0029_financeiro_payable_bloqueio_audit_actions.sql). Gerar a
-- partir dele reincluía CREATE TYPE/ADD COLUMN de 14 migrations já aplicadas,
-- sem idempotência — quebraria qualquer banco onde já existem. `db:generate`
-- foi rodado para produzir o nome do arquivo e resincronizar o snapshot de
-- meta (agora em paridade com schema/index.ts), mas o SQL abaixo foi escrito
-- à mão, apenas com o que é de fato novo neste prompt.
--
-- RLS deste schema fica para P-4.7 (modelo de acesso sem membership por
-- workspace — ver comentário em schema/tarefas.ts).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "tarefas"."workspace_slug" AS ENUM (
    'administrativo', 'financeiro', 'contabil_fiscal',
    'eclesiastico', 'comunicacao', 'tecnologia_inovacao'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tarefas"."task_priority" AS ENUM ('baixa', 'media', 'alta', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tarefas"."task_status" AS ENUM ('a_fazer', 'em_progresso', 'em_revisao', 'concluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tarefas"."task_source" AS ENUM ('manual', 'auto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tarefas"."recurrence_type" AS ENUM ('diaria', 'semanal', 'mensal', 'anual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tarefas"."tag_color" AS ENUM ('blue', 'orange', 'green', 'cyan', 'neutral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tarefas"."attachment_parent_type" AS ENUM ('task', 'comment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tarefas"."approval_request_status" AS ENUM ('pendente', 'aprovado', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- tarefas.workspaces — 6 fixos, seed abaixo. Sem rota de criação (BRAIN §6.9).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."workspaces" (
  "id"         uuid                          PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       "tarefas"."workspace_slug"    NOT NULL UNIQUE,
  "name"       text                          NOT NULL,
  "created_at" timestamptz                   NOT NULL DEFAULT now()
);

INSERT INTO "tarefas"."workspaces" ("id", "slug", "name") VALUES
  ('00000000-0000-0000-0007-000000000001', 'administrativo',        'Administrativo'),
  ('00000000-0000-0000-0007-000000000002', 'financeiro',             'Financeiro'),
  ('00000000-0000-0000-0007-000000000003', 'contabil_fiscal',        'Contábil e Fiscal'),
  ('00000000-0000-0000-0007-000000000004', 'eclesiastico',           'Eclesiástico'),
  ('00000000-0000-0000-0007-000000000005', 'comunicacao',            'Comunicação'),
  ('00000000-0000-0000-0007-000000000006', 'tecnologia_inovacao',    'Tecnologia e Inovação')
ON CONFLICT ("slug") DO NOTHING;

-- ---------------------------------------------------------------------------
-- tarefas.tags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."tags" (
  "id"         uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       text                    NOT NULL,
  "color"      "tarefas"."tag_color"   NOT NULL,
  "created_at" timestamptz             NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- tarefas.task_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."task_templates" (
  "id"                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                   text          NOT NULL,
  "description"            text,
  "workspace_id"           uuid          NOT NULL REFERENCES "tarefas"."workspaces" ("id") ON DELETE RESTRICT,
  "trigger_source_module"  text,
  "trigger_event"          text,
  "is_active"              boolean       NOT NULL DEFAULT true,
  "created_by"             uuid          NOT NULL REFERENCES public.users ("id"),
  "created_at"             timestamptz   NOT NULL DEFAULT now(),
  "updated_at"             timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_templates_workspace_id_idx
  ON "tarefas"."task_templates" ("workspace_id");

CREATE OR REPLACE TRIGGER task_templates_updated_at
  BEFORE UPDATE ON "tarefas"."task_templates"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tarefas.template_items — tarefas pré-definidas de um template
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."template_items" (
  "id"                uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_template_id"  uuid                        NOT NULL REFERENCES "tarefas"."task_templates" ("id") ON DELETE CASCADE,
  "title"             text                        NOT NULL,
  "description"       text,
  "priority"          "tarefas"."task_priority"   NOT NULL DEFAULT 'media',
  "due_offset_days"   integer,
  "subtasks"          jsonb                       NOT NULL DEFAULT '[]'::jsonb,
  "order"             integer                     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS template_items_task_template_id_idx
  ON "tarefas"."template_items" ("task_template_id");

-- ---------------------------------------------------------------------------
-- tarefas.recurrence_rules
-- dayOfWeek usado só quando type = 'semanal' (0 = domingo .. 6 = sábado).
-- dayOfMonth usado só quando type = 'mensal' | 'anual' (1-31).
-- next_run_at: próxima execução planejada, consumida pelo cron (P-4.8).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."recurrence_rules" (
  "id"                uuid                          PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_template_id"  uuid                          NOT NULL REFERENCES "tarefas"."task_templates" ("id") ON DELETE CASCADE,
  "type"              "tarefas"."recurrence_type"   NOT NULL,
  "interval"          integer                       NOT NULL DEFAULT 1,
  "day_of_week"       integer,
  "day_of_month"      integer,
  "end_date"          timestamptz,
  "next_run_at"       timestamptz,
  "created_at"        timestamptz                   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recurrence_rules_task_template_id_idx
  ON "tarefas"."recurrence_rules" ("task_template_id");

CREATE INDEX IF NOT EXISTS recurrence_rules_next_run_at_idx
  ON "tarefas"."recurrence_rules" ("next_run_at");

-- ---------------------------------------------------------------------------
-- tarefas.tasks
-- Imutabilidade: soft-delete via deleted_at, nunca hard delete.
-- source_ref: { sourceModule, sourceId } quando source = 'auto'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."tasks" (
  "id"                        uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"                     text                        NOT NULL,
  "description"               text,
  "workspace_id"              uuid                        NOT NULL REFERENCES "tarefas"."workspaces" ("id") ON DELETE RESTRICT,
  "status"                    "tarefas"."task_status"     NOT NULL DEFAULT 'a_fazer',
  "priority"                  "tarefas"."task_priority"   NOT NULL DEFAULT 'media',
  "due_date"                  timestamptz,
  "source"                    "tarefas"."task_source"     NOT NULL DEFAULT 'manual',
  "source_ref"                jsonb,
  "needs_manual_assignment"   boolean                     NOT NULL DEFAULT false,
  "recurrence_parent_id"      uuid,
  "created_by"                uuid                        NOT NULL REFERENCES public.users ("id"),
  "created_at"                timestamptz                 NOT NULL DEFAULT now(),
  "updated_at"                timestamptz                 NOT NULL DEFAULT now(),
  "completed_at"              timestamptz,
  "deleted_at"                timestamptz
);

CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx ON "tarefas"."tasks" ("workspace_id");
CREATE INDEX IF NOT EXISTS tasks_status_idx       ON "tarefas"."tasks" ("status");
CREATE INDEX IF NOT EXISTS tasks_created_by_idx   ON "tarefas"."tasks" ("created_by");
CREATE INDEX IF NOT EXISTS tasks_due_date_idx     ON "tarefas"."tasks" ("due_date");
CREATE INDEX IF NOT EXISTS tasks_deleted_at_idx   ON "tarefas"."tasks" ("deleted_at")
  WHERE "deleted_at" IS NULL;

CREATE OR REPLACE TRIGGER tasks_updated_at
  BEFORE UPDATE ON "tarefas"."tasks"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tarefas.subtasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."subtasks" (
  "id"           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"      uuid          NOT NULL REFERENCES "tarefas"."tasks" ("id") ON DELETE CASCADE,
  "title"        text          NOT NULL,
  "completed"    boolean       NOT NULL DEFAULT false,
  "assignee_id"  uuid          REFERENCES public.users ("id") ON DELETE SET NULL,
  "order"        integer       NOT NULL DEFAULT 0,
  "created_at"   timestamptz   NOT NULL DEFAULT now(),
  "completed_at" timestamptz
);

CREATE INDEX IF NOT EXISTS subtasks_task_id_idx ON "tarefas"."subtasks" ("task_id");

-- ---------------------------------------------------------------------------
-- tarefas.assignees — many-to-many task <-> user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."assignees" (
  "id"           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"      uuid          NOT NULL REFERENCES "tarefas"."tasks" ("id") ON DELETE CASCADE,
  "user_id"      uuid          NOT NULL REFERENCES public.users ("id") ON DELETE CASCADE,
  "assigned_at"  timestamptz   NOT NULL DEFAULT now(),
  UNIQUE ("task_id", "user_id")
);

CREATE INDEX IF NOT EXISTS assignees_task_id_idx ON "tarefas"."assignees" ("task_id");
CREATE INDEX IF NOT EXISTS assignees_user_id_idx ON "tarefas"."assignees" ("user_id");

-- ---------------------------------------------------------------------------
-- tarefas.comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."comments" (
  "id"          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"     uuid          NOT NULL REFERENCES "tarefas"."tasks" ("id") ON DELETE CASCADE,
  "author_id"   uuid          NOT NULL REFERENCES public.users ("id"),
  "content"     text          NOT NULL,
  "mentions"    jsonb         NOT NULL DEFAULT '[]'::jsonb,
  "created_at"  timestamptz   NOT NULL DEFAULT now(),
  "updated_at"  timestamptz
);

CREATE INDEX IF NOT EXISTS comments_task_id_idx ON "tarefas"."comments" ("task_id");

-- ---------------------------------------------------------------------------
-- tarefas.attachments — polimórfico (task/comment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."attachments" (
  "id"               uuid                                  PRIMARY KEY DEFAULT gen_random_uuid(),
  "parent_type"      "tarefas"."attachment_parent_type"    NOT NULL,
  "parent_id"        uuid                                  NOT NULL,
  "storage_key"      text                                  NOT NULL,
  "file_name"        text                                  NOT NULL,
  "file_size_bytes"  integer                                NOT NULL,
  "mime_type"        text                                  NOT NULL,
  "uploaded_by"      uuid                                  NOT NULL REFERENCES public.users ("id"),
  "uploaded_at"      timestamptz                           NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attachments_parent_idx
  ON "tarefas"."attachments" ("parent_type", "parent_id");

-- ---------------------------------------------------------------------------
-- tarefas.time_entries — time tracking opcional (BRAIN §6.9, "features v1")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."time_entries" (
  "id"                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"           uuid          NOT NULL REFERENCES "tarefas"."tasks" ("id") ON DELETE CASCADE,
  "user_id"           uuid          NOT NULL REFERENCES public.users ("id"),
  "started_at"        timestamptz   NOT NULL,
  "ended_at"          timestamptz,
  "duration_minutes"  integer,
  "notes"             text
);

CREATE INDEX IF NOT EXISTS time_entries_task_id_idx ON "tarefas"."time_entries" ("task_id");
CREATE INDEX IF NOT EXISTS time_entries_user_id_idx ON "tarefas"."time_entries" ("user_id");

-- ---------------------------------------------------------------------------
-- tarefas.task_tags — join table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."task_tags" (
  "id"       uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"  uuid   NOT NULL REFERENCES "tarefas"."tasks" ("id") ON DELETE CASCADE,
  "tag_id"   uuid   NOT NULL REFERENCES "tarefas"."tags" ("id") ON DELETE CASCADE,
  UNIQUE ("task_id", "tag_id")
);

CREATE INDEX IF NOT EXISTS task_tags_task_id_idx ON "tarefas"."task_tags" ("task_id");
CREATE INDEX IF NOT EXISTS task_tags_tag_id_idx  ON "tarefas"."task_tags" ("tag_id");

-- ---------------------------------------------------------------------------
-- tarefas.approval_requests — mutação crítica; ver admin.audit_action
-- em 0032_tarefas_audit_actions.sql (G6.3).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."approval_requests" (
  "id"                uuid                                 PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"           uuid                                 NOT NULL REFERENCES "tarefas"."tasks" ("id") ON DELETE CASCADE,
  "requested_status"  "tarefas"."task_status"              NOT NULL,
  "requested_by"      uuid                                 NOT NULL REFERENCES public.users ("id"),
  "approver_id"       uuid                                 NOT NULL REFERENCES public.users ("id"),
  "status"            "tarefas"."approval_request_status" NOT NULL DEFAULT 'pendente',
  "notes"             text,
  "requested_at"      timestamptz                          NOT NULL DEFAULT now(),
  "resolved_at"       timestamptz
);

CREATE INDEX IF NOT EXISTS approval_requests_task_id_idx     ON "tarefas"."approval_requests" ("task_id");
CREATE INDEX IF NOT EXISTS approval_requests_approver_id_idx ON "tarefas"."approval_requests" ("approver_id");
CREATE INDEX IF NOT EXISTS approval_requests_status_idx      ON "tarefas"."approval_requests" ("status");

-- ---------------------------------------------------------------------------
-- tarefas.task_events — log operacional do dia a dia (diferente de
-- admin.audit_log, reservado a mutações críticas — aprovações).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tarefas"."task_events" (
  "id"          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"     uuid          NOT NULL REFERENCES "tarefas"."tasks" ("id") ON DELETE CASCADE,
  "actor_id"    uuid          NOT NULL REFERENCES public.users ("id"),
  "event_type"  text          NOT NULL,
  "diff"        jsonb,
  "created_at"  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_events_task_id_idx    ON "tarefas"."task_events" ("task_id");
CREATE INDEX IF NOT EXISTS task_events_created_at_idx ON "tarefas"."task_events" ("created_at");
