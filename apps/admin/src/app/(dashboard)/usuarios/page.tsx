import Link from "next/link";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, or, ilike, count, sql, inArray, asc } from "drizzle-orm";
import { users, roleAssignments } from "@hebron/db/schema";
import { Search, Plus, Filter, Shield } from "lucide-react";

// ─── DB ───────────────────────────────────────────────────────────────────────

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurado");
  return drizzle(postgres(url, { prepare: false }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string | null): string {
  const palette = [
    "#202c85",
    "#ea5a06",
    "#07b4e7",
    "#a1c520",
    "#6b4ec8",
    "#0a8a7d",
    "#b8852a",
  ];
  if (!name) return palette[0] ?? "#202c85";
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[hash % palette.length] ?? "#202c85";
}

function getUserStatus(suspendedModules: string[]): "active" | "suspended" {
  return suspendedModules.includes("global") ? "suspended" : "active";
}

const VALID_ROLES = [
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
  "submissor",
  "aluno",
  "hospede",
  "ouvinte",
] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(r: string): r is ValidRole {
  return (VALID_ROLES as readonly string[]).includes(r);
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
  suspended: "Suspenso",
};

const STATUS_CLASSES: Record<string, string> = {
  active: "hb-status-active",
  suspended: "hb-status-suspended",
};

const PER_PAGE = 10;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const roleFilter = params.role ?? "all";
  const statusFilter = params.status ?? "all";
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));

  const db = getDb();

  // Resolve users that have the requested role (used for role filter subquery)
  let roleFilteredIds: string[] | null = null;
  if (roleFilter !== "all" && isValidRole(roleFilter)) {
    const rows = await db
      .selectDistinct({ userId: roleAssignments.userId })
      .from(roleAssignments)
      .where(eq(roleAssignments.role, roleFilter));
    roleFilteredIds = rows.map((r) => r.userId);
    if (roleFilteredIds.length === 0) {
      // No users with that role — render empty state early
      roleFilteredIds = ["__no_match__"];
    }
  }

  // Build WHERE conditions
  type SqlCondition = Parameters<typeof and>[0];
  const conditions: SqlCondition[] = [];

  if (search) {
    conditions.push(
      or(
        ilike(users.fullName, `%${search}%`),
        ilike(users.email, `%${search}%`),
      ),
    );
  }

  if (statusFilter === "active") {
    conditions.push(
      sql`NOT (${users.suspendedModules} @> '["global"]'::jsonb)`,
    );
  } else if (statusFilter === "suspended") {
    conditions.push(sql`${users.suspendedModules} @> '["global"]'::jsonb`);
  }

  if (roleFilteredIds !== null) {
    conditions.push(inArray(users.id, roleFilteredIds));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch users + role assignments + available roles in parallel
  const [allUsers, allRoleAssignments, availableRoles, totalCountRows] =
    await Promise.all([
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
        .where(whereClause)
        .orderBy(asc(users.fullName))
        .limit(PER_PAGE)
        .offset((currentPage - 1) * PER_PAGE),

      db
        .select({ userId: roleAssignments.userId, role: roleAssignments.role })
        .from(roleAssignments),

      db.selectDistinct({ role: roleAssignments.role }).from(roleAssignments),

      db.select({ total: count() }).from(users).where(whereClause),
    ]);

  const totalUsers = totalCountRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / PER_PAGE));

  // Build per-user role map
  const userRoleMap: Record<string, string[]> = {};
  for (const ra of allRoleAssignments) {
    (userRoleMap[ra.userId] ??= []).push(ra.role);
  }

  // URL builder for pagination links
  function buildUrl(overrides: { page?: string }) {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (roleFilter !== "all") p.set("role", roleFilter);
    if (statusFilter !== "all") p.set("status", statusFilter);
    const pg = overrides.page ?? String(currentPage);
    if (pg !== "1") p.set("page", pg);
    const s = p.toString();
    return `/usuarios${s ? `?${s}` : ""}`;
  }

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
          <Link href="/convites" className="hb-btn hb-btn-primary hb-btn-sm">
            <Plus size={14} aria-hidden="true" />
            Convidar usuário
          </Link>
        </div>
      </div>

      {/* Filters — native GET form for server-side filtering */}
      <form method="GET" action="/usuarios" className="hb-filter-row">
        <div className="hb-field" style={{ flex: "1 1 260px", maxWidth: 380 }}>
          <Search size={14} color="#6b7280" aria-hidden="true" />
          <input
            name="search"
            placeholder="Buscar por nome ou email"
            defaultValue={search}
            aria-label="Buscar usuários"
          />
        </div>
        <div className="hb-field">
          <Filter size={13} color="#6b7280" aria-hidden="true" />
          <label htmlFor="role-filter">Papel</label>
          <select id="role-filter" name="role" defaultValue={roleFilter}>
            <option value="all">Todos</option>
            {availableRoles.map(({ role: r }) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r] ?? r}
              </option>
            ))}
          </select>
        </div>
        <div className="hb-field">
          <label htmlFor="status-filter">Status</label>
          <select id="status-filter" name="status" defaultValue={statusFilter}>
            <option value="all">Todos</option>
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
        <button type="submit" className="hb-btn hb-btn-secondary hb-btn-sm">
          <Filter size={13} aria-hidden="true" />
          Filtrar
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: "#6b7280" }}>
          {totalUsers} {totalUsers === 1 ? "resultado" : "resultados"}
        </span>
      </form>

      {/* Table */}
      <div className="hb-card" style={{ overflow: "hidden" }}>
        {allUsers.length === 0 ? (
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
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => {
                  const initials = getInitials(u.fullName);
                  const bg = getAvatarColor(u.fullName);
                  const roles = userRoleMap[u.id] ?? [];
                  const status = getUserStatus(u.suspendedModules);
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
                            <b>{u.fullName ?? u.email}</b>
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
                          {roles.length === 0 && (
                            <span style={{ fontSize: 12.5, color: "#b7bdd0" }}>
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`hb-badge ${STATUS_CLASSES[status] ?? ""}`}
                        >
                          <span className="hb-badge-dot" />
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </td>
                      <td>
                        {/* MFA status requires Supabase Auth data — not available in DB */}
                        <span style={{ fontSize: 12.5, color: "#b7bdd0" }}>
                          <Shield size={13} aria-hidden="true" /> —
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/usuarios/${u.id}`}
                          className="hb-btn hb-btn-ghost hb-btn-xs"
                          style={{ borderRadius: 8 }}
                          aria-label={`Ver perfil de ${u.fullName ?? u.email}`}
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
            {totalPages > 1 && (
              <div className="hb-pagination">
                <span className="hb-pagination-info">
                  Página {currentPage} de {totalPages} · {totalUsers}{" "}
                  {totalUsers === 1 ? "usuário" : "usuários"}
                </span>
                {currentPage > 1 && (
                  <Link
                    href={buildUrl({ page: String(currentPage - 1) })}
                    className="hb-page-btn"
                    aria-label="Página anterior"
                  >
                    ‹
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (n) => (
                    <Link
                      key={n}
                      href={buildUrl({ page: String(n) })}
                      className={`hb-page-btn${currentPage === n ? " active" : ""}`}
                      aria-current={currentPage === n ? "page" : undefined}
                    >
                      {n}
                    </Link>
                  ),
                )}
                {currentPage < totalPages && (
                  <Link
                    href={buildUrl({ page: String(currentPage + 1) })}
                    className="hb-page-btn"
                    aria-label="Próxima página"
                  >
                    ›
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
