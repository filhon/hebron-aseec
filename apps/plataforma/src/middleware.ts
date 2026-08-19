import { createHebronMiddleware } from "@hebron/auth/app-middleware";

// Drizzle/postgres.js needs a real TCP socket — not available on the Edge
// runtime. Node middleware is stable since Next.js 15.2.
export const runtime = "nodejs";

/**
 * (aluno) allows any authenticated role (BRAIN §6.3), instrutor/admin areas
 * gate further at Camada 2 (lib/queries.ts) — Camada 1 only enforces "has a
 * session". `/certificado` stays public: certificates are verifiable by
 * anyone with the link (BRAIN.md:69 — Pacote 2 context), no login needed.
 */
export const middleware = createHebronMiddleware({
  publicPaths: ["/certificado"],
});

// Matches every path except static assets — deliberately includes /api.
// Must be a literal here (Next.js statically analyzes this exact file);
// keep in sync with HEBRON_MIDDLEWARE_MATCHER in @hebron/auth/app-middleware.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
