import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users } from "@hebron/db/schema";
import { invitations } from "@hebron/db/schema";
import { Plus, Mail, RotateCcw } from "lucide-react";
import { Button } from "@hebron/ui";
import { revokeInvitation, sendInvitation } from "../../../actions/invitations";

// ─── Server Actions ───────────────────────────────────────────────────────────

async function handleRevoke(formData: FormData) {
  "use server";
  const id = formData.get("invitationId") as string;
  const result = await revokeInvitation({ id });
  if (result?.serverError) {
    redirect(`/convites?error=${encodeURIComponent(result.serverError)}`);
  }
  revalidatePath("/convites");
  revalidatePath("/");
  redirect("/convites?success=revogado");
}

async function handleResend(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  const rolesRaw = formData.get("roles") as string;
  const roles = rolesRaw.split(",").filter(Boolean);
  if (roles.length === 0) {
    redirect("/convites?error=Papéis inválidos");
  }
  // Validate roles
  const validRoles = [
    "super_admin",
    "diretor",
    "conselheiro",
    "colaborador",
    "submissor",
    "aluno",
    "hospede",
    "ouvinte",
  ] as const;
  type ValidRole = (typeof validRoles)[number];
  const filteredRoles = roles.filter((r): r is ValidRole =>
    (validRoles as readonly string[]).includes(r),
  );
  if (filteredRoles.length === 0) {
    redirect("/convites?error=Papéis inválidos");
  }
  const result = await sendInvitation({
    email,
    roles: filteredRoles,
    expiresInDays: 7,
  });
  if (result?.serverError) {
    redirect(`/convites?error=${encodeURIComponent(result.serverError)}`);
  }
  revalidatePath("/convites");
  revalidatePath("/");
  redirect("/convites?success=reenviado");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type InvStatus = "pending" | "accepted" | "expired" | "revoked";

function getInvStatus(inv: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): InvStatus {
  if (inv.revokedAt) return "revoked";
  if (inv.acceptedAt) return "accepted";
  if (inv.expiresAt < new Date()) return "expired";
  return "pending";
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffD = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffD === 0) return "hoje";
  if (diffD === 1) return "ontem";
  if (diffD < 7) return `há ${diffD} dias`;
  return formatDate(date);
}

const STATUS_TABS: { value: InvStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "accepted", label: "Aceitos" },
  { value: "expired", label: "Expirados" },
  { value: "revoked", label: "Revogados" },
];

