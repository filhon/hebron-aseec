-- Migration: 0081_plataforma_course_stats
-- P-6.3c (CORRETIVO) — o painel do instrutor (app/instrutor/page.tsx)
-- sempre lê zero matrículas/certificados/progresso médio.
--
-- getInstructorDashboardCourses (queries.ts) agregava enrollments/progress/
-- certificates no cliente, dentro de withAuthenticatedContext com o
-- actorId do instrutor que abriu a tela. As três tabelas são "só o
-- próprio" (enrollments_select_own, progress_select_own,
-- certificates_select_own — 0020_plataforma_rls.sql), com exceção só para
-- super_admin. Um instrutor é uma linha em plataforma.instructors, não um
-- papel em public.role (plataforma.is_instructor(), mesmo arquivo) — não
-- passa em nenhuma das três policies, então todo agregado dava zero para
-- exatamente o público da tela.
--
-- course_stats() devolve só o agregado (contagens e média) — nunca linha
-- de aluno — para não abrir SELECT direto em progress/enrollments/
-- certificates de terceiros para o instrutor (isso vazaria o histórico
-- individual de cada aluno para resolver um contador). Guarda interna
-- (super_admin OU is_instructor(), senão conjunto vazio) porque a função é
-- GRANTed a authenticated — mesmo padrão de defesa em profundidade de
-- plataforma.verify_certificate/course_outline (0020_plataforma_rls.sql,
-- 0080_plataforma_course_outline.sql). Nenhuma policy existente muda.

CREATE OR REPLACE FUNCTION plataforma.course_stats(p_course_ids uuid[])
RETURNS TABLE (
  course_id uuid,
  enrollment_count integer,
  certificate_count integer,
  avg_percent integer
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    cid AS course_id,
    (
      SELECT count(*)::int FROM plataforma.enrollments e WHERE e.course_id = cid
    ) AS enrollment_count,
    (
      SELECT count(*)::int FROM plataforma.certificates c WHERE c.course_id = cid
    ) AS certificate_count,
    COALESCE(
      (
        SELECT round(avg(
          COALESCE(
            (
              SELECT count(*)::numeric FROM plataforma.progress p
              WHERE p.course_id = cid
                AND p.user_id = e.user_id
                AND p.completed_at IS NOT NULL
            ), 0
          ) / NULLIF(
            (SELECT count(*) FROM plataforma.lessons l WHERE l.course_id = cid), 0
          )
        ) * 100)::int
        FROM plataforma.enrollments e
        WHERE e.course_id = cid
      ), 0
    ) AS avg_percent
  FROM unnest(p_course_ids) AS cid
  WHERE public.has_role('super_admin') OR plataforma.is_instructor();
$$;

GRANT EXECUTE ON FUNCTION plataforma.course_stats(uuid[]) TO authenticated;
