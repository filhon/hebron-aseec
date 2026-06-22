import Link from "next/link";
import {
  Clock,
  FileWarning,
  Wallet,
  TrendingUp,
  ChevronRight,
  Plus,
} from "lucide-react";
import { mockProjects, mockReports } from "../../lib/mock-data";
import type { AnnualProject, Project } from "@hebron/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Mock: filter by current user's submitted projects
const MY_USER_ID = "user-sub-001";
const myProjects = mockProjects.filter((p) => p.submittedBy === MY_USER_ID);
const myReports = mockReports.filter((r) =>
  myProjects.some((p) => p.id === r.projectId),
);

const activeProjects = myProjects.filter((p) =>
  ["em_execucao", "aprovado", "homologacao", "votacao", "validacao"].includes(
    p.stage,
  ),
);

const pendingReports = myReports.filter(
  (r) => r.status === "pendente" || r.status === "em_atraso",
);

const totalAllocated = myProjects
  .filter((p) => !["cancelado", "reprovado", "rascunho"].includes(p.stage))
  .reduce((sum, p) => sum + p.valorTotal, 0);

// Upcoming payments (simplified: next 3 months from active annual projects)
const upcomingPayments: { month: string; amount: number }[] = (() => {
  const now = new Date();
  const months: { month: string; amount: number }[] = [];

  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthNum = d.getMonth() + 1;
    const label = d.toLocaleString("pt-BR", { month: "long", year: "numeric" });

    let amount = 0;
    for (const p of myProjects) {
      if (p.type !== "anual") continue;
      const ap = p as AnnualProject;
      if (!ap.mesesPagamento.includes(monthNum)) continue;
      if (["cancelado", "reprovado"].includes(p.stage)) continue;
      amount += Math.round(ap.valorTotal / ap.numeroParcelas);
    }

    if (amount > 0) months.push({ month: label, amount });
  }

  return months;
})();

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

function ProjectRow({ project }: { project: Project }) {
  const stage = STAGE_COLORS[project.stage] ?? {
    bg: "var(--hb-gray-50)",
    text: "var(--hb-gray-400)",
  };
  const pendingCount = project.reports.filter(
    (r) => r.status === "pendente" || r.status === "em_atraso",
  ).length;

  return (
    <Link
      href={`/${project.id}`}
      className="group flex items-center gap-4 rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4 shadow-[--shadow-xs] transition-all duration-[--dur-fast] hover:shadow-[--shadow-sm] hover:border-[--hb-blue]"
    >
      {/* Type indicator */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{
          backgroundColor:
            project.type === "anual" ? "var(--hb-blue)" : "var(--hb-purple)",
        }}
        aria-hidden
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p
            className="text-sm font-semibold text-[--fg] line-clamp-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {project.titulo}
          </p>
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: stage.bg, color: stage.text }}
          >
            {STAGE_LABELS[project.stage]}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[--fg-muted]">
          <span>{project.organizacao.name}</span>
          <span className="font-semibold text-[--fg]">
            {BRL.format(project.valorTotal)}
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-[--color-destructive] font-medium">
              <FileWarning className="w-3 h-3" aria-hidden />
              {pendingCount} relatório{pendingCount > 1 ? "s" : ""} pendente
              {pendingCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <ChevronRight
        className="w-4 h-4 text-[--fg-subtle] group-hover:text-[--hb-blue] transition-colors shrink-0"
        aria-hidden
      />
    </Link>
  );
}

function EmptySubmissor() {
  return (
    <div
      className="rounded-[--radius-lg] border border-dashed px-8 py-14 flex flex-col items-center text-center gap-5"
      style={{
        borderColor: "var(--hb-gray-200)",
        backgroundColor: "var(--bg-alt)",
      }}
    >
      {/* Illustration */}
      <div className="relative w-16 h-16 shrink-0">
        <div
          className="absolute inset-0 rounded-2xl rotate-6"
          style={{ backgroundColor: "var(--brand-muted)" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "var(--hb-blue)" }}
          aria-hidden
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
      </div>

      <div>
        <h3
          className="text-lg font-bold mb-1.5"
          style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
        >
          Você ainda não submeteu nenhum projeto
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--fg-muted)" }}
        >
          Projetos submetidos aparecem aqui para acompanhamento de status,
          <br className="hidden sm:block" />
          relatórios e histórico de aprovações.
        </p>
        <p
          className="text-xs mt-4 italic leading-relaxed"
          style={{ color: "var(--fg-subtle)" }}
        >
          "Comprometei ao Senhor o vosso caminho; confia nele, e ele agirá."
          <br />— Salmos 37:5
        </p>
      </div>

      <Link
        href="/novo"
        className="inline-flex items-center gap-2 rounded-[--radius-md] px-5 py-2.5 text-sm font-semibold shadow-[--shadow-sm] transition-colors hover:opacity-90"
        style={{ backgroundColor: "var(--hb-blue)", color: "#fff" }}
      >
        <Plus className="w-4 h-4" aria-hidden />
        Submeter meu primeiro projeto
      </Link>
    </div>
  );
}

