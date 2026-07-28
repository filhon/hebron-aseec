import Link from "next/link";
import { AlertCircle, ArrowRight, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import {
  getAuthUser,
  getSubmissorDashboard,
  type DashboardProject,
  type DashboardPayment,
  type DashboardReport,
  type DashboardInstitutionBudget,
} from "../../lib/queries";
import { BRL, STAGE_LABELS, getStageBadge } from "../../lib/stage-utils";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtMil(n: number) {
  if (n >= 1000) return `R$ ${Math.round(n / 1000)} mil`;
  return BRL.format(n);
}

function executionProgress(p: DashboardProject): number | null {
  if (p.stage !== "em_execucao") return null;
  if (p.totalSchedules === 0) return null;
  return Math.round((p.paidCount / p.totalSchedules) * 100);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function SubmissorDashboard() {
  const authUser = await getAuthUser();
  if (!authUser) redirect(CANONICAL_LOGIN_URL);

  const data = await getSubmissorDashboard(authUser.id);

  const activeProjects = data.projects.filter((p) =>
    ["em_execucao", "aprovado", "homologacao", "votacao", "validacao"].includes(
      p.stage,
    ),
  );

  const emAvaliacao = data.projects.filter((p) =>
    ["validacao", "votacao", "homologacao"].includes(p.stage),
  );

  const emVotacaoCount = data.projects.filter(
    (p) => p.stage === "votacao",
  ).length;

  const pendingReports = data.pendingReports;

  // Card-resumo no topo só faz sentido para uma instituição só: com N
  // instituições, apresentar o teto da primeira como se fosse "o do
  // usuário" é exatamente o desencontro que este prompt corrige (P-2.3c).
  // Com mais de uma, o detalhe fica só na seção "Orçamento" por instituição.
  const soleInstitution =
    data.institutions.length === 1 ? data.institutions[0] : null;

  const institutionName = data.institutions[0]?.nome ?? null;

  const fullName = authUser.fullName;
  const firstName = fullName
    ? (() => {
        const parts = fullName.split(" ");
        return parts.length >= 2 &&
          /^(Pr\.|Ev\.|Dir\.|Pastor|Diac\.)$/.test(parts[0] ?? "")
          ? `${parts[0]} ${parts[1]}`
          : (parts[0] ?? fullName);
      })()
    : null;

  const relPart =
    pendingReports.length > 0
      ? `${pendingReports.length} relatório${pendingReports.length > 1 ? "s" : ""} a vencer`
      : null;
  const votPart =
    emVotacaoCount > 0
      ? `${emVotacaoCount} projeto${emVotacaoCount > 1 ? "s" : ""} em votação`
      : null;

  const currentYear = new Date().getFullYear();

  return (
    <div className="hb-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: 28,
        }}
      >
        <div>
          {institutionName && (
            <p
              className="hb-eyebrow"
              style={{ marginBottom: 8, color: "var(--hb-blue)" }}
            >
              {institutionName}
            </p>
          )}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(24px, 3vw, 30px)",
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: "-0.01em",
              color: "var(--fg)",
            }}
          >
            {firstName ? `Graça e paz, ${firstName}.` : "Graça e paz."}
          </h1>

          {(relPart ?? votPart) ? (
            <p style={{ color: "var(--fg-muted)", marginTop: 8, fontSize: 15 }}>
              Você tem{" "}
              {relPart && (
                <strong style={{ color: "var(--fg)" }}>{relPart}</strong>
              )}
              {relPart && votPart && " e "}
              {votPart && (
                <strong style={{ color: "var(--fg)" }}>{votPart}</strong>
              )}{" "}
              nesta semana.
            </p>
          ) : (
            <p style={{ color: "var(--fg-muted)", marginTop: 8, fontSize: 15 }}>
              Acompanhe seus projetos e relatórios.
            </p>
          )}
        </div>

        <Link
          href="/novo"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            background: "var(--hb-orange)",
            color: "var(--fg-invert)",
            textDecoration: "none",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 15,
            padding: "13px 22px",
            borderRadius: "var(--radius-pill)",
            boxShadow: "var(--shadow-sm)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Submeter novo projeto
          <ArrowRight width={18} height={18} aria-hidden />
        </Link>
      </div>

      {/* ── 4 Stats cards ─────────────────────────────────────────────────── */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 ${
          soleInstitution ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        <StatCard
          dot="var(--hb-blue)"
          label="Projetos ativos"
          value={activeProjects.length}
          sub={`${activeProjects.filter((p) => p.stage === "em_execucao").length} em execução · ${activeProjects.filter((p) => p.stage === "aprovado").length} aprovado`}
        />
        <StatCard
          dot="var(--hb-cyan)"
          label="Em avaliação"
          value={emAvaliacao.length}
          sub={
            emAvaliacao.length > 0
              ? "Votação ou validação aberta"
              : "Nenhum em processo"
          }
        />
        <StatCard
          dot="var(--hb-orange)"
          label="Relatórios pendentes"
          value={pendingReports.length}
          valueColor={
            pendingReports.length > 0 ? "var(--hb-orange-deep)" : undefined
          }
          sub={
            pendingReports.length === 0
              ? "Todos em dia"
              : `${pendingReports.length > 1 ? "Vencem" : "Vence"} em breve`
          }
        />
        {soleInstitution &&
          (soleInstitution.limit !== null ? (
            <StatCard
              dot="var(--hb-green)"
              label="Orçamento disponível"
              valueFmt={fmtMil(
                Math.max(0, soleInstitution.limit - soleInstitution.committed),
              )}
              sub={`de ${fmtMil(soleInstitution.limit)} no ano`}
              compact
            />
          ) : (
            <StatCard
              dot="var(--hb-green)"
              label="Orçamento comprometido"
              valueFmt={fmtMil(soleInstitution.committed)}
              sub="Sem teto definido"
              compact
            />
          ))}
      </div>

      {/* ── Main 2-col layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 items-start">
        {/* ── Left: Meus projetos ─────────────────────────────────────────── */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "8px 8px 12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 16px 12px",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 18,
                margin: 0,
                color: "var(--fg)",
              }}
            >
              Meus projetos
            </h2>
          </div>

          {data.projects.length === 0 ? (
            <EmptyProjects />
          ) : (
            data.projects.map((p, i) => {
              const badge = getStageBadge(p.stage);
              const progress = executionProgress(p);
              const paidStr =
                p.stage === "em_execucao" && p.totalSchedules > 0
                  ? `parcela ${p.paidCount} de ${p.parcelas ?? p.totalSchedules}`
                  : null;

              const metaParts = [
                p.tipo === "anual" ? "Projeto anual" : "Projeto pontual",
                p.orgNome,
                paidStr,
              ].filter(Boolean);

              return (
                <div key={p.id}>
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
                    href={`/${p.id}`}
                    className="hover:bg-(--bg-alt)"
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      padding: 16,
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                      transition: "background-color 120ms",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 600,
                            fontSize: 16,
                            color: "var(--fg)",
                          }}
                        >
                          {p.titulo}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            padding: "3px 9px",
                            borderRadius: "var(--radius-pill)",
                            background: badge.bg,
                            color: badge.text,
                            flexShrink: 0,
                          }}
                        >
                          {STAGE_LABELS[p.stage]}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--fg-muted)",
                          marginTop: 4,
                          marginBottom: 0,
                        }}
                      >
                        {metaParts.join(" · ")}
                      </p>

                      {progress !== null && (
                        <div
                          style={{
                            height: 6,
                            background: "var(--surface-alt)",
                            borderRadius: "var(--radius-pill)",
                            marginTop: 10,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${progress}%`,
                              height: "100%",
                              background: "var(--hb-green)",
                              borderRadius: "var(--radius-pill)",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: 16,
                          color: "var(--fg)",
                        }}
                      >
                        {BRL.format(p.budgetTotal)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                        {progress !== null
                          ? `${progress}% executado`
                          : "valor solicitado"}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </section>

        {/* ── Right: pagamentos + orçamento + alerta ─────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Próximos pagamentos */}
          <section
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)",
              padding: 20,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                margin: "0 0 14px",
                color: "var(--fg)",
              }}
            >
              Próximos pagamentos
            </h2>

            {data.upcomingPayments.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                Nenhum pagamento previsto nos próximos meses.
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {data.upcomingPayments.map((pay, i) => (
                  <UpcomingPaymentRow key={pay.id} pay={pay} dim={i > 0} />
                ))}
              </div>
            )}
          </section>

          {/* Orçamento por instituição — nomeia sempre a instituição a que
              se refere (P-2.3c: nunca apresentar o teto da primeira como se
              fosse o do usuário quando há mais de uma). */}
          {data.institutions.map((inst) => (
            <InstitutionBudgetCard
              key={inst.id}
              inst={inst}
              year={currentYear}
            />
          ))}

          {/* Relatório pendente alert */}
          {pendingReports.length > 0 && (
            <PendingReportAlert report={pendingReports[0]} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InstitutionBudgetCard({
  inst,
  year,
}: {
  inst: DashboardInstitutionBudget;
  year: number;
}) {
  const pctComprometido =
    inst.limit !== null
      ? Math.min(100, Math.round((inst.committed / inst.limit) * 100))
      : null;

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: 20,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 16,
          margin: "0 0 6px",
          color: "var(--fg)",
        }}
      >
        Orçamento — {inst.nome}
      </h2>
      <p
        style={{
          fontSize: 12,
          color: "var(--fg-muted)",
          marginBottom: 14,
        }}
      >
        Ano-calendário {year}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 26,
            color: "var(--fg)",
          }}
        >
          {fmtMil(inst.committed)}
        </span>
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
          {inst.limit !== null ? `de ${fmtMil(inst.limit)}` : "comprometido"}
        </span>
      </div>

      {pctComprometido !== null && (
        <div
          style={{
            height: 10,
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-pill)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pctComprometido}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, var(--hb-blue), var(--hb-cyan))",
              borderRadius: "var(--radius-pill)",
            }}
          />
        </div>
      )}

      <p
        style={{
          fontSize: 12,
          color: "var(--fg-muted)",
          marginTop: 10,
        }}
      >
        {pctComprometido !== null ? (
          <>
            {pctComprometido}% comprometido.
            {pctComprometido >= 90 &&
              " Acima do teto, a submissão é bloqueada — contate o administrador."}
          </>
        ) : (
          "Nenhum teto definido para esta instituição."
        )}
      </p>
    </section>
  );
}

function StatCard({
  dot,
  label,
  value,
  valueFmt,
  valueColor,
  sub,
  compact = false,
}: {
  dot: string;
  label: string;
  value?: number;
  valueFmt?: string;
  valueColor?: string;
  sub: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--fg-muted)",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "var(--radius-pill)",
            background: dot,
            flexShrink: 0,
          }}
        />
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: compact ? 30 : 38,
          lineHeight: 1,
          marginTop: compact ? 14 : 12,
          color: valueColor ?? "var(--fg)",
          whiteSpace: "nowrap",
        }}
      >
        {valueFmt ?? value}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 6 }}>
        {sub}
      </div>
    </div>
  );
}

function UpcomingPaymentRow({
  pay,
  dim,
}: {
  pay: DashboardPayment;
  dim: boolean;
}) {
  const due = new Date(pay.dueDate + "T12:00:00");
  const day = due.getDate();
  const monthAbbr = due
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "");
  const shortTitle = pay.projectTitle.split(" ").slice(0, 3).join(" ");
  const label = `Parcela ${pay.parcelNum}/${pay.parcelTotal ?? "?"} · ${shortTitle}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: dim ? 0.62 : 1,
      }}
    >
      <div style={{ width: 42, flexShrink: 0, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
            lineHeight: 1,
            color: "var(--fg)",
          }}
        >
          {day}
        </div>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--fg-muted)",
          }}
        >
          {monthAbbr}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--fg)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
          {dim ? "previsto" : "último dia útil do mês"}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 14,
          color: "var(--fg)",
          flexShrink: 0,
        }}
      >
        {BRL.format(pay.amount)}
      </div>
    </div>
  );
}

