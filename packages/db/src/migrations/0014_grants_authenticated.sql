-- Migration: 0014_grants_authenticated
-- Decisão B (Fase 1 Q2): a conexão de aplicação passa a respeitar RLS de
-- verdade em vez de rodar como superuser. GRANT é o teto de permissão do
-- role; RLS filtra por linha dentro desse teto. Sem os GRANTs abaixo, o
-- role `authenticated` recebe "permission denied for schema" antes mesmo
-- de as policies serem avaliadas — daí P-1.6/P-1.7/P-1.19/P-2.7/P-3.7
-- estarem "corretos e testados" (achado F2) e ainda assim inertes em
-- produção (F3-05).
--
-- Regra seguida abaixo: cada GRANT de tabela cobre exatamente os comandos
-- (SELECT/INSERT/UPDATE/DELETE) para os quais existe uma policy — nunca
-- mais que isso. Onde não há policy para um comando, RLS já nega por
-- padrão; o GRANT reduzido é redundante com a RLS mas documenta a
-- intenção e falha mais cedo (permission denied em vez de 0 linhas).
--
-- `anon` só recebe USAGE/GRANT no schema `documentos`, no subconjunto que
-- as policies já tornam público (visibility = 'public'). Nenhum outro
-- schema de módulo concede nada a `anon`.

-- ---------------------------------------------------------------------------
-- USAGE nos schemas de módulo
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA "admin"      TO authenticated;
GRANT USAGE ON SCHEMA "documentos" TO authenticated;
GRANT USAGE ON SCHEMA "projetos"   TO authenticated;
GRANT USAGE ON SCHEMA "financeiro" TO authenticated;

GRANT USAGE ON SCHEMA "documentos" TO anon;

-- ---------------------------------------------------------------------------
-- admin.*
-- ---------------------------------------------------------------------------
GRANT SELECT                          ON "admin"."audit_log"       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "admin"."invitations"     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "admin"."email_templates" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "admin"."meeting_sessions" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "admin"."feature_flags"   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "admin"."system_settings" TO authenticated;

-- audit_log_insert_service é restrita a service_role (ver DROP/CREATE abaixo);
-- authenticated nunca recebe INSERT em admin.audit_log.

-- ---------------------------------------------------------------------------
-- documentos.* — authenticated (todos os papéis internos)
-- ---------------------------------------------------------------------------
GRANT SELECT                          ON "documentos"."categories"        TO authenticated;
GRANT INSERT, UPDATE, DELETE          ON "documentos"."categories"        TO authenticated;
GRANT SELECT                          ON "documentos"."tags"              TO authenticated;
GRANT INSERT, UPDATE, DELETE          ON "documentos"."tags"              TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "documentos"."documents"         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "documentos"."document_tags"     TO authenticated;
GRANT SELECT, INSERT                  ON "documentos"."document_versions" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "documentos"."editals"           TO authenticated;
GRANT SELECT, INSERT, DELETE          ON "documentos"."subscriptions"     TO authenticated;
GRANT SELECT, INSERT                  ON "documentos"."views"             TO authenticated;

-- ---------------------------------------------------------------------------
-- documentos.* — anon (apenas o subconjunto estritamente público; as
-- policies de SELECT filtram por visibility = 'public' e deleted_at IS NULL)
-- ---------------------------------------------------------------------------
GRANT SELECT ON "documentos"."categories"        TO anon;
GRANT SELECT ON "documentos"."tags"              TO anon;
GRANT SELECT ON "documentos"."documents"         TO anon;
GRANT SELECT ON "documentos"."document_tags"     TO anon;
GRANT SELECT ON "documentos"."document_versions" TO anon;
GRANT SELECT ON "documentos"."editals"           TO anon;

-- subscriptions e views exigem auth.uid() IS NOT NULL nas policies — anon
-- não recebe nenhum privilégio nessas duas tabelas.

