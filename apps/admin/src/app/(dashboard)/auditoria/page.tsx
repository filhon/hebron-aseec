import { Suspense } from "react";
import { db } from "@hebron/db/client";
import {
  eq,
  desc,
  count,
  sql,
  and,
  or,
  ilike,
  gte,
  lte,
  lt,
  type SQL,
} from "drizzle-orm";
import type { AuditLog } from "@hebron/db/schema";
import { users } from "@hebron/db/schema";
import { auditLog } from "@hebron/db/schema";
import { ShieldAlert, FileText, RotateCcw } from "lucide-react";
import { ErrorState, Button } from "@hebron/ui";
import { AuditLogFilters } from "../../../components/audit-log-filters";
import {
  AuditLogExport,
  type AuditLogEntry,
} from "../../../components/audit-log-export";
import { AuditLogSkeleton } from "../../../components/audit-log-skeleton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffMin < 2) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD === 1) return "ontem";
  return `há ${diffD} dias`;
}

function isImpersonation(action: string): boolean {
  return action.startsWith("user.impersonated");
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCardSmall({
  label,
  value,
  dot,
}: {
  label: string;
  value: string | number;
  dot: string;
}) {
  return (
    <div className="hb-stat" style={{ padding: "16px 18px" }}>
      <div
        className="hb-stat-dot"
        style={{ background: dot, width: 48, height: 48 }}
      />
      <div className="hb-stat-label" style={{ fontSize: 11.5 }}>
        {label}
      </div>
      <div className="hb-stat-value" style={{ fontSize: 30 }}>
        {value}
      </div>
    </div>
  );
}

// ─── Audit Content ────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

interface AuditContentProps {
  actor?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  /** Pilha de cursores das páginas já visitadas ("Anterior" faz pop). */
  stack: string[];
  /** Cursor da página atual: "<createdAt ISO>_<id>" da última linha da página anterior. */
  cursor?: string;
}

// Paginação por keyset sobre (created_at, id) — D4-003: o teto rígido de 500
// linhas tornava inalcançável qualquer registro além dos poucos dias mais
// recentes, contradizendo BRAIN §6.1 ("audit logs pesquisáveis com filtros
// avançados"). (created_at, id) em vez de só created_at porque a tabela é
// particionada por mês e pode ter timestamps empatados no mesmo milissegundo
// — id como desempate evita pular ou repetir linha na virada de página.
function parseCursor(
  raw: string | undefined,
): { createdAt: Date; id: string } | null {
  if (!raw) return null;
  const sep = raw.lastIndexOf("_");
  if (sep < 0) return null;
  const createdAt = new Date(raw.slice(0, sep));
  const id = raw.slice(sep + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return `${row.createdAt.toISOString()}_${row.id}`;
}

async function AuditContent({
  actor,
  action,
  entity,
  from,
  to,
  stack,
  cursor,
}: AuditContentProps) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Build WHERE conditions for filters
  const conditions: SQL[] = [];
  if (actor) conditions.push(ilike(users.fullName, `%${actor}%`));
  if (action)
    conditions.push(eq(auditLog.action, action as AuditLog["action"]));
  if (entity) conditions.push(ilike(auditLog.entity, `%${entity}%`));
  if (from) conditions.push(gte(auditLog.createdAt, new Date(from)));
  if (to) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLog.createdAt, toEnd));
  }

  const parsedCursor = parseCursor(cursor);
  if (parsedCursor) {
    conditions.push(
      or(
        lt(auditLog.createdAt, parsedCursor.createdAt),
        and(
          eq(auditLog.createdAt, parsedCursor.createdAt),
          lt(auditLog.id, parsedCursor.id),
        ),
      ) as SQL,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [entriesPlusOne, statsRows] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorId: auditLog.actorId,
        actorName: users.fullName,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        diff: auditLog.diff,
        ip: auditLog.ip,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .innerJoin(users, eq(auditLog.actorId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(PAGE_SIZE + 1),

    db
      .select({
        total: count(),
        todayCount: sql<number>`count(case when ${auditLog.createdAt} >= ${todayStart.toISOString()}::timestamptz then 1 end)::int`,
        impersonations: sql<number>`count(case when ${auditLog.action} = 'user.impersonated' then 1 end)::int`,
      })
      .from(auditLog),
  ]);

  const hasNextPage = entriesPlusOne.length > PAGE_SIZE;
  const entries = entriesPlusOne.slice(0, PAGE_SIZE);
  const lastEntry = entries[entries.length - 1];
  const nextCursor = hasNextPage && lastEntry ? encodeCursor(lastEntry) : null;

  const stats = statsRows[0] ?? { total: 0, todayCount: 0, impersonations: 0 };
  const isFiltered = !!(actor || action || entity || from || to);

  if (entries.length === 0) {
    return (
      <div className="hb-card">
        <div className="hb-empty">
          <div className="hb-empty-icon">
            <ShieldAlert size={22} aria-hidden="true" />
          </div>
          <b>
            {isFiltered
              ? "Nenhum registro encontrado para estes filtros."
              : "Nenhum registro de auditoria encontrado."}
          </b>
          <div className="hb-empty-quote">
            "Não há nada oculto que não venha a ser revelado"
            <cite className="hb-empty-cite">— Lucas 8:17</cite>
          </div>
        </div>
      </div>
    );
  }

  // Serialize for export (dates must be passed as serializable values)
  const exportEntries: AuditLogEntry[] = entries.map((e) => ({
    id: e.id,
    action: e.action,
    actorId: e.actorId,
    actorName: e.actorName,
    entity: e.entity,
    entityId: e.entityId,
    diff: e.diff,
    ip: e.ip,
    createdAt: e.createdAt,
  }));

  return (
    <>
      {/* Stats */}
      {!isFiltered && (
        <div className="hb-grid hb-grid-4" style={{ marginBottom: 22 }}>
          <StatCardSmall
            label="Eventos hoje"
            value={stats.todayCount ?? 0}
            dot="var(--hb-blue)"
          />
          <StatCardSmall
            label="Total de eventos"
            value={stats.total}
            dot="var(--hb-cyan)"
          />
          <StatCardSmall
            label="Impersonações"
            value={stats.impersonations ?? 0}
            dot="var(--hb-orange)"
          />
          <StatCardSmall
            label="Falhas de login"
            value="—"
            dot="var(--hb-green)"
          />
        </div>
      )}

      {/* Filtered result count */}
      {isFiltered && (
        <div
          style={{
            marginBottom: 14,
            fontSize: 13,
            color: "var(--fg-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            <b style={{ color: "var(--fg)" }}>{entries.length}</b> registro
            {entries.length !== 1 ? "s" : ""} encontrado
            {entries.length !== 1 ? "s" : ""}
          </span>
          <AuditLogExport entries={exportEntries} />
        </div>
      )}

      {/* Table */}
      <div className="hb-card" style={{ overflow: "hidden" }}>
        <table className="hb-tbl" aria-label="Trilha de auditoria">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Quando</th>
              <th>Ator</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th style={{ width: 120 }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const imp = isImpersonation(entry.action);
              return (
                <tr key={entry.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 13, color: "var(--fg)" }}>
                      {formatDateTime(entry.createdAt)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--fg-muted)",
                        marginTop: 2,
                      }}
                    >
                      {formatRelative(entry.createdAt)}
                    </div>
                  </td>
                  <td
                    style={{
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: "var(--fg)",
                    }}
                  >
                    {entry.actorName ?? "—"}
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: "ui-monospace,monospace",
                        fontSize: 11.5,
                        background: imp
                          ? "rgba(234,90,6,0.12)"
                          : "var(--bg-alt)",
                        color: imp ? "var(--hb-orange-deep)" : "var(--fg)",
                        padding: "2px 8px",
                        borderRadius: 6,
                        display: "inline-block",
                      }}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td
                    style={{
                      fontSize: 13,
                      color: imp ? "var(--hb-red-deep)" : "var(--fg)",
                      maxWidth: 360,
                    }}
                  >
                    <span style={{ color: "var(--fg-muted)" }}>
                      {entry.entity}
                    </span>
                    {entry.entityId && (
                      <span
                        style={{
                          fontFamily: "ui-monospace,monospace",
                          fontSize: 11,
                          color: "var(--fg-subtle)",
                          marginLeft: 6,
                        }}
                      >
                        {entry.entityId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      fontFamily: "ui-monospace,monospace",
                      fontSize: 11.5,
                      color: "var(--fg-muted)",
                    }}
                  >
                    {entry.ip ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pager — keyset (created_at, id). `stack` guarda o cursor de cada
          página já visitada antes da atual (a página 1 nunca entra na pilha,
          já que ela não usa cursor nenhum), permitindo "Anterior" sem reler
          do início. */}
      {(cursor || nextCursor) && (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          {cursor && (
            <form method="get">
              {actor && <input type="hidden" name="actor" value={actor} />}
              {action && <input type="hidden" name="action" value={action} />}
              {entity && <input type="hidden" name="entity" value={entity} />}
              {from && <input type="hidden" name="from" value={from} />}
              {to && <input type="hidden" name="to" value={to} />}
              {stack.slice(0, -1).map((c) => (
                <input key={c} type="hidden" name="stack" value={c} />
              ))}
              {stack.length > 0 && (
                <input
                  type="hidden"
                  name="cursor"
                  value={stack[stack.length - 1]}
                />
              )}
              <Button variant="ghost" size="sm" type="submit">
                ← Anterior
              </Button>
            </form>
          )}
          {nextCursor && (
            <form method="get">
              {actor && <input type="hidden" name="actor" value={actor} />}
              {action && <input type="hidden" name="action" value={action} />}
              {entity && <input type="hidden" name="entity" value={entity} />}
              {from && <input type="hidden" name="from" value={from} />}
              {to && <input type="hidden" name="to" value={to} />}
              {stack.map((c) => (
                <input key={c} type="hidden" name="stack" value={c} />
              ))}
              {cursor && <input type="hidden" name="stack" value={cursor} />}
              <input type="hidden" name="cursor" value={nextCursor} />
              <Button variant="ghost" size="sm" type="submit">
                Próxima →
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Footer note */}
      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "var(--fg-muted)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ShieldAlert size={13} aria-hidden="true" />A trilha é imutável — apenas{" "}
        <b>super_admin</b> pode visualizar. Particionada por mês em{" "}
        <code style={{ fontFamily: "ui-monospace,monospace", fontSize: 11 }}>
          admin.audit_log
        </code>
        .
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    actor?: string;
    action?: string;
    entity?: string;
    from?: string;
    to?: string;
    cursor?: string;
    stack?: string | string[];
  }>;
}) {
  const { state, actor, action, entity, from, to, cursor, stack } =
    await searchParams;
  const stackArr =
    stack === undefined ? [] : Array.isArray(stack) ? stack : [stack];

  return (
    <div className="hb-page">
      {/* Header */}
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">Trilha imutável · LGPD compliant</div>
          <h1 className="hb-page-title">Auditoria</h1>
          <p className="hb-page-subtitle">
            Toda mutação no ecossistema é registrada com ator, ação, entidade e
            IP. Particionado por mês — imutável por design.
          </p>
        </div>
        <div className="hb-page-header-actions">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="rounded-full"
          >
            <FileText size={14} aria-hidden="true" />
            JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AuditLogFilters />

      {state === "error" ? (
        <ErrorState
          title="Não foi possível carregar o registro de auditoria"
          description="Verifique sua conexão e tente novamente."
          action={
            <form method="get">
              <Button
                type="submit"
                leftIcon={<RotateCcw size={14} aria-hidden="true" />}
              >
                Tentar novamente
              </Button>
            </form>
          }
        />
      ) : (
        <Suspense fallback={<AuditLogSkeleton />}>
          <AuditContent
            actor={actor}
            action={action}
            entity={entity}
            from={from}
            to={to}
            stack={stackArr}
            cursor={cursor}
          />
        </Suspense>
      )}
    </div>
  );
}