const STATUS_CONFIG: Record<InvStatus, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "hb-status-pending" },
  accepted: { label: "Aceito", cls: "hb-status-aceito" },
  expired: { label: "Expirado", cls: "hb-status-expirado" },
  revoked: { label: "Revogado", cls: "hb-status-revogado" },
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  diretor: "Diretor",
  conselheiro: "Conselheiro",
  colaborador: "Colaborador",
  submissor: "Submissor",
  aluno: "Aluno",
  hospede: "Hóspede",
  ouvinte: "Ouvinte",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConvitesPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const filter = (params.filter ?? "all") as InvStatus | "all";

  // Fetch invitations with sender info
  const allInvitations = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      roles: invitations.roles,
      invitedBy: invitations.invitedBy,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      revokedAt: invitations.revokedAt,
      createdAt: invitations.createdAt,
      senderName: users.fullName,
      senderEmail: users.email,
    })
    .from(invitations)
    .innerJoin(users, eq(invitations.invitedBy, users.id))
    .orderBy(desc(invitations.createdAt));

  // Annotate with derived status
  const annotated = allInvitations.map((inv) => ({
    ...inv,
    status: getInvStatus(inv),
  }));

  // Count per status
  const counts: Record<string, number> = { all: annotated.length };
  for (const inv of annotated) {
    counts[inv.status] = (counts[inv.status] ?? 0) + 1;
  }

  // Filter
  const filtered =
    filter === "all" ? annotated : annotated.filter((i) => i.status === filter);

  // Tab URL builder
  function tabUrl(v: InvStatus | "all") {
    return v === "all" ? "/convites" : `/convites?filter=${v}`;
  }

  return (
    <div className="hb-page">
      {/* Header */}
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">Aprovação · entrada no ecossistema</div>
          <h1 className="hb-page-title">Convites</h1>
          <p className="hb-page-subtitle">
            Envie convites com expiração de 7 dias. O ecossistema aceita
            auto-cadastro com aprovação, mas o convite é o caminho preferido
            para pastores e colaboradores.
          </p>
        </div>
        <div className="hb-page-header-actions">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/convites/novo">
              <Plus size={14} aria-hidden="true" />
              Novo convite
            </Link>
          </Button>
        </div>
      </div>

      {/* Feedback */}
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
          {params.success === "revogado" && "Convite revogado com sucesso."}
          {params.success === "reenviado" &&
            "Novo convite enviado com sucesso."}
          {params.success === "enviado" && "Convite enviado com sucesso."}
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

      {/* Tab chips — URL-based navigation */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}
      >
        {STATUS_TABS.map((t) => (
          <Link
            key={t.value}
            href={tabUrl(t.value)}
            className={`hb-chip${filter === t.value ? " active" : ""}`}
          >
            {t.label}
            <span style={{ opacity: 0.6, fontSize: 11 }}>
              · {counts[t.value] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="hb-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <Mail size={22} aria-hidden="true" />
            </div>
            <b>Nenhum convite nesta categoria</b>
            <div className="hb-empty-body">
              Ao enviar um convite, o destinatário recebe um link com expiração
              de 7 dias.
            </div>
            <div className="hb-empty-quote">
              "Ide por todo o mundo e pregai o evangelho a toda criatura."
              <cite className="hb-empty-cite">— Marcos 16:15</cite>
            </div>
            <div style={{ marginTop: 18 }}>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/convites/novo">
                  <Plus size={14} aria-hidden="true" />
                  Novo convite
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <table className="hb-tbl" aria-label="Lista de convites">
            <thead>
              <tr>
                <th>Destinatário</th>
                <th>Papéis</th>
                <th>Enviado por</th>
                <th>Status</th>
                <th>Enviado</th>
                <th>Expira / Aceito</th>
                <th style={{ width: 160 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const cfg = STATUS_CONFIG[inv.status];
                const roles = Array.isArray(inv.roles) ? inv.roles : [];
                return (
                  <tr key={inv.id}>
                    <td>
                      <div className="hb-user-cell">
                        <div
                          className="hb-avatar hb-avatar-sm"
                          style={{ background: "var(--hb-cyan)" }}
                          aria-hidden="true"
                        >
                          <Mail size={13} />
                        </div>
                        <div className="hb-user-cell-text">
                          <b>{inv.email}</b>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="hb-role-stack">
                        {roles.slice(0, 2).map((r) => (
                          <span key={r} className={`hb-badge hb-role-${r}`}>
                            {ROLE_LABELS[r] ?? r}
                          </span>
                        ))}
                        {roles.length === 0 && (
                          <span
                            style={{
                              fontSize: 12.5,
                              color: "var(--fg-subtle)",
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: "var(--fg-muted)", fontSize: 13 }}>
                      {inv.senderName ?? inv.senderEmail}
                    </td>
                    <td>
                      <span className={`hb-badge ${cfg.cls}`}>
                        <span className="hb-badge-dot" />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ color: "var(--fg-muted)", fontSize: 12.5 }}>
                      {formatRelative(inv.createdAt)}
                    </td>
                    <td
                      style={{
                        fontSize: 12.5,
                        color:
                          inv.status === "expired"
                            ? "var(--hb-red)"
                            : "var(--fg-muted)",
                      }}
                    >
                      {inv.status === "accepted"
                        ? `aceito ${formatRelative(inv.acceptedAt ?? inv.createdAt)}`
                        : formatDate(inv.expiresAt)}
                    </td>
                    <td>
                      {inv.status === "pending" && (
                        <div style={{ display: "flex", gap: 5 }}>
                          {/* Resend — creates a new invitation for same email */}
                          <form action={handleResend}>
                            <input
                              type="hidden"
                              name="email"
                              value={inv.email}
                            />
                            <input
                              type="hidden"
                              name="roles"
                              value={roles.join(",")}
                            />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="xs"
                              className="rounded-full"
                            >
                              <RotateCcw size={12} aria-hidden="true" />
                              Reenviar
                            </Button>
                          </form>
                          {/* Revoke */}
                          <form action={handleRevoke}>
                            <input
                              type="hidden"
                              name="invitationId"
                              value={inv.id}
                            />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="xs"
                              className="rounded-full"
                            >
                              Revogar
                            </Button>
                          </form>
                        </div>
                      )}
                      {inv.status === "expired" && (
                        <form action={handleResend}>
                          <input type="hidden" name="email" value={inv.email} />
                          <input
                            type="hidden"
                            name="roles"
                            value={roles.join(",")}
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="xs"
                            className="rounded-full border-(--brand) text-(--brand)"
                          >
                            <Mail size={12} aria-hidden="true" />
                            Renovar
                          </Button>
                        </form>
                      )}
                      {inv.status === "accepted" && (
                        <span
                          style={{ fontSize: 12, color: "var(--fg-muted)" }}
                        >
                          Convite aceito
                        </span>
                      )}
                      {inv.status === "revoked" && (
                        <span
                          style={{ fontSize: 12, color: "var(--fg-subtle)" }}
                        >
                          Revogado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