-- ---------------------------------------------------------------------------
-- projetos.*
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE  ON "projetos"."categories"            TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "projetos"."organizations"         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "projetos"."organization_members"  TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "projetos"."projects"              TO authenticated;
GRANT SELECT, INSERT                  ON "projetos"."project_versions"      TO authenticated;
GRANT SELECT, INSERT                  ON "projetos"."compact_versions"      TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "projetos"."evaluations"           TO authenticated;
GRANT SELECT, INSERT                  ON "projetos"."votes"                 TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "projetos"."contestations"         TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "projetos"."reports"               TO authenticated;
GRANT SELECT, INSERT                  ON "projetos"."report_attachments"    TO authenticated;
GRANT SELECT, INSERT                  ON "projetos"."project_attachments"   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "projetos"."payment_schedules"     TO authenticated;

-- ---------------------------------------------------------------------------
-- financeiro.*
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE  ON "financeiro"."accounts"             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "financeiro"."categories"           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "financeiro"."cost_centers"         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "financeiro"."budgets"              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON "financeiro"."budget_items"         TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "financeiro"."payables"             TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "financeiro"."receivables"          TO authenticated;
GRANT SELECT, INSERT                  ON "financeiro"."transactions"         TO authenticated;
GRANT SELECT, INSERT                  ON "financeiro"."transaction_reversals" TO authenticated;
GRANT SELECT, INSERT, DELETE          ON "financeiro"."attachments"          TO authenticated;
GRANT SELECT, INSERT                  ON "financeiro"."bank_imports"         TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "financeiro"."bank_import_rows"     TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON "financeiro"."batch_approvals"      TO authenticated;
GRANT SELECT, INSERT                  ON "financeiro"."batch_approval_items" TO authenticated;

-- financeiro.transactions nunca recebe UPDATE/DELETE: além do trigger
-- forbid_transaction_mutation, o GRANT já nega o comando antes do trigger
-- disparar (falha mais barata, mesma garantia de imutabilidade).

-- ===========================================================================
-- Fixes de policy (F3-04 / F3-15 / F3-18)
-- ===========================================================================

-- F3-04 — invitations_select_by_token (USING (true), sem TO): já removida em
-- 0003_admin_rls.sql antes de qualquer GRANT existir. Nada a fazer aqui;
-- mantido como registro de que a exposição por token não ressurgiu.

-- F3-15 — admin.audit_log_insert_service tinha WITH CHECK (true) sem TO:
-- com o GRANT USAGE/INSERT que este arquivo introduz, qualquer authenticated
-- passaria a poder forjar entradas de audit log. Restringe a policy a
-- service_role (o audit é sempre escrito por função de confiança, nunca
-- diretamente pelo usuário) e concede o INSERT correspondente só a esse role.
DROP POLICY IF EXISTS "audit_log_insert_service" ON "admin"."audit_log";
CREATE POLICY "audit_log_insert_service"
  ON "admin"."audit_log" FOR INSERT TO service_role
  WITH CHECK (true);
GRANT INSERT ON "admin"."audit_log" TO service_role;

-- F3-15 — public.notifications_insert_service tinha o mesmo problema.
DROP POLICY IF EXISTS "notifications_insert_service" ON "public"."notifications";
CREATE POLICY "notifications_insert_service"
  ON "public"."notifications" FOR INSERT TO service_role
  WITH CHECK (true);
GRANT INSERT ON "public"."notifications" TO service_role;

-- F3-18 — public.users_insert_service: documentar. O INSERT real de
-- public.users acontece via handle_new_user() (SECURITY DEFINER, trigger em
-- auth.users), que roda como o dono da função e ignora GRANT/RLS. Esta
-- policy nunca é exercida por esse caminho; ela existe apenas como rede de
-- segurança caso algum código legítimo precise inserir a própria linha
-- diretamente (ex.: reconciliação manual) — por isso o WITH CHECK restringe
-- a auth.uid() = id, nunca um terceiro.
COMMENT ON POLICY "users_insert_service" ON "public"."users" IS
  'Rede de segurança, não o caminho principal de insert: a sincronização de '
  'auth.users -> public.users acontece via trigger SECURITY DEFINER '
  '(handle_new_user), que ignora RLS. Esta policy só importa se algum '
  'caminho excepcional inserir a própria linha diretamente; por isso exige '
  'auth.uid() = id.';
