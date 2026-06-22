import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Clock,
  ChevronRight,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  mockMeetingAgendas,
  mockProjects,
  mockPontualProjects,
} from "../../../lib/mock-data";
import type { AnnualProject, PontualProject } from "@hebron/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ─── BI calculations ──────────────────────────────────────────────────────────

const activeProjects = mockProjects.filter((p) => p.stage === "em_execucao");

const totalBudgetAllocated = activeProjects.reduce(
  (sum, p) => sum + p.valorTotal,
  0,
);

// Remaining months: sum of remaining parcelas from em_execucao annual projects
const now = new Date();
const currentMonth = now.getMonth() + 1;

const remainingPayments = activeProjects.reduce((sum, p) => {
  if (p.type !== "anual") return sum;
  const ap = p as AnnualProject;
  const remaining = ap.mesesPagamento.filter((m) => m >= currentMonth).length;
  return sum + remaining * Math.round(ap.valorTotal / ap.numeroParcelas);
}, 0);

const monthsRemaining = Math.max(
  ...activeProjects
    .filter((p) => p.type === "anual")
    .map((p) => {
      const ap = p as AnnualProject;
      const lastMonth = Math.max(...ap.mesesPagamento);
      return Math.max(0, lastMonth - currentMonth + 1);
    }),
  0,
);

// Pontual projects needing attention (pending/approved)
const pontualAttention = mockPontualProjects.filter((p) =>
  ["validacao", "aprovado", "em_execucao"].includes(p.stage),
);

// Pending reports across all active projects
const pendingReportCount = activeProjects.reduce(
  (sum, p) =>
    sum +
    p.reports.filter((r) => r.status === "pendente" || r.status === "em_atraso")
      .length,
  0,
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  validacao: "Validação",
  votacao: "Votação",
  homologacao: "Homologação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  em_execucao: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  rascunho: { bg: "var(--hb-gray-50)", text: "var(--hb-gray-400)" },
  validacao: { bg: "var(--hb-cyan-muted)", text: "var(--hb-cyan-darker)" },
  votacao: { bg: "var(--brand-muted)", text: "var(--hb-blue)" },
  homologacao: { bg: "var(--hb-orange-muted)", text: "var(--hb-orange-deep)" },
  aprovado: { bg: "var(--hb-green-muted)", text: "var(--hb-green-fg)" },
  reprovado: {
    bg: "var(--color-destructive-muted)",
    text: "var(--color-destructive)",
  },
  em_execucao: { bg: "var(--hb-cyan-muted)", text: "var(--hb-cyan-fg)" },
  concluido: { bg: "var(--hb-green-muted)", text: "var(--hb-green-fg)" },
  cancelado: {
    bg: "var(--color-destructive-muted)",
    text: "var(--hb-red-deep)",
  },
};

