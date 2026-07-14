-- Migration: 0020_plataforma_rls
-- P-6.7 — RLS Policies Plataforma. DENY by default em todo o schema
-- plataforma (0019_shocking_wrecking_crew.sql criou as tabelas sem RLS/GRANT
-- — mesmo padrão de tarefas 0031→0033 e intranet 0036→0037).
--
-- Não existe papel "instrutor" em public.role (ROLES, packages/types/src/
-- roles.ts) — P-6.11 confirma que o "papel professor" é preparado só como
-- estrutura futura, sem funcionalidade na v1. "Instrutor", aqui, é definido
-- por dados: qualquer usuário com uma linha em plataforma.instructors
-- vinculada ao próprio user_id (helper plataforma.is_instructor()). Como o
-- escopo do prompt não qualifica "próprios" para cursos/módulos/aulas/
-- quizzes (ao contrário de progresso/notas, que dizem explicitamente
-- "apenas próprios"), qualquer instrutor tem CRUD completo em qualquer
-- curso — não só nos que leciona (suposição G1, registrada em SESSIONS.md;
-- revisitar se o pedagógico crescer e precisar de escopo por curso).
--
-- Semântica por tabela:
--   • instructors  → SELECT público (nome/bio aparecem no catálogo); CRUD
--                    só super_admin.
--   • series/courses/modules/lessons/quizzes/quiz_questions/discussions
--                  → SELECT: conteúdo publicado (courses.published) e, para
--                    lessons/quizzes/quiz_questions/discussions, também
--                    matrícula + trilha sequencial (can_access_lesson).
--                    CRUD: super_admin OU instrutor.
--   • enrollments  → aluno vê/cria/atualiza a própria matrícula; super_admin
--                    com override total (sem DELETE — trilha de auditoria
--                    acadêmica, nunca hard delete).
--   • progress/notes → apenas o próprio usuário (+ override de
--                    super_admin). INSERT de progress também passa pelo
--                    gate de trilha sequencial — sem isso, um INSERT direto
--                    "destravaria" uma aula sem passar pelo player.
--   • quiz_attempts → aluno vê/insere as próprias tentativas; super_admin/
--                    instrutor podem SELECT (correção); imutável — nunca
--                    UPDATE/DELETE (mesmo padrão de tarefas.task_events).
--   • certificates → SELECT só o próprio. Não há policy de INSERT para o
--                    próprio aluno: emissão automática (P-6.8) precisa de
--                    função SECURITY DEFINER dedicada (a criar naquele
--                    prompt) — nunca autodeclaração via INSERT direto do
--                    cliente. Verificação pública por hash via
--                    plataforma.verify_certificate(), sem abrir SELECT na
--                    tabela para anon.

-- ---------------------------------------------------------------------------
-- Helpers — SECURITY DEFINER STABLE, mesmo padrão de public.has_role.
-- ---------------------------------------------------------------------------

-- Verdadeiro se o usuário corrente tem uma linha em plataforma.instructors
-- vinculada à própria conta (não há papel "instrutor" em public.role — ver
-- cabeçalho).
CREATE OR REPLACE FUNCTION plataforma.is_instructor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM plataforma.instructors WHERE user_id = auth.uid()
  );
$$;

-- Trilha sequencial: verdadeiro se a aula não exige conclusão prévia
-- (requires_completion = false), ou é a primeira do curso (por
-- module."order", lesson."order"), ou a aula anterior tem
-- progress.completed_at do usuário informado. Evita subquery correlata
-- inline na policy de SELECT de lessons (e nas demais tabelas de conteúdo
-- que seguem a mesma trilha).
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

