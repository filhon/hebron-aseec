-- Migration: 0021_users_anonymized_at
-- P-0.13 — LGPD: fundação (S1-03/F3-09). Marca quando um usuário foi
-- anonimizado por packages/db/src/anonymization.ts (anonymizeUser). Não é
-- exclusão de linha: a linha e as FKs permanecem, só os campos de PII são
-- substituídos por pseudônimo — este timestamp registra que a substituição
-- já ocorreu (idempotência) e permite excluir a conta de listagens.

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "anonymized_at" timestamptz;
