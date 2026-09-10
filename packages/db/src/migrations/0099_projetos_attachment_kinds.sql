-- Migration: 0099_projetos_attachment_kinds
-- P-2.20 (CORRETIVO) — AUDIT/06 §1.7, Q47/Q54.
--
-- project_attachments não distinguia o TIPO do anexo: o wizard coletava dois
-- PDFs genéricos ("projeto"/"estatuto") e um checkbox de autodeclaração para
-- a carta de recomendação — sem lugar para o vídeo de apresentação (até 3
-- min) nem a planilha de orçamento por etapas, ambos exigidos pelo PRD/Q47
-- e opcionais (mas com os campos presentes) no pontual (Q54).
--
-- kind: default 'outro' cobre as linhas já existentes, criadas antes desta
-- distinção — nunca invalida projetos anteriores (critério de aceite).
-- file_url passa a ser NULLABLE: anexos kind='video' não sobem para este
-- bucket (caro, sem streaming) — usam bunny_video_id, resolvido via
-- signBunnyPlaybackUrl (packages/integrations/src/bunny-stream.ts, P-6.20).

DO $$ BEGIN
  CREATE TYPE "projetos"."project_attachment_kind" AS ENUM (
    'projeto', 'estatuto', 'video', 'planilha', 'carta', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "projetos"."project_attachments"
  ADD COLUMN IF NOT EXISTS "kind" "projetos"."project_attachment_kind" NOT NULL DEFAULT 'outro';

ALTER TABLE "projetos"."project_attachments"
  ADD COLUMN IF NOT EXISTS "bunny_video_id" text;

ALTER TABLE "projetos"."project_attachments"
  ALTER COLUMN "file_url" DROP NOT NULL;

-- Planilha (XLSX/XLS/CSV/ODS) e carta de recomendação passam a caber no
-- mesmo bucket dos demais anexos de proposta — mesmo padrão ON CONFLICT DO
-- UPDATE de 0020_storage_buckets.sql, sem recriar as policies existentes
-- (project_attachments_select_own_or_staff / project_attachments_insert_own
-- já cobrem qualquer arquivo neste bucket, independente do mime type).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-attachments', 'project-attachments', false, 10485760,
        ARRAY[
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/vnd.oasis.opendocument.spreadsheet'
        ])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
