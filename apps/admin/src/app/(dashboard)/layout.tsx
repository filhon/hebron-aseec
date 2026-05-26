import { cookies } from "next/headers";
import { db } from "@hebron/db/client";
import { count, isNull, and, gt } from "drizzle-orm";
import { users, invitations } from "@hebron/db/schema";
import { SidebarNav } from "../../components/sidebar-nav";
import { ImpersonationBanner } from "@hebron/ui";
import {
  IMPERSONATION_COOKIE_NAME,
  parseImpersonationState,
} from "@hebron/auth/impersonation";
import { stopImpersonationAction } from "../../actions/impersonation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read impersonation state from cookie (server-side)
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
    <div className="hb-admin-shell">
      <SidebarNav
        userCount={userCount}
        pendingInvitesCount={pendingInvitesCount}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          minWidth: 0,
        }}
      >
        {impersonation && (
          <ImpersonationBanner
            impersonatedName={impersonation.impersonatedName}
            actorName={impersonation.actorName}
            startedAt={impersonation.startedAt}
            onStop={stopImpersonationAction}
          />
        )}
        <div className="hb-main-content">{children}</div>
      </div>
    </div>
  );
}
