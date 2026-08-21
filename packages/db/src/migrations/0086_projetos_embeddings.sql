-- Migration: 0086_projetos_embeddings
-- P-2.14 (BRAIN §2/§6.2/§8, PATCH-012): detecção de duplicidade de projetos
-- via embeddings (OpenAI text-embedding-3-small) + pgvector. Compara o
-- CONTEÚDO da proposta contra qualquer projeto já submetido, de qualquer
-- organização — nunca decide/bloqueia automaticamente, apenas sinaliza para
-- diretor/conselheiro/super_admin (mesma visibilidade de score_ai/
-- score_ai_breakdown, migration 0007_projetos_rls.sql).
--
-- possible_duplicate/duplicate_candidates são um SNAPSHOT calculado em
-- submitProject com o limiar então vigente — mudar o limiar depois
-- (admin.system_settings["projetos_duplicate_threshold"]) não recalcula
-- projetos já submetidos (critério de aceite P-2.14).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "projetos"."projects"
  ADD COLUMN IF NOT EXISTS "embedding" vector(1536),
  ADD COLUMN IF NOT EXISTS "possible_duplicate" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "duplicate_candidates" jsonb;

-- Índice HNSW para busca por similaridade de cosseno — parcial (só linhas
-- com embedding já gerado, i.e. projetos submetidos ao menos uma vez).
-- HNSW escolhido sobre ivfflat: não exige dados pré-existentes para treinar
-- listas, funciona bem mesmo a partir de uma tabela vazia/pequena.
CREATE INDEX "projects_embedding_hnsw_idx"
  ON "projetos"."projects"
  USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;

COMMENT ON COLUMN "projetos"."projects"."embedding" IS
  'Embedding OpenAI text-embedding-3-small (1536 dims) de title+objectives+justification, gerado em submitProject (P-2.14). Nunca recalculado retroativamente.';
COMMENT ON COLUMN "projetos"."projects"."possible_duplicate" IS
  'Snapshot calculado na submissão: true se outro projeto (qualquer organização) teve similaridade de cosseno acima do limiar vigente em admin.system_settings["projetos_duplicate_threshold"] no momento desta submissão.';
COMMENT ON COLUMN "projetos"."projects"."duplicate_candidates" IS
  'Snapshot de candidatos similares na submissão: array de {projectId,title,orgName,similarity}. Visibilidade: diretor/conselheiro/super_admin apenas (mesma regra de score_ai) — nunca ao submissor.';
