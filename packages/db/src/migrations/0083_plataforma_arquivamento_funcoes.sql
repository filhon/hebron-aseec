-- Migration: 0083_plataforma_arquivamento_funcoes
-- P-6.16 (CORRETIVO) — 0082_plataforma_arquivamento.sql (P-6.4b) atualizou as
-- policies de SELECT e plataforma.course_outline() para ignorar linha
-- arquivada, mas deixou para trás as demais funções SECURITY DEFINER e a
-- policy de INSERT de matrícula, todas entregues antes de archived_at
-- existir. Confirmado no banco de dev via pg_get_functiondef: can_access_
-- lesson, issue_certificate e course_stats não continham archived_at.
--
-- Sem este fix, arquivar a primeira aula/módulo/curso real dispara:
--   1. Trilha travada — can_access_lesson calcula a cadeia LAG() sobre
--      TODAS as aulas, arquivadas incluídas; arquivar a aula N tranca
--      permanentemente a aula N+1 para quem não a concluiu antes.
--   2. Conclusão da última aula aborta — issue_certificate revalida com
--      count(*) cru em lessons (inclui arquivada) enquanto a aplicação
--      (checkAndIssueCertificate) já conta pela outline; a função RAISE
--      EXCEPTION e a transação inteira de markLessonComplete/
--      submitQuizAttempt reverte.
--   3. Painel do instrutor diverge — course_stats usa o mesmo count(*) cru
--      como denominador, saindo da régua da outline/certificado.
--   4. Matrícula direta em curso arquivado continua possível por RPC —
--      enrollments_insert_own exige published = true mas não archived_at
--      IS NULL.
--
-- Fix: as três funções passam a usar o mesmo universo de course_outline()
-- (aula/módulo com archived_at IS NULL); enrollments_insert_own ganha o
-- mesmo filtro de archived_at que courses_select_published já tem desde
-- 0082. Nenhuma policy de SELECT muda — só as funções SECURITY DEFINER e
-- esta policy de INSERT.

-- ---------------------------------------------------------------------------
-- plataforma.can_access_lesson — a cadeia LAG() passa a ser calculada só
-- sobre aulas (e módulos) não arquivados, o mesmo filtro de
-- course_outline(). Aula/módulo arquivado nunca mais entra na partição:
-- quem vem depois de uma aula arquivada passa a enxergar a aula anterior
-- não-arquivada como o requisito real, em vez de ficar trancado para sempre
-- atrás de uma aula que já não existe para ninguém.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION plataforma.can_access_lesson(p_user_id uuid, p_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH ordered AS (
    SELECT
      l.id,
      l.requires_completion,
      LAG(l.id) OVER (
        PARTITION BY l.course_id ORDER BY m."order", l."order"
      ) AS prev_lesson_id
    FROM plataforma.lessons l
    JOIN plataforma.modules m ON m.id = l.module_id
    WHERE l.archived_at IS NULL AND m.archived_at IS NULL
  )
  SELECT
    NOT o.requires_completion
    OR o.prev_lesson_id IS NULL
    OR EXISTS (
      SELECT 1 FROM plataforma.progress p
      WHERE p.user_id = p_user_id
        AND p.lesson_id = o.prev_lesson_id
        AND p.completed_at IS NOT NULL
    )
  FROM ordered o
  WHERE o.id = p_lesson_id;
$$;

-- ---------------------------------------------------------------------------
-- plataforma.issue_certificate — total e concluídas passam a vir de uma
-- fonte só, plataforma.course_outline(p_course_id) (a mesma que a aplicação
-- já usa em checkAndIssueCertificate), nunca mais count(*) cru em lessons.
-- "Concluídas" intersecciona progress.lesson_id com as aulas da outline —
-- linha de progresso de aula arquivada (que sobrevive ao arquivamento, por
-- design de P-6.4b) deixa de inflar o numerador.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION plataforma.issue_certificate(p_course_id uuid)
RETURNS plataforma.certificates
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cert plataforma.certificates%ROWTYPE;
  v_total_lessons integer;
  v_completed_lessons integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM plataforma.enrollments
    WHERE user_id = auth.uid() AND course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Usuário não matriculado neste curso';
  END IF;

  SELECT * INTO v_cert FROM plataforma.certificates
  WHERE course_id = p_course_id AND user_id = auth.uid();
  IF FOUND THEN
    RETURN v_cert;
  END IF;

  WITH outline AS (
    SELECT lesson_id FROM plataforma.course_outline(p_course_id)
  )
  SELECT
    count(*)::int,
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM plataforma.progress p
        WHERE p.user_id = auth.uid()
          AND p.completed_at IS NOT NULL
          AND p.lesson_id = outline.lesson_id
      )
    )::int
  INTO v_total_lessons, v_completed_lessons
  FROM outline;

  IF v_total_lessons = 0 OR v_completed_lessons < v_total_lessons THEN
    RAISE EXCEPTION 'Trilha não concluída (% de % aulas)', v_completed_lessons, v_total_lessons;
  END IF;

  INSERT INTO plataforma.certificates (course_id, user_id, verification_hash)
  VALUES (
    p_course_id,
    auth.uid(),
    md5(gen_random_uuid()::text || clock_timestamp()::text)
  )
  RETURNING * INTO v_cert;

  RETURN v_cert;
END;
$$;

-- ---------------------------------------------------------------------------
-- plataforma.course_stats — denominador e numerador do avg_percent
-- restritos a aulas não arquivadas (mesmo filtro de lessons/modules que
-- can_access_lesson/course_outline usam), para o painel do instrutor voltar
-- a bater com a régua da jornada do aluno e do certificado.
-- ---------------------------------------------------------------------------

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
                AND p.lesson_id IN (
                  SELECT l.id FROM plataforma.lessons l
                  JOIN plataforma.modules m ON m.id = l.module_id
                  WHERE l.course_id = cid
                    AND l.archived_at IS NULL
                    AND m.archived_at IS NULL
                )
            ), 0
          ) / NULLIF(
            (
              SELECT count(*) FROM plataforma.lessons l
              JOIN plataforma.modules m ON m.id = l.module_id
              WHERE l.course_id = cid
                AND l.archived_at IS NULL
                AND m.archived_at IS NULL
            ), 0
          )
        ) * 100)::int
        FROM plataforma.enrollments e
        WHERE e.course_id = cid
      ), 0
    ) AS avg_percent
  FROM unnest(p_course_ids) AS cid
  WHERE public.has_role('super_admin') OR plataforma.is_instructor();
$$;

-- ---------------------------------------------------------------------------
-- enrollments_insert_own — mesmo filtro de archived_at que
-- courses_select_published já exige desde 0082; sem isso, matrícula direta
-- em curso arquivado continuava possível por RPC (a policy só barrava
-- rascunho, não curso arquivado).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "enrollments_insert_own" ON "plataforma"."enrollments";
CREATE POLICY "enrollments_insert_own"
  ON "plataforma"."enrollments" FOR INSERT TO authenticated
  WITH CHECK (
    "user_id" = auth.uid()
    AND EXISTS (
      SELECT 1 FROM "plataforma"."courses" c
      WHERE c.id = "plataforma"."enrollments"."course_id"
        AND c.published = true
        AND c.archived_at IS NULL
    )
  );
