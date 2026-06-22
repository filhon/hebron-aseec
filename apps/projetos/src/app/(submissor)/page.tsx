import Link from "next/link";
import { AlertCircle, ArrowRight, ChevronRight } from "lucide-react";
import { mockProjects, mockReports } from "../../lib/mock-data";
import type { AnnualProject } from "@hebron/types";

// ─── Formatters ───────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function fmtMil(n: number) {
  if (n >= 1000) return `R$ ${Math.round(n / 1000)} mil`;
  return BRL.format(n);
}

// ─── Mock user data ───────────────────────────────────────────────────────────

const MY_USER_ID = "user-sub-001";
const MOCK_USER_NAME = "Pr. André Costa";
// Budget limit set by admin per institution/year
const ORCAMENTO_ANUAL_LIMITE = 150_000;

const myProjects = mockProjects.filter((p) => p.submittedBy === MY_USER_ID);

const activeProjects = myProjects.filter((p) =>
  ["em_execucao", "aprovado", "homologacao", "votacao", "validacao"].includes(
    p.stage,
  ),
);

const emAvaliacao = myProjects.filter((p) =>
  ["validacao", "votacao", "homologacao"].includes(p.stage),
);

const emVotacaoCount = myProjects.filter((p) => p.stage === "votacao").length;

const pendingReports = mockReports.filter(
  (r) =>
    myProjects.some((p) => p.id === r.projectId) &&
    (r.status === "pendente" || r.status === "em_atraso"),
);

const orcamentoComprometido = myProjects
  .filter((p) => !["cancelado", "reprovado", "rascunho"].includes(p.stage))
  .reduce((s, p) => s + p.valorTotal, 0);

const orcamentoDisponivel = Math.max(
  0,
  ORCAMENTO_ANUAL_LIMITE - orcamentoComprometido,
);

const pctComprometido = Math.min(
  100,
  Math.round((orcamentoComprometido / ORCAMENTO_ANUAL_LIMITE) * 100),
);

// First active project org name as header eyebrow
const institutionName =
  activeProjects[0]?.organizacao.name ?? myProjects[0]?.organizacao.name;

// ─── Upcoming payments ────────────────────────────────────────────────────────

type UpcomingPayment = {
  day: number;
  monthAbbr: string;
  label: string;
  sublabel: string;
  amount: number;
  dim: boolean;
};

const upcomingPayments: UpcomingPayment[] = (() => {
  const now = new Date();
  const items: UpcomingPayment[] = [];

  for (let offset = 0; offset <= 2 && items.length < 4; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const monthNum = d.getMonth() + 1;
    const monthAbbr = d
      .toLocaleString("pt-BR", { month: "short" })
      .replace(".", "");
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    for (const p of myProjects) {
      if (p.type !== "anual") continue;
      const ap = p as AnnualProject;
      if (!ap.mesesPagamento.includes(monthNum)) continue;
      if (["cancelado", "reprovado"].includes(p.stage)) continue;

      const paidBefore = ap.mesesPagamento
        .slice()
        .sort((a, b) => a - b)
        .indexOf(monthNum);
      const parcelaNum = paidBefore + 1;
      const parcelaValor = Math.round(ap.valorTotal / ap.numeroParcelas);
      const shortTitle = ap.titulo.split(" ").slice(0, 3).join(" ");

      items.push({
        day: lastDay,
        monthAbbr,
        label: `Parcela ${parcelaNum}/${ap.numeroParcelas} · ${shortTitle}`,
        sublabel:
          offset === 0
            ? "último dia útil do mês"
            : offset === 1
              ? "aguardando aprovação"
              : "previsto",
        amount: parcelaValor,
        dim: offset > 0,
      });
    }
  }

  return items.slice(0, 3);
})();

// ─── Stage display ────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  validacao: "Em Validação",
  votacao: "Em Votação",
  homologacao: "Homologação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  em_execucao: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

type BadgeStyle = { bg: string; color: string };

function stageBadge(stage: string): BadgeStyle {
  switch (stage) {
    case "em_execucao":
      return {
        bg: "rgba(42, 56, 160, 0.12)",
        color: "var(--hb-blue-soft)",
      };
    case "votacao":
      return { bg: "rgba(32, 44, 133, 0.10)", color: "var(--hb-blue)" };
    case "validacao":
      return { bg: "rgba(7, 180, 231, 0.12)", color: "var(--hb-cyan-deeper)" };
    case "homologacao":
      return {
        bg: "rgba(234, 90, 6, 0.10)",
        color: "var(--hb-orange-deep)",
      };
    case "aprovado":
      return { bg: "rgba(130, 163, 23, 0.20)", color: "#5f7510" };
    case "concluido":
      return { bg: "rgba(130, 163, 23, 0.20)", color: "#5f7510" };
    case "reprovado":
    case "cancelado":
      return {
        bg: "var(--color-destructive-muted)",
        color: "var(--color-destructive)",
      };
    default:
      return { bg: "var(--hb-gray-50)", color: "var(--hb-gray-400)" };
  }
}

