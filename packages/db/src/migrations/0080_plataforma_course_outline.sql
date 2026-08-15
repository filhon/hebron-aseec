-- Migration: 0080_plataforma_course_outline
-- P-6.2b (CORRETIVO) — a trilha sequencial era modelada duas vezes: uma em
-- `plataforma.can_access_lesson` (0020_plataforma_rls.sql, a única
-- alimentada, ordena por module."order"/lesson."order") e outra na coluna
-- `lessons.next_lesson_id`, que nada nunca escreveu. Consequência: a ementa
-- de um curso ainda não matriculado vinha vazia (lessons_select_enrolled
-- exige matrícula) e o progresso do aluno era contado só sobre as aulas
-- liberadas pelo SELECT, nunca sobre o total real do curso.
--
-- `course_outline` expõe o esqueleto da trilha (nunca conteúdo — video_url/
-- content/download_url continuam atrás de lessons_select_enrolled, sem
-- nenhuma policy alterada aqui) para qualquer usuário autenticado, matriculado
-- ou não: mesmo padrão SECURITY DEFINER STABLE de plataforma.verify_certificate
-- (0020_plataforma_rls.sql), que expõe o mínimo necessário sem abrir SELECT
-- direto na tabela protegida.

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
  ORDER BY m."order", l."order";
$$;

GRANT EXECUTE ON FUNCTION plataforma.course_outline(uuid) TO authenticated;

-- `lessons.next_lesson_id` está 100% NULL (nenhum caminho de escrita jamais
-- a preencheu — createLesson/updateLesson/reorderLessons em
-- apps/plataforma/src/actions/courses.ts não a mencionam); "próxima aula" é
-- derivada de course_outline() na leitura (queries.ts), nunca mais uma
-- coluna. DROP COLUMN remove a FK inline junto.
ALTER TABLE "plataforma"."lessons" DROP COLUMN IF EXISTS "next_lesson_id";
