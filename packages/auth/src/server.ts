import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ServerCookieHandlers {
  getAll(): Array<{ name: string; value: string }>;
  setAll?: (
    cookies: Array<{ name: string; value: string; options?: CookieOptions }>,
  ) => void;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Creates a Supabase server client for use in Server Actions and Route Handlers.
 * Reads the session from SSR cookies via the provided handlers.
 */
export function createSupabaseServerActionClient(
  handlers: ServerCookieHandlers,
): SupabaseClient {
  return createServerClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: handlers.getAll,
        setAll: handlers.setAll ?? (() => undefined),
      },
    },
  );
}