export default function SubmissorDashboard() {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="hb-eyebrow mb-1">Área do Submissor</p>
          <h1
            className="text-3xl font-bold text-[--fg] leading-snug"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {greeting}, Pr. André
          </h1>
          <p className="text-sm text-[--fg-muted] mt-1">
            Acompanhe o andamento dos seus projetos e relatórios pendentes.
          </p>
        </div>
        <Link
          href="/novo"
          className="flex items-center gap-2 rounded-[--radius-md] bg-[--brand] text-[--brand-fg] px-4 py-2.5 text-sm font-semibold shadow-[--shadow-sm] hover:bg-[--hb-blue-soft] transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Novo Projeto
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4 shadow-[--shadow-xs]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-[--radius] flex items-center justify-center bg-[--brand-muted]">
              <TrendingUp className="w-4 h-4 text-[--brand]" aria-hidden />
            </div>
            <p className="text-xs font-semibold text-[--fg-muted] uppercase tracking-wider">
              Projetos Ativos
            </p>
          </div>
          <p
            className="text-3xl font-bold text-[--fg]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {activeProjects.length}
          </p>
          <p className="text-xs text-[--fg-muted] mt-0.5">
            de {myProjects.length} total
          </p>
        </div>

        <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4 shadow-[--shadow-xs]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-[--radius] flex items-center justify-center bg-[--color-destructive-muted]">
              <FileWarning
                className="w-4 h-4 text-[--color-destructive]"
                aria-hidden
              />
            </div>
            <p className="text-xs font-semibold text-[--fg-muted] uppercase tracking-wider">
              Relatórios Pendentes
            </p>
          </div>
          <p
            className="text-3xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color:
                pendingReports.length > 0
                  ? "var(--color-destructive)"
                  : "var(--fg)",
            }}
          >
            {pendingReports.length}
          </p>
          <p className="text-xs text-[--fg-muted] mt-0.5">
            {pendingReports.length === 0 ? "Tudo em dia" : "Atenção necessária"}
          </p>
        </div>

        <div className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-5 py-4 shadow-[--shadow-xs]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-[--radius] flex items-center justify-center bg-[--hb-green-muted]">
              <Wallet className="w-4 h-4 text-[--hb-green-fg]" aria-hidden />
            </div>
            <p className="text-xs font-semibold text-[--fg-muted] uppercase tracking-wider">
              Total Alocado
            </p>
          </div>
          <p
            className="text-2xl font-bold text-[--fg] tabular-nums"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {BRL.format(totalAllocated)}
          </p>
          <p className="text-xs text-[--fg-muted] mt-0.5">
            em projetos vigentes
          </p>
        </div>
      </div>

      {/* My projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-semibold text-[--fg]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Meus Projetos
          </h2>
          <p className="text-xs text-[--fg-muted]">
            {myProjects.length} projeto{myProjects.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {myProjects.length === 0 ? (
            <EmptySubmissor />
          ) : (
            myProjects.map((p) => <ProjectRow key={p.id} project={p} />)
          )}
        </div>
      </section>

      {/* Bottom row: pending reports + payment projection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending reports */}
        <section>
          <h2
            className="text-lg font-semibold text-[--fg] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Relatórios Pendentes
          </h2>

          {pendingReports.length === 0 ? (
            <div className="rounded-[--radius-md] border border-[--border] bg-[--hb-green-muted] px-5 py-4 text-center">
              <p className="text-sm font-medium text-[--hb-green-fg]">
                Todos os relatórios estão em dia.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingReports.map((r) => {
                const proj = myProjects.find((p) => p.id === r.projectId);
                const isOverdue = r.status === "em_atraso";
                return (
                  <div
                    key={r.id}
                    className="rounded-[--radius-md] border px-4 py-3 flex items-start gap-3"
                    style={{
                      borderColor: isOverdue
                        ? "var(--color-destructive)"
                        : "var(--border)",
                      backgroundColor: isOverdue
                        ? "var(--color-destructive-muted)"
                        : "var(--surface)",
                    }}
                  >
                    <Clock
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{
                        color: isOverdue
                          ? "var(--color-destructive)"
                          : "var(--fg-muted)",
                      }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: isOverdue
                            ? "var(--color-destructive)"
                            : "var(--fg)",
                        }}
                      >
                        {proj?.titulo ?? r.projectId} — {r.period}
                      </p>
                      <p className="text-xs text-[--fg-muted]">
                        {isOverdue ? "Em atraso" : "Aguardando entrega"} · vence{" "}
                        {r.dueAt.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/${r.projectId}`}
                      className="shrink-0 text-xs font-semibold text-[--brand] hover:underline"
                    >
                      Entregar
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Payment projection */}
        <section>
          <h2
            className="text-lg font-semibold text-[--fg] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Próximos Pagamentos
          </h2>

          {upcomingPayments.length === 0 ? (
            <div className="rounded-[--radius-md] border border-[--border] bg-[--surface-alt] px-5 py-4 text-center">
              <p className="text-sm text-[--fg-muted]">
                Nenhum pagamento previsto nos próximos 3 meses.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingPayments.map((p, i) => (
                <div
                  key={p.month}
                  className="rounded-[--radius-md] border border-[--border] bg-[--surface] px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[--brand-fg] shrink-0"
                      style={{
                        backgroundColor:
                          i === 0 ? "var(--hb-blue)" : "var(--hb-gray-100)",
                        color: i === 0 ? "#fff" : "var(--hb-gray-400)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium text-[--fg] capitalize">
                      {p.month}
                    </p>
                  </div>
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{
                      color: i === 0 ? "var(--hb-blue)" : "var(--fg)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {BRL.format(p.amount)}
                  </p>
                </div>
              ))}

              <p className="text-xs text-[--fg-muted] px-1 mt-1">
                Valores estimados com base nas parcelas aprovadas.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
