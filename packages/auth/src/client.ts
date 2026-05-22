import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SignInResult } from "./types";

// NEXT_PUBLIC_ vars must be accessed via dot notation so the webpack bundler
// can statically inline them for the browser. Bracket notation (process.env[name])
// is not detected by Next.js and resolves to undefined on the client.
function resolveEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const SUPABASE_URL = resolveEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);
const SUPABASE_ANON_KEY = resolveEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

/**
 * In production, cookies are scoped to `.hebronaseec.com.br` for cross-app SSO.
 * In development, no domain is set (localhost).
 */
const COOKIE_DOMAIN =
  process.env.NODE_ENV === "production" ? ".hebronaseec.com.br" : undefined;

// Access document safely without requiring DOM lib in this package.
// The auth package is bundled by Next.js (which includes DOM), so this is
// safe at runtime; we just avoid importing DOM types here.
type MinimalDocument = {
  cookie: string;
};

function getDoc(): MinimalDocument | undefined {
  const g = globalThis as Record<string, unknown>;
  const d = g["document"];
  if (d !== null && typeof d === "object" && "cookie" in d) {
    return d as MinimalDocument;
  }
  return undefined;
}

function parseCookies(): Array<{ name: string; value: string }> {
  const doc = getDoc();
  if (!doc) return [];
  return doc.cookie
    .split("; ")
    .filter(Boolean)
    .map((c) => {
      const eqIdx = c.indexOf("=");
      return { name: c.slice(0, eqIdx), value: c.slice(eqIdx + 1) };
    });
}

function setCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    secure?: boolean;
    sameSite?: string;
  },
): void {
  const doc = getDoc();
  if (!doc) return;
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  str += `; path=${options.path ?? "/"}`;
  if (options.maxAge !== undefined) str += `; max-age=${options.maxAge}`;
  if (COOKIE_DOMAIN) str += `; domain=${COOKIE_DOMAIN}`;
  if (options.secure) str += `; secure`;
  if (options.sameSite) str += `; samesite=${options.sameSite}`;
  doc.cookie = str;
}

let _client: SupabaseClient | null = null;

/** Returns a singleton Supabase browser client with SSO cookie configuration. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!_client) {
    _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll: parseCookies,
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>,
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, {
              maxAge:
                typeof options?.["maxAge"] === "number"
                  ? options["maxAge"]
                  : undefined,
              path:
                typeof options?.["path"] === "string"
                  ? options["path"]
                  : undefined,
              secure:
                typeof options?.["secure"] === "boolean"
                  ? options["secure"]
                  : undefined,
              sameSite:
                typeof options?.["sameSite"] === "string"
                  ? options["sameSite"]
                  : undefined,
            });
          });
        },
      },
    });
  }
  return _client;
}

/** Sign in with email and password. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<SignInResult> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

/**
 * Send a magic link to the given email address.
 * `redirectTo` overrides the default site URL.
 */
export async function signInWithMagicLink(
  email: string,
  redirectTo?: string,
): Promise<SignInResult> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo ?? process.env.NEXT_PUBLIC_SITE_URL,
      shouldCreateUser: false,
    },
  });
  return { error };
}

/** Sign out the current user and clear all session cookies. */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}

/** Get the current session. */
export async function getSession() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

/** Refresh the current session (extend TTL). */
export async function refreshSession() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.refreshSession();
  return { session: data.session, error };
}
