"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import type { AuditLogEntry, AuditAction } from "@hebron/types/admin";

// ─── Config ───────────────────────────────────────────────────────────────────

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

const ACTION_LABELS: Record<AuditAction, string> = {
  "user.created": "Usuário criado",
  "user.updated": "Usuário atualizado",
  "user.suspended": "Usuário suspenso",
  "user.approved": "Usuário aprovado",
  "user.impersonated": "Impersonação",
  "role.granted": "Papel concedido",
  "role.revoked": "Papel revogado",
  "invitation.created": "Convite criado",
  "invitation.revoked": "Convite revogado",
  "setting.updated": "Config. atualizada",
  "feature_flag.toggled": "Flag alternada",
  "email_template.updated": "Template atualizado",
  "meeting.created": "Reunião criada",
  "meeting.updated": "Reunião atualizada",
  "designation.assigned": "Designação criada",
  "designation.revoked": "Designação revogada",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: "Usuário",
  invitation: "Convite",
  role_assignment: "Atribuição de papel",
  system_setting: "Configuração",
  feature_flag: "Feature flag",
  email_template: "Template de e-mail",
  meeting_session: "Reunião",
  designation: "Designação",
};

// Unique sorted actions from the type
const ALL_ACTIONS = Object.keys(ACTION_LABELS) as AuditAction[];

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

// ─── Columns ──────────────────────────────────────────────────────────────────

function buildColumns(): ColumnDef<AuditLogEntry>[] {
  return [
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Data/hora",
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-muted-foreground)",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
          }}
        >
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actorName",
      accessorKey: "actorName",
      header: "Ator",
      cell: ({ row }) => (
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-foreground)",
            whiteSpace: "nowrap",
          }}
        >
          {row.original.actorName}
        </span>
      ),
    },
    {
      id: "action",
      accessorKey: "action",
      header: "Ação",
      cell: ({ row }) => <ActionBadge action={row.original.action} />,
    },
    {
      id: "targetType",
      accessorKey: "targetType",
      header: "Entidade",
      cell: ({ row }) => (
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-muted-foreground)",
            backgroundColor: "var(--color-muted)",
            borderRadius: "var(--radius-full)",
            padding: "0.125rem 0.5rem",
            whiteSpace: "nowrap",
          }}
        >
          {row.original.targetType
            ? (TARGET_TYPE_LABELS[row.original.targetType] ??
              row.original.targetType)
            : "—"}
        </span>
      ),
    },
    {
      id: "targetId",
      header: "ID alvo",
      enableSorting: false,
      cell: ({ row }) => (
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-muted-foreground)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {row.original.targetId ?? "—"}
        </span>
      ),
    },
  ];
}

// ─── Action badge ─────────────────────────────────────────────────────────────

const ACTION_CATEGORY_COLORS: Record<string, string> = {
  user: "var(--color-primary-muted)",
  role: "#ede9fe",
  invitation: "var(--color-support-sky-muted)",
  setting: "var(--color-muted)",
  feature_flag: "var(--color-accent-muted)",
  email_template: "var(--color-muted)",
  meeting: "var(--color-support-green-muted)",
  designation: "#fef9c3",
};

