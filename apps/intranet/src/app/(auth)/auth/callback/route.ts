import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerActionClient } from "@hebron/auth/server";

/**
 * Exchanges the PKCE `code` Supabase Auth appends to email-confirmation and
 * magic-link redirects for a real session. Without this route, self-signup
 * email confirmation (and magic-link, which also uses the PKCE flow via
 * @supabase/ssr's createBrowserClient) never completes — the link 404s.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/post-login";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerActionClient({
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const target = new URL("/post-login", origin);
      target.searchParams.set("return_to", next);
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
}
