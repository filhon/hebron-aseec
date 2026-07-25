-- Migration: 0061_documentos_document_type
-- P-1.18b (CORRETIVO) — DocumentForm (P-1.14) já expõe um <select> "Tipo de
-- documento" com os oito valores de DocumentType, mas documentos.documents
-- nunca guardou essa escolha (as quatro telas de leitura escreviam
-- `type: "other"` fixo). O mesmo vale para os metadados de versão
-- (file_size_bytes, mime_type, notes): a UI coleta o File.size/File.type no
-- upload e descarta os dois, forçando a inferência de mimeType por extensão
-- de arquivo em runtime.

-- ---------------------------------------------------------------------------
-- Enum: documentos.document_type
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "documentos"."document_type" AS ENUM (
    'edital', 'legal', 'fiscal', 'sop', 'cargo_description', 'policy', 'report', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- documentos.documents.type
-- ---------------------------------------------------------------------------
ALTER TABLE "documentos"."documents"
  ADD COLUMN IF NOT EXISTS "type" "documentos"."document_type" NOT NULL DEFAULT 'other';

CREATE INDEX IF NOT EXISTS documents_type_idx
  ON "documentos"."documents" ("type");

-- Backfill: todo edital é do tipo edital por definição — único backfill
-- honesto possível (o tipo real dos demais documentos existentes não é
-- recuperável e permanece 'other', o default da coluna).
UPDATE "documentos"."documents" d
SET "type" = 'edital'
WHERE EXISTS (
  SELECT 1 FROM "documentos"."editals" e WHERE e.id = d.id
);

-- ---------------------------------------------------------------------------
-- documentos.document_versions — metadados de arquivo (nullable: versões
-- existentes não têm como recuperar o dado)
-- ---------------------------------------------------------------------------
ALTER TABLE "documentos"."document_versions"
  ADD COLUMN IF NOT EXISTS "file_size_bytes" bigint,
  ADD COLUMN IF NOT EXISTS "mime_type" text,
  ADD COLUMN IF NOT EXISTS "notes" text;