-- Verificação pública de certificado: hash → curso/nome/data, sem abrir
-- SELECT na tabela plataforma.certificates para anon (escopo P-6.7).
CREATE OR REPLACE FUNCTION plataforma.verify_certificate(p_hash text)
RETURNS TABLE (course_title text, user_name text, issued_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT c.title, u.full_name, cert.issued_at
  FROM plataforma.certificates cert
  JOIN plataforma.courses c ON c.id = cert.course_id
  JOIN public.users u ON u.id = cert.user_id
  WHERE cert.verification_hash = p_hash;
$$;

-- ===========================================================================
-- Row Level Security — DENY by default em todas as tabelas
-- ===========================================================================

-- ── instructors ─────────────────────────────────────────────────────────
ALTER TABLE "plataforma"."instructors" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instructors_mutate_admin"
  ON "plataforma"."instructors" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "instructors_select_authenticated"
  ON "plataforma"."instructors" FOR SELECT TO authenticated
  USING (true);

-- ── series (PATCH-024) — sem coluna "published"; SELECT aberto ao
--    autenticado é o equivalente mais próximo de "mesmo padrão de courses
--    publicados" nesta tabela ─────────────────────────────────────────────
ALTER TABLE "plataforma"."series" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "series_mutate_staff"
  ON "plataforma"."series" FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR plataforma.is_instructor())
  WITH CHECK (public.has_role('super_admin') OR plataforma.is_instructor());

CREATE POLICY "series_select_authenticated"
  ON "plataforma"."series" FOR SELECT TO authenticated
  USING (true);

-- ── courses ─────────────────────────────────────────────────────────────
ALTER TABLE "plataforma"."courses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_mutate_staff"
  ON "plataforma"."courses" FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR plataforma.is_instructor())
  WITH CHECK (public.has_role('super_admin') OR plataforma.is_instructor());

CREATE POLICY "courses_select_published"
  ON "plataforma"."courses" FOR SELECT TO authenticated
  USING ("published" = true);

-- ── modules — segue a publicação do curso-pai ──────────────────────────────
ALTER TABLE "plataforma"."modules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_mutate_staff"
  ON "plataforma"."modules" FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR plataforma.is_instructor())
  WITH CHECK (public.has_role('super_admin') OR plataforma.is_instructor());

CREATE POLICY "modules_select_published"
  ON "plataforma"."modules" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plataforma"."courses" c
      WHERE c.id = "plataforma"."modules"."course_id" AND c.published = true
    )
  );

-- ── lessons — matrícula + trilha sequencial via can_access_lesson ─────────
ALTER TABLE "plataforma"."lessons" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons_mutate_staff"
  ON "plataforma"."lessons" FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR plataforma.is_instructor())
  WITH CHECK (public.has_role('super_admin') OR plataforma.is_instructor());

CREATE POLICY "lessons_select_enrolled"
  ON "plataforma"."lessons" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plataforma"."enrollments" e
      WHERE e.user_id = auth.uid()
        AND e.course_id = "plataforma"."lessons"."course_id"
    )
    AND plataforma.can_access_lesson(auth.uid(), "plataforma"."lessons"."id")
  );

-- ── enrollments — matrícula própria; override de super_admin; sem DELETE
--    (trilha de auditoria acadêmica, nunca hard delete) ────────────────────
ALTER TABLE "plataforma"."enrollments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_mutate_admin"
  ON "plataforma"."enrollments" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "enrollments_select_own"
  ON "plataforma"."enrollments" FOR SELECT TO authenticated
  USING ("user_id" = auth.uid());

CREATE POLICY "enrollments_insert_own"
  ON "plataforma"."enrollments" FOR INSERT TO authenticated
  WITH CHECK (
    "user_id" = auth.uid()
    AND EXISTS (
      SELECT 1 FROM "plataforma"."courses" c
      WHERE c.id = "plataforma"."enrollments"."course_id" AND c.published = true
    )
  );

-- UPDATE cobre a marcação de completed_at quando a trilha é 100% concluída
-- (Server Action rodando como o próprio aluno — decisão B, G6.2).
CREATE POLICY "enrollments_update_own"
  ON "plataforma"."enrollments" FOR UPDATE TO authenticated
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

