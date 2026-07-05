-- Migration: 0020_storage_buckets
-- P-0.12 — Storage: buckets e policies (AUDIT/04-prompts-pendentes.md §4).
--
-- Problema (S1-21iii / CS-11): uploads em produção dependem de buckets que
-- nenhuma migration cria — `hebron-docs` e `project-attachments` são
-- referenciados por path literal em app code (apps/documentos,
-- apps/projetos) desde as Fases 1-2, mas nunca foram provisionados aqui;
-- só existem porque alguém os criou manualmente pelo dashboard em algum
-- ambiente. `financeiro-extratos` já foi formalizado ad hoc em
-- 0019_financeiro_organization_budgets.sql (P-3.8b, S-63) seguindo esse
-- mesmo precedente, antes deste corretivo rodar — nada a redeclarar aqui
-- além de registrá-lo na documentação (ver BRAIN §4).
--
-- Este arquivo formaliza os buckets que faltam e as respectivas policies de
-- storage.objects, seguindo exatamente o padrão já usado por
-- financeiro-extratos: bucket privado (public = false, toda leitura via
-- signed URL de prazo curto ou path resolvido sob demanda) + policies em
-- storage.objects que espelham a policy da tabela que referencia o arquivo.
--
-- Convenção de path (obrigatória para as policies abaixo funcionarem):
--   hebron-docs           documents/{author_id}/{uuid}.{ext}
--   project-attachments   {uploaded_by}/{uuid}.{ext}
--   financeiro-extratos   {bank_account_id}/{uuid}.{ext}      (já existente)
--   financeiro-recibos    {uploaded_by}/{uuid}.{ext}
--   flats-documentos      {user_id}/{uuid}.{ext}
--   plataforma-capas      {course_id}/{uuid}.{ext}
--
-- flats-documentos e plataforma-capas não têm nenhuma tabela/app consumidora
-- ainda (Fases 6 e 7 pendentes) — as policies abaixo usam apenas os papéis
-- globais já existentes (public.role, sem depender de schema que não
-- existe), como fundação para P-6.4/P-6.8 e P-7.4/P-7.6 adotarem. Path
-- ownership (ex.: hóspede só lê a própria pasta) é o único controle
-- possível hoje; refinamento por reserva/curso é escopo desses prompts.

-- ===========================================================================
-- hebron-docs (documentos) — PII/registro editorial; visibilidade herdada
-- de documentos.documents / document_versions (mesmo padrão de
-- 0005_documentos_rls.sql). Upload hoje só acontece via signed upload URL
-- gerada por Server Action com service_role (getUploadUrl), então estas
-- policies são defense-in-depth, não o caminho principal.
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hebron-docs', 'hebron-docs', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "hebron_docs_select_by_visibility"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (
    bucket_id = 'hebron-docs'
    AND (
      EXISTS (
        SELECT 1 FROM "documentos"."documents" d
        WHERE d.file_url = storage.objects.name
          AND d.deleted_at IS NULL
          AND (
            d.visibility = 'public'
            OR (d.visibility = 'internal'   AND auth.uid() IS NOT NULL)
            OR (d.visibility = 'restricted' AND public.has_role('super_admin', 'diretor', 'conselheiro'))
          )
      )
      OR EXISTS (
        SELECT 1 FROM "documentos"."document_versions" v
        JOIN "documentos"."documents" d ON d.id = v.document_id
        WHERE v.file_url = storage.objects.name
          AND d.deleted_at IS NULL
          AND (
            d.visibility = 'public'
            OR (d.visibility = 'internal'   AND auth.uid() IS NOT NULL)
            OR (d.visibility = 'restricted' AND public.has_role('super_admin', 'diretor', 'conselheiro'))
          )
      )
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "hebron_docs_insert_editor"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hebron-docs'
    AND public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Sem UPDATE/DELETE: document_versions é imutável (0005_documentos_rls.sql);
-- documentos.documents usa soft-delete (deleted_at), nunca remove o arquivo.

-- ===========================================================================
-- project-attachments (projetos) — anexos de propostas e de relatórios.
-- Espelha projetos.project_attachments (0008): dono lê o próprio, diretoria
-- lê tudo, dono insere o próprio. report_attachments usa o mesmo bucket e a
-- mesma convenção de path (uploaded_by na raiz da pasta).
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-attachments', 'project-attachments', false, 10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "project_attachments_select_own_or_staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role('super_admin', 'diretor', 'conselheiro')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_attachments_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================================================
-- financeiro-recibos (financeiro) — comprovantes/NF/recibos anexados a
-- payables, receivables ou transactions. Espelha financeiro.attachments
-- (0010_financeiro.sql: attachments_select_staff / insert_staff /
-- delete_admin) exatamente. Retenção de 5 anos, mesma decisão F3-Q6 que
-- financeiro-extratos.
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('financeiro-recibos', 'financeiro-recibos', false, 10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "financeiro_recibos_select_staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'financeiro-recibos'
    AND public.has_role('super_admin', 'diretor', 'colaborador')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "financeiro_recibos_insert_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'financeiro-recibos'
    AND public.has_role('super_admin', 'colaborador')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "financeiro_recibos_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'financeiro-recibos'
    AND public.has_role('super_admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================================================
-- flats-documentos (flats, ainda sem schema de app — Fase 7 pendente) —
-- documento de identidade / comprovantes do hóspede (PII sensível, BRAIN
-- §6.8 critério d). Fundação mínima: dono lê/insere a própria pasta,
-- super_admin/diretor leem tudo para análise de reserva. P-7.4/P-7.6 devem
-- substituir a checagem de papel por uma ligada à reserva quando a tabela
-- existir (ver AUDIT/04-prompts-pendentes.md CS-9/CS-11).
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('flats-documentos', 'flats-documentos', false, 10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "flats_documentos_select_own_or_staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'flats-documentos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role('super_admin', 'diretor')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "flats_documentos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'flats-documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================================================
-- plataforma-capas (plataforma, ainda sem schema de app — Fase 6 pendente) —
-- imagem de capa de curso. BRAIN §6.3: "acesso a todos os cursos para
-- qualquer usuário registrado, sem restrição por papel"; criação hoje é
-- só super_admin (papel `professor` é v2). Fundação para P-6.4/P-6.8.
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('plataforma-capas', 'plataforma-capas', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "plataforma_capas_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'plataforma-capas');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "plataforma_capas_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plataforma-capas' AND public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "plataforma_capas_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'plataforma-capas' AND public.has_role('super_admin'))
  WITH CHECK (bucket_id = 'plataforma-capas' AND public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "plataforma_capas_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'plataforma-capas' AND public.has_role('super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
