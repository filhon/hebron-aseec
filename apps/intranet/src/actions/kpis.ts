"use server";

import { z } from "zod";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import {
  financialCategories,
  kpiSnapshotHistory,
  projects,
  tasks,
  transactions,
} from "@hebron/db/schema";
import { getStudentKpiMetrics } from "@hebron/integrations/plataforma";
import {
  getRadioDashboardStatus,
  type RadioAudienceKpi,
  type RadioDashboardStatus,
} from "@hebron/integrations/radio";
import type { KPI, KPITrend } from "@hebron/types/intranet";
import { staffAction } from "../lib/safe-action";

// Snapshot é considerado fresco por até 2h (contrato de frescor, PATCH-018).
const SNAPSHOT_FRESHNESS_MS = 2 * 60 * 60 * 1000;

const PT_BR_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function currentPeriodLabel(): string {
  const now = new Date();
  return `${PT_BR_MONTHS[now.getMonth()]}/${now.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// "Projetos ativos" — projetos em execução (projetos.projects.stage =
// 'em_execucao'). Estágios anteriores ainda estão em pipeline de aprovação;
// aprovado/reprovado/concluído não estão mais "em atividade".
//
// Exceção service-level (G6.2/P-9.1b-5, decisão sobre S-02 em kpis.ts —
// registrada em SESSIONS.md): este KPI é um total ORG-WIDE, o mesmo número
// para qualquer membro do staff que olhe o dashboard. `projects_select_own_or_org`
// (0007_projetos_rls.sql) restringe colaborador/submissor a projetos próprios
// ou da própria organização — sob RLS normal, um colaborador sem projeto/
// organização veria uma contagem menor que a real, um valor errado, não
// apenas "menos dados". Roda via withSystemRole (RESET ROLE, mesma
// transação aberta por withAuthenticatedContext) para obter o total real; só
// um número agregado sai daqui, nenhuma linha de projeto individual é
// devolvida ao cliente.
// ---------------------------------------------------------------------------

async function countProjetosAtivos(tx: AuthenticatedTx): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.stage, "em_execucao"));
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// "Doações do mês" — soma das transações de receita (credito) lançadas na
// categoria "Doações" do plano de contas no mês corrente (BRAIN §6.6,
// PATCH-008). O prompt P-5.8 descreve a categoria como "despesa", mas o
// plano de contas seed (0010_financeiro.sql) e BRAIN §6.6 concordam que
// Doações é receita — seguindo a fonte da verdade (BRAIN.md).
//
// Exceção service-level (mesma razão de countProjetosAtivos acima):
// `transactions_select_staff`/`categories_select_staff`
// (0010_financeiro.sql) não incluem conselheiro — sob RLS normal, um
// conselheiro veria "R$ 0,00" em vez do valor real, o que é uma métrica
// errada para um papel de diretoria, não uma restrição de acesso legítima
// (conselheiro tem função de supervisão, BRAIN §3). Só a soma agregada sai
// daqui, nenhuma transação individual.
// ---------------------------------------------------------------------------

async function sumDoacoesDoMes(tx: AuthenticatedTx): Promise<number> {
  const [category] = await tx
    .select({ id: financialCategories.id })
    .from(financialCategories)
    .where(eq(financialCategories.name, "Doações"))
    .limit(1);
  if (!category) return 0;

  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "credito"),
        eq(transactions.categoryId, category.id),
        sql`date_trunc('month', ${transactions.date}) = date_trunc('month', now())`,
      ),
    );
  return Number(row?.total ?? 0);
}

// ---------------------------------------------------------------------------
// "Tarefas abertas" — não concluídas e não excluídas (mesmo filtro de
// packages/jobs/src/crons/tarefas-prazos.ts). `tasks_select_staff`
// (0033_tarefas_rls.sql) já dá visibilidade total (sem filtro por
// criador/assignee) a colaborador/diretor/conselheiro, e super_admin enxerga
// tudo via `tasks_mutate_admin` — nenhum papel do staff veria uma contagem
// diferente sob RLS normal. Roda sob o mesmo `withSystemRole` que os outros
// dois agregados acima só por uniformidade de uma única transação/helper
// para o KPI inteiro, não por necessidade de bypass.
// ---------------------------------------------------------------------------

async function countTarefasAbertas(tx: AuthenticatedTx): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(isNull(tasks.deletedAt), ne(tasks.status, "concluido")));
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// KPIs persistíveis — snapshot horário em intranet.kpi_snapshot_history
// (packages/jobs/src/crons/intranet.ts::runKpiSnapshot, PATCH-018). "Alunos"
// fica fora: é stub até packages/db/src/schema/plataforma.ts existir (Fase 6).
// ---------------------------------------------------------------------------

interface PersistableKpiConfig {
  metricName: string;
  id: string;
  name: string;
  unit: string;
  sourceModule: string;
  computeLive: (tx: AuthenticatedTx) => Promise<number>;
}

const PERSISTABLE_KPIS: PersistableKpiConfig[] = [
  {
    metricName: "projetos_ativos",
    id: "kpi-projetos-ativos",
    name: "Projetos ativos",
    unit: "projetos",
    sourceModule: "projetos",
    computeLive: countProjetosAtivos,
  },
  {
    metricName: "doacoes_mes",
    id: "kpi-doacoes-mes",
    name: "Doações do mês",
    unit: "R$",
    sourceModule: "financeiro",
    computeLive: sumDoacoesDoMes,
  },
  {
    metricName: "tarefas_abertas",
    id: "kpi-tarefas-abertas",
    name: "Tarefas abertas",
    unit: "tarefas",
    sourceModule: "tarefas",
    computeLive: countTarefasAbertas,
  },
];

interface PersistableKpiSample {
  value: string;
  capturedAt: Date;
}

interface PersistableKpiResult {
  config: PersistableKpiConfig;
  // Ordenado do mais recente para o mais antigo (ordem da query).
  samples: PersistableKpiSample[];
}

// Últimos N pontos da série (12 buckets = meio dia de leituras horárias),
// mais recente primeiro, para calcular frescor, tendência e desenhar o
// sparkline real sem manter histórico maior em memória da app.
// `kpi_snapshot_history_select_staff` (0043) já cobre todo o staff — roda
// sob a mesma transação/tx passada pelo chamador por uniformidade com os
// agregados live acima, não por necessidade de bypass.
const HISTORY_SAMPLE_LIMIT = 12;

async function recentHistorySamples(
  tx: AuthenticatedTx,
  metricName: string,
): Promise<PersistableKpiSample[]> {
  return tx
    .select({
      value: kpiSnapshotHistory.value,
      capturedAt: kpiSnapshotHistory.capturedAt,
    })
    .from(kpiSnapshotHistory)
    .where(eq(kpiSnapshotHistory.metricName, metricName))
    .orderBy(desc(kpiSnapshotHistory.capturedAt))
    .limit(HISTORY_SAMPLE_LIMIT);
}

async function loadPersistableKpiResult(
  tx: AuthenticatedTx,
  config: PersistableKpiConfig,
): Promise<PersistableKpiResult> {
  const samples = await recentHistorySamples(tx, config.metricName);
  return { config, samples };
}

function isFresh(capturedAt: Date, now: Date): boolean {
  return now.getTime() - capturedAt.getTime() <= SNAPSHOT_FRESHNESS_MS;
}

function trendFor(current: number, previous: number | null): KPITrend | null {
  if (previous === null) return null;
  if (current === previous) return "stable";
  return current > previous ? "up" : "down";
}

// ---------------------------------------------------------------------------
// "Audiência da Rádio" — sessões-ouvinte do dia agregado mais recente de
// radio.listener_stats (BRAIN §6.6, P-8.11). A métrica já nasce agregada por
// dia (1 linha/dia, packages/jobs/src/crons/radio-stats.ts) — por isso fica
// fora do contrato de frescor de 2h de PATCH-018 (que existe para métricas
// recomputáveis a qualquer hora) e do snapshot horário em
// intranet.kpi_snapshot_history: history/trend vêm direto das últimas linhas
// diárias de packages/integrations/src/radio.ts, sempre ao vivo — mesmo
// tratamento de "Alunos na Plataforma" acima. Sem nenhuma linha ainda, o
// cartão mostra zero/nulo/vazio e um período dizendo que a agregação não
// rodou, nunca uma curva ou seta inventada (regra que P-5.2b fixou).
// ---------------------------------------------------------------------------

function audienciaPeriodLabel(latest: RadioAudienceKpi | null): string {
  if (!latest) return "Agregação ainda não rodou";
  const dateLabel = new Date(`${latest.date}T00:00:00`).toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "short" },
  );
  const hoursLabel = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(latest.hoursListened);
  return `${dateLabel} · ${hoursLabel}h ouvidas`;
}

function kpiFromRadioAudience(status: RadioDashboardStatus, now: Date): KPI {
  const { audience, audienceHistory } = status;
  const previous = audienceHistory[audienceHistory.length - 2] ?? null;
  return {
    id: "kpi-audiencia-radio",
    name: "Audiência da Rádio",
    value: audience?.uniqueSessions ?? 0,
    unit: "ouvintes",
    trend: audience
      ? trendFor(audience.uniqueSessions, previous?.uniqueSessions ?? null)
      : null,
    period: audienciaPeriodLabel(audience),
    sourceModule: "radio",
    updatedAt: audience?.capturedAt ?? now,
    history: audienceHistory.map((day) => day.uniqueSessions),
  };
}

function kpiFromSnapshot(result: PersistableKpiResult, period: string): KPI {
  const { config, samples } = result;
  const [latest, previous] = samples;
  if (!latest) {
    throw new BusinessError(
      `Snapshot ausente para métrica persistível "${config.metricName}"`,
    );
  }
  const value = Number(latest.value);
  const previousValue = previous ? Number(previous.value) : null;
  // samples vem do mais recente para o mais antigo; history é cronológico.
  const history = samples
    .map((s) => Number(s.value))
    .slice()
    .reverse();
  return {
    id: config.id,
    name: config.name,
    value,
    unit: config.unit,
    trend: trendFor(value, previousValue),
    period,
    sourceModule: config.sourceModule,
    updatedAt: latest.capturedAt,
    history,
  };
}

async function kpiFromLive(
  tx: AuthenticatedTx,
  config: PersistableKpiConfig,
  period: string,
  now: Date,
): Promise<KPI> {
  return {
    id: config.id,
    name: config.name,
    value: await config.computeLive(tx),
    unit: config.unit,
    trend: null,
    period,
    sourceModule: config.sourceModule,
    updatedAt: now,
    history: [],
  };
}

function requireKpi(kpiByMetric: Map<string, KPI>, metricName: string): KPI {
  const kpi = kpiByMetric.get(metricName);
  if (!kpi) {
    throw new BusinessError(`KPI ausente para métrica "${metricName}"`);
  }
  return kpi;
}

// ---------------------------------------------------------------------------
// getKpis — 5 indicadores do dashboard (BRAIN §6.6). Lê
// intranet.kpi_snapshot_history (fonte primária) quando o snapshot de todo
// KPI persistível está fresco (< 2h); caso contrário recalcula ao vivo para
// o conjunto inteiro, evitando misturar snapshot de um KPI com live de outro
// (contrato de frescor, PATCH-018). "Alunos na Plataforma" e "Audiência da
// Rádio" ficam fora desse contrato — não há snapshot horário persistido para
// eles (o segundo nasce agregado por dia, não por hora) — e são sempre
// calculados ao vivo via packages/integrations (P-6.11/P-5.8b).
// ---------------------------------------------------------------------------

export const getKpis = staffAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const now = new Date();
    const period = currentPeriodLabel();

    // Todo o cálculo dos 3 KPIs persistíveis roda dentro de um único
    // withSystemRole (ver comentários de countProjetosAtivos/sumDoacoesDoMes
    // acima) — decisão P-9.1b-5 sobre S-02, registrada em SESSIONS.md.
    const [results, studentMetrics, radioStatus] =
      await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
        withSystemRole(tx, (sysTx) =>
          Promise.all([
            Promise.all(
              PERSISTABLE_KPIS.map((config) =>
                loadPersistableKpiResult(sysTx, config),
              ),
            ),
            getStudentKpiMetrics(),
            getRadioDashboardStatus(),
          ]),
        ),
      );

    const allFresh = results.every(
      (r) =>
        r.samples[0] !== undefined && isFresh(r.samples[0].capturedAt, now),
    );

    const kpiEntries = allFresh
      ? results.map(
          (r) => [r.config.metricName, kpiFromSnapshot(r, period)] as const,
        )
      : await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
          withSystemRole(tx, (sysTx) =>
            Promise.all(
              results.map(
                async (r) =>
                  [
                    r.config.metricName,
                    await kpiFromLive(sysTx, r.config, period, now),
                  ] as const,
              ),
            ),
          ),
        );

    const kpiByMetric = new Map(kpiEntries);

    const kpis: KPI[] = [
      requireKpi(kpiByMetric, "projetos_ativos"),
      {
        id: "kpi-alunos-plataforma",
        name: "Alunos na Plataforma",
        value: studentMetrics.totalEnrolled,
        unit: "alunos",
        trend: null,
        period,
        sourceModule: "plataforma",
        updatedAt: now,
        history: [],
      },
      requireKpi(kpiByMetric, "doacoes_mes"),
      requireKpi(kpiByMetric, "tarefas_abertas"),
      kpiFromRadioAudience(radioStatus, now),
    ];

    return { kpis };
  });
