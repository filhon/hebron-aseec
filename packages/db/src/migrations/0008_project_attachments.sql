-- Migration: 0008_project_attachments
-- Cria tabela projetos.project_attachments e bucket de storage project-attachments.

CREATE TABLE IF NOT EXISTS projetos.project_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projetos.projects(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  uploaded_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_attachments_project_id_idx ON projetos.project_attachments(project_id);

ALTER TABLE projetos.project_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "submissor_reads_own_project_attachments"
  ON projetos.project_attachments FOR SELECT
  TO authenticated
  USING (uploaded_by = (select auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "directors_read_all_project_attachments"
  ON projetos.project_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      WHERE ra.user_id = (select auth.uid())
      AND ra.role IN ('super_admin', 'diretor', 'conselheiro')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "submissor_inserts_project_attachments"
  ON projetos.project_attachments FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = (select auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
