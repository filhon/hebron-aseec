-- Migration: 0078_intranet_perfil_diretorio
-- P-5.1b (CORRETIVO) — o diretório da intranet promete bio e foto, mas
-- nenhuma das duas tinha fonte: `bio` não existia como coluna, e
-- `avatar_url` (que já existia) nunca era escrita por nenhum app.
--
-- 1. bio: coluna simples, sem policy nova — users_update_own e
--    users_select_own/_admin (0000_initial.sql:147-159) já cobrem qualquer
--    coluna da própria linha.
-- 2. perfil-avatares: bucket no mesmo desenho de 0020_storage_buckets.sql
--    (pasta por usuário, escrita só do dono), mas leitura aberta a todo
--    autenticado — o diretório é interno, não há visibilidade por papel a
--    aplicar (mesma lógica de plataforma-capas).

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio text;

-- ===========================================================================
-- perfil-avatares (intranet) — foto de perfil exibida no diretório.
-- Path: {user_id}/{uuid}.{ext}. Privado: leitura resolvida sob demanda via
-- signed URL de curta duração (mesmo padrão de plataforma-capas/uploads.ts,
-- nunca uma URL de longa duração persistida).
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('perfil-avatares', 'perfil-avatares', false, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "perfil_avatares_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'perfil-avatares');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "perfil_avatares_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'perfil-avatares'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
