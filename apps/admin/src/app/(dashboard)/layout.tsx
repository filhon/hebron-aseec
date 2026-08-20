import { db } from "@hebron/db/client";
import { count, isNull, and, gt } from "drizzle-orm";
import { users, invitations } from "@hebron/db/schema";
import { AdminShell } from "../../components/admin-shell";
import { getActiveImpersonation } from "@hebron/auth/impersonation-server";
import { stopImpersonationAction } from "../../actions/impersonation";
import { requireAdminSession } from "../../lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  const impersonation = await getActiveImpersonation();

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
    <AdminShell
      userCount={userCount}
      pendingInvitesCount={pendingInvitesCount}
      impersonation={
        impersonation
          ? {
              impersonatedName: impersonation.impersonatedName,
              actorName: impersonation.actorName,
              startedAt: impersonation.startedAt,
              onStop: stopImpersonationAction,
            }
          : null
      }
    >
      {children}
    </AdminShell>
  );
}
