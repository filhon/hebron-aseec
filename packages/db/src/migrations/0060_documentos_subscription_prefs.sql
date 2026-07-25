-- Migration: 0060_documentos_subscription_prefs
-- P-1.16b (CORRETIVO) — SubscriptionForm (P-1.16) já expõe dois toggles
-- independentes por categoria ("avisar em nova versão" / "avisar quando
-- abrir edital"), mas documentos.subscriptions só guardava (user_id,
-- category_id): a UI colapsava os dois num único "inscrito" e recarregava
-- sempre com ambos hardcoded em true, e o envio de email nunca filtrava por
-- tipo de evento. Linhas existentes ficam com ambos `true` — preserva o
-- comportamento atual (todo mundo já inscrito continua recebendo os dois
-- tipos de alerta até ajustar a preferência).

ALTER TABLE "documentos"."subscriptions"
  ADD COLUMN IF NOT EXISTS "on_new_version" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "on_edital_open" boolean NOT NULL DEFAULT true;

-- Faltava UPDATE: as policies de 0005_documentos_rls.sql só cobriam
-- SELECT/INSERT/DELETE porque subscribe/unsubscribe nunca atualizavam uma
-- linha existente. saveSubscriptions (substitui o par subscribe/unsubscribe)
-- faz upsert via onConflictDoUpdate — sem esta policy e o GRANT abaixo, o
-- caminho de update do upsert falha silenciosamente sob RLS (0 linhas) ou
-- com "permission denied" antes mesmo da policy.
CREATE POLICY "subscriptions_update_own"
  ON "documentos"."subscriptions" FOR UPDATE
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT UPDATE ON "documentos"."subscriptions" TO authenticated;
