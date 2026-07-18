-- Migration: 0056_fix_projetos_schema_grant_recur
-- Achado colateral da sessão de P-9.1b-3: os GRANTs de 0025_fix_projetos_schema_grant
-- (USAGE no schema) e 0026_fix_projetos_missing_select_grants (SELECT em
-- projects/votes/organization_members) estão ausentes de novo no banco de
-- dev/staging, apesar de 0025/0026 constarem como aplicadas em
-- public._migrations. Confirmado por introspecção:
--   - has_schema_privilege('authenticated', 'projetos', 'USAGE') = false
--   - information_schema.role_table_grants: authenticated tem INSERT/UPDATE
--     em projetos.projects mas SEM SELECT; INSERT em projetos.votes mas SEM
--     SELECT; DELETE/INSERT/UPDATE em projetos.organization_members mas SEM
--     SELECT — exatamente os 3 achados originais de 0026, recorrendo.
-- Os demais 8 schemas de app (admin, documentos, financeiro, plataforma,
-- flats, tarefas, intranet, radio) mantêm os grants intactos — drift
-- isolado no schema "projetos", não no código (idêntico ao já documentado
-- em 0025/0026). Sem estes grants, toda migração de P-9.1b-3 de
-- apps/projetos/src/actions/*.ts para withAuthenticatedContext falha em
-- runtime com "permission denied for schema/table projetos.*" antes mesmo
-- de qualquer policy de RLS ser avaliada.

GRANT USAGE ON SCHEMA "projetos" TO authenticated;

GRANT SELECT ON "projetos"."projects"             TO authenticated;
GRANT SELECT ON "projetos"."votes"                TO authenticated;
GRANT SELECT ON "projetos"."organization_members" TO authenticated;