-- ── progress — apenas próprio; INSERT também exige matrícula + trilha
--    sequencial (defesa em profundidade além do SELECT gated de lessons);
--    sem DELETE (mesma razão de enrollments) ────────────────────────────────
ALTER TABLE "plataforma"."progress" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_mutate_admin"
  ON "plataforma"."progress" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "progress_select_own"
  ON "plataforma"."progress" FOR SELECT TO authenticated
  USING ("user_id" = auth.uid());

CREATE POLICY "progress_insert_own"
  ON "plataforma"."progress" FOR INSERT TO authenticated
  WITH CHECK (
    "user_id" = auth.uid()
    AND EXISTS (
      SELECT 1 FROM "plataforma"."enrollments" e
      WHERE e.user_id = auth.uid()
        AND e.course_id = "plataforma"."progress"."course_id"
    )
    AND plataforma.can_access_lesson(auth.uid(), "plataforma"."progress"."lesson_id")
  );

CREATE POLICY "progress_update_own"
  ON "plataforma"."progress" FOR UPDATE TO authenticated
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

-- ── quizzes — segue a visibilidade da aula (matrícula + trilha) ───────────
ALTER TABLE "plataforma"."quizzes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quizzes_mutate_staff"
  ON "plataforma"."quizzes" FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR plataforma.is_instructor())
  WITH CHECK (public.has_role('super_admin') OR plataforma.is_instructor());

CREATE POLICY "quizzes_select_enrolled"
  ON "plataforma"."quizzes" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plataforma"."lessons" l
      JOIN "plataforma"."enrollments" e
        ON e.course_id = l.course_id AND e.user_id = auth.uid()
      WHERE l.id = "plataforma"."quizzes"."lesson_id"
        AND plataforma.can_access_lesson(auth.uid(), l.id)
    )
  );

-- ── quiz_questions — mesma visibilidade do quiz-pai ────────────────────────
ALTER TABLE "plataforma"."quiz_questions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_questions_mutate_staff"
  ON "plataforma"."quiz_questions" FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR plataforma.is_instructor())
  WITH CHECK (public.has_role('super_admin') OR plataforma.is_instructor());

CREATE POLICY "quiz_questions_select_enrolled"
  ON "plataforma"."quiz_questions" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plataforma"."quizzes" q
      JOIN "plataforma"."lessons" l ON l.id = q.lesson_id
      JOIN "plataforma"."enrollments" e
        ON e.course_id = l.course_id AND e.user_id = auth.uid()
      WHERE q.id = "plataforma"."quiz_questions"."quiz_id"
        AND plataforma.can_access_lesson(auth.uid(), l.id)
    )
  );

-- ── quiz_attempts — próprio insere/vê; staff vê para correção; imutável
--    (sem UPDATE/DELETE para ninguém — mesmo padrão de tarefas.task_events) ─
ALTER TABLE "plataforma"."quiz_attempts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_attempts_select_own_or_staff"
  ON "plataforma"."quiz_attempts" FOR SELECT TO authenticated
  USING (
    "user_id" = auth.uid()
    OR public.has_role('super_admin')
    OR plataforma.is_instructor()
  );

CREATE POLICY "quiz_attempts_insert_own"
  ON "plataforma"."quiz_attempts" FOR INSERT TO authenticated
  WITH CHECK ("user_id" = auth.uid());

-- ── certificates — SELECT só o próprio; emissão fora do escopo desta
--    migration (ver cabeçalho); verificação pública via função acima ──────
ALTER TABLE "plataforma"."certificates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificates_mutate_admin"
  ON "plataforma"."certificates" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "certificates_select_own"
  ON "plataforma"."certificates" FOR SELECT TO authenticated
  USING ("user_id" = auth.uid());

-- ── discussions — fórum por aula; segue a visibilidade da aula ─────────────
ALTER TABLE "plataforma"."discussions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussions_mutate_staff"
  ON "plataforma"."discussions" FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR plataforma.is_instructor())
  WITH CHECK (public.has_role('super_admin') OR plataforma.is_instructor());

