import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, organizationMembers } from "@hebron/db/schema";
import { resolveSession } from "@hebron/auth/server";
import {
  CANONICAL_LOGIN_URL,
  anyRoleRequiresMfa,
  hasVerifiedTotpFactor,
  getAssuranceLevel,
} from "@hebron/auth";
import { getSessionSupabaseClient } from "../../../lib/session-client";

interface PostLoginPageProps {
  searchParams: Promise<{ return_to?: string }>;
}

/**
 * Single checkpoint every login path routes through (password, magic link,
 * invite auto-login, email confirmation) before reaching the destination —
 * enforces the onboarding-approval gate and the MFA-enrollment gate in one
 * place instead of duplicating both checks in every entry point.
 */
export default async function PostLoginPage({
  searchParams,
}: PostLoginPageProps) {
  const { return_to } = await searchParams;
  const destination = safeRedirectTarget(return_to);

  const cookieStore = await cookies();
  let session;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  const [userRow] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, session.actorId))
    .limit(1);

  const status = userRow?.status ?? "active";

  if (status === "rejected") redirect("/cadastro/status");

  if (status === "pending_approval") {
    const [membership] = await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, session.actorId))
      .limit(1);

    redirect(membership ? "/cadastro/status" : "/cadastro/instituicao");
  }

  if (anyRoleRequiresMfa(session.roles)) {
    const supabase = await getSessionSupabaseClient();
    const hasFactor = await hasVerifiedTotpFactor(supabase);

    if (!hasFactor) {
      redirect(`/mfa/enroll?return_to=${encodeURIComponent(destination)}`);
    }

    const { currentLevel, nextLevel } = await getAssuranceLevel(supabase);
    if (nextLevel === "aal2" && currentLevel !== "aal2") {
      redirect(`/mfa/challenge?return_to=${encodeURIComponent(destination)}`);
    }
  }

  redirect(destination);
}

/** Only ever redirect within this app — never to an attacker-supplied host. */
function safeRedirectTarget(returnTo: string | undefined): string {
  if (!returnTo) return "/";
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return "/";
  return returnTo;
}
