"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { createSupabaseServerActionClient } from "@hebron/auth/server";

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerActionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options),
      );
    },
  });

  await supabase.auth.signOut();
  redirect(CANONICAL_LOGIN_URL);
}
