"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@hebron/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string | null;
  entity: string;
  entityId: string | null;
  diff: unknown;
  ip: string | null;
  createdAt: Date;
}

export interface AuditLogExportProps {
  entries: AuditLogEntry[];
  /** Optional filename prefix. Defaults to "audit-log". */
  filenamePrefix?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditLogExport({
  entries,
  filenamePrefix = "audit-log",
}: AuditLogExportProps) {
  const [exporting, setExporting] = React.useState(false);

  function handleExport() {
    setExporting(true);
    try {
      const csv = buildCsv(entries);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `${filenamePrefix}-${date}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting || entries.length === 0}
      className="rounded-full border-(--brand) text-(--brand)"
      title={
        entries.length === 0
          ? "Sem dados para exportar"
          : `Exportar ${entries.length} registros`
      }
    >
      <Download size={14} aria-hidden="true" />
      {exporting ? "Exportando…" : "Exportar CSV"}
    </Button>
  );
}

// ─── CSV builder ─────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  "id",
  "timestamp",
  "ator_id",
  "ator_nome",
  "acao",
  "entidade",
  "entidade_id",
  "ip",
  "diff",
] as const;

function buildCsv(entries: AuditLogEntry[]): string {
  const rows: string[] = [CSV_HEADERS.join(",")];

  for (const e of entries) {
    rows.push(
      [
        csvCell(e.id),
        csvCell(e.createdAt.toISOString()),
        csvCell(e.actorId),
        csvCell(e.actorName ?? ""),
        csvCell(e.action),
        csvCell(e.entity),
        csvCell(e.entityId ?? ""),
        csvCell(e.ip ?? ""),
        csvCell(e.diff ? JSON.stringify(e.diff) : ""),
      ].join(","),
    );
  }

  return rows.join("\r\n");
}

function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  // Quote if value contains comma, quote, newline
  return /[,"\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}
