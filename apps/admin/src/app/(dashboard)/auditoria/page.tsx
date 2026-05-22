import { Suspense } from "react";
import { Download, ShieldAlert, AlertTriangle, RotateCcw } from "lucide-react";
import { mockAuditLog } from "../../../lib/mock-data";
import { AuditLogTable } from "../../../components/audit-log-table";
import { AuditLogSkeleton } from "../../../components/audit-log-skeleton";

// ─── Fade-in keyframe ─────────────────────────────────────────────────────────

const fadeInStyle = `@keyframes hb-fade-in { from { opacity: 0; } to { opacity: 1; } }`;

// ─── Error state ──────────────────────────────────────────────────────────────

function AuditError() {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "5rem 1.5rem",
        textAlign: "center",
        animation: "hb-fade-in 0.2s ease-out",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--color-destructive-muted)",
          color: "var(--color-destructive)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle size={20} />
      </div>
      <div>
        <p
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-foreground)",
          }}
        >
          Não foi possível carregar o registro de auditoria
        </p>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-muted-foreground)",
            marginTop: "0.25rem",
          }}
        >
          Verifique sua conexão e tente novamente.
        </p>
      </div>
      {/* GET form — clears query params and reloads, no JS required */}
      <form method="get">
        <button
          type="submit"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-primary-foreground)",
            backgroundColor: "var(--color-primary)",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Tentar novamente
        </button>
      </form>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function AuditEmpty() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "5rem 1.5rem",
        textAlign: "center",
        animation: "hb-fade-in 0.2s ease-out",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--color-primary-muted)",
          color: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ShieldAlert size={20} />
      </div>
      <p
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--color-foreground)",
        }}
      >
        Nenhum registro de auditoria encontrado.
      </p>
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-muted-foreground)",
          fontStyle: "italic",
          maxWidth: "24rem",
        }}
      >
        "Não há nada oculto que não venha a ser revelado"
        <br />— Lucas 8:17
      </p>
    </div>
  );
}

// ─── Audit content (async — ready for real data fetching) ─────────────────────

async function AuditContent() {
  const entries = mockAuditLog;

  if (entries.length === 0) {
    return <AuditEmpty />;
  }

  return (
    <div style={{ animation: "hb-fade-in 0.2s ease-out" }}>
      <AuditLogTable entries={entries} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;

  return (
    <>
      <style>{fadeInStyle}</style>
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

        {/* Content — skeleton while loading, error state on failure */}
        {state === "error" ? (
          <AuditError />
        ) : (
          <Suspense fallback={<AuditLogSkeleton />}>
            <AuditContent />
          </Suspense>
        )}
      </div>
    </>
  );
}
