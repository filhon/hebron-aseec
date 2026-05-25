"use client";

import * as React from "react";
import { Plus, Mail, RotateCcw } from "lucide-react";
import type { InvitationStatus } from "@hebron/types/admin";
import { mockInvitations, mockUsers } from "../../../lib/mock-data";

// ─── Helpers ────────────────��─────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatRelative(date: Date): string {
  const now = new Date("2026-05-23T10:00:00Z");
  const diffD = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffD === 0) return "hoje";
  if (diffD === 1) return "ontem";
  if (diffD < 7) return `há ${diffD} dias`;
  return formatDate(date);
}

const STATUS_TABS: { value: InvitationStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "accepted", label: "Aceitos" },
  { value: "expired", label: "Expirados" },
  { value: "revoked", label: "Revogados" },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
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

// ─── Page ────────────────��─────────────────────────────────────��──────────────

export default function ConvitesPage() {
  const [filter, setFilter] = React.useState<InvitationStatus | "all">("all");

  const invitationsWithSender = mockInvitations.map((inv) => {
    const sender = mockUsers.find((u) => u.id === inv.invitedBy);
    return { ...inv, senderName: sender?.name ?? "Desconhecido" };
  });

  const counts: Record<string, number> = React.useMemo(() => {
    const c: Record<string, number> = { all: mockInvitations.length };
    mockInvitations.forEach((i) => {
      c[i.status] = (c[i.status] ?? 0) + 1;
    });
    return c;
  }, []);

  const filtered =
    filter === "all"
      ? invitationsWithSender
      : invitationsWithSender.filter((i) => i.status === filter);

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
          <button className="hb-btn hb-btn-primary hb-btn-sm" type="button">
            <Plus size={14} aria-hidden="true" />
            Novo convite
          </button>
        </div>
      </div>

      {/* Tab chips */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}
      >
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`hb-chip${filter === t.value ? " active" : ""}`}
            onClick={() => setFilter(t.value)}
          >
            {t.label}
            <span style={{ opacity: 0.6, fontSize: 11 }}>
              · {counts[t.value] ?? 0}
            </span>
          </button>
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
              <button className="hb-btn hb-btn-primary hb-btn-sm" type="button">
                <Plus size={14} aria-hidden="true" />
                Novo convite
              </button>
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
                const cfg = STATUS_CONFIG[inv.status] ?? {
                  label: inv.status,
                  cls: "",
                };
                const roles: string[] = inv.role ? [inv.role] : [];
                return (
                  <tr key={inv.id}>
                    <td>
                      <div className="hb-user-cell">
                        <div
                          className="hb-avatar hb-avatar-sm"
                          style={{ background: "#07b4e7" }}
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
                        {roles.map((r) => (
                          <span key={r} className={`hb-badge hb-role-${r}`}>
                            {ROLE_LABELS[r] ?? r}
                          </span>
                        ))}
                        {roles.length === 0 && (
                          <span style={{ fontSize: 12.5, color: "#b7bdd0" }}>
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: "#6b7280", fontSize: 13 }}>
                      {inv.senderName}
                    </td>
                    <td>
                      <span className={`hb-badge ${cfg.cls}`}>
                        <span className="hb-badge-dot" />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ color: "#6b7280", fontSize: 12.5 }}>
                      {formatRelative(inv.invitedAt)}
                    </td>
                    <td
                      style={{
                        fontSize: 12.5,
                        color: inv.status === "expired" ? "#b8331a" : "#6b7280",
                      }}
                    >
                      {inv.status === "accepted"
                        ? `aceito ${formatRelative(inv.acceptedAt ?? inv.invitedAt)}`
                        : formatDate(inv.expiresAt)}
                    </td>
                    <td>
                      {inv.status === "pending" && (
                        <div style={{ display: "flex", gap: 5 }}>
                          <button
                            className="hb-btn hb-btn-ghost hb-btn-xs"
                            type="button"
                          >
                            <RotateCcw size={12} aria-hidden="true" />
                            Reenviar
                          </button>
                          <button
                            className="hb-btn hb-btn-ghost hb-btn-xs"
                            type="button"
                          >
                            Revogar
                          </button>
                        </div>
                      )}
                      {inv.status === "expired" && (
                        <button
                          className="hb-btn hb-btn-secondary hb-btn-xs"
                          type="button"
                        >
                          <Mail size={12} aria-hidden="true" />
                          Renovar
                        </button>
                      )}
                      {inv.status === "accepted" && (
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          Convite aceito
                        </span>
                      )}
                      {inv.status === "revoked" && (
                        <span style={{ fontSize: 12, color: "#b7bdd0" }}>
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
