import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments, organizationMembers } from "@hebron/db/schema";
import {
  createSupabaseMiddlewareClient,
  CANONICAL_LOGIN_URL,
} from "@hebron/auth/middleware";
import {
  anyRoleRequiresMfa,
  hasVerifiedTotpFactor,
  getAssuranceLevel,
} from "@hebron/auth";
import type { Role } from "@hebron/types/roles";

// Drizzle/postgres.js needs a real TCP socket — not available on the Edge
// runtime. Node middleware is stable since Next.js 15.2.
export const runtime = "nodejs";

/**
 * Routes that are publicly accessible without any session at all.
 * Auth callback must be public so Supabase can finalize magic-link/email
 * confirmation redirects before a session exists.
 */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/convite", "/cadastro"];

/**
 * Routes that require a session but must be exempt from the
 * status/MFA gate below — visiting them IS how a pending/unenrolled user
 * resolves that exact gate. Without this list they'd redirect to themselves.
 */
const GATE_EXEMPT_PATHS = [
  "/cadastro/instituicao",
  "/cadastro/status",
  "/mfa/enroll",
  "/mfa/challenge",
  "/post-login",
];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Static assets and Next.js internals — skip auth check
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (matchesPath(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createSupabaseMiddlewareClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      // Write cookies to both request and response so downstream
      // server components see the refreshed session.
      cookiesToSet.forEach(({ name, value }) => {
        request.cookies.set(name, value);
      });
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, {
          ...(options ?? {}),
          // In production, scope session cookies to the root domain so all
          // apps share the same session (SSO).
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
    const returnTo = encodeURIComponent(pathname + request.nextUrl.search);
    const loginUrl = new URL(CANONICAL_LOGIN_URL);
    loginUrl.searchParams.set("return_to", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  if (matchesPath(pathname, GATE_EXEMPT_PATHS)) {
    return response;
  }

  // Safety net for resumed/stale sessions — the primary gate is
  // /post-login, reached right after every login method. This re-checks the
  // same two things on subsequent navigation so a session that slipped past
  // (or was created before approval/enrollment) can't wander the app.
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
    return NextResponse.redirect(new URL("/cadastro/status", request.url));
  }
  if (status === "pending_approval") {
    // Mirrors /post-login's check: a pending user who hasn't linked an
    // institution yet still needs /cadastro/instituicao, not the dead-end
    // status page — otherwise a bookmarked/direct hit to any app route
    // strands them somewhere with no actionable next step.
    const [membership] = await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user.id))
      .limit(1);
    return NextResponse.redirect(
      new URL(
        membership ? "/cadastro/status" : "/cadastro/instituicao",
        request.url,
      ),
    );
  }

  const roles = roleRows.map((r) => r.role) as Role[];
  if (anyRoleRequiresMfa(roles)) {
    const hasFactor = await hasVerifiedTotpFactor(supabase);
    const returnTo = encodeURIComponent(pathname + request.nextUrl.search);

    if (!hasFactor) {
      return NextResponse.redirect(
        new URL(`/mfa/enroll?return_to=${returnTo}`, request.url),
      );
    }

    const { currentLevel, nextLevel } = await getAssuranceLevel(supabase);
    if (nextLevel === "aal2" && currentLevel !== "aal2") {
      return NextResponse.redirect(
        new URL(`/mfa/challenge?return_to=${returnTo}`, request.url),
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