// Execution progress (% of installments paid, estimated by current month position)
function executionProgress(p: AnnualProject): number | null {
  if (p.stage !== "em_execucao") return null;
  const sorted = [...p.mesesPagamento].sort((a, b) => a - b);
  const currentMonth = new Date().getMonth() + 1;
  const paid = sorted.filter((m) => m < currentMonth).length;
  if (p.numeroParcelas === 0) return null;
  return Math.round((paid / p.numeroParcelas) * 100);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubmissorDashboard() {
  // Keep "Pr." / "Ev." / "Dir." honorific + first given name: "Pr. André Costa" → "Pr. André"
  const parts = MOCK_USER_NAME.split(" ");
  const firstName =
    parts.length >= 2 &&
    /^(Pr\.|Ev\.|Dir\.|Pastor|Diac\.)$/.test(parts[0] ?? "")
      ? `${parts[0]} ${parts[1]}`
      : (parts[0] ?? MOCK_USER_NAME);

  // Summary sentence
  const relPart =
    pendingReports.length > 0
      ? `${pendingReports.length} relatório${pendingReports.length > 1 ? "s" : ""} a vencer`
      : null;
  const votPart =
    emVotacaoCount > 0
      ? `${emVotacaoCount} projeto${emVotacaoCount > 1 ? "s" : ""} em votação`
      : null;

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
            Paz do Senhor, {firstName}.
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
            color: "#fff",
            textDecoration: "none",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 15,
            padding: "13px 22px",
            borderRadius: 99,
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
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 1 · Projetos ativos */}
        <StatCard
          dot="var(--hb-blue)"
          label="Projetos ativos"
          value={activeProjects.length}
          sub={`${activeProjects.filter((p) => p.stage === "em_execucao").length} em execução · ${activeProjects.filter((p) => p.stage === "aprovado").length} aprovado`}
        />

        {/* 2 · Em avaliação */}
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

        {/* 3 · Relatórios pendentes */}
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

        {/* 4 · Orçamento disponível */}
        <StatCard
          dot="var(--hb-green)"
          label="Orçamento disponível"
          valueFmt={fmtMil(orcamentoDisponivel)}
          sub={`de ${fmtMil(ORCAMENTO_ANUAL_LIMITE)} no ano`}
          compact
        />
      </div>

      {/* ── Main 2-col layout ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
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
            <Link
              href="/"
              style={{
                color: "var(--hb-blue)",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Ver todos
            </Link>
          </div>

          {myProjects.length === 0 ? (
            <EmptyProjects />
          ) : (
            myProjects.map((p, i) => {
              const badge = stageBadge(p.stage);
              const isAnual = p.type === "anual";
              const ap = isAnual ? (p as AnnualProject) : null;
              const progress = ap ? executionProgress(ap) : null;
              const paidStr =
                ap && p.stage === "em_execucao"
                  ? `parcela ${Math.floor((progress ?? 0) / (100 / ap.numeroParcelas))} de ${ap.numeroParcelas}`
                  : null;

              const metaParts = [
                isAnual ? "Projeto anual" : "Projeto pontual",
                p.organizacao.city
                  ? `${p.organizacao.city}, ${p.organizacao.state ?? p.organizacao.country}`
                  : p.organizacao.country,
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
                    className="hover:bg-[--bg-alt]"
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
                            borderRadius: 99,
                            background: badge.bg,
                            color: badge.color,
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
                            borderRadius: 99,
                            marginTop: 10,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${progress}%`,
                              height: "100%",
                              background: "var(--hb-green)",
                              borderRadius: 99,
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
                        {BRL.format(p.valorTotal)}
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

            {upcomingPayments.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                Nenhum pagamento previsto nos próximos meses.
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {upcomingPayments.map((pay, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      opacity: pay.dim ? 0.62 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        flexShrink: 0,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: 15,
                          lineHeight: 1,
                          color: "var(--fg)",
                        }}
                      >
                        {pay.day}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "var(--fg-muted)",
                        }}
                      >
                        {pay.monthAbbr}
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
                        {pay.label}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                        {pay.sublabel}
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
                ))}
              </div>
            )}
          </section>

          {/* Orçamento da instituição */}
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
              Orçamento da instituição
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--fg-muted)",
                marginBottom: 14,
              }}
            >
              Ano-calendário 2025
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
                {fmtMil(orcamentoComprometido)}
              </span>
              <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                de {fmtMil(ORCAMENTO_ANUAL_LIMITE)}
              </span>
            </div>

            <div
              style={{
                height: 10,
                background: "var(--surface-alt)",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pctComprometido}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, var(--hb-blue), var(--hb-cyan))`,
                  borderRadius: 99,
                }}
              />
            </div>

            <p
              style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 10 }}
            >
              {pctComprometido}% comprometido.
              {pctComprometido >= 90 &&
                " Acima do teto, a submissão é bloqueada — contate o administrador."}
            </p>
          </section>

          {/* Relatório pendente alert */}
          {pendingReports.length > 0 &&
            (() => {
              const r = pendingReports[0];
              if (!r) return null;
              const proj = myProjects.find((p) => p.id === r.projectId);
              const isOverdue = r.status === "em_atraso";
              const dueStr = r.dueAt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
              });
              return (
                <section
                  style={{
                    background: "rgba(234, 90, 6, 0.06)",
                    border: "1px solid rgba(234, 90, 6, 0.25)",
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
                    {isOverdue ? "Relatório em atraso" : "Relatório pendente"}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--fg)",
                      margin: 0,
                    }}
                  >
                    {proj?.titulo ?? r.projectId} — {r.period}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--fg-muted)",
                      margin: "4px 0 14px",
                    }}
                  >
                    {isOverdue ? "Em atraso" : "Vence em breve"} · {dueStr}
                  </p>
                  <Link
                    href={`/${r.projectId}`}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "center",
                      background: "var(--hb-blue)",
                      color: "#fff",
                      textDecoration: "none",
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: 14,
                      padding: 11,
                      borderRadius: 99,
                    }}
                  >
                    Enviar relatório
                  </Link>
                </section>
              );
            })()}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
            borderRadius: 99,
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
          color: "#fff",
          textDecoration: "none",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 14,
          padding: "10px 20px",
          borderRadius: 99,
        }}
      >
        Submeter meu primeiro projeto
        <ChevronRight width={16} height={16} aria-hidden />
      </Link>
    </div>
  );
}
