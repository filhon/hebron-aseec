-- Migration: 0053_radio_listener_stats_finalize
-- P-8.11 — Integração Cross-App Rádio: passo 2/2. Cria radio.listener_heartbeats
-- (heartbeat anônimo bruto, D-3) e remove listener_count de listener_stats
-- (formato antigo, substituído em 0052 por date/unique_sessions/hours_listened).
-- Gerado com `drizzle-kit generate` como `0026_...` (mesmo drift do journal
-- documentado em 0050_radio_rls.sql); renomeado em disco para `0053`.
CREATE TABLE IF NOT EXISTS "radio"."listener_heartbeats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"track_id" uuid NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "radio"."listener_heartbeats" ADD CONSTRAINT "listener_heartbeats_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "radio"."tracks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listener_heartbeats_received_at_idx" ON "radio"."listener_heartbeats" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listener_heartbeats_session_id_idx" ON "radio"."listener_heartbeats" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "radio"."listener_stats" DROP COLUMN IF EXISTS "listener_count";