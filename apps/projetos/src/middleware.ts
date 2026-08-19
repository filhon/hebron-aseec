import { createHebronMiddleware } from "@hebron/auth/app-middleware";

// Drizzle/postgres.js needs a real TCP socket — not available on the Edge
// runtime. Node middleware is stable since Next.js 15.2.
export const runtime = "nodejs";

/**
 * (submissor) and (diretoria) have disjoint role requirements
 * (requireSubmissorSession vs requireDiretorSession in lib/session.ts) —
 * that split stays a Camada 2 concern; Camada 1 only enforces "has a
 * session".
 */
export const middleware = createHebronMiddleware({});

// Matches every path except static assets — deliberately includes /api.
// Must be a literal here (Next.js statically analyzes this exact file);
// keep in sync with HEBRON_MIDDLEWARE_MATCHER in @hebron/auth/app-middleware.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
