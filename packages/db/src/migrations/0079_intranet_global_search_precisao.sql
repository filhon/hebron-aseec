-- Migration: 0079_intranet_global_search_precisao
-- P-5.8c (CORRETIVO) — três defeitos em public.intranet_global_search
-- (0039_intranet_global_search.sql):
--
-- 1. _query ia direto para ILIKE sem escapar `%`/`_`/`\`. Buscar "100%"
--    devolvia tudo que contivesse "100"; buscar "ata_2026" casava
--    "ata 2026" e "ataX2026" (o `_` de LIKE casa um caractere qualquer).
--    Aqui o termo é escapado à mão (`\` primeiro, depois `%` e `_`) e a
--    comparação usa `ESCAPE '\'` explícito.
-- 2. A linha de reunião montava o rótulo em SQL ('Reunião ' || type::text),
--    devolvendo o enum cru ("Reunião ordinaria") em vez do rótulo acentuado
--    que o resto do módulo usa (queries.ts, MEETING_TYPE_LABEL). Agora a
--    função devolve type/date crus; o rótulo é montado na aplicação a
--    partir da mesma fonte única.
-- 3. Cada bloco cortava em 20 sem sinalizar o corte. Agora cada bloco busca
--    LIMIT 21 (teto de 20 + 1 sentinela); o 21º registro nunca é exibido —
--    ele só serve para actions/search.ts saber que houve corte e avisar o
--    módulo truncado.
--
-- Contrato de P-5.8 não muda: continua SECURITY INVOKER (roda com o papel
-- de quem chama, RLS de cada schema filtra as linhas) e o GRANT EXECUTE
-- para authenticated permanece no mesmo arquivo.
--
-- DROP FUNCTION é obrigatório porque o RETURNS TABLE muda de forma
-- (description deixa de carregar o rótulo de reunião; meeting_type/
-- meeting_date entram no lugar) — Postgres recusa CREATE OR REPLACE que
-- altere o tipo de retorno de uma função existente.

DROP FUNCTION IF EXISTS public.intranet_global_search(text);

CREATE FUNCTION public.intranet_global_search(_query text)
RETURNS TABLE(
  module text,
  id uuid,
  title text,
  description text,
  meeting_type text,
  meeting_date timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, projetos, documentos, tarefas, admin
AS $$
  WITH escaped AS (
    SELECT '%' || replace(replace(replace(_query, '\', '\\'), '%', '\%'), '_', '\_') || '%' AS pattern
  )
  (
    SELECT 'projetos'::text AS module, p.id, p.title, NULL::text AS description,
      NULL::text AS meeting_type, NULL::timestamptz AS meeting_date
    FROM projetos.projects p, escaped
    WHERE p.title ILIKE escaped.pattern ESCAPE '\'
    ORDER BY p.title
    LIMIT 21
  )
  UNION ALL
  (
    SELECT 'documentos'::text, d.id, d.title, NULL::text,
      NULL::text, NULL::timestamptz
    FROM documentos.documents d, escaped
    WHERE d.title ILIKE escaped.pattern ESCAPE '\'
    ORDER BY d.title
    LIMIT 21
  )
  UNION ALL
  (
    SELECT 'tarefas'::text, t.id, t.title, NULL::text,
      NULL::text, NULL::timestamptz
    FROM tarefas.tasks t, escaped
    WHERE t.deleted_at IS NULL
      AND t.title ILIKE escaped.pattern ESCAPE '\'
    ORDER BY t.title
    LIMIT 21
  )
  UNION ALL
  (
    SELECT 'admin'::text, m.id, NULL::text, NULL::text,
      m.type::text, m.date
    FROM admin.meeting_sessions m, escaped
    WHERE m.type::text ILIKE escaped.pattern ESCAPE '\'
       OR to_char(m.date, 'DD/MM/YYYY') ILIKE escaped.pattern ESCAPE '\'
    ORDER BY m.date DESC
    LIMIT 21
  )
$$;

GRANT EXECUTE ON FUNCTION public.intranet_global_search(text) TO authenticated;
