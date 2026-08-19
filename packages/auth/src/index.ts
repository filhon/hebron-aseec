// This barrel is imported by "use client" components (login-form.tsx and
// friends use `getSupabaseBrowserClient`/`signInWithPassword`/mfa helpers
// straight from "@hebron/auth"). It must therefore only ever re-export
// browser-safe modules.
//
// ./server.ts is deliberately NOT re-exported here: it imports
// `@hebron/db/client` (drizzle + postgres, which needs Node's `net`/`tls`),
// so re-exporting it from this barrel would pull `postgres` into every
// client bundle that imports "@hebron/auth" for anything — the exact
// "Module not found: Can't resolve 'net'" failure this comment is here to
// prevent regressing into. Server code must import `resolveSession` /
// `createSupabaseServerActionClient` from "@hebron/auth/server" directly
// (as apps/*/src/lib/safe-action.ts already do).
// ./impersonation.ts is likewise NOT re-exported: it signs state with
// `node:crypto`, so re-exporting it here breaks the build of every app whose
// client components import "@hebron/auth" (webpack: `UnhandledSchemeError:
// Reading from "node:crypto" is not handled by plugins`). Server code imports
// it from "@hebron/auth/impersonation" directly, as apps/admin already does.
export * from "./types";
export * from "./client";
export * from "./mfa";
export { CANONICAL_LOGIN_URL } from "./middleware";
// Type-only — erased at compile time, so these don't pull `next/server` (a
// server/edge-only module) into the client bundle. Runtime code lives at
// "@hebron/auth/app-middleware" and "@hebron/auth/role-gate", imported
// directly by each app's middleware.ts / lib/{session,queries}.ts.
export type { HebronMiddlewareOptions } from "./app-middleware";
export type { RoleGateOptions } from "./role-gate";
