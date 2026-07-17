-- Migration: 0054_radio_listener_heartbeats_rls
-- P-8.11 — Integração Cross-App Rádio: RLS de radio.listener_heartbeats.
-- Gerado vazio com `drizzle-kit generate --custom` e preenchido à mão (RLS
-- não é representável em schema/radio.ts — mesmo padrão de
-- 0011_financeiro_rls.sql/0050_radio_rls.sql).
--
-- Escrita real (heartbeat do player, ouvinte anônimo) roda pela conexão
-- superuser de @hebron/db/client a partir de
-- apps/radio/src/app/api/heartbeat/route.ts — mesma decisão já tomada em
-- apps/radio/src/app/api/stream/route.ts para now_playing (sem sessão HTTP
-- de usuário, G1). RLS abaixo é defense-in-depth (BRAIN §"Defense in
-- depth") para o caminho de PostgREST/anon-key: dado bruto e efêmero (LGPD —
-- descartado após agregação diária, packages/jobs/src/crons/radio-stats.ts),
-- sem motivo de negócio para SELECT/mutação por qualquer papel além de
-- super_admin.
ALTER TABLE "radio"."listener_heartbeats" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listener_heartbeats_mutate_admin"
  ON "radio"."listener_heartbeats" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."listener_heartbeats" TO authenticated;
