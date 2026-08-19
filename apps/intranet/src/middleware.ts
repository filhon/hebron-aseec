import { createHebronMiddleware } from "@hebron/auth/app-middleware";

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
 * Routes that require a session but must be exempt from the status/MFA gate
 * — visiting them IS how a pending/unenrolled user resolves that exact
 * gate. Without this list they'd redirect to themselves. Only intranet owns
 * these pages; every other app's middleware bounces here instead.
 */
const GATE_EXEMPT_PATHS = [
  "/cadastro/instituicao",
  "/cadastro/status",
  "/mfa/enroll",
  "/mfa/challenge",
  "/post-login",
];

/**
 * Intranet hosts diretor, conselheiro and colaborador in the same app with
 * no shared role requirement — role admission stays a Camada 2 concern
 * (there wasn't one at Camada 1 before this session either).
 */
export const middleware = createHebronMiddleware({
  publicPaths: PUBLIC_PATHS,
  gateExemptPaths: GATE_EXEMPT_PATHS,
});

// Matches every path except static assets — deliberately includes /api.
// Must be a literal here (Next.js statically analyzes this exact file);
// keep in sync with HEBRON_MIDDLEWARE_MATCHER in @hebron/auth/app-middleware.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
