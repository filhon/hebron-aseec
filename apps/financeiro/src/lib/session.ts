import { createRoleGate } from "@hebron/auth/role-gate";

/**
 * Gate para páginas RSC do Financeiro que exigem papel colaborador+ (mesmo
 * conjunto de `colaboradorAction` em lib/safe-action.ts). O dashboard do
 * Financeiro ainda não tem gate de papel em `shell.tsx`/`layout.tsx`
 * (débito de P-3.9) — páginas novas que fazem leitura/mutação real (P-3.8b)
 * não esperam por isso e checam inline, mesmo padrão de
 * apps/projetos/src/lib/session.ts.
 */
export const requireColaboradorSession = createRoleGate({
  allowedRoles: ["colaborador", "diretor", "super_admin"],
});
