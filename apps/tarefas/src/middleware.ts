import { createHebronMiddleware } from "@hebron/auth/app-middleware";

// Drizzle/postgres.js needs a real TCP socket — not available on the Edge
// runtime. Node middleware is stable since Next.js 15.2.
export const runtime = "nodejs";

/** Mirrors STAFF_ROLES + requireStaffSession (lib/queries.ts), the sole
 * gate for (dashboard) — the only route group in this app. */
export const middleware = createHebronMiddleware({
  roles: ["colaborador", "diretor", "conselheiro", "super_admin"],
});

// Matches every path except static assets — deliberately includes /api.
// Must be a literal here (Next.js statically analyzes this exact file);
// keep in sync with HEBRON_MIDDLEWARE_MATCHER in @hebron/auth/app-middleware.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
