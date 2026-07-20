"use client";

import * as React from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type FilterFn,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import type { Role } from "@hebron/types/roles";
import { ROLES } from "@hebron/types/roles";
import { RoleBadge } from "./role-badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  suspendedModules: string[];
  createdAt: Date;
}

export interface AdminRoleAssignmentRow {
  userId: string;
  role: Role;
}

type UserStatus = "active" | "suspended";

type UserRow = AdminUserRow & { roles: Role[]; status: UserStatus };

interface UserTableProps {
  users: AdminUserRow[];
  roleAssignments: AdminRoleAssignmentRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getStatus(suspendedModules: string[]): UserStatus {
  return suspendedModules.includes("global") ? "suspended" : "active";
}

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Ativo",
  suspended: "Suspenso",
};

const STATUS_CLASSES: Record<UserStatus, string> = {
  active: "hb-status-active",
  suspended: "hb-status-suspended",
};

const USER_STATUS_OPTIONS: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "active", label: "Ativo" },
  { value: "suspended", label: "Suspenso" },
];

// ─── Custom global filter: searches name + email ──────────────────────────────

const nameEmailFilter: FilterFn<UserRow> = (
  row,
  _columnId,
  filterValue: string,
) => {
  const q = filterValue.toLowerCase();
  return (
    (row.original.fullName ?? "").toLowerCase().includes(q) ||
    row.original.email.toLowerCase().includes(q)
  );
};

// ─── Columns ──────────────────────────────────────────────────────────────────

function buildColumns(): ColumnDef<UserRow>[] {
  return [
    {
      id: "user",
      accessorKey: "fullName",
      header: "Usuário",
      cell: ({ row }) => (
        <Link
          href={`/usuarios/${row.original.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            textDecoration: "none",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: "2rem",
              height: "2rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--brand-muted)",
              color: "var(--hb-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-weight-semibold)",
              overflow: "hidden",
            }}
          >
            {row.original.avatarUrl ? (
              <img
                src={row.original.avatarUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              getInitials(row.original.fullName)
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--fg)",
              }}
            >
              {row.original.fullName ?? row.original.email}
            </div>
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--fg-muted)",
              }}
            >
              {row.original.email}
            </div>
          </div>
        </Link>
      ),
    },
    {
      id: "roles",
      header: "Papéis",
      enableSorting: false,
      cell: ({ row }) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
          {row.original.roles.length === 0 ? (
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--fg-muted)",
              }}
            >
              —
            </span>
          ) : (
            row.original.roles.map((role) => (
              <RoleBadge key={role} role={role} size="sm" />
            ))
          )}
        </div>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`hb-badge ${STATUS_CLASSES[row.original.status]}`}>
          <span className="hb-badge-dot" />
          {STATUS_LABELS[row.original.status]}
        </span>
      ),
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Criado em",
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
          }}
        >
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserTable({ users, roleAssignments }: UserTableProps) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<UserStatus | "all">(
    "all",
  );
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  // Join roles + status into users
  const userRows: UserRow[] = React.useMemo(() => {
    return users.map((u) => ({
      ...u,
      roles: roleAssignments
        .filter((ra) => ra.userId === u.id)
        .map((ra) => ra.role),
      status: getStatus(u.suspendedModules),
    }));
  }, [users, roleAssignments]);

  // Pre-filter by role and status (TanStack handles text search via globalFilter)
  const filteredData: UserRow[] = React.useMemo(() => {
    return userRows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (roleFilter !== "all" && !row.roles.includes(roleFilter)) return false;
      return true;
    });
  }, [userRows, statusFilter, roleFilter]);

  const columns = React.useMemo(() => buildColumns(), []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter, sorting },
    globalFilterFn: nameEmailFilter,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Filters bar */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{ position: "relative", flex: "1 1 14rem", minWidth: "10rem" }}
        >
          <Search
            size={16}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--fg-muted)",
              pointerEvents: "none",
            }}
          />
          <Input
            placeholder="Buscar por nome ou e-mail…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            style={{ paddingLeft: "2.25rem" }}
            aria-label="Buscar usuários"
          />
        </div>

        <div style={{ minWidth: "9rem" }}>
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as Role | "all")}
          >
            <SelectTrigger aria-label="Filtrar por papel">
              <SelectValue placeholder="Papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os papéis</SelectItem>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div style={{ minWidth: "10rem" }}>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as UserStatus | "all")}
          >
            <SelectTrigger aria-label="Filtrar por status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {USER_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Result count */}
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--fg-muted)",
        }}
      >
        {rows.length} {rows.length === 1 ? "usuário" : "usuários"} encontrado
        {rows.length !== 1 ? "s" : ""}
      </p>

      {/* Scrollable table wrapper (mobile) */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "var(--text-sm)",
          }}
          aria-label="Tabela de usuários"
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                style={{
                  backgroundColor: "var(--surface-alt)",
                  borderBottom: "1px solid var(--border)",
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
                        color: "var(--fg-muted)",
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
                            style={{ color: "var(--fg-muted)" }}
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
                    color: "var(--fg-muted)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom:
                      i < rows.length - 1 ? "1px solid var(--border)" : "none",
                    backgroundColor: "var(--bg)",
                    transition: "background-color var(--transition-fast)",
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        padding: "0.75rem 0.875rem",
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

      {/* Clear filters */}
      {(globalFilter !== "" ||
        roleFilter !== "all" ||
        statusFilter !== "all") && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setGlobalFilter("");
              setRoleFilter("all");
              setStatusFilter("all");
            }}
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
