-- Migration: 0089_pacote8_financeiro_robustez
-- AUDIT/04-BACKLOG-CORRECAO.md — PACOTE 8 (Robustez do Financeiro em escala).
--
-- Parte 1 — D5-001: guarda de idempotência do cron semanal de lote de
-- pagamentos. Hoje o guard é "existe lote da semana?", o que faz um retry
-- pular o laço de notificação inteiro se a criação do lote já tiver
-- terminado (mesmo que nenhum destinatário tenha sido avisado ainda).
-- notified_at troca a pergunta para "os destinatários já foram avisados?".
ALTER TABLE "financeiro"."batch_approvals"
  ADD COLUMN IF NOT EXISTS "notified_at" timestamptz;

-- Parte 2 — D2-002: índices nas 7 FKs em caminho de consulta real que não
-- tinham índice (levantamento completo em AUDIT/02-DOMINIOS/D2-dados.md
-- §[D2-002]). financeiro.payables.payment_schedule_id, também citada no
-- achado, já tem índice único implícito via
-- "payables_payment_schedule_id_unique" (0030_financeiro_payables_bloqueio_columns.sql)
-- — UNIQUE sempre cria um índice — por isso não repetida aqui.

-- DRE e relatório mensal agrupam transações por categoria (actions/reports.ts).
CREATE INDEX IF NOT EXISTS "transactions_category_id_idx"
  ON "financeiro"."transactions" USING btree ("category_id");

-- Listagem de contas a pagar/receber filtrada por conta bancária.
CREATE INDEX IF NOT EXISTS "payables_account_id_idx"
  ON "financeiro"."payables" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "receivables_account_id_idx"
  ON "financeiro"."receivables" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "receivables_category_id_idx"
  ON "financeiro"."receivables" USING btree ("category_id");

-- checkAndIssueCertificate faz inArray(progress.lessonId, outlineLessonIds)
-- a cada aula concluída (plataforma/lib/queries.ts).
CREATE INDEX IF NOT EXISTS "progress_lesson_id_idx"
  ON "plataforma"."progress" USING btree ("lesson_id");

-- Listagem de documentos por tag no portal público.
CREATE INDEX IF NOT EXISTS "document_tags_tag_id_idx"
  ON "documentos"."document_tags" USING btree ("tag_id");

-- Montagem de playlist do Auto DJ e agregação diária do cron radio-stats.
CREATE INDEX IF NOT EXISTS "playlist_tracks_track_id_idx"
  ON "radio"."playlist_tracks" USING btree ("track_id");

CREATE INDEX IF NOT EXISTS "listener_heartbeats_track_id_idx"
  ON "radio"."listener_heartbeats" USING btree ("track_id");