function PendingReportAlert({
  report,
}: {
  report: DashboardReport | undefined;
}) {
  if (!report) return null;
  const dueDate = report.dueDate
    ? new Date(report.dueDate + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
      })
    : null;

  return (
    <section
      style={{
        background: "var(--accent-tint)",
        border: "1px solid var(--accent-tint-border)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--hb-orange-deep)",
          fontWeight: 700,
          fontSize: 13,
          marginBottom: 6,
        }}
      >
        <AlertCircle width={16} height={16} aria-hidden />
        {report.isOverdue ? "Relatório em atraso" : "Relatório pendente"}
      </div>
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--fg)",
          margin: 0,
        }}
      >
        {report.projectTitle}
      </p>
      <p
        style={{
          fontSize: 12,
          color: "var(--fg-muted)",
          margin: "4px 0 14px",
        }}
      >
        {report.isOverdue ? "Em atraso" : "Vence em breve"}
        {dueDate ? ` · ${dueDate}` : ""}
      </p>
      <Link
        href={`/${report.projectId}`}
        style={{
          display: "block",
          width: "100%",
          textAlign: "center",
          background: "var(--hb-blue)",
          color: "var(--fg-invert)",
          textDecoration: "none",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 14,
          padding: 11,
          borderRadius: "var(--radius-pill)",
        }}
      >
        Enviar relatório
      </Link>
    </section>
  );
}

function EmptyProjects() {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--fg-muted)",
      }}
    >
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 6,
          color: "var(--fg)",
        }}
      >
        Você ainda não submeteu nenhum projeto
      </p>
      <p style={{ fontSize: 13, marginBottom: 16 }}>
        Projetos submetidos aparecem aqui para acompanhamento.
      </p>
      <p
        style={{
          fontSize: 12,
          fontStyle: "italic",
          color: "var(--fg-subtle)",
          marginBottom: 20,
        }}
      >
        "Comprometei ao Senhor o vosso caminho; confia nele, e ele agirá." — Sl
        37:5
      </p>
      <Link
        href="/novo"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "var(--hb-blue)",
          color: "var(--fg-invert)",
          textDecoration: "none",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 14,
          padding: "10px 20px",
          borderRadius: "var(--radius-pill)",
        }}
      >
        Submeter meu primeiro projeto
        <ChevronRight width={16} height={16} aria-hidden />
      </Link>
    </div>
  );
}
