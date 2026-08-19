import { createHebronMiddleware } from "@hebron/auth/app-middleware";

// Drizzle/postgres.js needs a real TCP socket — not available on the Edge
// runtime. Node middleware is stable since Next.js 15.2.
export const runtime = "nodejs";

/**
 * Documentos is a public portal (BRAIN §6: papel `ouvinte` = anônimo) — only
 * /editorial is gated (mirrors EDITOR_ROLES + requireEditorSession,
 * lib/session.ts). `protectedPaths` instead of `publicPaths`: the public
 * catalog (busca, categoria, editais, [slug]...) is most of the app.
 */
export const middleware = createHebronMiddleware({
  protectedPaths: ["/editorial"],
  roles: ["super_admin", "diretor", "conselheiro", "colaborador"],
});

// Matches every path except static assets — deliberately includes /api.
// Must be a literal here (Next.js statically analyzes this exact file);
// keep in sync with HEBRON_MIDDLEWARE_MATCHER in @hebron/auth/app-middleware.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
