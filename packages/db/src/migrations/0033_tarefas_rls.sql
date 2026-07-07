-- Migration: 0033_tarefas_rls
-- P-4.7 — RLS Policies Tarefas. Semântica fechada (sem membership por
-- workspace, ver comentário em schema/tarefas.ts / 0031_tarefas.sql):
--   • super_admin      → full access em todo o schema (FOR ALL em toda tabela)
--   • colaborador      → SELECT em todas as tarefas dos 6 workspaces
--                        (transparência interna); INSERT em qualquer
--                        workspace; UPDATE/soft-DELETE apenas em tarefas que
--                        criou ou nas quais é assignee
--   • diretor/conselheiro → SELECT em tudo (TreeView de despacho); UPDATE
--                        apenas em approval_requests endereçados a si; NUNCA
--                        recebem INSERT em tasks (não têm tarefas operacionais,
--                        BRAIN §6.9)
--   • comentários/anexos/time_entries → seguem a visibilidade da tarefa;
--                        escrita restrita ao próprio autor
--   • demais papéis (submissor, aluno, hospede, ouvinte) → sem nenhuma policy
--                        que os inclua → zero acesso ao schema
--
-- GRANT: como o schema tarefas nasceu depois de 0014_grants_authenticated.sql
-- (o retrofit que corrigiu admin/documentos/projetos/financeiro), este arquivo
-- já inclui os GRANTs — sem eles as policies abaixo ficariam "corretas e
-- testadas" e mesmo assim inertes em produção (mesmo achado F3-05 de 0014).

-- ---------------------------------------------------------------------------
-- Helpers — evitam repetir a mesma subquery em cada policy e (por serem
-- SECURITY DEFINER) evitam recursão de RLS quando uma tabela filha consulta
-- tarefas.tasks/tarefas.assignees por dentro da própria avaliação da policy.
-- ---------------------------------------------------------------------------

-- Visível para quem pode ver a tarefa: super_admin sempre; demais só se a
-- tarefa existe e não foi soft-deletada.
CREATE OR REPLACE FUNCTION tarefas.task_visible(p_task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.has_role('super_admin')
    OR EXISTS (
      SELECT 1 FROM tarefas.tasks
      WHERE id = p_task_id AND deleted_at IS NULL
    );
$$;

-- Verdadeiro se o usuário corrente é o criador da tarefa ou um assignee dela
-- (tarefa não soft-deletada). Base da regra "UPDATE/soft-DELETE apenas em
-- tarefas que criou ou nas quais é assignee".
CREATE OR REPLACE FUNCTION tarefas.can_manage_task(p_task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM tarefas.tasks t
    WHERE t.id = p_task_id
      AND t.deleted_at IS NULL
      AND (
        t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM tarefas.assignees a
          WHERE a.task_id = t.id AND a.user_id = auth.uid()
        )
      )
  );
$$;

-- Resolve o task_id de um anexo polimórfico (parent_type = 'task' | 'comment').
CREATE OR REPLACE FUNCTION tarefas.attachment_task_id(
  p_parent_type "tarefas"."attachment_parent_type",
  p_parent_id uuid
)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE p_parent_type
    WHEN 'task' THEN p_parent_id
    WHEN 'comment' THEN (SELECT task_id FROM tarefas.comments WHERE id = p_parent_id)
  END;
$$;

-- ===========================================================================
-- Row Level Security — DENY by default em todas as tabelas
-- ===========================================================================

