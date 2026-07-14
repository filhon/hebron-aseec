-- Migration: 0046_plataforma_uploads_storage
-- P-6.15 — Upload de Mídia da Plataforma (capa de curso, anexo de aula).
--
-- Débito registrado desde P-6.4/S-106, adiado conscientemente em P-6.8/P-6.9:
-- CourseForm/LessonForm capturavam File só localmente (URL.createObjectURL),
-- sem nenhuma Server Action de upload real. Dois problemas fechados aqui:
--
-- 1. plataforma-capas (0020_storage_buckets.sql) restringia INSERT/UPDATE/
--    DELETE a public.has_role('super_admin') — inconsistente com a decisão
--    de P-6.7 (0020_plataforma_rls.sql, suposição G1) de que qualquer
--    instrutor (dado — plataforma.is_instructor() — não papel) tem CRUD
--    completo em curso. Corrigido abaixo para o mesmo padrão de
--    courses_mutate_staff: super_admin OR plataforma.is_instructor().
--
-- 2. Não existia bucket para anexo de aula tipo "download" — plataforma.
--    lessons.download_url/download_file_name/download_file_size_bytes
--    existem desde P-6.6 (0019_shocking_wrecking_crew.sql), mas P-0.12 só
--    provisionou plataforma-capas. Criado plataforma-anexos: privado,
--    escrita staff (mesmo padrão de lessons_mutate_staff), leitura staff OU
--    matriculado no curso da pasta (mesma visibilidade de aula no nível de
--    curso — o path não carrega lesson_id, então a trilha sequencial fina de
--    plataforma.can_access_lesson não é reproduzível aqui; suposição
--    registrada em SESSIONS.md).
--
-- Path convention (informativo — as policies abaixo checam só bucket_id e
-- pasta raiz, não têm dependência estrutural além disso):
--   plataforma-capas     {actorId}/{uuid}.{ext}   (desvio do path ilustrativo
--                         de 0020_storage_buckets.sql: course_id ainda não
--                         existe no momento do upload da capa — CourseForm
--                         envia a imagem antes de criar o curso)
--   plataforma-anexos    {courseId}/{uuid}.{ext}  (courseId sempre existe —
--                         LessonForm exige a prop — só lessonId ainda não)

-- ===========================================================================
-- plataforma-capas — corrige policies de escrita para incluir instrutor
-- ===========================================================================
DROP POLICY IF EXISTS "plataforma_capas_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "plataforma_capas_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "plataforma_capas_delete_admin" ON storage.objects;

DO $$ BEGIN
  CREATE POLICY "plataforma_capas_insert_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'plataforma-capas'
    AND (public.has_role('super_admin') OR plataforma.is_instructor())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "plataforma_capas_update_staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'plataforma-capas'
    AND (public.has_role('super_admin') OR plataforma.is_instructor())
  )
  WITH CHECK (
    bucket_id = 'plataforma-capas'
    AND (public.has_role('super_admin') OR plataforma.is_instructor())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "plataforma_capas_delete_staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'plataforma-capas'
    AND (public.has_role('super_admin') OR plataforma.is_instructor())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================================================
-- plataforma-anexos — anexo de aula tipo "download" (PDF, Word, ZIP).
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('plataforma-anexos', 'plataforma-anexos', false, 20971520,
        ARRAY[
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/zip'
        ])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "plataforma_anexos_select_enrolled_or_staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'plataforma-anexos'
    AND (
      public.has_role('super_admin')
      OR plataforma.is_instructor()
      OR EXISTS (
        SELECT 1 FROM "plataforma"."enrollments" e
        WHERE e.user_id = auth.uid()
          AND e.course_id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "plataforma_anexos_insert_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'plataforma-anexos'
    AND (public.has_role('super_admin') OR plataforma.is_instructor())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "plataforma_anexos_update_staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'plataforma-anexos'
    AND (public.has_role('super_admin') OR plataforma.is_instructor())
  )
  WITH CHECK (
    bucket_id = 'plataforma-anexos'
    AND (public.has_role('super_admin') OR plataforma.is_instructor())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "plataforma_anexos_delete_staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'plataforma-anexos'
    AND (public.has_role('super_admin') OR plataforma.is_instructor())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
