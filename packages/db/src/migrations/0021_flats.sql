-- Migration: 0021_flats
-- P-7.6 — Schema do Banco Flats. Cria o schema "flats" completo: units (2
-- fixas, seed abaixo), reservations, preferred_periods, guests,
-- vehicles, scoring_responses, aid_requests, usage_history, document_files
-- (BRAIN §6.8). Gerado via `drizzle-kit generate` a partir de
-- schema/flats.ts (G6.4) — os valores novos de admin.audit_action ficam em
-- 0022_flats_audit_actions.sql, separado por ser não-transacional (mesmo
-- padrão de 0032_tarefas_audit_actions.sql / 0020_plataforma_audit_actions.sql).
--
-- Extras hand-added abaixo do bloco gerado pelo kit (não representáveis em
-- schema/flats.ts): CREATE EXTENSION btree_gist, EXCLUDE USING gist contra
-- double-booking em reservations, e o seed de units.
--
-- RLS deste schema fica para P-7.7. Colunas de PII (flats.guests: name,
-- cpf, birth_date, email, phone) e o dado sensível de saúde
-- (flats.scoring_responses.health_self_declared, BRAIN §6.8 critério d)
-- ficam sem RLS restrita até lá — ver comentários em schema/flats.ts.
CREATE TYPE "flats"."aid_request_status" AS ENUM('solicitado', 'aprovado', 'rejeitado');--> statement-breakpoint
CREATE TYPE "flats"."ministry_type" AS ENUM('pastor', 'missionario', 'conjuge_pastor', 'conjuge_missionario');--> statement-breakpoint
CREATE TYPE "flats"."reservation_status" AS ENUM('solicitada', 'aprovada', 'rejeitada', 'confirmada', 'em_curso', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "flats"."scoring_criterion" AS ENUM('a_tempo_ministerio', 'b_frequencia_uso', 'c_localizacao', 'd_saude', 'e_situacao_familiar', 'f_ultimo_descanso', 'g_intensidade_ministerial', 'h_carta_recomendacao', 'i_tipo_sustento', 'j_participacao_projetos');--> statement-breakpoint
CREATE TYPE "flats"."transport_mode" AS ENUM('aereo', 'combustivel', 'nenhum');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flats"."aid_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"requests_daily_allowance" boolean DEFAULT false NOT NULL,
	"daily_allowance_amount" numeric(10, 2),
	"transport_mode" "flats"."transport_mode" DEFAULT 'nenhum' NOT NULL,
	"transport_passenger_count" integer,
	"transport_amount" numeric(10, 2),
	"status" "flats"."aid_request_status" DEFAULT 'solicitado' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"financeiro_expense_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aid_requests_reservation_id_unique" UNIQUE("reservation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flats"."document_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"guest_id" uuid,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- flats.guests: PII — name, cpf, birth_date, email, phone. Acesso restrito
-- a gestor/super_admin via RLS (P-7.7).
CREATE TABLE IF NOT EXISTS "flats"."guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"cpf" text NOT NULL,
	"birth_date" date NOT NULL,
	"is_responsible" boolean DEFAULT false NOT NULL,
	"is_under_3" boolean DEFAULT false NOT NULL,
	"email" text,
	"phone" text,
	"ministry_type" "flats"."ministry_type",
	"ministry_start_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flats"."vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"plate" text NOT NULL,
	"color" text NOT NULL,
	"model" text NOT NULL,
	"brand" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_reservation_id_unique" UNIQUE("reservation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flats"."preferred_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"period" daterange NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preferred_periods_reservation_rank_uniq" UNIQUE("reservation_id","rank"),
	CONSTRAINT "preferred_periods_rank_check" CHECK ("flats"."preferred_periods"."rank" IN (1, 2, 3))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flats"."reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by" uuid NOT NULL,
	"unit_id" uuid,
	"status" "flats"."reservation_status" DEFAULT 'solicitada' NOT NULL,
	"selected_period" daterange,
	"purpose" text NOT NULL,
	"arrives_by_car" boolean DEFAULT false NOT NULL,
	"score_total" integer,
	"manager_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- flats.scoring_responses.health_self_declared: dado sensível de saúde
-- (BRAIN §6.8 critério d) — coluna própria, nunca em "value", acesso
-- restrito via RLS/GRANT em P-7.7; coleta condicionada a consentimento
-- "dado_saude" em public.consents (P-7.4).
CREATE TABLE IF NOT EXISTS "flats"."scoring_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"criterion" "flats"."scoring_criterion" NOT NULL,
	"value" text,
	"health_self_declared" boolean,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scoring_responses_reservation_criterion_uniq" UNIQUE("reservation_id","criterion"),
	CONSTRAINT "scoring_responses_health_column_check" CHECK (("flats"."scoring_responses"."criterion" = 'd_saude' AND "flats"."scoring_responses"."value" IS NULL) OR ("flats"."scoring_responses"."criterion" <> 'd_saude' AND "flats"."scoring_responses"."health_self_declared" IS NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flats"."units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"capacity" integer DEFAULT 6 NOT NULL,
	"bedrooms" integer DEFAULT 2 NOT NULL,
	"has_suite" boolean DEFAULT true NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"amenities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flats"."usage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reservation_id" uuid NOT NULL,
	"days_used" integer NOT NULL,
	"period" daterange NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."aid_requests" ADD CONSTRAINT "aid_requests_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "flats"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."aid_requests" ADD CONSTRAINT "aid_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."document_files" ADD CONSTRAINT "document_files_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "flats"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."document_files" ADD CONSTRAINT "document_files_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "flats"."guests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."document_files" ADD CONSTRAINT "document_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."guests" ADD CONSTRAINT "guests_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "flats"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."guests" ADD CONSTRAINT "guests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."vehicles" ADD CONSTRAINT "vehicles_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "flats"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."preferred_periods" ADD CONSTRAINT "preferred_periods_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "flats"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."reservations" ADD CONSTRAINT "reservations_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."reservations" ADD CONSTRAINT "reservations_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "flats"."units"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."reservations" ADD CONSTRAINT "reservations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."scoring_responses" ADD CONSTRAINT "scoring_responses_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "flats"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."usage_history" ADD CONSTRAINT "usage_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flats"."usage_history" ADD CONSTRAINT "usage_history_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "flats"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_files_reservation_id_idx" ON "flats"."document_files" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_files_guest_id_idx" ON "flats"."document_files" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guests_reservation_id_idx" ON "flats"."guests" USING btree ("reservation_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "guests_reservation_responsible_uniq" ON "flats"."guests" USING btree ("reservation_id") WHERE "flats"."guests"."is_responsible" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "preferred_periods_reservation_id_idx" ON "flats"."preferred_periods" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_requested_by_idx" ON "flats"."reservations" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_status_idx" ON "flats"."reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_unit_id_idx" ON "flats"."reservations" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scoring_responses_reservation_id_idx" ON "flats"."scoring_responses" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_history_user_id_idx" ON "flats"."usage_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_history_reservation_id_idx" ON "flats"."usage_history" USING btree ("reservation_id");

-- ---------------------------------------------------------------------------
-- Double-booking: nenhuma unidade pode ter duas reservas "ocupantes"
-- (aprovada/confirmada/em_curso) com selected_period sobreposto. Não
-- representável em schema/flats.ts — EXCLUDE não é suportado pelo Drizzle
-- ORM. Requer btree_gist para o operador de igualdade de uuid em índice
-- GiST. WHERE na constraint restringe às reservas que de fato ocupam o
-- flat: solicitada/rejeitada/cancelada/concluida ficam de fora (unit_id ou
-- selected_period ainda nulos, ou já liberado).
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "flats"."reservations"
    ADD CONSTRAINT "reservations_no_overlap_per_unit"
    EXCLUDE USING gist (
      "unit_id" WITH =,
      "selected_period" WITH &&
    )
    WHERE (status IN ('aprovada', 'confirmada', 'em_curso'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- flats.units — 2 fixas, gratuitas (BRAIN §6.8). Sem rota de criação na v1.
-- ---------------------------------------------------------------------------
INSERT INTO "flats"."units"
  ("id", "name", "description", "capacity", "bedrooms", "has_suite", "photos", "amenities", "is_active")
VALUES
  (
    '00000000-0000-0000-0008-000000000001',
    'Flat Refúgio',
    'Apartamento no condomínio fechado, próximo à sede da Hebron Aseec, com varanda e vista para a área verde.',
    6, 2, true,
    '[]'::jsonb,
    '["Wi-Fi", "Ar-condicionado", "Cozinha equipada", "Roupa de cama e banho", "Estacionamento"]'::jsonb,
    true
  ),
  (
    '00000000-0000-0000-0008-000000000002',
    'Flat Shalom',
    'Apartamento térreo do condomínio, com acesso facilitado e área de convivência compartilhada.',
    6, 2, true,
    '[]'::jsonb,
    '["Wi-Fi", "Ar-condicionado", "Cozinha equipada", "Roupa de cama e banho", "Acesso facilitado (térreo)"]'::jsonb,
    true
  )
ON CONFLICT ("id") DO NOTHING;