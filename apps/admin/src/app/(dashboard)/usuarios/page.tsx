import { Suspense } from "react";
import Link from "next/link";
import { db } from "@hebron/db/client";
import { count } from "drizzle-orm";
import { users, roleAssignments } from "@hebron/db/schema";
import { Plus } from "lucide-react";
import { Button } from "@hebron/ui";
import { UserTable } from "../../../components/user-table";
import { UserTableSkeleton } from "../../../components/user-table-skeleton";

// ─── Users content (async, streamed via Suspense) ─────────────────────────────

async function UsersContent() {
  const [allUsers, allRoleAssignments] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        suspendedModules: users.suspendedModules,
        createdAt: users.createdAt,
      })
      .from(users),

    db
      .select({ userId: roleAssignments.userId, role: roleAssignments.role })
      .from(roleAssignments),
  ]);

  return <UserTable users={allUsers} roleAssignments={allRoleAssignments} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UsuariosPage() {
  const totalCountRows = await db.select({ total: count() }).from(users);
  const totalUsers = totalCountRows[0]?.total ?? 0;

  return (
    <div className="hb-page">
      {/* Header */}
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">
            Operação · {totalUsers} conta{totalUsers !== 1 ? "s" : ""}
          </div>
          <h1 className="hb-page-title">Usuários</h1>
          <p className="hb-page-subtitle">
            Aprove cadastros, atribua papéis e mantenha a hierarquia de acesso
            ao ecossistema Hebron ASEEC.
          </p>
        </div>
        <div className="hb-page-header-actions">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/convites">
              <Plus size={14} aria-hidden="true" />
              Convidar usuário
            </Link>
          </Button>
        </div>
      </div>

      <div className="hb-card" style={{ padding: 20 }}>
        <Suspense fallback={<UserTableSkeleton />}>
          <UsersContent />
        </Suspense>
      </div>
    </div>
  );
}
