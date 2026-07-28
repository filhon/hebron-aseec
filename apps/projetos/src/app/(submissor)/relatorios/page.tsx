import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, ArrowRight, CheckCircle2 } from "lucide-react";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { getAuthUser, getSubmissorDashboard } from "../../../lib/queries";

export default async function RelatoriosPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect(CANONICAL_LOGIN_URL);

  const data = await getSubmissorDashboard(authUser.id);
  const pending = data.pendingReports;

  return (
    <div className="hb-page">
      <div style={{ marginBottom: 28 }}>
        <p
          className="hb-eyebrow"
          style={{ marginBottom: 8, color: "var(--hb-blue)" }}
        >
          Prestação de contas
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
          Relatórios
        </h1>
        <p style={{ color: "var(--fg-muted)", marginTop: 8, fontSize: 15 }}>
          Relatórios obrigatórios dos projetos aprovados em execução.
        </p>
      </div>

      {pending.length === 0 ? (
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
          <CheckCircle2
            width={40}
            height={40}
            style={{ color: "var(--hb-green)", margin: "0 auto 16px" }}
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
            Nenhum relatório pendente
          </p>
          <p
            style={{ fontSize: 14, color: "var(--fg-muted)", marginBottom: 20 }}
          >
            Todos os relatórios estão em dia.
          </p>
          <p
            style={{
              fontSize: 13,
              fontStyle: "italic",
              color: "var(--fg-subtle)",
            }}
          >
            "Aquele que é fiel no mínimo, também é fiel no muito." — Lc 16:10
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "8px 8px 12px",
          }}
        >
          <div style={{ padding: "16px 16px 12px" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                margin: 0,
                color: "var(--fg)",
              }}
            >
              Pendentes de envio
            </h2>
          </div>

          {pending.map((report, i) => {
            const dueDate = report.dueDate
              ? new Date(report.dueDate + "T12:00:00").toLocaleDateString(
                  "pt-BR",
                  { day: "2-digit", month: "long", year: "numeric" },
                )
              : null;

            return (
              <div key={report.id}>
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
                  href={`/${report.projectId}`}
                  className="hover:bg-(--bg-alt)"
                  style={{
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    padding: 16,
                    borderRadius: 16,
                    textDecoration: "none",
                    transition: "background-color 120ms",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: report.isOverdue
                        ? "var(--accent-tint-strong)"
                        : "var(--brand-tint)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileText
                      width={20}
                      height={20}
                      style={{
                        color: report.isOverdue
                          ? "var(--hb-orange-deep)"
                          : "var(--hb-blue)",
                      }}
                      aria-hidden
                    />
                  </div>
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
                      {report.projectTitle}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--fg-muted)",
                        marginTop: 2,
                      }}
                    >
                      {report.isOverdue ? "Em atraso" : "Vence em breve"}
                      {dueDate ? ` · ${dueDate}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--hb-blue)",
                      fontWeight: 600,
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    Enviar
                    <ArrowRight width={15} height={15} aria-hidden />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
