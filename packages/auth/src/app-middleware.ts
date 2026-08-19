import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments, organizationMembers } from "@hebron/db/schema";
import {
  createSupabaseMiddlewareClient,
  CANONICAL_LOGIN_URL,
} from "./middleware";
import {
  anyRoleRequiresMfa,
  hasVerifiedTotpFactor,
  getAssuranceLevel,
} from "./mfa";
import type { Role } from "@hebron/types/roles";

/**
 * Every app's `middleware.ts` must export this literally (Next.js reads the
 * runtime segment config via static analysis of the file itself, so
 * re-exporting it through this module does not work) — Drizzle/postgres.js
 * needs a real TCP socket, unavailable on the Edge runtime.
 */
export const HEBRON_MIDDLEWARE_RUNTIME = "nodejs";

/**
 * Next.js requires `middleware.ts`'s `config.matcher` to be a statically
 * analyzable literal in that exact file — importing this value into
 * `config = { matcher: HEBRON_MIDDLEWARE_MATCHER }` fails the build
 * ("can't recognize the exported `config` field"). Kept here as the single
 * documented source of truth; every app's middleware.ts must copy this
 * literal array into its own `config.matcher` rather than import it.
 *
 * Matches every path except static assets — deliberately includes `/api`,
 * unlike the old per-app middlewares that bypassed it (D1-001: route
 * handlers with no layer above the function).
 */
export const HEBRON_MIDDLEWARE_MATCHER = [
  "/((?!_next/static|_next/image|favicon.ico).*)",
];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function intranetOrigin(): string {
  return new URL(CANONICAL_LOGIN_URL).origin;
}

function absoluteUrl(request: NextRequest): string {
  return (
    request.nextUrl.origin + request.nextUrl.pathname + request.nextUrl.search
  );
}

/** Builds a redirect to an intranet auth-flow page, carrying the caller's
 * absolute URL as `return_to` so `/post-login` can bounce back cross-app. */
function authFlowRedirect(path: string, request: NextRequest): NextResponse {
  const url = new URL(path, intranetOrigin());
  url.searchParams.set("return_to", absoluteUrl(request));
  return NextResponse.redirect(url);
}

/**
 * Allowlist for `return_to` targets that cross origins (every app but
 * intranet logs in on a different subdomain). Mirrors the SSO cookie's own
 * trust boundary (`Domain=.hebronaseec.com.br`) — never trust an arbitrary
 * host. Exported so `/post-login` (intranet) can apply the same rule instead
 * of keeping its own copy.
 */
export function isAllowedReturnToOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    if (process.env.NODE_ENV === "production") {
      return (
        protocol === "https:" &&
        (hostname === "hebronaseec.com.br" ||
          hostname.endsWith(".hebronaseec.com.br"))
      );
    }
    return protocol === "http:" && hostname === "localhost";
  } catch {
    return false;
  }
}

/**
 * Resolves a `return_to` value to a safe redirect target: a same-app
 * relative path, or an absolute URL on an allowed Hebron subdomain. Anything
 * else (attacker-supplied host) falls back to "/".
 */
export function resolveReturnToDestination(
  returnTo: string | undefined,
): string {
  if (!returnTo) return "/";
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  try {
    const url = new URL(returnTo);
    if (isAllowedReturnToOrigin(url.origin)) return returnTo;
  } catch {
    // Not a valid absolute URL either — fall through to the safe default.
  }
  return "/";
}

export interface HebronMiddlewareOptions {
  /**
   * App-wide role gate: the request must carry at least one of these roles.
   * Omit when the app hosts multiple areas with disjoint role requirements
   * — the finer-grained check then stays in the Camada 2 gate
   * (`createRoleGate`) for each area, same as before this package existed.
   */
  roles?: Role[];
  /**
   * Routes reachable without a session. Default mode: everything else
   * requires one. Mutually exclusive with `protectedPaths`.
   */
  publicPaths?: string[];
  /**
   * Routes that require a session; everything else is public. For apps that
   * are mostly a public catalog/portal with a small internal area (Rádio,
   * Documentos) — listing every public route in `publicPaths` there would be
   * both unwieldy and one omission away from wrongly gating a public page.
   */
  protectedPaths?: string[];
  /**
   * Paths that need a session but are exempt from the status/MFA gate below
   * — visiting them IS how a pending/unenrolled user resolves that exact
   * gate. Only meaningful for intranet, which owns those pages.
   */
  gateExemptPaths?: string[];
}

/**
 * Builds the shared Camada 1 (BRAIN.md §Modelo de permissões) middleware:
 * session refresh, role admission, onboarding-status gate, mandatory-MFA
 * gate, and SSO cookie-domain rewrite. One implementation for all 9 apps —
 * previously copy-pasted (badly: 8 of 9 apps had none at all).
 */
export function createHebronMiddleware(options: HebronMiddlewareOptions) {
  const { roles, publicPaths, protectedPaths, gateExemptPaths = [] } = options;

  return async function middleware(
    request: NextRequest,
  ): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    const needsAuth = protectedPaths
      ? matchesPath(pathname, protectedPaths)
      : !matchesPath(pathname, publicPaths ?? []);

    if (!needsAuth) {
      return NextResponse.next();
    }

    let response = NextResponse.next({ request });

    const supabase = createSupabaseMiddlewareClient({
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write cookies to both request and response so downstream server
        // components see the refreshed session.
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...(options ?? {}),
            // In production, scope session cookies to the root domain so
            // all apps share the same session (SSO).
            ...(process.env.NODE_ENV === "production" && {
              domain: ".hebronaseec.com.br",
              secure: true,
              sameSite: "lax",
            }),
          });
        });
      },
    });

    // `getUser()` validates the JWT server-side — safer than `getSession()`.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return authFlowRedirect("/login", request);
    }

    if (matchesPath(pathname, gateExemptPaths)) {
      return response;
    }

    // Safety net for resumed/stale sessions — the primary gate is
    // /post-login (intranet), reached right after every login method. This
    // re-checks the same two things on subsequent navigation so a session
    // that slipped past (or was created before approval/enrollment) can't
    // wander any app.
    const [userRow, roleRows] = await Promise.all([
      db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1),
      db
        .select({ role: roleAssignments.role })
        .from(roleAssignments)
        .where(eq(roleAssignments.userId, user.id)),
    ]);

    const status = userRow[0]?.status ?? "active";
    if (status === "rejected") {
      return NextResponse.redirect(
        new URL("/cadastro/status", intranetOrigin()),
      );
    }
    if (status === "pending_approval") {
      const [membership] = await db
        .select({ organizationId: organizationMembers.organizationId })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, user.id))
        .limit(1);
      return NextResponse.redirect(
        new URL(
          membership ? "/cadastro/status" : "/cadastro/instituicao",
          intranetOrigin(),
        ),
      );
    }

    const userRoles = roleRows.map((r) => r.role) as Role[];

    if (roles && !userRoles.some((r) => roles.includes(r))) {
      return NextResponse.redirect(new URL(CANONICAL_LOGIN_URL));
    }

    if (anyRoleRequiresMfa(userRoles)) {
      const hasFactor = await hasVerifiedTotpFactor(supabase);

      if (!hasFactor) {
        return authFlowRedirect("/mfa/enroll", request);
      }

      const { currentLevel, nextLevel } = await getAssuranceLevel(supabase);
      if (nextLevel === "aal2" && currentLevel !== "aal2") {
        return authFlowRedirect("/mfa/challenge", request);
      }
    }

    return response;
  };
}
