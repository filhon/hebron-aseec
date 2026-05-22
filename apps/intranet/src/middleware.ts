import { type NextRequest, NextResponse } from "next/server";
import {
  createSupabaseMiddlewareClient,
  CANONICAL_LOGIN_URL,
} from "@hebron/auth/middleware";

/**
 * Routes that are publicly accessible without authentication.
 * Auth callback must be public so Supabase can finalize OAuth/magic link flows.
 */
const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Static assets and Next.js internals — skip auth check
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createSupabaseMiddlewareClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      // Write cookies to both request and response so downstream
      // server components see the refreshed session.
      cookiesToSet.forEach(({ name, value }) => {
        request.cookies.set(name, value);
      });
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, {
          ...(options ?? {}),
          // In production, scope session cookies to the root domain so all
          // apps share the same session (SSO).
          ...(process.env.NODE_ENV === "production" && {
            domain: ".hebronaseec.com.br",
            secure: true,
            sameSite: "lax",
          }),
        });
      });
    },
  });

  // `getUser()` validates the JWT server-side — safer than `getSession()`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnTo = encodeURIComponent(pathname + request.nextUrl.search);
    const loginUrl = new URL(CANONICAL_LOGIN_URL);
    loginUrl.searchParams.set("return_to", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
