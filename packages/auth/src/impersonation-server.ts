/**
 * Next.js-coupled convenience wrapper around impersonation.ts, split out so
 * `impersonation.ts` itself (imported by client-adjacent code for its types)
 * never pulls in `next/headers`. Only server components/actions import this
 * subpath directly.
 */

import { cookies } from "next/headers";
import {
  IMPERSONATION_COOKIE_NAME,
  resolveVerifiedImpersonationState,
  type ImpersonationState,
} from "./impersonation";

/**
 * Reads the current request's impersonation cookie, verifies it, and returns
 * the active state — or `null` when there is none, it failed verification,
 * or it is past the 8h ceiling. Safe to call outside a request scope (e.g. a
 * cron job importing an app's lib/audit.ts): `cookies()` throws there, and
 * that throw is treated the same as "no impersonation active".
 */
export async function getActiveImpersonation(): Promise<ImpersonationState | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;
    return resolveVerifiedImpersonationState(raw);
  } catch {
    return null;
  }
}
