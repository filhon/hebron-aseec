import { createHebronMiddleware } from "@hebron/auth/app-middleware";

// Drizzle/postgres.js needs a real TCP socket — not available on the Edge
// runtime. Node middleware is stable since Next.js 15.2.
export const runtime = "nodejs";

/**
 * Rádio is a public catalog (BRAIN §6: papel `ouvinte` = anônimo) — only
 * /admin is gated (mirrors requireSuperAdminSession, lib/queries.ts).
 * `protectedPaths` (opt-in) instead of `publicPaths` (opt-out) here: the
 * public surface is most of the app, so enumerating it would be one missed
 * route away from wrongly gating a catalog page. This also puts
 * /api/heartbeat and /api/stream behind the middleware for the first time
 * (D1-001) — they stay public, but now run inside the same layer as
 * everything else instead of the route handler having no layer above it.
 */
export const middleware = createHebronMiddleware({
  protectedPaths: ["/admin"],
  roles: ["super_admin"],
});

// Matches every path except static assets — deliberately includes /api.
// Must be a literal here (Next.js statically analyzes this exact file);
// keep in sync with HEBRON_MIDDLEWARE_MATCHER in @hebron/auth/app-middleware.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
