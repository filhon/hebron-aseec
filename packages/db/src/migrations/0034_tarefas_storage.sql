-- Migration: 0034_tarefas_storage
-- P-4.8 — Server Actions Tarefas: bucket de Storage para anexos.
--
-- Débito registrado em SESSIONS.md: nenhum prompt de schema/RLS de tarefas
-- (P-4.6/P-4.7) provisionou o bucket referenciado por
-- `tarefas.attachments.storage_key` — mesmo gap que 0020_storage_buckets.sql
-- corrigiu para documentos/projetos/financeiro (S1-21iii / CS-11). Sem este
-- arquivo, `createAttachment` (apps/tarefas/src/actions/tasks.ts) chama
-- `createSignedUploadUrl` contra um bucket inexistente.
--
-- Convenção de path (mesma de project-attachments/financeiro-recibos):
--   tarefas-anexos   {uploaded_by}/{uuid}.{ext}
--
-- Visibilidade: staff (colaborador/diretor/conselheiro/super_admin) lê tudo
-- — mesma transparência interna de tarefas.attachments (0033_tarefas_rls.sql,
-- attachments_select_staff). Insert restrito à própria pasta do usuário,
-- mesmo padrão de project-attachments.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tarefas-anexos', 'tarefas-anexos', false, 10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "tarefas_anexos_select_staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tarefas-anexos'
    AND public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "tarefas_anexos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tarefas-anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "tarefas_anexos_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tarefas-anexos' AND public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
