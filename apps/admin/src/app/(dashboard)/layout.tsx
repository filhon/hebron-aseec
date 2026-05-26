import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { count, isNull, and, gt } from "drizzle-orm";
import { users, invitations } from "@hebron/db/schema";
import { SidebarNav } from "../../components/sidebar-nav";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurado");
  return drizzle(postgres(url, { prepare: false }));
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = getDb();

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
        <div className="hb-main-content">{children}</div>
      </div>
    </div>
  );
}
