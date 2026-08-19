import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { dataDeletionRequests, users } from "@hebron/db/schema";
import { UserX } from "lucide-react";
import { Button } from "@hebron/ui";
import {
  resolveDeletionRequest,
  rejectDeletionRequest,
} from "../../../actions/lgpd";

// ─── Server Actions ───────────────────────────────────────────────────────────

async function handleExecute(formData: FormData) {
  "use server";
  const requestId = formData.get("requestId") as string;
  const result = await resolveDeletionRequest({ requestId });
  if (result?.serverError) {
    redirect(`/lgpd?error=${encodeURIComponent(result.serverError)}`);
  }
  revalidatePath("/lgpd");
  redirect("/lgpd?success=executado");
}

async function handleReject(formData: FormData) {
  "use server";
  const requestId = formData.get("requestId") as string;
  const notes = (formData.get("notes") as string | null) ?? "";
  const result = await rejectDeletionRequest({ requestId, notes });
  if (result?.serverError) {
    redirect(`/lgpd?error=${encodeURIComponent(result.serverError)}`);
  }
  revalidatePath("/lgpd");
  redirect("/lgpd?success=recusado");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ReqStatus = "pending" | "completed" | "rejected";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const STATUS_TABS: { value: ReqStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pendentes" },
  { value: "completed", label: "Executados" },
  { value: "rejected", label: "Recusados" },
  { value: "all", label: "Todos" },
];

const STATUS_CONFIG: Record<ReqStatus, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "hb-status-pending" },
  completed: { label: "Executado", cls: "hb-status-active" },
  rejected: { label: "Recusado", cls: "hb-status-suspended" },
};

const TEXTAREA_CLASS =
  "flex w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LgpdPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const filter = (params.filter ?? "pending") as ReqStatus | "all";

  const requests = await db
    .select()
    .from(dataDeletionRequests)
    .orderBy(desc(dataDeletionRequests.createdAt));

  const relatedUserIds = [
    ...new Set(
      requests.flatMap((r) =>
        [r.userId, r.resolvedBy].filter((v): v is string => v !== null),
      ),
    ),
  ];
  const userRows =
    relatedUserIds.length > 0
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, relatedUserIds))
      : [];
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const counts: Record<string, number> = { all: requests.length };
  for (const r of requests) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  function tabUrl(v: ReqStatus | "all") {
    return v === "pending" ? "/lgpd" : `/lgpd?filter=${v}`;
  }

  return (
    <div className="hb-page">
      {/* Header */}
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">LGPD · art. 18, VI</div>
          <h1 className="hb-page-title">Exclusão de dados</h1>
          <p className="hb-page-subtitle">
            Executar anonimiza a PII do titular de verdade — a ação não pode ser
            desfeita. Recusar exige uma base legal para reter os dados e
            notifica o titular.
          </p>
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
          {params.success === "executado" &&
            "Pedido executado — os dados do titular foram anonimizados e o login foi desativado."}
          {params.success === "recusado" &&
            "Pedido recusado — o titular foi notificado do motivo."}
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

      {/* Tab chips */}
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
              <UserX size={22} aria-hidden="true" />
            </div>
            <b>Nenhum pedido nesta categoria</b>
            <div className="hb-empty-body">
              Pedidos abertos pelo titular em "Meus Dados" aparecem aqui como
              pendentes.
            </div>
            <div className="hb-empty-quote">
              "Tudo tem o seu tempo determinado, e há tempo para todo o
              propósito debaixo do céu."
              <cite className="hb-empty-cite">— Eclesiastes 3:1</cite>
            </div>
          </div>
        ) : (
          <table className="hb-tbl" aria-label="Pedidos de exclusão de dados">
            <thead>
              <tr>
                <th>Titular</th>
                <th>Motivo</th>
                <th>Solicitado</th>
                <th>Status</th>
                <th>Resolução</th>
                <th style={{ width: 240 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => {
                const requester = userById.get(req.userId);
                const resolver = req.resolvedBy
                  ? userById.get(req.resolvedBy)
                  : null;
                const cfg = STATUS_CONFIG[req.status];
                return (
                  <tr key={req.id}>
                    <td>
                      <div className="hb-user-cell">
                        <div
                          className="hb-avatar hb-avatar-sm"
                          style={{ background: "var(--hb-red)" }}
                          aria-hidden="true"
                        >
                          <UserX size={13} />
                        </div>
                        <div className="hb-user-cell-text">
                          <b>
                            {requester?.fullName ??
                              requester?.email ??
                              req.userId}
                          </b>
                          {requester?.fullName && (
                            <span
                              style={{ fontSize: 12, color: "var(--fg-muted)" }}
                            >
                              {requester.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        fontSize: 13,
                        color: "var(--fg-muted)",
                        maxWidth: 220,
                      }}
                    >
                      {req.reason ?? "—"}
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                      {formatDate(req.createdAt)}
                    </td>
                    <td>
                      <span className={`hb-badge ${cfg.cls}`}>
                        <span className="hb-badge-dot" />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                      {req.status === "pending" ? (
                        "—"
                      ) : (
                        <>
                          {resolver?.fullName ?? resolver?.email ?? "—"}
                          {req.resolvedAt && (
                            <div>{formatDateTime(req.resolvedAt)}</div>
                          )}
                          {req.status === "rejected" && req.resolutionNotes && (
                            <div style={{ marginTop: 4, fontStyle: "italic" }}>
                              "{req.resolutionNotes}"
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      {req.status === "pending" ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            alignItems: "flex-start",
                          }}
                        >
                          <form action={handleExecute}>
                            <input
                              type="hidden"
                              name="requestId"
                              value={req.id}
                            />
                            <Button
                              type="submit"
                              variant="accent"
                              size="xs"
                              className="rounded-full"
                            >
                              Executar exclusão
                            </Button>
                          </form>
                          <details style={{ width: "100%" }}>
                            <summary
                              style={{
                                cursor: "pointer",
                                fontSize: 12,
                                color: "var(--fg-muted)",
                              }}
                            >
                              Recusar…
                            </summary>
                            <form
                              action={handleReject}
                              style={{
                                marginTop: 6,
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              <input
                                type="hidden"
                                name="requestId"
                                value={req.id}
                              />
                              <textarea
                                name="notes"
                                required
                                minLength={10}
                                rows={2}
                                placeholder="Base legal para reter os dados (ex.: obrigação contábil em curso)"
                                className={TEXTAREA_CLASS}
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="xs"
                                className="rounded-full"
                              >
                                Confirmar recusa
                              </Button>
                            </form>
                          </details>
                        </div>
                      ) : (
                        <span
                          style={{ fontSize: 12, color: "var(--fg-subtle)" }}
                        >
                          {req.status === "completed"
                            ? "Dados anonimizados"
                            : "Pedido recusado"}
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
