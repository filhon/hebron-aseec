import { cookies } from "next/headers";
import { db } from "@hebron/db/client";
import { count, isNull, and, gt } from "drizzle-orm";
import { users, invitations } from "@hebron/db/schema";
import { AdminShell } from "../../components/admin-shell";
import { ImpersonationBanner } from "@hebron/ui";
import {
  IMPERSONATION_COOKIE_NAME,
  parseImpersonationState,
} from "@hebron/auth/impersonation";
import { stopImpersonationAction } from "../../actions/impersonation";
import { requireAdminSession } from "../../lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  const cookieStore = await cookies();
  const rawImp = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;
  const impersonation = rawImp ? parseImpersonationState(rawImp) : null;

  const [userCountRows, pendingInviteRows] = await Promise.all([
    db.select({ total: count() }).from(users),

    db
      .select({ total: count() })
      .from(invitations)
      .where(
        and(
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
          gt(invitations.expiresAt, new Date()),
        ),
      ),
  ]);

  const userCount = userCountRows[0]?.total ?? 0;
  const pendingInvitesCount = pendingInviteRows[0]?.total ?? 0;

  return (
    <AdminShell userCount={userCount} pendingInvitesCount={pendingInvitesCount}>
      {impersonation && (
        <ImpersonationBanner
          impersonatedName={impersonation.impersonatedName}
          actorName={impersonation.actorName}
          startedAt={impersonation.startedAt}
          onStop={stopImpersonationAction}
        />
      )}
      {children}
    </AdminShell>
  );
}
