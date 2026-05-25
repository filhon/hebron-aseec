"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Download, Plus, Filter, Shield } from "lucide-react";
import { mockUsers, mockRoleAssignments } from "../../../lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const palette = [
    "#202c85",
    "#ea5a06",
    "#07b4e7",
    "#a1c520",
    "#6b4ec8",
    "#0a8a7d",
    "#b8852a",
  ];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[hash % palette.length] ?? "#202c85";
}

function formatRelative(date: Date | null): string {
  if (!date) return "nunca";
  const now = new Date("2026-05-23T10:00:00Z");
  const diffD = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffD === 0) return "hoje";
  if (diffD === 1) return "ontem";
  if (diffD < 7) return `há ${diffD} dias`;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  pending_approval: "Pendente",
  suspended: "Suspenso",
};

const STATUS_CLASSES: Record<string, string> = {
  active: "hb-status-active",
  pending_approval: "hb-status-pending_approval",
  suspended: "hb-status-suspended",
};

const PER_PAGE = 10;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const allRoles = [
    ...new Set(
      mockRoleAssignments
        .filter((ra) => ra.revokedAt === null)
        .map((ra) => ra.role),
    ),
  ];

  const userRoleMap = React.useMemo(() => {
    const m: Record<string, string[]> = {};
    mockRoleAssignments
      .filter((ra) => ra.revokedAt === null)
      .forEach((ra) => {
        m[ra.userId] = [...(m[ra.userId] ?? []), ra.role];
      });
    return m;
  }, []);

  const filtered = React.useMemo(() => {
    return mockUsers.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchRole =
        roleFilter === "all" || (userRoleMap[u.id] ?? []).includes(roleFilter);
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [search, roleFilter, statusFilter, userRoleMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const resetPage = () => setPage(1);

  return (
    <div className="hb-page">
      {/* Header */}
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">Operação · {mockUsers.length} contas</div>
          <h1 className="hb-page-title">Usuários</h1>
          <p className="hb-page-subtitle">
            Aprove cadastros, atribua papéis e mantenha a hierarquia de acesso
            ao ecossistema Hebron ASEEC.
          </p>
        </div>
        <div className="hb-page-header-actions">
          <button className="hb-btn hb-btn-secondary hb-btn-sm" type="button">
            <Download size={14} aria-hidden="true" />
            Exportar CSV
          </button>
          <button className="hb-btn hb-btn-primary hb-btn-sm" type="button">
            <Plus size={14} aria-hidden="true" />
            Convidar usuário
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="hb-filter-row">
        <div className="hb-field" style={{ flex: "1 1 260px", maxWidth: 380 }}>
          <Search size={14} color="#6b7280" aria-hidden="true" />
          <input
            placeholder="Buscar por nome ou email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            aria-label="Buscar usuários"
          />
        </div>
        <div className="hb-field">
          <Filter size={13} color="#6b7280" aria-hidden="true" />
          <label htmlFor="role-filter">Papel</label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              resetPage();
            }}
          >
            <option value="all">Todos</option>
            {allRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r] ?? r}
              </option>
            ))}
          </select>
        </div>
        <div className="hb-field">
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              resetPage();
            }}
          >
            <option value="all">Todos</option>
            <option value="active">Ativo</option>
            <option value="pending_approval">Pendente</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: "#6b7280" }}>
          {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
        </span>
      </div>

      {/* Table */}
      <div className="hb-card" style={{ overflow: "hidden" }}>
        {pageItems.length === 0 ? (
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <Search size={22} aria-hidden="true" />
            </div>
            <b>Nenhum usuário encontrado</b>
            <div className="hb-empty-body">
              Ajuste os filtros ou convide um novo usuário.
            </div>
            <div className="hb-empty-quote">
              "Os que semeiam com lágrimas com júbilo ceifarão."
              <cite className="hb-empty-cite">— Salmos 126:5</cite>
            </div>
          </div>
        ) : (
          <>
            <table className="hb-tbl" aria-label="Lista de usuários">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Papéis</th>
                  <th>Status</th>
                  <th>MFA</th>
                  <th>Último acesso</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((u) => {
                  const initials = getInitials(u.name);
                  const bg = getAvatarColor(u.name);
                  const roles = userRoleMap[u.id] ?? [];
                  return (
                    <tr key={u.id}>
                      <td>
                        <Link
                          href={`/usuarios/${u.id}`}
                          className="hb-user-cell"
                          style={{ textDecoration: "none" }}
                        >
                          <div
                            className="hb-avatar"
                            style={{ background: bg }}
                            aria-hidden="true"
                          >
                            {initials}
                          </div>
                          <div className="hb-user-cell-text">
                            <b>{u.name}</b>
                            <span>{u.email}</span>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <div className="hb-role-stack">
                          {roles.slice(0, 2).map((r) => (
                            <span key={r} className={`hb-badge hb-role-${r}`}>
                              {ROLE_LABELS[r] ?? r}
                            </span>
                          ))}
                          {roles.length > 2 && (
                            <span className="hb-badge">
                              +{roles.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`hb-badge ${STATUS_CLASSES[u.status] ?? ""}`}
                        >
                          <span className="hb-badge-dot" />
                          {STATUS_LABELS[u.status] ?? u.status}
                        </span>
                      </td>
                      <td>
                        {u.mfaEnabled ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 12.5,
                              color: "#5e7a10",
                            }}
                          >
                            <Shield size={13} aria-hidden="true" /> Ativo
                          </span>
                        ) : (
                          <span style={{ fontSize: 12.5, color: "#b7bdd0" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td style={{ color: "#6b7280", fontSize: 12.5 }}>
                        {formatRelative(u.lastLoginAt)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/usuarios/${u.id}`}
                          className="hb-btn hb-btn-ghost hb-btn-xs"
                          style={{ borderRadius: 8 }}
                          aria-label={`Ver perfil de ${u.name}`}
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="hb-pagination">
              <span className="hb-pagination-info">
                Página {page} de {totalPages} · {filtered.length}{" "}
                {filtered.length === 1 ? "usuário" : "usuários"}
              </span>
              <button
                className="hb-page-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Página anterior"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`hb-page-btn${page === n ? " active" : ""}`}
                  onClick={() => setPage(n)}
                  aria-current={page === n ? "page" : undefined}
                >
                  {n}
                </button>
              ))}
              <button
                className="hb-page-btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Próxima página"
              >
                ›
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
