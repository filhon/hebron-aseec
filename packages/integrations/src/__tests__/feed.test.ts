/**
 * feed.test.ts — getFeed (P-5.11)
 *
 * Sem mock: roda contra o banco real, mesmo padrão de
 * projetos-tarefas.test.ts. Cobre os dois critérios de aceite do prompt:
 * agregação real dos 3 módulos (super_admin, que enxerga tudo) e respeito à
 * RLS (um papel de staff sem policy de SELECT em financeiro.transactions —
 * "conselheiro" — não vê eventos financeiros, mas continua vendo
 * projetos/tarefas). "conselheiro" é usado no lugar de "colaborador" porque,
 * na RLS atual (0011_financeiro_rls.sql: transactions_select_staff),
 * colaborador TEM select em financeiro (papel operacional do módulo);
 * conselheiro é o papel de staff real que ilustra "sem acesso a financeiro"
 * exigido pelo critério de aceite.
 *
 * Cleanup: financeiro.transactions nunca aceita DELETE (trigger
 * forbid_transaction_mutation, 0010_financeiro.sql — mesmo padrão de
 * apps/financeiro/src/__tests__/transactions.test.ts). A transação, a conta
 * bancária e o super_admin de teste (referenciados via FK) por isso
 * permanecem entre execuções (onConflictDoNothing no beforeAll); só
 * projeto/tarefa/papel do conselheiro são de fato removidos no teardown.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  projects,
  bankAccounts,
  transactions,
  tasks,
  workspaces,
} from "@hebron/db/schema";
import { getFeed } from "../feed";

const SUPER_ADMIN_ID = "fe000000-0000-0000-0000-000000000001";
const CONSELHEIRO_ID = "fe000000-0000-0000-0000-000000000002";
const SUBMITTER_ID = "fe000000-0000-0000-0000-000000000003";
const PROJECT_ID = "fe000000-0000-0000-0000-0000000000a1";
const ACCOUNT_ID = "fe000000-0000-0000-0000-0000000000a2";
const TRANSACTION_ID = "fe000000-0000-0000-0000-0000000000a3";
const TASK_ID = "fe000000-0000-0000-0000-0000000000a4";

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: SUPER_ADMIN_ID,
        email: "feed-test-admin@test.hebron",
        fullName: "Feed Test Admin",
      },
      {
        id: CONSELHEIRO_ID,
        email: "feed-test-conselheiro@test.hebron",
        fullName: "Feed Test Conselheiro",
      },
      {
        id: SUBMITTER_ID,
        email: "feed-test-submitter@test.hebron",
        fullName: "Feed Test Submitter",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: SUPER_ADMIN_ID, role: "super_admin" },
      { userId: CONSELHEIRO_ID, role: "conselheiro" },
    ])
    .onConflictDoNothing();

  const [administrativo] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "administrativo"));
  if (!administrativo) {
    throw new Error(
      'Workspace "administrativo" não encontrado — rode as migrations de tarefas (0031_tarefas.sql).',
    );
  }

  await db
    .insert(projects)
    .values({
      id: PROJECT_ID,
      title: "Projeto Feed Test",
      tipo: "pontual",
      stage: "aprovado",
      submitterId: SUBMITTER_ID,
    })
    .onConflictDoNothing();

  await db
    .insert(bankAccounts)
    .values({
      id: ACCOUNT_ID,
      bankName: "Banco Feed Test",
      createdBy: SUPER_ADMIN_ID,
    })
    .onConflictDoNothing();

  await db
    .insert(transactions)
    .values({
      id: TRANSACTION_ID,
      type: "credito",
      amount: "100.00",
      description: "Transação Feed Test",
      date: new Date().toISOString().slice(0, 10),
      accountId: ACCOUNT_ID,
      createdBy: SUPER_ADMIN_ID,
    })
    .onConflictDoNothing();

  await db
    .insert(tasks)
    .values({
      id: TASK_ID,
      title: "Tarefa Feed Test",
      workspaceId: administrativo.id,
      createdBy: SUPER_ADMIN_ID,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  // transactions/bankAccounts/o super_admin de teste NÃO são apagados —
  // ver comentário de cleanup no topo do arquivo.
  await db.delete(tasks).where(eq(tasks.id, TASK_ID));
  await db.delete(projects).where(eq(projects.id, PROJECT_ID));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, CONSELHEIRO_ID));
  await db.delete(users).where(eq(users.id, CONSELHEIRO_ID));
  await db.delete(users).where(eq(users.id, SUBMITTER_ID));
});

describe("getFeed", () => {
  it("agrega eventos reais de projetos, financeiro e tarefas para super_admin", async () => {
    const events = await getFeed({ actorId: SUPER_ADMIN_ID, limit: 50 });

    expect(
      events.some((e) => e.module === "projetos" && e.id === PROJECT_ID),
    ).toBe(true);
    expect(
      events.some((e) => e.module === "financeiro" && e.id === TRANSACTION_ID),
    ).toBe(true);
    expect(events.some((e) => e.module === "tarefas" && e.id === TASK_ID)).toBe(
      true,
    );
  });

  it("respeita RLS: papel de staff sem acesso a financeiro não vê eventos financeiros no feed", async () => {
    const events = await getFeed({ actorId: CONSELHEIRO_ID, limit: 50 });

    expect(events.some((e) => e.module === "financeiro")).toBe(false);
    expect(events.some((e) => e.module === "tarefas" && e.id === TASK_ID)).toBe(
      true,
    );
  });
});
