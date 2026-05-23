import { Suspense } from "react";
import { Download, ShieldAlert, RotateCcw } from "lucide-react";
import { PageHeader, EmptyState, ErrorState, Button } from "@hebron/ui";
import { mockAuditLog } from "../../../lib/mock-data";
import { AuditLogTable } from "../../../components/audit-log-table";
import { AuditLogSkeleton } from "../../../components/audit-log-skeleton";

// ─── Fade-in keyframe ─────────────────────────────────────────────────────────

const fadeInStyle = `@keyframes hb-fade-in { from { opacity: 0; } to { opacity: 1; } }`;

// ─── Audit content (async — ready for real data fetching) ─────────────────────

async function AuditContent() {
  const entries = mockAuditLog;

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nenhum registro de auditoria encontrado."
        icon={ShieldAlert}
        quote={{
          text: "Não há nada oculto que não venha a ser revelado",
          reference: "Lucas 8:17",
        }}
      />
    );
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
        <PageHeader
          title="Auditoria"
          description="Registro imutável de todas as ações administrativas"
          actions={
            <Button
              variant="outline"
              leftIcon={<Download size={15} aria-hidden="true" />}
            >
              Exportar CSV
            </Button>
          }
        />

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
            <AuditContent />
          </Suspense>
        )}
      </div>
    </>
  );
}
