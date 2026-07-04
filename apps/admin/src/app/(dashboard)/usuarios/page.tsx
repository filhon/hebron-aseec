import { Suspense } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { db } from "@hebron/db/client";
import { count, eq } from "drizzle-orm";
import {
  users,
  roleAssignments,
  organizationMembers,
  organizations,
} from "@hebron/db/schema";
import { Plus, Building2, Check, X } from "lucide-react";
import { Button } from "@hebron/ui";
import { UserTable } from "../../../components/user-table";
import { UserTableSkeleton } from "../../../components/user-table-skeleton";
import { approveSignup, rejectSignup } from "../../../actions/users";

// ─── Server Actions ───────────────────────────────────────────────────────────

async function handleApprove(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const result = await approveSignup({ id });
  if (result?.serverError) {
    redirect(`/usuarios?error=${encodeURIComponent(result.serverError)}`);
  }
  revalidatePath("/usuarios");
  redirect("/usuarios?success=aprovado");
}

async function handleReject(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const result = await rejectSignup({ id });
  if (result?.serverError) {
    redirect(`/usuarios?error=${encodeURIComponent(result.serverError)}`);
  }
  revalidatePath("/usuarios");
  redirect("/usuarios?success=rejeitado");
}

// ─── Pending signups (async, streamed via Suspense) ───────────────────────────

async function PendingSignupsContent() {
  const pending = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      createdAt: users.createdAt,
      organizationName: organizations.nome,
    })
    .from(users)
    .leftJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .leftJoin(
      organizations,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .where(eq(users.status, "pending_approval"));

  if (pending.length === 0) return null;

  return (
    <div className="hb-card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="hb-eyebrow">Aprovação · entrada no ecossistema</div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 17,
            margin: "4px 0 0",
            color: "var(--fg)",
          }}
        >
          Cadastros aguardando aprovação ({pending.length})
        </h2>
      </div>

      <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pending.map((row) => (
          <li
            key={row.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "12px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                className="hb-avatar hb-avatar-sm"
                style={{ background: "var(--hb-blue)" }}
                aria-hidden="true"
              >
                {(row.fullName ?? row.email).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <b>{row.fullName ?? row.email}</b>
                <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                  {row.email}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginLeft: 8,
                  fontSize: 12.5,
                  color: "var(--fg-muted)",
                }}
              >
                <Building2 size={13} aria-hidden="true" />
                {row.organizationName ?? "sem instituição vinculada"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <form action={handleReject}>
                <input type="hidden" name="id" value={row.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="xs"
                  className="rounded-full"
                >
                  <X size={12} aria-hidden="true" />
                  Rejeitar
                </Button>
              </form>
              <form action={handleApprove}>
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" size="xs" className="rounded-full">
                  <Check size={12} aria-hidden="true" />
                  Aprovar
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
      .from(users)
      .where(eq(users.status, "active")),

    db
      .select({ userId: roleAssignments.userId, role: roleAssignments.role })
      .from(roleAssignments),
  ]);

  return <UserTable users={allUsers} roleAssignments={allRoleAssignments} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const totalCountRows = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.status, "active"));
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

      {params.success && (
        <div
          style={{
            background: "rgba(161,197,32,0.12)",
            border: "1px solid rgba(161,197,32,0.4)",
            borderRadius: 12,
            padding: "12px 18px",
            fontSize: 13.5,
            color: "#4a6009",
            marginBottom: 16,
          }}
        >
          {params.success === "aprovado" && "Cadastro aprovado com sucesso."}
          {params.success === "rejeitado" && "Cadastro rejeitado."}
        </div>
      )}
      {params.error && (
        <div
          style={{
            background: "rgba(184,51,26,0.08)",
            border: "1px solid rgba(184,51,26,0.3)",
            borderRadius: 12,
            padding: "12px 18px",
            fontSize: 13.5,
            color: "var(--hb-red)",
            marginBottom: 16,
          }}
        >
          {decodeURIComponent(params.error)}
        </div>
      )}

      <Suspense fallback={null}>
        <PendingSignupsContent />
      </Suspense>

      <div className="hb-card" style={{ padding: 20 }}>
        <Suspense fallback={<UserTableSkeleton />}>
          <UsersContent />
        </Suspense>
      </div>
    </div>
  );
}
