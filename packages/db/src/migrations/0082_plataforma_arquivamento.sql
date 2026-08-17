-- Migration: 0082_plataforma_arquivamento
-- P-6.4b (CORRETIVO) — deleteCourse/deleteCourseModule/deleteLesson
-- (actions/courses.ts) faziam DELETE físico. As FKs de modules/lessons/
-- enrollments/progress/certificates para courses são "on delete cascade"
-- (packages/db/src/schema/plataforma.ts:113,145,178,208,309) — apagar um
-- curso apagava matrícula, progresso e certificados já emitidos, driblando
-- por dentro a própria decisão registrada no cabeçalho de
-- 0020_plataforma_rls.sql ("sem DELETE — trilha de auditoria acadêmica,
-- nunca hard delete") porque cascade de FK não passa por policy. Nenhuma
-- das três tinha chamador de UI (achado do prompt).
--
-- Fix: arquivamento em vez de exclusão. `archived_at` nullable em courses/
-- modules/lessons — curso/módulo/aula arquivado some do catálogo/ementa/
-- trilha/editor (filtros abaixo + queries.ts), mas a linha permanece:
-- matrícula, progresso e certificado de quem já cursou continuam intactos
-- e o certificado segue verificável em /certificado/verificar
-- (plataforma.verify_certificate não depende de courses.archived_at).
--
-- REVOKE DELETE espelha a mesma decisão já tomada para enrollments/progress/
-- quiz_attempts (0020_plataforma_rls.sql): sem isso, o "D" continuaria
-- fisicamente possível por fora da UI (psql direto, migration futura
-- descuidada) mesmo depois de nenhuma Server Action mais o chamar.

-- ---------------------------------------------------------------------------
-- Colunas — idempotente
-- ---------------------------------------------------------------------------

ALTER TABLE "plataforma"."courses" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
ALTER TABLE "plataforma"."modules" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
ALTER TABLE "plataforma"."lessons" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;

CREATE INDEX IF NOT EXISTS "courses_archived_at_idx" ON "plataforma"."courses" ("archived_at");
CREATE INDEX IF NOT EXISTS "modules_archived_at_idx" ON "plataforma"."modules" ("archived_at");
CREATE INDEX IF NOT EXISTS "lessons_archived_at_idx" ON "plataforma"."lessons" ("archived_at");

-- ---------------------------------------------------------------------------
-- RLS — SELECT "público" (courses_select_published / modules_select_published
-- / lessons_select_enrolled) passa a exigir archived_at IS NULL na própria
-- linha e em curso/módulo-pai, para que arquivar barre mesmo um SELECT
-- direto de aluno que já tinha a URL/id. courses_mutate_staff/
-- modules_mutate_staff/lessons_mutate_staff (FOR ALL, sem filtro de
-- archived_at) não mudam — instrutor continua enxergando a linha via RLS;
-- o filtro de "some do editor" é aplicado em queries.ts (camada de
-- aplicação), porque a policy de staff é intencionalmente irrestrita
-- (qualquer instrutor administra qualquer curso — G1 de P-6.7).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "courses_select_published" ON "plataforma"."courses";
CREATE POLICY "courses_select_published"
  ON "plataforma"."courses" FOR SELECT TO authenticated
  USING ("published" = true AND "archived_at" IS NULL);

DROP POLICY IF EXISTS "modules_select_published" ON "plataforma"."modules";
CREATE POLICY "modules_select_published"
  ON "plataforma"."modules" FOR SELECT TO authenticated
  USING (
    "archived_at" IS NULL
    AND EXISTS (
      SELECT 1 FROM "plataforma"."courses" c
      WHERE c.id = "plataforma"."modules"."course_id"
        AND c.published = true
        AND c.archived_at IS NULL
    )
  );

DROP POLICY IF EXISTS "lessons_select_enrolled" ON "plataforma"."lessons";
CREATE POLICY "lessons_select_enrolled"
  ON "plataforma"."lessons" FOR SELECT TO authenticated
  USING (
    "archived_at" IS NULL
    AND EXISTS (
      SELECT 1 FROM "plataforma"."modules" m
      WHERE m.id = "plataforma"."lessons"."module_id" AND m.archived_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM "plataforma"."courses" c
      WHERE c.id = "plataforma"."lessons"."course_id" AND c.archived_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM "plataforma"."enrollments" e
      WHERE e.user_id = auth.uid()
        AND e.course_id = "plataforma"."lessons"."course_id"
    )
    AND plataforma.can_access_lesson(auth.uid(), "plataforma"."lessons"."id")
  );

-- ---------------------------------------------------------------------------
-- plataforma.course_outline() — SECURITY DEFINER, não passa pelas policies
-- acima; precisa do mesmo filtro escrito à mão (mesma razão de já filtrar
-- c.published = true). Sem isto, a ementa/trilha (queries.ts,
-- getCourseModulesWithLessons/getLessonPageData) continuaria listando
-- módulo/aula arquivados para quem nunca teve acesso a eles antes.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION plataforma.course_outline(p_course_id uuid)
RETURNS TABLE (
  lesson_id uuid,
  module_id uuid,
  module_order integer,
  lesson_order integer,
  title text,
  type plataforma.lesson_type,
  video_duration_seconds integer,
  requires_completion boolean,
  unlocked boolean
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    l.id,
    l.module_id,
    m."order",
    l."order",
    l.title,
    l.type,
    l.video_duration_seconds,
    l.requires_completion,
    plataforma.can_access_lesson(auth.uid(), l.id)
  FROM plataforma.lessons l
  JOIN plataforma.modules m ON m.id = l.module_id
  JOIN plataforma.courses c ON c.id = l.course_id
  WHERE l.course_id = p_course_id
    AND c.published = true
    AND c.archived_at IS NULL
    AND m.archived_at IS NULL
    AND l.archived_at IS NULL
  ORDER BY m."order", l."order";
$$;

-- ---------------------------------------------------------------------------
-- discussion_posts — a policy de moderação existente (discussion_posts_
-- mutate_admin, FOR ALL) cobre DELETE só para super_admin;
-- discussion_posts_update_own (0020_plataforma_rls.sql) já libera UPDATE
-- para o autor, mas nunca existiu policy de DELETE para o próprio autor —
-- critério deste prompt exige que o autor edite E remova o próprio post,
-- não só edite.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "discussion_posts_delete_own" ON "plataforma"."discussion_posts";
CREATE POLICY "discussion_posts_delete_own"
  ON "plataforma"."discussion_posts" FOR DELETE TO authenticated
  USING ("author_id" = auth.uid());

-- ---------------------------------------------------------------------------
-- Sem DELETE físico de curso/módulo/aula por nenhum caminho, nem direto no
-- banco — espelha enrollments/progress/quiz_attempts (0020_plataforma_
-- rls.sql), trilha de auditoria acadêmica.
-- ---------------------------------------------------------------------------

REVOKE DELETE ON "plataforma"."courses" FROM authenticated;
REVOKE DELETE ON "plataforma"."modules" FROM authenticated;
REVOKE DELETE ON "plataforma"."lessons" FROM authenticated;
