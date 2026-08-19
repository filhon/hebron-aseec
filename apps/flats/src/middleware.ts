import { createHebronMiddleware } from "@hebron/auth/app-middleware";

// Drizzle/postgres.js needs a real TCP socket — not available on the Edge
// runtime. Node middleware is stable since Next.js 15.2.
export const runtime = "nodejs";

/**
 * (hospede) is a route group — no URL prefix — so it can't be separated
 * from /admin via `protectedPaths`, and the two areas have disjoint (in
 * fact partly conflicting, see requireHospedeSession's blockedRoles) role
 * requirements. That split stays a Camada 2 concern (lib/queries.ts);
 * Camada 1 only enforces "has a session".
 */
export const middleware = createHebronMiddleware({});

// Matches every path except static assets — deliberately includes /api.
// Must be a literal here (Next.js statically analyzes this exact file);
// keep in sync with HEBRON_MIDDLEWARE_MATCHER in @hebron/auth/app-middleware.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
