import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession, type ActionSession } from "./server";
import { CANONICAL_LOGIN_URL } from "./middleware";
import type { DesignationType, Role } from "@hebron/types/roles";

export interface RoleGateOptions {
  /**
   * At least one of these roles is required. Omit to allow any
   * authenticated user through, regardless of role (e.g. Plataforma's
   * "acesso a todos os cursos para qualquer usuário registrado").
   */
  allowedRoles?: Role[];
  /**
   * Roles that are always denied, even if they also hold an allowed role or
   * are covered by `bypassRoles` — e.g. Flats blocks diretor/conselheiro
   * from the hospede area regardless (BRAIN §6.8: conflito de interesse).
   */
  blockedRoles?: Role[];
  /** Required designation (e.g. "gestor"), ANDed with `allowedRoles`. */
  requireDesignation?: DesignationType;
  /**
   * Roles that skip `allowedRoles`/`requireDesignation` entirely (but never
   * `blockedRoles`) — typically `["super_admin"]`.
   */
  bypassRoles?: Role[];
  /**
   * Extra, app-specific predicate (e.g. "is this user an instructor row"),
   * ANDed with the rest. Kept out of this package because it needs
   * app-owned schema knowledge this package doesn't have.
   */
  extraCheck?: (session: ActionSession) => boolean | Promise<boolean>;
}

/**
 * Builds a Camada 2 (Server Component / Server Action) session gate:
 * resolve session → redirect to canonical login if absent or role-mismatched
 * → return the session otherwise. Replaces the 12 hand-copied
 * `require*Session` functions that used to duplicate this boilerplate across
 * every app's lib/{session,queries}.ts.
 */
export function createRoleGate(options: RoleGateOptions = {}) {
  const {
    allowedRoles,
    blockedRoles,
    requireDesignation,
    bypassRoles,
    extraCheck,
  } = options;

  return async function gate(): Promise<ActionSession> {
    const cookieStore = await cookies();

    let session: ActionSession;
    try {
      session = await resolveSession(cookieStore);
    } catch {
      redirect(CANONICAL_LOGIN_URL);
    }

    if (blockedRoles?.some((r) => session.roles.includes(r))) {
      redirect(CANONICAL_LOGIN_URL);
    }

    const bypassed =
      bypassRoles?.some((r) => session.roles.includes(r)) ?? false;

    if (!bypassed) {
      if (
        allowedRoles &&
        !session.roles.some((r) => allowedRoles.includes(r))
      ) {
        redirect(CANONICAL_LOGIN_URL);
      }
      if (
        requireDesignation &&
        !session.designations.includes(requireDesignation)
      ) {
        redirect(CANONICAL_LOGIN_URL);
      }
      if (extraCheck && !(await extraCheck(session))) {
        redirect(CANONICAL_LOGIN_URL);
      }
    }

    return session;
  };
}
