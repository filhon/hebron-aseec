import { and, eq, isNull } from "drizzle-orm";
import type { AuthenticatedTx } from "./authenticated";
import { roleAssignments } from "./schema";
import type { Role } from "@hebron/types/roles";

// Ref: BRAIN.md §6.1 — diretores/conselheiros NÃO podem ser submissores nem
// hóspedes (governança dual: quem aprova/vota não pode ser quem propõe nem
// quem hospeda). Extraído de apps/admin/src/actions/roles.ts (D6-002,
// AUDIT/04-BACKLOG-CORRECAO.md PACOTE 9) — era verificado só em assignRole,
// deixando sendInvitation e acceptInvitation gravarem a combinação proibida.
//
// Retorna a mensagem (nunca lança): packages/db não depende de @hebron/auth
// (BusinessError) para não criar dependência circular — @hebron/auth já
// depende de @hebron/db. Cada call site (Server Action) envolve o retorno
// em `throw new BusinessError(message)`.

const GOVERNANCE_ROLES: Role[] = ["diretor", "conselheiro"];
const RESTRICTED_ROLES: Role[] = ["submissor", "hospede"];

function conflictMessage(existingRoles: Role[], newRole: Role): string | null {
  if (GOVERNANCE_ROLES.includes(newRole)) {
    const conflicts = existingRoles.filter((r) => RESTRICTED_ROLES.includes(r));
    if (conflicts.length > 0) {
      return (
        `Conflito de interesse: o usuário já possui o(s) papel(éis) ${conflicts.join(", ")}. ` +
        `Diretores e conselheiros não podem ser submissores nem hóspedes.`
      );
    }
  }

  if (RESTRICTED_ROLES.includes(newRole)) {
    const conflicts = existingRoles.filter((r) => GOVERNANCE_ROLES.includes(r));
    if (conflicts.length > 0) {
      return (
        `Conflito de interesse: o usuário já possui o(s) papel(éis) ${conflicts.join(", ")}. ` +
        `Submissores e hóspedes não podem ser diretores nem conselheiros.`
      );
    }
  }

  return null;
}

/**
 * Consulta os papéis ativos do usuário e valida newRole contra eles.
 * Retorna a mensagem de conflito, ou null se não há conflito.
 */
export async function findUserRoleConflict(
  tx: AuthenticatedTx,
  userId: string,
  newRole: Role,
): Promise<string | null> {
  const currentRows = await tx
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, userId),
        isNull(roleAssignments.revokedAt),
      ),
    );

  return conflictMessage(
    currentRows.map((r) => r.role as Role),
    newRole,
  );
}

/**
 * Valida um conjunto de papéis concedidos juntos (ex.: convite com múltiplos
 * papéis) sem depender de um userId existente — checa a combinação interna
 * do próprio conjunto, já que ainda não há linhas em role_assignments para
 * consultar (a conta nasce com o convite).
 */
export function findRoleSetConflict(roles: Role[]): string | null {
  const hasGovernance = roles.some((r) => GOVERNANCE_ROLES.includes(r));
  const hasRestricted = roles.some((r) => RESTRICTED_ROLES.includes(r));
  if (hasGovernance && hasRestricted) {
    return "Conflito de interesse: diretor/conselheiro e submissor/hóspede não podem ser atribuídos à mesma pessoa.";
  }
  return null;
}
