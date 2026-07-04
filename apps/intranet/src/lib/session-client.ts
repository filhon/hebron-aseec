import { cookies } from "next/headers";
import { createSupabaseServerActionClient } from "@hebron/auth/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client bound to the request's session cookies, for Server Actions
 * that need to call `.rpc(...)` as the caller (so `auth.uid()` resolves
 * inside SECURITY DEFINER functions) — as opposed to `resolveSession()`,
 * which only returns { actorId, roles } and can't issue further queries.
 */
export async function getSessionSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createSupabaseServerActionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Read-only context (e.g. Server Component) — safe to ignore.
        }
      });
    },
  });
}
