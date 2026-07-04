import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, ChevronRight } from "lucide-react";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { getAuthUser, getDirectorReportsOverview } from "../../../lib/queries";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  submitted: "Aguardando revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pendente: { bg: "var(--hb-gray-50)", text: "var(--hb-gray-400)" },
  submitted: { bg: "var(--brand-muted)", text: "var(--hb-blue)" },
  approved: { bg: "var(--hb-green-muted)", text: "var(--hb-green-fg)" },
  rejected: {
    bg: "var(--color-destructive-muted)",
    text: "var(--color-destructive)",
  },
};

export default async function RelatoriosDiretoriaPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect(CANONICAL_LOGIN_URL);

  const reports = await getDirectorReportsOverview();
  const pendingReview = reports.filter((r) => r.status === "submitted");
  const others = reports.filter((r) => r.status !== "submitted");

  return (
    <div className="hb-page">
      <div style={{ marginBottom: 28 }}>
        <p
          className="hb-eyebrow"
          style={{ marginBottom: 8, color: "var(--hb-blue)" }}
        >
          Análise
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(22px, 3vw, 28px)",
            lineHeight: 1.1,
            margin: 0,
            color: "var(--fg)",
          }}
        >
          Relatórios da Diretoria
        </h1>
        <p style={{ color: "var(--fg-muted)", marginTop: 8, fontSize: 15 }}>
          Consolidado de relatórios recebidos e pendências por projeto.
          Solicitar novos relatórios e revisar submissões acontece na página de
          cada projeto no pipeline.
        </p>
      </div>

      {reports.length === 0 ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "64px 32px",
            textAlign: "center",
          }}
        >
          <BarChart3
            width={40}
            height={40}
            style={{ color: "var(--fg-subtle)", margin: "0 auto 16px" }}
            aria-hidden
          />
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--fg)",
              marginBottom: 6,
            }}
          >
            Nenhum relatório solicitado ainda
          </p>
          <p
            style={{ fontSize: 14, color: "var(--fg-muted)", marginBottom: 20 }}
          >
            Relatórios aparecem aqui assim que forem solicitados a um projeto em
            execução.
          </p>
          <p
            style={{
              fontSize: 13,
              fontStyle: "italic",
              color: "var(--fg-subtle)",
            }}
          >
            "Seja diligente para te apresentares aprovado a Deus." — 2Tm 2:15
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {pendingReview.length > 0 && (
            <section>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "var(--fg)",
                  marginBottom: 12,
                }}
              >
                Aguardando Revisão ({pendingReview.length})
              </h2>
              <ReportList rows={pendingReview} />
            </section>
          )}

          <section>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--fg)",
                marginBottom: 12,
              }}
            >
              Demais Relatórios
            </h2>
            <ReportList rows={others} />
          </section>
        </div>
      )}
    </div>
  );
}

function ReportList({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getDirectorReportsOverview>>;
}) {
  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--fg-muted)" }}>
        Nenhum item nesta categoria.
      </p>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "8px 8px 12px",
      }}
    >
      {rows.map((r, i) => {
        const meta = STATUS_COLOR[r.status] ??
          STATUS_COLOR.pendente ?? {
            bg: "var(--hb-gray-50)",
            text: "var(--hb-gray-400)",
          };
        return (
          <div key={r.id}>
            {i > 0 && (
              <div
                style={{
                  height: 1,
                  background: "var(--divider)",
                  margin: "0 16px",
                }}
              />
            )}
            <Link
              href={`/pipeline/${r.projectId}`}
              className="hover:bg-(--bg-alt)"
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                padding: 16,
                borderRadius: 16,
                textDecoration: "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 15,
                    color: "var(--fg)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.projectTitle}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--fg-muted)",
                    marginTop: 2,
                  }}
                >
                  {r.orgNome}
                  {r.dueDate ? ` · prazo ${r.dueDate}` : ""}
                </div>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: meta.bg,
                  color: meta.text,
                }}
              >
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
              <ChevronRight
                width={16}
                height={16}
                style={{ color: "var(--fg-muted)", flexShrink: 0 }}
                aria-hidden
              />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
