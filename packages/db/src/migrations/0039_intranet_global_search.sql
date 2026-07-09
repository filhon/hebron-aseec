-- Migration: 0039_intranet_global_search
-- P-5.8 — Busca global cross-app da Intranet. Contrato fechado na auditoria
-- (PROMPTS.md P-5.8): a busca roda com o client da SESSÃO do usuário
-- (authenticated) e a RLS de cada schema filtra o que ele pode ver — zero
-- reimplementação de visibilidade na aplicação. Financeiro fica fora do
-- conjunto indexável v1 (dados sensíveis, acessível só pelo app próprio).
--
-- PostgREST só expõe os schemas "public"/"graphql_public" (supabase/config.toml)
-- — por isso a função pública abaixo é o único jeito de consultar
-- projetos/documentos/tarefas/admin através do client de sessão. Ela é
-- SECURITY INVOKER (não DEFINER): roda com o papel do próprio chamador, então
-- as policies de RLS de cada tabela (projects_select_*, documents_select_*,
-- tasks_select_staff, meeting_sessions_select_board) filtram as linhas com o
-- papel real de quem chamou — SECURITY DEFINER rodaria como o dono da função
-- e bypassaria RLS, quebrando o contrato.

CREATE OR REPLACE FUNCTION public.intranet_global_search(_query text)
RETURNS TABLE(module text, id uuid, title text, description text)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, projetos, documentos, tarefas, admin
AS $$
  (
    SELECT 'projetos'::text AS module, p.id, p.title, NULL::text AS description
    FROM projetos.projects p
    WHERE p.title ILIKE '%' || _query || '%'
    ORDER BY p.title
    LIMIT 20
  )
  UNION ALL
  (
    SELECT 'documentos'::text, d.id, d.title, NULL::text
    FROM documentos.documents d
    WHERE d.title ILIKE '%' || _query || '%'
    ORDER BY d.title
    LIMIT 20
  )
  UNION ALL
  (
    SELECT 'tarefas'::text, t.id, t.title, NULL::text
    FROM tarefas.tasks t
    WHERE t.deleted_at IS NULL
      AND t.title ILIKE '%' || _query || '%'
    ORDER BY t.title
    LIMIT 20
  )
  UNION ALL
  (
    SELECT
      'admin'::text,
      m.id,
      'Reunião ' || m.type::text || ' — ' || to_char(m.date, 'DD/MM/YYYY'),
      NULL::text
    FROM admin.meeting_sessions m
    WHERE m.type::text ILIKE '%' || _query || '%'
       OR to_char(m.date, 'DD/MM/YYYY') ILIKE '%' || _query || '%'
    ORDER BY m.date DESC
    LIMIT 20
  )
$$;

GRANT EXECUTE ON FUNCTION public.intranet_global_search(text) TO authenticated;