-- ── workspaces — 6 fixos, seed em 0031, sem rota de criação em runtime ──────
-- Nenhuma policy de escrita é criada (nem para super_admin): a própria
-- migration de schema documenta que nenhum papel insere linha aqui em
-- runtime — mutação só acontece via nova migration de seed.
ALTER TABLE "tarefas"."workspaces" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_select_staff"
  ON "tarefas"."workspaces" FOR SELECT TO authenticated
  USING (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'));

-- ── tags — taxonomia compartilhada ──────────────────────────────────────────
ALTER TABLE "tarefas"."tags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select_staff"
  ON "tarefas"."tags" FOR SELECT TO authenticated
  USING (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'));

CREATE POLICY "tags_write_collab"
  ON "tarefas"."tags" FOR ALL TO authenticated
  USING (public.has_role('super_admin', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'colaborador'));

-- ── task_templates — templates configuráveis (BRAIN §6.9) ──────────────────
ALTER TABLE "tarefas"."task_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_templates_select_staff"
  ON "tarefas"."task_templates" FOR SELECT TO authenticated
  USING (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'));

CREATE POLICY "task_templates_write_collab"
  ON "tarefas"."task_templates" FOR ALL TO authenticated
  USING (public.has_role('super_admin', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'colaborador'));

-- ── template_items ───────────────────────────────────────────────────────
ALTER TABLE "tarefas"."template_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_items_select_staff"
  ON "tarefas"."template_items" FOR SELECT TO authenticated
  USING (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'));

CREATE POLICY "template_items_write_collab"
  ON "tarefas"."template_items" FOR ALL TO authenticated
  USING (public.has_role('super_admin', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'colaborador'));

-- ── recurrence_rules ─────────────────────────────────────────────────────
ALTER TABLE "tarefas"."recurrence_rules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurrence_rules_select_staff"
  ON "tarefas"."recurrence_rules" FOR SELECT TO authenticated
  USING (public.has_role('super_admin', 'diretor', 'conselheiro', 'colaborador'));

CREATE POLICY "recurrence_rules_write_collab"
  ON "tarefas"."recurrence_rules" FOR ALL TO authenticated
  USING (public.has_role('super_admin', 'colaborador'))
  WITH CHECK (public.has_role('super_admin', 'colaborador'));

-- ── tasks ────────────────────────────────────────────────────────────────
ALTER TABLE "tarefas"."tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_mutate_admin"
  ON "tarefas"."tasks" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- Transparência interna: colaborador/diretor/conselheiro veem todas as
-- tarefas dos 6 workspaces (sem membership) — necessário para kanban/lista
-- e para o TreeView de despacho.
CREATE POLICY "tasks_select_staff"
  ON "tarefas"."tasks" FOR SELECT TO authenticated
  USING (
    "deleted_at" IS NULL
    AND public.has_role('colaborador', 'diretor', 'conselheiro')
  );

-- Diretor/conselheiro NUNCA recebem INSERT: não têm tarefas operacionais
-- (BRAIN §6.9) — só respondem approval_requests.
CREATE POLICY "tasks_insert_collab"
  ON "tarefas"."tasks" FOR INSERT TO authenticated
  WITH CHECK (public.has_role('colaborador'));

-- UPDATE cobre edição geral e soft-delete (UPDATE deleted_at) — restrito a
-- quem criou a tarefa ou é assignee dela.
CREATE POLICY "tasks_update_own_or_assignee"
  ON "tarefas"."tasks" FOR UPDATE TO authenticated
  USING (
    "deleted_at" IS NULL
    AND public.has_role('colaborador')
    AND (
      "created_by" = auth.uid()
      OR EXISTS (
        SELECT 1 FROM "tarefas"."assignees" a
        WHERE a.task_id = "tarefas"."tasks"."id" AND a.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.has_role('colaborador')
    AND (
      "created_by" = auth.uid()
      OR EXISTS (
        SELECT 1 FROM "tarefas"."assignees" a
        WHERE a.task_id = "tarefas"."tasks"."id" AND a.user_id = auth.uid()
      )
    )
  );

-- ── subtasks — visibilidade e escrita seguem a tarefa-mãe ──────────────────
ALTER TABLE "tarefas"."subtasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subtasks_mutate_admin"
  ON "tarefas"."subtasks" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "subtasks_select_staff"
  ON "tarefas"."subtasks" FOR SELECT TO authenticated
  USING (
    public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible("task_id")
  );

CREATE POLICY "subtasks_write_collab"
  ON "tarefas"."subtasks" FOR ALL TO authenticated
  USING (public.has_role('colaborador') AND tarefas.can_manage_task("task_id"))
  WITH CHECK (public.has_role('colaborador') AND tarefas.can_manage_task("task_id"));

-- ── assignees ────────────────────────────────────────────────────────────
ALTER TABLE "tarefas"."assignees" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignees_mutate_admin"
  ON "tarefas"."assignees" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "assignees_select_staff"
  ON "tarefas"."assignees" FOR SELECT TO authenticated
  USING (
    public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible("task_id")
  );

CREATE POLICY "assignees_write_collab"
  ON "tarefas"."assignees" FOR ALL TO authenticated
  USING (public.has_role('colaborador') AND tarefas.can_manage_task("task_id"))
  WITH CHECK (public.has_role('colaborador') AND tarefas.can_manage_task("task_id"));

-- ── comments — visibilidade da tarefa; escrita do próprio autor ────────────
ALTER TABLE "tarefas"."comments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_mutate_admin"
  ON "tarefas"."comments" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "comments_select_staff"
  ON "tarefas"."comments" FOR SELECT TO authenticated
  USING (
    public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible("task_id")
  );

CREATE POLICY "comments_insert_own"
  ON "tarefas"."comments" FOR INSERT TO authenticated
  WITH CHECK (
    "author_id" = auth.uid()
    AND public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible("task_id")
  );

CREATE POLICY "comments_update_own"
  ON "tarefas"."comments" FOR UPDATE TO authenticated
  USING ("author_id" = auth.uid())
  WITH CHECK ("author_id" = auth.uid());

-- ── attachments — polimórfico (task/comment); visibilidade da tarefa;
--    escrita do próprio autor; sem UPDATE/DELETE (imutável uma vez enviado) ─
ALTER TABLE "tarefas"."attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_mutate_admin"
  ON "tarefas"."attachments" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "attachments_select_staff"
  ON "tarefas"."attachments" FOR SELECT TO authenticated
  USING (
    public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible(tarefas.attachment_task_id("parent_type", "parent_id"))
  );

CREATE POLICY "attachments_insert_own"
  ON "tarefas"."attachments" FOR INSERT TO authenticated
  WITH CHECK (
    "uploaded_by" = auth.uid()
    AND public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible(tarefas.attachment_task_id("parent_type", "parent_id"))
  );

-- ── time_entries — visibilidade da tarefa; escrita do próprio autor ────────
ALTER TABLE "tarefas"."time_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_entries_mutate_admin"
  ON "tarefas"."time_entries" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "time_entries_select_staff"
  ON "tarefas"."time_entries" FOR SELECT TO authenticated
  USING (
    public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible("task_id")
  );

-- start/stop/manual e edição são sempre em nome do próprio usuário.
CREATE POLICY "time_entries_write_own"
  ON "tarefas"."time_entries" FOR ALL TO authenticated
  USING ("user_id" = auth.uid() AND public.has_role('colaborador'))
  WITH CHECK ("user_id" = auth.uid() AND public.has_role('colaborador'));

-- ── task_tags — join table; segue a tarefa (mesma regra de subtasks) ───────
ALTER TABLE "tarefas"."task_tags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_tags_mutate_admin"
  ON "tarefas"."task_tags" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "task_tags_select_staff"
  ON "tarefas"."task_tags" FOR SELECT TO authenticated
  USING (
    public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible("task_id")
  );

CREATE POLICY "task_tags_write_collab"
  ON "tarefas"."task_tags" FOR ALL TO authenticated
  USING (public.has_role('colaborador') AND tarefas.can_manage_task("task_id"))
  WITH CHECK (public.has_role('colaborador') AND tarefas.can_manage_task("task_id"));

-- ── approval_requests — diretores só recebem pedidos, nunca tarefas ────────
ALTER TABLE "tarefas"."approval_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_requests_mutate_admin"
  ON "tarefas"."approval_requests" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- Transparência interna, mesmo padrão de tasks_select_staff.
CREATE POLICY "approval_requests_select_staff"
  ON "tarefas"."approval_requests" FOR SELECT TO authenticated
  USING (public.has_role('colaborador', 'diretor', 'conselheiro'));

-- Só colaborador solicita (é quem tem tarefa operacional a avançar).
CREATE POLICY "approval_requests_insert_collab"
  ON "tarefas"."approval_requests" FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('colaborador')
    AND "requested_by" = auth.uid()
  );

-- UPDATE (aprovar/rejeitar) apenas pelo diretor/conselheiro endereçado.
CREATE POLICY "approval_requests_update_approver"
  ON "tarefas"."approval_requests" FOR UPDATE TO authenticated
  USING (
    public.has_role('diretor', 'conselheiro')
    AND "approver_id" = auth.uid()
  )
  WITH CHECK (
    public.has_role('diretor', 'conselheiro')
    AND "approver_id" = auth.uid()
  );

-- ── task_events — log operacional; segue a tarefa; sem UPDATE/DELETE ───────
ALTER TABLE "tarefas"."task_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_events_mutate_admin"
  ON "tarefas"."task_events" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "task_events_select_staff"
  ON "tarefas"."task_events" FOR SELECT TO authenticated
  USING (
    public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible("task_id")
  );

CREATE POLICY "task_events_insert_staff"
  ON "tarefas"."task_events" FOR INSERT TO authenticated
  WITH CHECK (
    "actor_id" = auth.uid()
    AND public.has_role('colaborador', 'diretor', 'conselheiro')
    AND tarefas.task_visible("task_id")
  );

-- ===========================================================================
-- GRANTs — teto de permissão do role `authenticated`; RLS acima filtra por
-- linha dentro desse teto (mesma regra de 0014_grants_authenticated.sql).
-- Sem isto, "permission denied for schema tarefas" antes de qualquer policy
-- ser avaliada.
-- ===========================================================================
GRANT USAGE ON SCHEMA "tarefas" TO authenticated;

GRANT SELECT                          ON "tarefas"."workspaces"       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "tarefas"."tags"             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "tarefas"."task_templates"   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "tarefas"."template_items"   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "tarefas"."recurrence_rules" TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "tarefas"."tasks"            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "tarefas"."subtasks"         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "tarefas"."assignees"        TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "tarefas"."comments"         TO authenticated;
GRANT SELECT, INSERT, DELETE          ON "tarefas"."attachments"      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "tarefas"."time_entries"     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "tarefas"."task_tags"        TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "tarefas"."approval_requests" TO authenticated;
GRANT SELECT, INSERT                  ON "tarefas"."task_events"      TO authenticated;

-- tasks nunca recebe DELETE (nem super_admin): soft-delete via UPDATE
-- deleted_at é o único caminho (BRAIN — "nunca hard delete").
-- comments/approval_requests/task_events nunca recebem DELETE nem UPDATE
-- fora do dono (não têm deleted_at — imutabilidade total, mesmo padrão de
-- financeiro.transactions).
-- attachments/task_events nunca recebem UPDATE: append-only por design
-- (sem coluna updated_at). attachments recebe DELETE restrito a super_admin
-- (mesmo padrão de financeiro.attachments em 0014) para remoção de upload
-- indevido — a policy attachments_mutate_admin já cobre esse caso.
