import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MiddlewareCookie {
  name: string;
  value: string;
}

export interface MiddlewareCookieOptions {
  domain?: string;
  path?: string;
  maxAge?: number;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  httpOnly?: boolean;
}

export interface MiddlewareCookieWithOptions extends MiddlewareCookie {
  options?: MiddlewareCookieOptions;
}

export interface MiddlewareCookieHandlers {
  getAll(): MiddlewareCookie[];
  setAll(cookies: MiddlewareCookieWithOptions[]): void;
}

/**
 * Creates a Supabase server client for use inside Next.js middleware.
 *
 * The caller is responsible for reading cookies from the request and writing
 * them back to the response — this keeps the auth package framework-agnostic.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createSupabaseMiddlewareClient(
  handlers: MiddlewareCookieHandlers,
): SupabaseClient {
  return createServerClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: handlers.getAll,
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
        ) {
          handlers.setAll(
            cookiesToSet.map(({ name, value, options }) => ({
              name,
              value,
              options: options as MiddlewareCookieOptions,
            })),
          );
        },
      },
    },
  );
}

/**
 * The canonical login URL for the entire Hebron Aseec ecosystem.
 * All apps redirect here when the session is absent.
 */
export const CANONICAL_LOGIN_URL =
  process.env.NODE_ENV === "production"
    ? "https://app.hebronaseec.com.br/login"
    : "http://localhost:3005/login";