function ActionBadge({ action }: { action: AuditAction }) {
  const category = action.split(".")[0] ?? "other";
  const bg = ACTION_CATEGORY_COLORS[category] ?? "var(--color-muted)";

  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: bg,
        color: "var(--color-foreground)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--font-weight-medium)",
        borderRadius: "var(--radius-full)",
        padding: "0.125rem 0.625rem",
        whiteSpace: "nowrap",
      }}
    >
      {ACTION_LABELS[action]}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditLogTable({ entries }: AuditLogTableProps) {
  const [actorSearch, setActorSearch] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState<AuditAction | "all">(
    "all",
  );
  const [entityFilter, setEntityFilter] = React.useState<string | "all">("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const columns = React.useMemo(() => buildColumns(), []);

  // Unique target types from data
  const uniqueEntityTypes = React.useMemo(() => {
    return Array.from(
      new Set(entries.map((e) => e.targetType).filter(Boolean)),
    ) as string[];
  }, [entries]);

  // Apply all filters manually
  const filteredEntries = React.useMemo(() => {
    return entries.filter((entry) => {
      if (
        actorSearch &&
        !entry.actorName.toLowerCase().includes(actorSearch.toLowerCase())
      ) {
        return false;
      }
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;
      if (entityFilter !== "all" && entry.targetType !== entityFilter)
        return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (entry.createdAt < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (entry.createdAt > to) return false;
      }
      return true;
    });
  }, [entries, actorSearch, actionFilter, entityFilter, dateFrom, dateTo]);

  const table = useReactTable({
    data: filteredEntries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const hasFilters =
    actorSearch !== "" ||
    actionFilter !== "all" ||
    entityFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  function clearFilters() {
    setActorSearch("");
    setActionFilter("all");
    setEntityFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        {/* Actor search */}
        <div
          style={{ position: "relative", flex: "1 1 12rem", minWidth: "9rem" }}
        >
          <Search
            size={15}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-muted-foreground)",
              pointerEvents: "none",
            }}
          />
          <Input
            placeholder="Buscar por ator…"
            value={actorSearch}
            onChange={(e) => setActorSearch(e.target.value)}
            style={{ paddingLeft: "2.25rem" }}
            aria-label="Filtrar por ator"
          />
        </div>

        {/* Action filter */}
        <div style={{ minWidth: "11rem" }}>
          <Select
            value={actionFilter}
            onValueChange={(v) => setActionFilter(v as AuditAction | "all")}
          >
            <SelectTrigger aria-label="Filtrar por ação">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {ALL_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {ACTION_LABELS[action]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entity filter */}
        <div style={{ minWidth: "10rem" }}>
          <Select
            value={entityFilter}
            onValueChange={(v) => setEntityFilter(v)}
          >
            <SelectTrigger aria-label="Filtrar por entidade">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              {uniqueEntityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {TARGET_TYPE_LABELS[type] ?? type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <label
              htmlFor="audit-date-from"
              style={{
                display: "block",
                fontSize: "var(--text-xs)",
                color: "var(--color-muted-foreground)",
                marginBottom: "0.25rem",
              }}
            >
              De
            </label>
            <input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                height: "2.5rem",
                padding: "0 0.75rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-input-bg)",
                fontSize: "var(--text-sm)",
                color: "var(--color-foreground)",
                outline: "none",
              }}
              aria-label="Data inicial"
            />
          </div>
          <div>
            <label
              htmlFor="audit-date-to"
              style={{
                display: "block",
                fontSize: "var(--text-xs)",
                color: "var(--color-muted-foreground)",
                marginBottom: "0.25rem",
              }}
            >
              Até
            </label>
            <input
              id="audit-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                height: "2.5rem",
                padding: "0 0.75rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-input-bg)",
                fontSize: "var(--text-sm)",
                color: "var(--color-foreground)",
                outline: "none",
              }}
              aria-label="Data final"
            />
          </div>
        </div>

        {/* Clear */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<X size={14} />}
            onClick={clearFilters}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Row count */}
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-muted-foreground)",
        }}
      >
        {rows.length} {rows.length === 1 ? "registro" : "registros"} encontrado
        {rows.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "var(--text-sm)",
          }}
          aria-label="Audit log"
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                style={{
                  backgroundColor: "var(--color-muted)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={{
                        padding: "0.625rem 0.875rem",
                        textAlign: "left",
                        fontWeight: "var(--font-weight-semibold)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-muted-foreground)",
                        whiteSpace: "nowrap",
                        cursor: isSortable ? "pointer" : "default",
                        userSelect: "none",
                      }}
                      aria-sort={
                        sortDir === "asc"
                          ? "ascending"
                          : sortDir === "desc"
                            ? "descending"
                            : isSortable
                              ? "none"
                              : undefined
                      }
                      onClick={
                        isSortable
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {isSortable && (
                          <span
                            aria-hidden="true"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {sortDir === "asc" ? (
                              <ChevronUp size={13} />
                            ) : sortDir === "desc" ? (
                              <ChevronDown size={13} />
                            ) : (
                              <ChevronsUpDown size={13} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "3rem 1rem",
                    textAlign: "center",
                    color: "var(--color-muted-foreground)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Nenhum registro encontrado para os filtros aplicados.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom:
                      i < rows.length - 1
                        ? "1px solid var(--color-border)"
                        : "none",
                    backgroundColor: "var(--color-background)",
                    transition: "background-color var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    (
                      e.currentTarget as HTMLTableRowElement
                    ).style.backgroundColor = "var(--color-muted)";
                  }}
                  onMouseLeave={(e) => {
                    (
                      e.currentTarget as HTMLTableRowElement
                    ).style.backgroundColor = "var(--color-background)";
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        padding: "0.625rem 0.875rem",
                        verticalAlign: "middle",
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
