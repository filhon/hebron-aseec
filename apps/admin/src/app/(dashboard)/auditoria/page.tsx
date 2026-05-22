import { Download } from "lucide-react";
import { mockAuditLog } from "../../../lib/mock-data";
import { AuditLogTable } from "../../../components/audit-log-table";

export default function AuditoriaPage() {
  return (
    <div
      style={{
        padding: "1.5rem",
        maxWidth: "72rem",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-foreground)",
            }}
          >
            Auditoria
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-muted-foreground)",
              marginTop: "0.25rem",
            }}
          >
            Registro imutável de todas as ações administrativas
          </p>
        </div>

        <button
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-foreground)",
            backgroundColor: "transparent",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            cursor: "pointer",
          }}
        >
          <Download size={15} aria-hidden="true" />
          Exportar CSV
        </button>
      </div>

      <AuditLogTable entries={mockAuditLog} />
    </div>
  );
}
