"use server";

import { z } from "zod";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  financialCategories,
  projects,
  tasks,
  transactions,
} from "@hebron/db/schema";
import type { KPI } from "@hebron/types/intranet";
import { staffAction } from "../lib/safe-action";

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
// ---------------------------------------------------------------------------

async function countProjetosAtivos(): Promise<number> {
  const [row] = await db
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
// ---------------------------------------------------------------------------

async function sumDoacoesDoMes(): Promise<number> {
  const [category] = await db
    .select({ id: financialCategories.id })
    .from(financialCategories)
    .where(eq(financialCategories.name, "Doações"))
    .limit(1);
  if (!category) return 0;

  const [row] = await db
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
// packages/jobs/src/crons/tarefas-prazos.ts).
// ---------------------------------------------------------------------------

async function countTarefasAbertas(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(isNull(tasks.deletedAt), ne(tasks.status, "concluido")));
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// getKpis — 4 indicadores do dashboard, computados ao vivo. "Alunos" é stub
// (packages/db/src/schema/plataforma.ts ainda não existe — Fase 6).
// ---------------------------------------------------------------------------

export const getKpis = staffAction.schema(z.object({})).action(async () => {
  const [projetosAtivos, doacoesDoMes, tarefasAbertas] = await Promise.all([
    countProjetosAtivos(),
    sumDoacoesDoMes(),
    countTarefasAbertas(),
  ]);

  const period = currentPeriodLabel();
  const now = new Date();

  const kpis: KPI[] = [
    {
      id: "kpi-projetos-ativos",
      name: "Projetos ativos",
      value: projetosAtivos,
      unit: "projetos",
      trend: "stable",
      period,
      sourceModule: "projetos",
      updatedAt: now,
    },
    {
      id: "kpi-alunos-plataforma",
      name: "Alunos na Plataforma",
      value: 0,
      unit: "alunos",
      trend: "stable",
      period: "Aguardando Fase 6",
      sourceModule: "plataforma",
      updatedAt: now,
    },
    {
      id: "kpi-doacoes-mes",
      name: "Doações do mês",
      value: doacoesDoMes,
      unit: "R$",
      trend: "stable",
      period,
      sourceModule: "financeiro",
      updatedAt: now,
    },
    {
      id: "kpi-tarefas-abertas",
      name: "Tarefas abertas",
      value: tarefasAbertas,
      unit: "tarefas",
      trend: "stable",
      period,
      sourceModule: "tarefas",
      updatedAt: now,
    },
  ];

  return { kpis };
});
