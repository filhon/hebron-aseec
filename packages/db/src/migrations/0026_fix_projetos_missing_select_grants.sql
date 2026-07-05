-- Migration: 0026_fix_projetos_missing_select_grants
-- Continuação de 0025: além do USAGE no schema "projetos", 3 tabelas
-- estavam sem GRANT SELECT para "authenticated" apesar de
-- 0014_grants_authenticated.sql já declará-lo (confirmado via
-- information_schema.role_table_grants). Mesmo drift de ambiente — restaura
-- exatamente o que 0014 já documenta, sem alterar nenhuma policy.

GRANT SELECT ON "projetos"."projects"             TO authenticated;
GRANT SELECT ON "projetos"."votes"                TO authenticated;
GRANT SELECT ON "projetos"."organization_members" TO authenticated;
