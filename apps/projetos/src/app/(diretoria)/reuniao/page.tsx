import Link from "next/link";
import {
  CalendarDays,
  CalendarClock,
  Clock,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { getMeetingBIData, getMeetingAgenda } from "../../../lib/queries";
import { BRL } from "../../../lib/stage-utils";

const MEETING_DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default async function ReuniaoPage() {
  const [bi, agenda] = await Promise.all([
    getMeetingBIData(),
    getMeetingAgenda(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="hb-eyebrow mb-1">Diretoria</p>
        <h1
          className="text-2xl font-bold text-(--fg)"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Reunião de Diretoria
        </h1>
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-(--fg-muted)">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" aria-hidden />
            {agenda
              ? `${agenda.title} · ${MEETING_DATE_FORMAT.format(agenda.date)}`
              : "Nenhuma reunião agendada"}
          </span>
        </div>
      </div>

      {/* Main layout: agenda + BI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Agenda */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section>
            <h2
              className="text-base font-bold text-(--fg) mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pauta da Reunião
            </h2>

            {agenda && agenda.items.length > 0 ? (
              <div className="rounded-lg border border-(--border) bg-(--surface) shadow-(--shadow-xs) overflow-hidden">
                {agenda.items.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/pipeline/${item.projectId}`}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-(--bg-alt)"
                    style={{
                      borderTop:
                        index > 0 ? "1px solid var(--divider)" : undefined,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                      style={{ backgroundColor: "var(--hb-blue)" }}
                    >
                      {item.order}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-(--fg) truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-(--fg-muted) mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className="rounded-lg border border-dashed border-(--border) px-8 py-16 flex flex-col items-center text-center gap-5"
                style={{ backgroundColor: "var(--bg-alt)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "var(--brand-muted)" }}
                >
                  <FileText
                    className="w-6 h-6"
                    style={{ color: "var(--hb-blue)" }}
                    aria-hidden
                  />
                </div>
                <div>
                  <h3
                    className="text-base font-bold text-(--fg) mb-1"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Nenhum projeto pontual em aberto
                  </h3>
                  <p className="text-sm text-(--fg-muted) leading-relaxed">
                    Não há projetos pontuais aguardando deliberação para a
                    próxima reunião.
                  </p>
                  <p className="text-xs text-(--fg-subtle) mt-4 italic">
                    "Porque onde dois ou três estão reunidos em meu nome, aí
                    estou eu no meio deles."
                    <br />— Mateus 18:20
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Projects needing attention */}
          {(bi.inVotacaoCount > 0 || bi.inValidacaoCount > 0) && (
            <section>
              <h2
                className="text-base font-bold text-(--fg) mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Projetos Aguardando Deliberação
              </h2>
              <div className="flex flex-col gap-2">
                {bi.inVotacaoCount > 0 && (
                  <div className="rounded-md border border-(--brand-muted) bg-(--brand-muted) px-4 py-3 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                      style={{ backgroundColor: "var(--hb-blue)" }}
                    >
                      {bi.inVotacaoCount}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-(--hb-blue)">
                        Em Votação
                      </p>
                      <p className="text-xs text-(--fg-muted)">
                        Aguardando votos dos conselheiros e diretores
                      </p>
                    </div>
                  </div>
                )}
                {bi.inValidacaoCount > 0 && (
                  <div
                    className="rounded-md border px-4 py-3 flex items-center gap-3"
                    style={{
                      borderColor: "var(--hb-cyan-muted)",
                      backgroundColor: "var(--hb-cyan-muted)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                      style={{ backgroundColor: "var(--hb-cyan)" }}
                    >
                      {bi.inValidacaoCount}
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--hb-cyan-darker)" }}
                      >
                        Em Validação
                      </p>
                      <p className="text-xs text-(--fg-muted)">
                        Aguardando avaliação da diretoria
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right 1/3: BI */}
        <div className="flex flex-col gap-4">
          <h2
            className="text-base font-bold text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Painel Financeiro
          </h2>

          {/* Budget allocated */}
          <div className="rounded-lg border border-(--border) bg-(--surface) shadow-(--shadow-md) overflow-hidden">
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
                <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted)">
                  Valor Alocado (Portfólio Ativo)
                </p>
              </div>
              <p
                className="text-3xl font-bold text-(--hb-blue) tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {BRL.format(bi.totalBudgetActive)}
              </p>
              <p className="text-xs text-(--fg-muted) mt-1">
                {bi.activeProjectsCount} projeto
                {bi.activeProjectsCount !== 1 ? "s" : ""} ativos
              </p>
            </div>
          </div>

          {/* Remaining months in calendar year */}
          <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-4 shadow-(--shadow-xs)">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock
                className="w-4 h-4"
                style={{ color: "var(--hb-cyan)" }}
                aria-hidden
              />
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted)">
                Meses Restantes no Ano
              </p>
            </div>
            <p
              className="text-2xl font-bold text-(--fg) tabular-nums"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {bi.mesesRestantesAnoCalendario}
            </p>
            <p className="text-xs text-(--fg-muted) mt-0.5">
              parcelas pendentes de projetos anuais em execução
            </p>
          </div>

          {/* In execution */}
          <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-4 shadow-(--shadow-xs)">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp
                className="w-4 h-4"
                style={{ color: "var(--hb-green)" }}
                aria-hidden
              />
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted)">
                Em Execução
              </p>
            </div>
            <p
              className="text-2xl font-bold text-(--fg) tabular-nums"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {bi.inExecucaoCount}
            </p>
            <p className="text-xs text-(--fg-muted) mt-0.5">
              projetos com entregas ativas
            </p>
          </div>

          {/* Waiting clock */}
          <div className="rounded-md border border-(--border) bg-(--surface) px-5 py-4 shadow-(--shadow-xs)">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-(--fg-muted)" aria-hidden />
              <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted)">
                Aguardando Deliberação
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-(--fg-muted)">Em votação</span>
                <span
                  className="font-bold tabular-nums"
                  style={{
                    color:
                      bi.inVotacaoCount > 0
                        ? "var(--hb-blue)"
                        : "var(--fg-muted)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {bi.inVotacaoCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--fg-muted)">Em validação</span>
                <span
                  className="font-bold tabular-nums"
                  style={{
                    color:
                      bi.inValidacaoCount > 0
                        ? "var(--hb-cyan-darker)"
                        : "var(--fg-muted)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {bi.inValidacaoCount}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="flex flex-col gap-2">
            {bi.pendingReportsCount > 0 && (
              <div
                className="rounded-md px-4 py-3 flex items-start gap-3"
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
                    Relatórios pendentes
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-destructive)" }}
                  >
                    {bi.pendingReportsCount} relatório
                    {bi.pendingReportsCount > 1 ? "s" : ""} no portfólio
                  </p>
                </div>
              </div>
            )}

            <div
              className="rounded-md px-4 py-3 flex items-center gap-3"
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
                {bi.inExecucaoCount} projeto
                {bi.inExecucaoCount !== 1 ? "s" : ""} em execução
              </p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="rounded-md border border-(--border) bg-(--surface-alt) px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-(--fg-muted) mb-3">
              Resumo do Portfólio
            </p>
            <div className="flex flex-col gap-2.5 text-sm">
              {[
                {
                  label: "Projetos ativos",
                  value: bi.activeProjectsCount.toString(),
                },
                {
                  label: "Em execução",
                  value: bi.inExecucaoCount.toString(),
                  color: "var(--hb-cyan-fg)",
                },
                {
                  label: "Aguardando votação",
                  value: bi.inVotacaoCount.toString(),
                  color: "var(--hb-blue)",
                },
                {
                  label: "Aprovados",
                  value: bi.approvedCount.toString(),
                  color: "var(--hb-green-fg)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-(--fg-muted)">{item.label}</span>
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
