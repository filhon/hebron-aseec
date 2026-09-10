/**
 * state-machine.test.ts — Máquina de estados de projetos
 *
 * Testa o mapa VALID_STAGE_TRANSITIONS (lógica pura), a persistência
 * de estágios no banco de dados, e — a partir de P-2.12b — a action
 * `transitionProjectStage` que de fato aplica o mapa em produção
 * (achado do corretivo: os testes anteriores só verificavam a constante,
 * nunca a action que deveria obedecê-la).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  VALID_STAGE_TRANSITIONS,
  getValidStageTransitions,
  PROJECT_STAGES,
  projects,
  projectVersions,
  organizations,
  organizationMembers,
  users,
  roleAssignments,
  auditLog,
} from "@hebron/db/schema";
import type { ProjectStage } from "@hebron/db/schema";

// transitionProjectStage roda pelo pipeline real de Server Action
// (diretorAction) — precisa de sessão mockada, mesmo padrão de
// voting.test.ts/close-voting.test.ts.
const resolveSessionMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@hebron/auth/server", () => ({
  resolveSession: (...args: unknown[]) => resolveSessionMock(...args),
}));

// ── Fixtures DB (usados apenas nos testes de persistência) ────────────────────

const SM_IDS = {
  submissor: "ddaa0000-0000-0000-0000-000000000001",
  diretor: "ddaa0000-0000-0000-0000-000000000002",
  // P-2.18 CORRETIVO: um projeto em `validacao` é invisível a diretor via
  // RLS (mesmo achado do comentário abaixo, describe "transitionProjectStage
  // (action real)") — o teste de recusa pontual validacao→aprovado precisa
  // de um ator que enxergue a linha, daí super_admin aqui.
  superAdmin: "ddaa0000-0000-0000-0000-000000000003",
  org: "ddbb0000-0000-0000-0000-000000000001",
} as const;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: SM_IDS.submissor,
        email: "sm-sub@test.hebron",
        fullName: "SM Submissor",
      },
      {
        id: SM_IDS.diretor,
        email: "sm-dir@test.hebron",
        fullName: "SM Diretor",
      },
      {
        id: SM_IDS.superAdmin,
        email: "sm-adm@test.hebron",
        fullName: "SM Admin",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: SM_IDS.submissor,
        role: "submissor",
        grantedBy: SM_IDS.submissor,
      },
      {
        userId: SM_IDS.diretor,
        role: "diretor",
        grantedBy: SM_IDS.submissor,
      },
      {
        userId: SM_IDS.superAdmin,
        role: "super_admin",
        grantedBy: SM_IDS.submissor,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values({
      id: SM_IDS.org,
      nome: "Org SM Test",
      createdBy: SM_IDS.submissor,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values({ organizationId: SM_IDS.org, userId: SM_IDS.submissor })
    .onConflictDoNothing();
});

afterAll(async () => {
  // Cascade delete removes project_versions as well
  await db.delete(projects).where(eq(projects.submitterId, SM_IDS.submissor));
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, SM_IDS.org));
  await db.delete(organizations).where(eq(organizations.id, SM_IDS.org));
  // transitionProjectStage (P-2.12b) grava audit_log com actorId = diretor —
  // precisa ser limpo antes de deletar o usuário (audit_log_actor_id_fkey).
  await db.delete(auditLog).where(eq(auditLog.actorId, SM_IDS.diretor));
  await db.delete(auditLog).where(eq(auditLog.actorId, SM_IDS.superAdmin));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, SM_IDS.submissor));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, SM_IDS.diretor));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, SM_IDS.superAdmin));
  await db.delete(users).where(eq(users.id, SM_IDS.submissor));
  await db.delete(users).where(eq(users.id, SM_IDS.diretor));
  await db.delete(users).where(eq(users.id, SM_IDS.superAdmin));
});

// ── Cobertura do mapa ─────────────────────────────────────────────────────────

describe("State Machine — VALID_STAGE_TRANSITIONS: cobertura", () => {
  it("todo estágio possui entrada no mapa", () => {
    for (const stage of PROJECT_STAGES) {
      expect(
        Object.prototype.hasOwnProperty.call(VALID_STAGE_TRANSITIONS, stage),
        `estágio '${stage}' não encontrado no mapa`,
      ).toBe(true);
    }
  });

  it("rascunho → [validacao] — única transição de saída", () => {
    expect(VALID_STAGE_TRANSITIONS.rascunho).toEqual(["validacao"]);
  });

  it("validacao → [votacao, aprovado, reprovado] — mapa base (anual); pontual é sobrescrito por getValidStageTransitions", () => {
    const valid = VALID_STAGE_TRANSITIONS.validacao;
    expect(valid).toContain("votacao");
    expect(valid).toContain("aprovado");
    expect(valid).toContain("reprovado");
  });

  it("votacao → [homologacao, validacao] — inclui o retorno para correção (P-2.16 CORRETIVO)", () => {
    const valid = VALID_STAGE_TRANSITIONS.votacao;
    expect(valid).toContain("homologacao");
    expect(valid).toContain("validacao");
    expect(valid).toHaveLength(2);
  });

  it("homologacao → [aprovado, reprovado]", () => {
    const valid = VALID_STAGE_TRANSITIONS.homologacao;
    expect(valid).toContain("aprovado");
    expect(valid).toContain("reprovado");
  });

  it("aprovado → [em_execucao] — única transição de saída", () => {
    expect(VALID_STAGE_TRANSITIONS.aprovado).toEqual(["em_execucao"]);
  });

  it("em_execucao → [concluido] — única transição de saída", () => {
    expect(VALID_STAGE_TRANSITIONS.em_execucao).toEqual(["concluido"]);
  });

  it("reprovado é terminal — lista vazia", () => {
    expect(VALID_STAGE_TRANSITIONS.reprovado).toHaveLength(0);
  });

  it("concluido é terminal — lista vazia", () => {
    expect(VALID_STAGE_TRANSITIONS.concluido).toHaveLength(0);
  });
});

// ── Transições inválidas ──────────────────────────────────────────────────────

describe("State Machine — transição inválida retorna erro", () => {
  function assertInvalid(from: ProjectStage, to: ProjectStage): void {
    const validNext = VALID_STAGE_TRANSITIONS[from] as string[];
    if (!validNext.includes(to)) {
      throw new Error(
        `Transição inválida: ${from} → ${to}. ` +
          `Próximos estágios válidos: ${VALID_STAGE_TRANSITIONS[from].join(", ")}`,
      );
    }
  }

  it("rascunho → aprovado lança erro", () => {
    expect(() => assertInvalid("rascunho", "aprovado")).toThrow(
      "Transição inválida",
    );
  });

  it("rascunho → concluido lança erro", () => {
    expect(() => assertInvalid("rascunho", "concluido")).toThrow(
      "Transição inválida",
    );
  });

  it("rascunho → votacao lança erro (deve passar por validacao)", () => {
    expect(() => assertInvalid("rascunho", "votacao")).toThrow(
      "Transição inválida",
    );
  });

  it("votacao → aprovado lança erro (deve passar por homologacao)", () => {
    expect(() => assertInvalid("votacao", "aprovado")).toThrow(
      "Transição inválida",
    );
  });

  it("votacao → reprovado lança erro (deve passar por homologacao)", () => {
    expect(() => assertInvalid("votacao", "reprovado")).toThrow(
      "Transição inválida",
    );
  });

  it("aprovado → concluido lança erro (deve passar por em_execucao)", () => {
    expect(() => assertInvalid("aprovado", "concluido")).toThrow(
      "Transição inválida",
    );
  });

  it("reprovado → qualquer estágio lança erro (terminal)", () => {
    for (const stage of PROJECT_STAGES) {
      expect(() => assertInvalid("reprovado", stage)).toThrow(
        "Transição inválida",
      );
    }
  });

  it("concluido → qualquer estágio lança erro (terminal)", () => {
    for (const stage of PROJECT_STAGES) {
      expect(() => assertInvalid("concluido", stage)).toThrow(
        "Transição inválida",
      );
    }
  });
});

// ── Caminhos de aprovação ─────────────────────────────────────────────────────

describe("State Machine — caminhos de aprovação válidos", () => {
  function isValidTransition(from: ProjectStage, to: ProjectStage): boolean {
    return (VALID_STAGE_TRANSITIONS[from] as string[]).includes(to);
  }

  it("caminho anual completo: rascunho→validacao→votacao→homologacao→aprovado→em_execucao→concluido", () => {
    const path: ProjectStage[] = [
      "rascunho",
      "validacao",
      "votacao",
      "homologacao",
      "aprovado",
      "em_execucao",
      "concluido",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      if (!from || !to) continue;
      expect(
        isValidTransition(from, to),
        `Esperado que ${from} → ${to} seja válido`,
      ).toBe(true);
    }
  });

  it("contestação usa update direto (não consta em VALID_STAGE_TRANSITIONS)", () => {
    // createContestation faz db.update({ stage: ... }) direto, sem passar
    // pelo mapa de transições — portanto homologacao→votacao/validacao NÃO
    // consta no mapa.
    expect(isValidTransition("homologacao", "votacao")).toBe(false);
    expect(isValidTransition("homologacao", "validacao")).toBe(false);
  });
});

// ── getValidStageTransitions — mapa por tipo de projeto (P-2.18 CORRETIVO) ─────

describe("State Machine — getValidStageTransitions: pontual pula votacao mas passa por homologacao", () => {
  it("pontual em validacao: só pode ir para homologacao (aprovado/reprovado direto foi removido)", () => {
    const valid = getValidStageTransitions("pontual", "validacao");
    expect(valid).toEqual(["homologacao"]);
  });

  it("anual em validacao: mantém votacao/aprovado/reprovado (comportamento pré-existente, fora do escopo deste corretivo)", () => {
    const valid = getValidStageTransitions("anual", "validacao");
    expect(valid).toEqual(VALID_STAGE_TRANSITIONS.validacao);
  });

  it("pontual em homologacao: aprovado/reprovado — mesmo mapa do anual", () => {
    expect(getValidStageTransitions("pontual", "homologacao")).toEqual(
      VALID_STAGE_TRANSITIONS.homologacao,
    );
  });

  it("pontual em qualquer outro estágio: cai no mapa base (sem override)", () => {
    for (const stage of PROJECT_STAGES) {
      if (stage === "validacao") continue;
      expect(getValidStageTransitions("pontual", stage)).toEqual(
        VALID_STAGE_TRANSITIONS[stage],
      );
    }
  });
});

// ── DB: persistência de estágio ───────────────────────────────────────────────

describe("State Machine — DB: estágio persiste e transita corretamente", () => {
  it("projeto inserido em rascunho tem stage=rascunho no banco", async () => {
    const [inserted] = await db
      .insert(projects)
      .values({
        title: "SM Test — Rascunho",
        tipo: "anual",
        stage: "rascunho",
        organizationId: SM_IDS.org,
        submitterId: SM_IDS.submissor,
        evaluationYear: 2026,
        budgetTotal: "5000.00",
        parcelas: 1,
        meses: 1,
      })
      .returning();

    if (!inserted) throw new Error("Falha ao inserir projeto");
    expect(inserted.stage).toBe("rascunho");

    await db.delete(projects).where(eq(projects.id, inserted.id));
  });

  it("transição rascunho→validacao persiste o novo estágio + submittedAt", async () => {
    const [proj] = await db
      .insert(projects)
      .values({
        title: "SM Test — Transição Validacao",
        tipo: "anual",
        stage: "rascunho",
        organizationId: SM_IDS.org,
        submitterId: SM_IDS.submissor,
        evaluationYear: 2026,
        budgetTotal: "5000.00",
        parcelas: 1,
        meses: 1,
      })
      .returning();

    if (!proj) throw new Error("Falha ao inserir projeto");

    const now = new Date();
    const [updated] = await db
      .update(projects)
      .set({ stage: "validacao", submittedAt: now, updatedAt: now })
      .where(eq(projects.id, proj.id))
      .returning();

    if (!updated) throw new Error("Falha ao atualizar projeto");
    expect(updated.stage).toBe("validacao");
    expect(updated.submittedAt).not.toBeNull();

    await db.delete(projects).where(eq(projects.id, proj.id));
  });

  it("snapshot de versão cria entrada com stage correto", async () => {
    const [proj] = await db
      .insert(projects)
      .values({
        title: "SM Test — Snapshot",
        tipo: "anual",
        stage: "validacao",
        organizationId: SM_IDS.org,
        submitterId: SM_IDS.submissor,
        evaluationYear: 2026,
        budgetTotal: "5000.00",
        parcelas: 1,
        meses: 1,
      })
      .returning();

    if (!proj) throw new Error("Falha ao inserir projeto");

    await db.insert(projectVersions).values({
      projectId: proj.id,
      versionNumber: 1,
      stage: "validacao",
      data: { _source: "test" },
      createdBy: SM_IDS.submissor,
    });

    const versions = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, proj.id));

    expect(versions).toHaveLength(1);
    expect(versions.at(0)?.stage).toBe("validacao");

    // Cascade delete via project deletion
    await db.delete(projects).where(eq(projects.id, proj.id));
  });

  it("projeto soft-deleted não retorna em consulta com isNull(deletedAt)", async () => {
    const [proj] = await db
      .insert(projects)
      .values({
        title: "SM Test — Soft Delete",
        tipo: "anual",
        stage: "rascunho",
        organizationId: SM_IDS.org,
        submitterId: SM_IDS.submissor,
        evaluationYear: 2026,
        budgetTotal: "5000.00",
        parcelas: 1,
        meses: 1,
      })
      .returning();

    if (!proj) throw new Error("Falha ao inserir projeto");

    await db
      .update(projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, proj.id));

    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.id, proj.id));

    const active = rows.filter((r) => r.deletedAt === null);
    expect(active).toHaveLength(0);
    expect(rows.at(0)?.deletedAt).not.toBeNull(); // audit trail preservado

    await db.delete(projects).where(eq(projects.id, proj.id));
  });
});

// ── Action: transitionProjectStage obedece o mapa de verdade ──────────────────
//
// P-2.12b: os 25 testes acima verificam a constante VALID_STAGE_TRANSITIONS
// e checagens manuais equivalentes ao `if` de produção — nenhum chamava a
// action que de fato aplica o mapa. transitionProjectStage (diretorAction,
// actions/projects.ts) é a action genérica de avanço de estágio; castVote/
// closeVoting/triggerPanicButton (voting.ts) já são cobertas contra o mapa
// em voting.test.ts/close-voting.test.ts.

describe("State Machine — transitionProjectStage (action real) aplica e recusa conforme o mapa", () => {
  // Os cenários usam projetos em "aprovado"/"homologacao", não "validacao"/
  // "rascunho": a RLS "projects_select_reviewer" (0007_projetos_rls.sql)
  // só dá SELECT a diretor/conselheiro em projetos com stage IN (votacao,
  // homologacao, aprovado, reprovado, em_execucao, concluido) — um projeto
  // em rascunho/validacao é invisível para o ator diretor usado aqui, e
  // getProjectOrThrow lançaria "Projeto não encontrado" antes mesmo de
  // chegar na checagem do mapa, testando a RLS por acidente em vez da
  // transição. Achado registrado em SESSIONS.md: a página
  // (diretoria)/pipeline chama esta mesma action para validacao → votacao,
  // o que sugere uma lacuna de RLS pré-existente fora do escopo de arquivos
  // permitidos deste corretivo (actions/projects.ts).
  it("aprovado → em_execucao: transição válida é aplicada pela action, versão registrada", async () => {
    // "aprovado" (não "homologacao → aprovado") de propósito: toStage
    // "aprovado" dispara onProjectApproved (cross-app fire-and-forget,
    // packages/db/projetos-approval.ts) que cria financeiro.cost_centers/
    // payables — uma corrida entre esse insert assíncrono e o cleanup do
    // teste (cost_centers_project_id_fkey é onDelete: restrict). "aprovado
    // → em_execucao" exercita o mesmo mapa sem esse efeito colateral.
    const [proj] = await db
      .insert(projects)
      .values({
        title: "SM Test — Action Transição Válida",
        tipo: "anual",
        stage: "aprovado",
        organizationId: SM_IDS.org,
        submitterId: SM_IDS.submissor,
        evaluationYear: 2026,
        budgetTotal: "5000.00",
        parcelas: 1,
        meses: 1,
      })
      .returning();
    if (!proj) throw new Error("Falha ao inserir projeto");

    resolveSessionMock.mockResolvedValueOnce({
      actorId: SM_IDS.diretor,
      roles: ["diretor"],
    });
    const { transitionProjectStage } = await import("../actions/projects");
    const result = await transitionProjectStage({
      projectId: proj.id,
      toStage: "em_execucao",
    });

    expect(result?.serverError).toBeUndefined();

    const [updated] = await db
      .select({ stage: projects.stage, startedAt: projects.startedAt })
      .from(projects)
      .where(eq(projects.id, proj.id));
    expect(updated?.stage).toBe("em_execucao");
    expect(updated?.startedAt).not.toBeNull();

    const versions = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, proj.id));
    expect(versions.some((v) => v.stage === "em_execucao")).toBe(true);

    await db.delete(projects).where(eq(projects.id, proj.id));
  });

  it("homologacao → votacao: transição inválida é recusada pela action, estágio não muda", async () => {
    const [proj] = await db
      .insert(projects)
      .values({
        title: "SM Test — Action Transição Inválida",
        tipo: "anual",
        stage: "homologacao",
        organizationId: SM_IDS.org,
        submitterId: SM_IDS.submissor,
        evaluationYear: 2026,
        budgetTotal: "5000.00",
        parcelas: 1,
        meses: 1,
      })
      .returning();
    if (!proj) throw new Error("Falha ao inserir projeto");

    resolveSessionMock.mockResolvedValueOnce({
      actorId: SM_IDS.diretor,
      roles: ["diretor"],
    });
    const { transitionProjectStage } = await import("../actions/projects");
    const result = await transitionProjectStage({
      projectId: proj.id,
      toStage: "votacao",
    });

    // next-safe-action generaliza a mensagem do Error lançado (sem
    // handleReturnedServerError customizado) — só "houve erro" é
    // observável no cliente; o efeito real é o que importa aqui.
    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, proj.id));
    expect(row?.stage).toBe("homologacao");

    await db.delete(projects).where(eq(projects.id, proj.id));
  });

  // P-2.18 CORRETIVO: critério de aceite "Transição validacao → aprovado
  // para pontual passa a ser recusada" — verificado aqui na action real,
  // não só no mapa puro (describe "getValidStageTransitions" acima). Ator
  // super_admin porque diretor não enxerga um projeto em `validacao` via
  // RLS (`projects_select_reviewer` só cobre votacao+, comentário no topo
  // deste describe) — usar diretor testaria "Projeto não encontrado", não
  // a recusa da transição.
  it("pontual validacao → aprovado: action recusa (pontual passou a exigir homologacao)", async () => {
    const [proj] = await db
      .insert(projects)
      .values({
        title: "SM Test — Pontual Validacao Recusa Aprovado",
        tipo: "pontual",
        stage: "validacao",
        organizationId: SM_IDS.org,
        submitterId: SM_IDS.submissor,
        evaluationYear: 2026,
        budgetTotal: "3000.00",
        parcelas: 1,
        meses: 1,
      })
      .returning();
    if (!proj) throw new Error("Falha ao inserir projeto");

    resolveSessionMock.mockResolvedValueOnce({
      actorId: SM_IDS.superAdmin,
      roles: ["super_admin"],
    });
    const { transitionProjectStage } = await import("../actions/projects");
    const result = await transitionProjectStage({
      projectId: proj.id,
      toStage: "aprovado",
    });

    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, proj.id));
    expect(row?.stage).toBe("validacao");

    // Controle positivo: a mesma transição segue aberta para o anual —
    // prova que a recusa acima é por tipo, não por um bug geral no mapa.
    const [projAnual] = await db
      .insert(projects)
      .values({
        title: "SM Test — Anual Validacao Aprovado Continua Valido (controle)",
        tipo: "anual",
        stage: "validacao",
        organizationId: SM_IDS.org,
        submitterId: SM_IDS.submissor,
        evaluationYear: 2026,
        budgetTotal: "3000.00",
        parcelas: 1,
        meses: 1,
      })
      .returning();
    if (!projAnual) throw new Error("Falha ao inserir projeto de controle");

    resolveSessionMock.mockResolvedValueOnce({
      actorId: SM_IDS.superAdmin,
      roles: ["super_admin"],
    });
    const controlResult = await transitionProjectStage({
      projectId: projAnual.id,
      toStage: "votacao",
    });
    expect(controlResult?.serverError).toBeUndefined();

    await db.delete(projects).where(eq(projects.id, proj.id));
    await db.delete(projects).where(eq(projects.id, projAnual.id));
  });

  it("reprovado → qualquer estágio: action recusa (terminal), mesmo para super_admin", async () => {
    const [proj] = await db
      .insert(projects)
      .values({
        title: "SM Test — Action Terminal Reprovado",
        tipo: "anual",
        stage: "reprovado",
        organizationId: SM_IDS.org,
        submitterId: SM_IDS.submissor,
        evaluationYear: 2026,
        budgetTotal: "5000.00",
        parcelas: 1,
        meses: 1,
      })
      .returning();
    if (!proj) throw new Error("Falha ao inserir projeto");

    resolveSessionMock.mockResolvedValueOnce({
      actorId: SM_IDS.diretor,
      roles: ["diretor"],
    });
    const { transitionProjectStage } = await import("../actions/projects");
    const result = await transitionProjectStage({
      projectId: proj.id,
      toStage: "em_execucao",
    });

    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select({ stage: projects.stage })
      .from(projects)
      .where(eq(projects.id, proj.id));
    expect(row?.stage).toBe("reprovado");

    await db.delete(projects).where(eq(projects.id, proj.id));
  });
});
