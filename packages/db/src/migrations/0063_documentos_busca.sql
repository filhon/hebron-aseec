-- Migration: 0063_documentos_busca
-- P-1.20b (corretivo) — busca de documentos sensível a acento e sem índice.
--
-- `ILIKE '%termo%'` compara byte a byte: buscar "orcamento" não encontra
-- "Orçamento", "missoes" não encontra "Missões" — o caso mais comum de
-- digitação rápida no celular. Além disso, curinga à esquerda ('%termo%')
-- não usa nenhum índice B-tree; toda busca era um seq scan em
-- documentos.documents.
--
-- Fix: extensão unaccent + pg_trgm. `unaccent()` built-in é STABLE (a
-- dictionary lookup por nome via search_path poderia mudar), então não pode
-- aparecer numa coluna GERADA nem num índice de expressão — Postgres exige
-- IMMUTABLE para os dois. `f_unaccent` abaixo é o wrapper padrão da
-- comunidade Postgres: fixa o dicionário via cast para regdictionary (uma
-- constante resolvida na definição da função, não por lookup em cada
-- chamada) e declara IMMUTABLE — truque documentado no wiki do Postgres para
-- viabilizar unaccent em índice.
--
-- `documents.search_text` materializa title + content_md já normalizados
-- (STORED, não recalculado em toda leitura) com índice GIN gin_trgm_ops, que
-- suporta ILIKE '%...%' com curinga nos dois lados — o caso de uso central
-- do pg_trgm. tags.name e categories.name recebem índice de expressão
-- equivalente (sem materializar: tabelas pequenas, sem necessidade de
-- coluna própria).

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION "documentos"."f_unaccent"(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;

-- ---------------------------------------------------------------------------
-- documentos.documents — coluna gerada + índice GIN trgm
-- ---------------------------------------------------------------------------
ALTER TABLE "documentos"."documents"
  ADD COLUMN "search_text" text
  GENERATED ALWAYS AS (
    "documentos"."f_unaccent"(lower("title" || ' ' || coalesce("content_md", '')))
  ) STORED;

CREATE INDEX "documents_search_text_trgm_idx"
  ON "documentos"."documents" USING gin ("search_text" gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- documentos.tags / documentos.categories — índice de expressão equivalente
-- ---------------------------------------------------------------------------
CREATE INDEX "tags_name_trgm_idx"
  ON "documentos"."tags"
  USING gin ("documentos"."f_unaccent"(lower("name")) gin_trgm_ops);

CREATE INDEX "categories_name_trgm_idx"
  ON "documentos"."categories"
  USING gin ("documentos"."f_unaccent"(lower("name")) gin_trgm_ops);
