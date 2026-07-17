-- Migration: 0052_radio_listener_stats_add_columns
-- P-8.11 — Integração Cross-App Rádio: passo 1/2 da mudança de
-- radio.listener_stats para o formato diário agregado (D-3). Gerado com
-- `drizzle-kit generate` (journal internamente nomeou como `0025_...` —
-- mesmo drift pré-existente do meta/_journal.json documentado em
-- 0050_radio_rls.sql, parado em idx 24; renomeado em disco para `0052` para
-- seguir a numeração sequencial real). O gerador também reemitiu os valores
-- novos de admin.audit_action já aplicados por 0051_radio_audit_actions.sql
-- via ALTER TYPE (mesmo drift — migrations custom não entram no snapshot que
-- o kit usa para diff); removidos manualmente deste arquivo para não
-- duplicar.
--
-- listener_count permanece nullable nesta migration (tabela vazia em
-- produção — confirmado antes de gerar) só para permitir que o passo 2
-- (DROP COLUMN, próxima migration) seja um diff não-ambíguo para o gerador
-- (evita o prompt interativo de "create or rename column").
DROP INDEX IF EXISTS "listener_stats_captured_at_idx";--> statement-breakpoint
ALTER TABLE "radio"."listener_stats" ALTER COLUMN "listener_count" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "radio"."listener_stats" ADD COLUMN "date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "radio"."listener_stats" ADD COLUMN "unique_sessions" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "radio"."listener_stats" ADD COLUMN "hours_listened" numeric(10, 2) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listener_stats_date_uniq" ON "radio"."listener_stats" USING btree ("date");
