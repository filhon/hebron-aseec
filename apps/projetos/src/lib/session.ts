import { createRoleGate } from "@hebron/auth/role-gate";

/**
 * Gate para a área (submissor): submissor OU super_admin. Sem sessão ou sem
 * o papel correto redireciona para o login canônico — antes desta sessão o
 * layout só checava `getAuthUser() !== null`, deixando qualquer autenticado
 * (inclusive diretor/conselheiro) entrar na área do submissor.
 */
export const requireSubmissorSession = createRoleGate({
  allowedRoles: ["submissor", "super_admin"],
});

/**
 * Gate para a área (diretoria): diretor, conselheiro OU super_admin.
 *
 * F2-P4 (CRÍTICO): `(diretoria)/layout.tsx` verificava apenas
 * `getAuthUser() !== null` — nenhuma checagem de papel — permitindo que um
 * submissor autenticado navegasse para `/pipeline/<id>` e visse score IA,
 * breakdown, versão compacta e contagem de votos de qualquer projeto.
 */
export const requireDiretorSession = createRoleGate({
  allowedRoles: ["diretor", "conselheiro", "super_admin"],
});
