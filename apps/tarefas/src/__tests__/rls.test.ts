/**
 * rls.test.ts — Políticas RLS do módulo tarefas (P-4.7, migration
 * 0033_tarefas_rls.sql)
 *
 * Testa via conexão direta (postgres.js) com SET LOCAL ROLE authenticated
 * e request.jwt.claims para simular diferentes usuários — mesmo padrão de
 * apps/projetos/src/__tests__/rls.test.ts.
 *
 * Semântica vigente (patch P-4.7, AUDIT/patches/P-4.7.md — sem membership
 * por workspace):
 *  - super_admin: full access.
 *  - colaborador: SELECT em qualquer tarefa dos 6 workspaces (transparência
 *    interna); INSERT em qualquer workspace; UPDATE/soft-DELETE apenas em
 *    tarefas que criou ou nas quais é assignee.
 *  - diretor/conselheiro: SELECT em tudo; UPDATE só em approval_requests
 *    endereçados a si; NUNCA inserem tasks (sem tarefa operacional).
 *  - comentários seguem a visibilidade da tarefa; escrita do próprio autor.
 *  - submissor (e demais papéis externos): zero acesso ao schema.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  workspaces,
  tasks,
  assignees,
  comments,
  approvalRequests,
} from "@hebron/db/schema";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IDS = {
  users: {
    superAdmin: "ea000000-0000-0000-0000-000000000001",
    colaboradorA: "ea000000-0000-0000-0000-000000000002",
    colaboradorB: "ea000000-0000-0000-0000-000000000003",
    colaboradorC: "ea000000-0000-0000-0000-000000000004",
    diretor1: "ea000000-0000-0000-0000-000000000005",
    diretor2: "ea000000-0000-0000-0000-000000000006",
    submissor1: "ea000000-0000-0000-0000-000000000007",
  },
  tasks: {
    taskByA: "ea110000-0000-0000-0000-000000000001",
    taskByB: "ea110000-0000-0000-0000-000000000002",
    taskAssignedC: "ea110000-0000-0000-0000-000000000003",
  },
  approvals: {
    forDiretor1: "ea220000-0000-0000-0000-000000000001",
  },
  comments: {
    onTaskByA: "ea330000-0000-0000-0000-000000000001",
  },
} as const;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

// ── Helpers ───────────────────────────────────────────────────────────────────

async function queryAs(userId: string, query: string): Promise<postgres.Row[]> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  let rows: postgres.Row[] = [];

  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
      rows = await tx.unsafe(query);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }

  return rows;
}

async function queryAsAnon(query: string): Promise<postgres.Row[]> {
  let rows: postgres.Row[] = [];
  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE anon`;
      rows = await tx.unsafe(query);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }
  return rows;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let workspaceIds: { administrativo: string; financeiro: string };

beforeAll(async () => {
  const userFixtures = [
    {
      id: IDS.users.superAdmin,
      email: "rls-taref-super@test.hebron",
      fullName: "RLS Taref SuperAdmin",
    },
    {
      id: IDS.users.colaboradorA,
      email: "rls-taref-colab-a@test.hebron",
      fullName: "RLS Taref Colaborador A",
    },
    {
      id: IDS.users.colaboradorB,
      email: "rls-taref-colab-b@test.hebron",
      fullName: "RLS Taref Colaborador B",
    },
    {
      id: IDS.users.colaboradorC,
      email: "rls-taref-colab-c@test.hebron",
      fullName: "RLS Taref Colaborador C",
    },
    {
      id: IDS.users.diretor1,
      email: "rls-taref-dir-1@test.hebron",
      fullName: "RLS Taref Diretor 1",
    },
    {
      id: IDS.users.diretor2,
      email: "rls-taref-dir-2@test.hebron",
      fullName: "RLS Taref Diretor 2",
    },
    {
      id: IDS.users.submissor1,
      email: "rls-taref-sub@test.hebron",
      fullName: "RLS Taref Submissor",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  const roleSeed = [
    {
      userId: IDS.users.superAdmin,
      role: "super_admin" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.colaboradorA,
      role: "colaborador" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.colaboradorB,
      role: "colaborador" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.colaboradorC,
      role: "colaborador" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.diretor1,
      role: "diretor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.diretor2,
      role: "diretor" as const,
      grantedBy: IDS.users.superAdmin,
    },
    {
      userId: IDS.users.submissor1,
      role: "submissor" as const,
      grantedBy: IDS.users.superAdmin,
    },
  ];
  for (const r of roleSeed) {
    await db.insert(roleAssignments).values(r).onConflictDoNothing();
  }

  const wsRows = await db.select().from(workspaces);
  const bySlug = new Map(wsRows.map((w) => [w.slug, w.id]));
  const administrativo = bySlug.get("administrativo");
  const financeiro = bySlug.get("financeiro");
  if (!administrativo || !financeiro) {
    throw new Error("Workspaces fixos não encontrados (seed ausente)");
  }
  workspaceIds = { administrativo, financeiro };

  await db
    .insert(tasks)
    .values([
      {
        id: IDS.tasks.taskByA,
        title: "Tarefa de A",
        workspaceId: workspaceIds.administrativo,
        createdBy: IDS.users.colaboradorA,
      },
      {
        id: IDS.tasks.taskByB,
        title: "Tarefa de B",
        workspaceId: workspaceIds.administrativo,
        createdBy: IDS.users.colaboradorB,
      },
      {
        id: IDS.tasks.taskAssignedC,
        title: "Tarefa atribuída a C",
        workspaceId: workspaceIds.administrativo,
        createdBy: IDS.users.colaboradorA,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(assignees)
    .values({ taskId: IDS.tasks.taskAssignedC, userId: IDS.users.colaboradorC })
    .onConflictDoNothing();

  await db
    .insert(comments)
    .values({
      id: IDS.comments.onTaskByA,
      taskId: IDS.tasks.taskByA,
      authorId: IDS.users.colaboradorA,
      content: "Comentário de teste RLS",
    })
    .onConflictDoNothing();

  await db
    .insert(approvalRequests)
    .values({
      id: IDS.approvals.forDiretor1,
      taskId: IDS.tasks.taskByA,
      requestedStatus: "concluido",
      requestedBy: IDS.users.colaboradorA,
      approverId: IDS.users.diretor1,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(approvalRequests)
    .where(inArray(approvalRequests.id, Object.values(IDS.approvals)));
  await db
    .delete(comments)
    .where(inArray(comments.id, Object.values(IDS.comments)));
  await db
    .delete(assignees)
    .where(eq(assignees.taskId, IDS.tasks.taskAssignedC));
  await db.delete(tasks).where(inArray(tasks.id, Object.values(IDS.tasks)));
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }
  await sql.end();
});

// ── super_admin: full access ───────────────────────────────────────────────────

describe("RLS — super_admin: full access", () => {
  it("vê todas as tarefas, inclusive de qualquer colaborador", async () => {
    const rows = await queryAs(
      IDS.users.superAdmin,
      "SELECT id FROM tarefas.tasks",
    );
    const ids = rows.map((r) => r["id"]);
    expect(ids).toContain(IDS.tasks.taskByA);
    expect(ids).toContain(IDS.tasks.taskByB);
  });

  it("pode UPDATE qualquer tarefa, mesmo sem ser criador/assignee", async () => {
    const rows = await queryAs(
      IDS.users.superAdmin,
      `UPDATE tarefas.tasks SET title = 'Editado por super_admin' WHERE id = '${IDS.tasks.taskByB}' RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });
});

// ── colaborador: transparência interna (SELECT tudo) ───────────────────────────

describe("RLS — colaborador: SELECT em qualquer tarefa (transparência interna)", () => {
  it("colaboradorA vê tarefa criada por colaboradorB", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorA,
      `SELECT id FROM tarefas.tasks WHERE id = '${IDS.tasks.taskByB}'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("colaboradorB vê tarefa criada por colaboradorA", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorB,
      `SELECT id FROM tarefas.tasks WHERE id = '${IDS.tasks.taskByA}'`,
    );
    expect(rows).toHaveLength(1);
  });
});

// ── colaborador: UPDATE/DELETE só como creator/assignee ────────────────────────

describe("RLS — colaborador: UPDATE/soft-DELETE só como creator ou assignee (2 usuários)", () => {
  it("colaboradorA (criador) atualiza a própria tarefa", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorA,
      `UPDATE tarefas.tasks SET title = 'Editado por A' WHERE id = '${IDS.tasks.taskByA}' RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("colaboradorB NÃO atualiza tarefa de colaboradorA (nem criador, nem assignee)", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorB,
      `UPDATE tarefas.tasks SET title = 'Hackeado' WHERE id = '${IDS.tasks.taskByA}' RETURNING id`,
    );
    expect(rows).toHaveLength(0);
  });

  it("colaboradorC (assignee) atualiza a tarefa da qual é responsável", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorC,
      `UPDATE tarefas.tasks SET status = 'em_progresso' WHERE id = '${IDS.tasks.taskAssignedC}' RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("colaboradorB NÃO faz soft-delete de tarefa de colaboradorA", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorB,
      `UPDATE tarefas.tasks SET deleted_at = now() WHERE id = '${IDS.tasks.taskByA}' RETURNING id`,
    );
    expect(rows).toHaveLength(0);
  });

  it("colaboradorA faz soft-delete da própria tarefa", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorA,
      `UPDATE tarefas.tasks SET deleted_at = now() WHERE id = '${IDS.tasks.taskByA}' RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });
});

// ── colaborador: INSERT em qualquer workspace ──────────────────────────────────

describe("RLS — colaborador: INSERT em qualquer um dos 6 workspaces", () => {
  it("colaboradorA insere tarefa em workspace diferente do da fixture (financeiro)", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorA,
      `INSERT INTO tarefas.tasks (title, workspace_id, created_by) VALUES ('Nova tarefa financeiro', '${workspaceIds.financeiro}', '${IDS.users.colaboradorA}') RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("diretor NÃO insere tarefa (BRAIN §6.9 — sem tarefa operacional)", async () => {
    await expect(
      queryAs(
        IDS.users.diretor1,
        `INSERT INTO tarefas.tasks (title, workspace_id, created_by) VALUES ('Tarefa indevida', '${workspaceIds.administrativo}', '${IDS.users.diretor1}') RETURNING id`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

// ── diretor: SELECT em tudo; UPDATE só em approval_requests endereçados a si ──

describe("RLS — diretor: SELECT em todas as tarefas; UPDATE só em approval_requests endereçados a si", () => {
  it("diretor1 vê tarefas de qualquer colaborador (TreeView de despacho)", async () => {
    const rows = await queryAs(
      IDS.users.diretor1,
      "SELECT id FROM tarefas.tasks WHERE deleted_at IS NULL",
    );
    const ids = rows.map((r) => r["id"]);
    expect(ids).toContain(IDS.tasks.taskByB);
    expect(ids).toContain(IDS.tasks.taskAssignedC);
  });

  it("diretor1 (endereçado) resolve o pedido de aprovação dirigido a si", async () => {
    const rows = await queryAs(
      IDS.users.diretor1,
      `UPDATE tarefas.approval_requests SET status = 'aprovado' WHERE id = '${IDS.approvals.forDiretor1}' RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("diretor2 (não endereçado) NÃO resolve pedido dirigido a outro diretor", async () => {
    const rows = await queryAs(
      IDS.users.diretor2,
      `UPDATE tarefas.approval_requests SET status = 'rejeitado' WHERE id = '${IDS.approvals.forDiretor1}' RETURNING id`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── approval_requests: USING e WITH CHECK separados ────────────────────────────

describe("RLS — approval_requests: WITH CHECK (requested_by = auth.uid()) separado do USING", () => {
  it("colaboradorA insere pedido em nome de si mesmo", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorA,
      `INSERT INTO tarefas.approval_requests (task_id, requested_status, requested_by, approver_id) VALUES ('${IDS.tasks.taskByB}', 'concluido', '${IDS.users.colaboradorA}', '${IDS.users.diretor1}') RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("colaboradorA NÃO insere pedido se fizer-se passar por outro colaborador", async () => {
    await expect(
      queryAs(
        IDS.users.colaboradorA,
        `INSERT INTO tarefas.approval_requests (task_id, requested_status, requested_by, approver_id) VALUES ('${IDS.tasks.taskByB}', 'concluido', '${IDS.users.colaboradorB}', '${IDS.users.diretor1}') RETURNING id`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

// ── comments: seguem a visibilidade da tarefa; escrita do próprio autor ───────

describe("RLS — comments: seguem a visibilidade da tarefa; escrita do próprio autor", () => {
  it("colaboradorB vê comentário em tarefa de colaboradorA (transparência)", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorB,
      `SELECT id FROM tarefas.comments WHERE id = '${IDS.comments.onTaskByA}'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("colaboradorB NÃO edita comentário de colaboradorA (escrita restrita ao autor)", async () => {
    const rows = await queryAs(
      IDS.users.colaboradorB,
      `UPDATE tarefas.comments SET content = 'hackeado' WHERE id = '${IDS.comments.onTaskByA}' RETURNING id`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── submissor: zero acesso ao schema ────────────────────────────────────────────

describe("RLS — submissor: zero acesso ao schema tarefas", () => {
  it("submissor NÃO vê tarefas", async () => {
    const rows = await queryAs(
      IDS.users.submissor1,
      "SELECT id FROM tarefas.tasks",
    );
    expect(rows).toHaveLength(0);
  });

  it("submissor NÃO vê approval_requests", async () => {
    const rows = await queryAs(
      IDS.users.submissor1,
      "SELECT id FROM tarefas.approval_requests",
    );
    expect(rows).toHaveLength(0);
  });

  it("submissor NÃO vê comentários", async () => {
    const rows = await queryAs(
      IDS.users.submissor1,
      "SELECT id FROM tarefas.comments",
    );
    expect(rows).toHaveLength(0);
  });
});

// ── anon: sem GRANT no schema tarefas ────────────────────────────────────────────

describe("RLS — anon não lê nada de tarefas.*", () => {
  it("anon NÃO lê tarefas.tasks (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM tarefas.tasks LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema tarefas/i);
  });
});
