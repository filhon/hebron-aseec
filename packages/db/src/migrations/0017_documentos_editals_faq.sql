-- Migration: 0017_documentos_editals_faq
-- Persiste as perguntas frequentes de cada edital. Antes desta migration, a
-- página pública (editais/[slug]) exibia um FAQ_ITEMS estático (igual para
-- todos os editais) e o formulário editorial mantinha um estado local de FAQ
-- que era descartado ao publicar/salvar — nunca chegava ao banco nem à
-- página pública.

ALTER TABLE "documentos"."editals"
  ADD COLUMN "faq" jsonb NOT NULL DEFAULT '[]'::jsonb;