CREATE POLICY "discussions_select_enrolled"
  ON "plataforma"."discussions" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plataforma"."lessons" l
      JOIN "plataforma"."enrollments" e
        ON e.course_id = l.course_id AND e.user_id = auth.uid()
      WHERE l.id = "plataforma"."discussions"."lesson_id"
        AND plataforma.can_access_lesson(auth.uid(), l.id)
    )
  );

-- ── discussion_posts — visibilidade da discussão; escrita do próprio
--    autor; moderação (editar/remover qualquer post) só super_admin ───────
ALTER TABLE "plataforma"."discussion_posts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discussion_posts_mutate_admin"
  ON "plataforma"."discussion_posts" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "discussion_posts_select_enrolled"
  ON "plataforma"."discussion_posts" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plataforma"."discussions" d
      JOIN "plataforma"."lessons" l ON l.id = d.lesson_id
      JOIN "plataforma"."enrollments" e
        ON e.course_id = l.course_id AND e.user_id = auth.uid()
      WHERE d.id = "plataforma"."discussion_posts"."discussion_id"
        AND plataforma.can_access_lesson(auth.uid(), l.id)
    )
  );

CREATE POLICY "discussion_posts_insert_own"
  ON "plataforma"."discussion_posts" FOR INSERT TO authenticated
  WITH CHECK (
    "author_id" = auth.uid()
    AND EXISTS (
      SELECT 1 FROM "plataforma"."discussions" d
      JOIN "plataforma"."lessons" l ON l.id = d.lesson_id
      JOIN "plataforma"."enrollments" e
        ON e.course_id = l.course_id AND e.user_id = auth.uid()
      WHERE d.id = "plataforma"."discussion_posts"."discussion_id"
        AND plataforma.can_access_lesson(auth.uid(), l.id)
    )
  );

CREATE POLICY "discussion_posts_update_own"
  ON "plataforma"."discussion_posts" FOR UPDATE TO authenticated
  USING ("author_id" = auth.uid())
  WITH CHECK ("author_id" = auth.uid());

-- ── notes — nota pessoal, apenas o próprio dono ────────────────────────────
ALTER TABLE "plataforma"."notes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_mutate_admin"
  ON "plataforma"."notes" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "notes_all_own"
  ON "plataforma"."notes" FOR ALL TO authenticated
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

-- ===========================================================================
-- GRANTs — teto de permissão do role `authenticated` (e `anon`, só para a
-- verificação pública de certificado); RLS acima filtra por linha dentro
-- desse teto (mesma regra de 0014_grants_authenticated.sql /
-- 0033_tarefas_rls.sql). Sem isto, "permission denied for schema plataforma"
-- antes de qualquer policy ser avaliada.
-- ===========================================================================
GRANT USAGE ON SCHEMA "plataforma" TO authenticated;
GRANT USAGE ON SCHEMA "plataforma" TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."instructors"      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."series"           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."courses"          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."modules"          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."lessons"          TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON "plataforma"."enrollments"      TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON "plataforma"."progress"         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."quizzes"          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."quiz_questions"   TO authenticated;
GRANT SELECT, INSERT                 ON "plataforma"."quiz_attempts"    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."certificates"     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."discussions"      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."discussion_posts" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plataforma"."notes"            TO authenticated;

-- enrollments/progress nunca recebem DELETE (nem super_admin): matrícula e
-- progresso são trilha de auditoria acadêmica (BRAIN — "nunca hard delete").
-- quiz_attempts recebe só SELECT/INSERT: tentativa é imutável (mesmo padrão
-- de tarefas.task_events) — nem super_admin corrige um score já registrado.
-- certificates recebe INSERT no teto do GRANT, mas nenhuma policy permite
-- INSERT fora de super_admin (certificates_mutate_admin) — a emissão real
-- via aluno (P-6.8) precisará de função SECURITY DEFINER dedicada.

GRANT EXECUTE ON FUNCTION plataforma.verify_certificate(text) TO anon, authenticated;