function formatDate(d: Date): string {
  return d.toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReuniaoPage() {
  const agenda = mockMeetingAgendas[0];

  if (!agenda) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-[--fg-muted]">Nenhuma reunião agendada.</p>
      </div>
    );
  }

  const totalDuration = agenda.items.reduce(
    (sum, item) => sum + (item.durationMinutes ?? 0),
    0,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="hb-eyebrow mb-1">Diretoria</p>
        <h1
          className="text-2xl font-bold text-[--fg]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {agenda.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[--fg-muted]">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" aria-hidden />
            {formatDate(agenda.scheduledAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" aria-hidden />
            {agenda.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" aria-hidden />
            {totalDuration} min estimados
          </span>
        </div>
        <p className="text-xs text-[--fg-muted] mt-1">
          Presidida por{" "}
          <span className="font-semibold text-[--fg]">
            {agenda.presidentName}
          </span>
        </p>
      </div>

      {/* Main layout: agenda + BI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Agenda */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Agenda items */}
          <section>
            <h2
              className="text-base font-bold text-[--fg] mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pauta da Reunião
            </h2>

            <ol className="flex flex-col gap-3" aria-label="Itens da pauta">
              {agenda.items.map((item) => {
                const linkedProject = item.projectId
                  ? mockProjects.find((p) => p.id === item.projectId)
                  : null;
                const stageConfig = linkedProject
                  ? (STAGE_COLORS[linkedProject.stage] ?? {
                      bg: "var(--hb-gray-50)",
                      text: "var(--hb-gray-400)",
                    })
                  : null;

                return (
                  <li key={item.id}>
                    <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] shadow-[--shadow-xs] overflow-hidden">
                      {/* Item header */}
                      <div className="px-5 py-4 flex items-start gap-4">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{
                            backgroundColor: "var(--brand)",
                            color: "#fff",
                          }}
                        >
                          {item.order}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p
                              className="text-sm font-semibold text-[--fg]"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {item.title}
                            </p>
                            <span className="shrink-0 text-xs text-[--fg-muted] whitespace-nowrap">
                              {item.durationMinutes} min
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-[--fg-muted] leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Linked project strip */}
                      {linkedProject && stageConfig && (
                        <Link
                          href={`/${linkedProject.id}`}
                          className="flex items-center gap-3 px-5 py-2.5 border-t border-[--border] bg-[--surface-alt] hover:bg-[--brand-muted] transition-colors group"
                        >
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-semibold shrink-0"
                            style={{
                              backgroundColor: stageConfig.bg,
                              color: stageConfig.text,
                            }}
                          >
                            {STAGE_LABELS[linkedProject.stage]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[--fg] truncate group-hover:text-[--brand]">
                              {linkedProject.titulo}
                            </p>
                            <p className="text-xs text-[--fg-muted]">
                              {linkedProject.organizacao.name} ·{" "}
                              {BRL.format(linkedProject.valorTotal)}
                            </p>
                          </div>
                          <ChevronRight
                            className="w-4 h-4 text-[--fg-subtle] group-hover:text-[--brand] shrink-0"
                            aria-hidden
                          />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Pontual projects section */}
          {pontualAttention.length > 0 && (
            <section>
              <h2
                className="text-base font-bold text-[--fg] mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Projetos Pontuais para Deliberação
              </h2>

              <div className="flex flex-col gap-2">
                {pontualAttention.map((p) => {
                  const pp = p as PontualProject;
                  const sc = STAGE_COLORS[p.stage] ?? {
                    bg: "var(--hb-gray-50)",
                    text: "var(--hb-gray-400)",
                  };

                  return (
                    <Link
                      key={p.id}
                      href={`/${p.id}`}
                      className="group rounded-[--radius-md] border border-[--border] bg-[--surface] px-4 py-3 flex items-center gap-4 hover:border-[--brand] hover:shadow-[--shadow-sm] transition-all"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                        style={{
                          backgroundColor: "var(--hb-purple)",
                          color: "#fff",
                        }}
                      >
                        P
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[--fg] truncate group-hover:text-[--brand]">
                          {p.titulo}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[--fg-muted]">
                          <span>{p.organizacao.name}</span>
                          <span className="font-semibold text-[--fg]">
                            {BRL.format(p.valorTotal)}
                          </span>
                          {pp.prazoNecessidade && (
                            <span className="text-[--hb-orange-deep]">
                              Prazo:{" "}
                              {pp.prazoNecessidade.toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{ backgroundColor: sc.bg, color: sc.text }}
                      >
                        {STAGE_LABELS[p.stage]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Previous minutes */}
          {mockMeetingAgendas[1]?.minutesText && (
            <section>
              <h2
                className="text-base font-bold text-[--fg] mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ata da Reunião Anterior
              </h2>
              <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4">
                <p className="text-xs font-semibold text-[--fg-muted] mb-3">
                  {mockMeetingAgendas[1].title}
                </p>
                <div className="text-sm text-[--fg] leading-relaxed whitespace-pre-line">
                  {mockMeetingAgendas[1].minutesText}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right 1/3: BI */}
        <div className="flex flex-col gap-4">
          <h2
            className="text-base font-bold text-[--fg]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Painel Financeiro
          </h2>

          {/* Budget allocated */}
          <div className="rounded-[--radius-lg] border border-[--border] bg-[--surface] shadow-[--shadow-md] overflow-hidden">
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: "var(--hb-blue)" }}
              aria-hidden
            />
            <div className="px-5 py-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet
                  className="w-4 h-4"
                  style={{ color: "var(--hb-blue)" }}
                  aria-hidden
                />
                <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted]">
                  Saldo Alocado (Em Execução)
                </p>
              </div>
              <p
                className="text-3xl font-bold text-[--hb-blue] tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {BRL.format(totalBudgetAllocated)}
              </p>
              <p className="text-xs text-[--fg-muted] mt-1">
                {activeProjects.length} projeto
                {activeProjects.length !== 1 ? "s" : ""} em execução
              </p>
            </div>
          </div>

          {/* Remaining payments */}
          <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4 shadow-[--shadow-xs]">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp
                className="w-4 h-4"
                style={{ color: "var(--hb-green)" }}
                aria-hidden
              />
              <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted]">
                Pagamentos Restantes
              </p>
            </div>
            <p
              className="text-2xl font-bold text-[--fg] tabular-nums"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {BRL.format(remainingPayments)}
            </p>
            <p className="text-xs text-[--fg-muted] mt-0.5">
              nos próximos {monthsRemaining} meses
            </p>
          </div>

          {/* Months remaining bar */}
          <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4 shadow-[--shadow-xs]">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[--fg-muted]" aria-hidden />
              <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted]">
                Execução por Projeto
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {activeProjects.slice(0, 5).map((p) => {
                if (p.type !== "anual") return null;
                const ap = p as AnnualProject;
                const remaining = ap.mesesPagamento.filter(
                  (m) => m >= currentMonth,
                ).length;
                const total = ap.numeroParcelas;
                const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;

                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[--fg] font-medium truncate max-w-40">
                        {p.titulo.split("—")[0]?.trim() ?? p.titulo}
                      </span>
                      <span className="text-[--fg-muted] shrink-0">
                        {remaining}/{total}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[--hb-gray-100] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            pct > 75
                              ? "var(--hb-green)"
                              : pct > 40
                                ? "var(--hb-cyan)"
                                : "var(--hb-blue)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          <div className="flex flex-col gap-2">
            {pendingReportCount > 0 && (
              <div
                className="rounded-[--radius-md] px-4 py-3 flex items-start gap-3"
                style={{
                  backgroundColor: "var(--color-destructive-muted)",
                  border: "1px solid var(--color-destructive)",
                }}
              >
                <AlertTriangle
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: "var(--color-destructive)" }}
                  aria-hidden
                />
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--color-destructive)" }}
                  >
                    Relatórios em atraso
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-destructive)" }}
                  >
                    {pendingReportCount} relatório
                    {pendingReportCount > 1 ? "s" : ""} pendente
                    {pendingReportCount > 1 ? "s" : ""} no portfólio
                  </p>
                </div>
              </div>
            )}

            <div
              className="rounded-[--radius-md] px-4 py-3 flex items-center gap-3"
              style={{
                backgroundColor: "var(--hb-green-muted)",
                border: "1px solid var(--hb-green)",
              }}
            >
              <CheckCircle2
                className="w-4 h-4 shrink-0"
                style={{ color: "var(--hb-green-fg)" }}
                aria-hidden
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--hb-green-fg)" }}
              >
                {activeProjects.length} projeto
                {activeProjects.length !== 1 ? "s" : ""} em execução saudável
              </p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="rounded-[--radius-md] border border-[--border] bg-[--surface-alt] px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[--fg-muted] mb-3">
              Resumo do Portfólio
            </p>
            <div className="flex flex-col gap-2.5 text-sm">
              {[
                {
                  label: "Total de projetos",
                  value: mockProjects.length.toString(),
                },
                {
                  label: "Em execução",
                  value: activeProjects.length.toString(),
                  color: "var(--hb-cyan-fg)",
                },
                {
                  label: "Aguardando votação",
                  value: mockProjects
                    .filter((p) => p.stage === "votacao")
                    .length.toString(),
                  color: "var(--hb-blue)",
                },
                {
                  label: "Concluídos",
                  value: mockProjects
                    .filter((p) => p.stage === "concluido")
                    .length.toString(),
                  color: "var(--hb-green-fg)",
                },
                {
                  label: "Projetos pontuais ativos",
                  value: pontualAttention.length.toString(),
                  color: "var(--hb-purple)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-[--fg-muted]">{item.label}</span>
                  <span
                    className="font-bold tabular-nums"
                    style={{
                      color: item.color ?? "var(--fg)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
