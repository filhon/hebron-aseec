-- Migration: 0019_financeiro_organization_budgets
-- P-3.8b — Financeiro: governança e conciliação verdadeiras.
--   • Cria financeiro.organization_budgets (S1-01): teto de orçamento por
--     instituição/ano, substituindo o workaround em admin.system_settings
--     usado por apps/projetos (checkOrganizationBudget).
--   • Corrige a policy de UPDATE de financeiro.batch_approvals (0011): cobria
--     apenas super_admin e diretor+gestor; diretor+autorizador (2ª camada da
--     governança dual, BRAIN §6.5 passo 6) nunca tinha um branch — mesmo que
--     o Server Action passasse a permitir, o RLS rejeitaria o UPDATE.
--   • Cria o bucket financeiro-extratos (F3-11): extrato bancário original
--     precisa ser retido por 5 anos (decisão F3-Q6); sem UPDATE/DELETE —
--     imutável uma vez enviado.

-- ===========================================================================
-- financeiro.organization_budgets
-- ===========================================================================
CREATE TABLE IF NOT EXISTS "financeiro"."organization_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_budgets_org_year_uniq" UNIQUE("organization_id","year")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "financeiro"."organization_budgets" ADD CONSTRAINT "organization_budgets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "projetos"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "financeiro"."organization_budgets" ADD CONSTRAINT "organization_budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_budgets_org_id_idx" ON "financeiro"."organization_budgets" USING btree ("organization_id");
--> statement-breakpoint

ALTER TABLE "financeiro"."organization_budgets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Leitura/escrita restrita à equipe financeira (super_admin, diretor,
-- colaborador). checkOrganizationBudget (apps/projetos) lê via conexão
-- superuser, não via sessão de submissor — não há branch de leitura para
-- submissor aqui (defense-in-depth para o dia em que essa leitura migrar
-- para withAuthenticatedContext).
CREATE POLICY "organization_budgets_select_staff"
	ON "financeiro"."organization_budgets" FOR SELECT TO authenticated
	USING (public.has_role('super_admin', 'diretor', 'colaborador'));
--> statement-breakpoint

CREATE POLICY "organization_budgets_insert_staff"
	ON "financeiro"."organization_budgets" FOR INSERT TO authenticated
	WITH CHECK (public.has_role('super_admin', 'colaborador'));
--> statement-breakpoint

CREATE POLICY "organization_budgets_update_staff"
	ON "financeiro"."organization_budgets" FOR UPDATE TO authenticated
	USING (public.has_role('super_admin', 'colaborador'))
	WITH CHECK (public.has_role('super_admin', 'colaborador'));

-- ===========================================================================
-- financeiro.batch_approvals — corrige UPDATE para cobrir autorizador
-- (BRAIN §6.5 passo 6: diretor autorizador AUTORIZA no banco — nunca o
-- mesmo que aprovou; a regra approved_by ≠ authorized_by continua
-- enforced no Server Action, RLS não distingue coluna a coluna).
-- ===========================================================================
DROP POLICY IF EXISTS "batch_approvals_update_gestor" ON "financeiro"."batch_approvals";
--> statement-breakpoint

CREATE POLICY "batch_approvals_update_dual_governance"
	ON "financeiro"."batch_approvals" FOR UPDATE TO authenticated
	USING (
		public.has_role('super_admin')
		OR (public.has_role('diretor') AND public.has_designation('gestor'))
		OR (public.has_role('diretor') AND public.has_designation('autorizador'))
	)
	WITH CHECK (
		public.has_role('super_admin')
		OR (public.has_role('diretor') AND public.has_designation('gestor'))
		OR (public.has_role('diretor') AND public.has_designation('autorizador'))
	);

-- ===========================================================================
-- Bucket financeiro-extratos (F3-11 / F3-Q6: retenção legal 5 anos)
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('financeiro-extratos', 'financeiro-extratos', false)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

DO $$ BEGIN
	CREATE POLICY "financeiro_extratos_insert_staff"
	ON storage.objects FOR INSERT TO authenticated
	WITH CHECK (
		bucket_id = 'financeiro-extratos'
		AND public.has_role('super_admin', 'diretor', 'colaborador')
	);
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	CREATE POLICY "financeiro_extratos_select_staff"
	ON storage.objects FOR SELECT TO authenticated
	USING (
		bucket_id = 'financeiro-extratos'
		AND public.has_role('super_admin', 'diretor', 'colaborador')
	);
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
-- Sem UPDATE/DELETE: retenção de 5 anos, imutável uma vez enviado.
