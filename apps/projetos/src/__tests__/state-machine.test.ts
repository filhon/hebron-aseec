/**
 * state-machine.test.ts — Máquina de estados de projetos
 *
 * Testa o mapa VALID_STAGE_TRANSITIONS (lógica pura) e a persistência
 * de estágios no banco de dados.
 *
 * Não invoca Server Actions (dependem do contexto Supabase Auth);
 * em vez disso, testa o invariante que as actions usam diretamente.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  VALID_STAGE_TRANSITIONS,
  PROJECT_STAGES,
  projects,
  projectVersions,
  organizations,
  organizationMembers,
  users,
  roleAssignments,
} from "@hebron/db/schema";
import type { ProjectStage } from "@hebron/db/schema";

// ── Fixtures DB (usados apenas nos testes de persistência) ────────────────────

const SM_IDS = {
  submissor: "ddaa0000-0000-0000-0000-000000000001",
  org: "ddbb0000-0000-0000-0000-000000000001",
} as const;

beforeAll(async () => {
  await db
    .insert(users)
    .values({ id: SM_IDS.submissor, email: "sm-sub@test.hebron", fullName: "SM Submissor" })
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values({ userId: SM_IDS.submissor, role: "submissor", grantedBy: SM_IDS.submissor })
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values({ id: SM_IDS.org, nome: "Org SM Test", createdBy: SM_IDS.submissor })
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
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, SM_IDS.submissor));
  await db.delete(users).where(eq(users.id, SM_IDS.submissor));
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

  it("validacao → [votacao, aprovado, reprovado] — caminhos anual e pontual", () => {
    const valid = VALID_STAGE_TRANSITIONS.validacao;
    expect(valid).toContain("votacao");
    expect(valid).toContain("aprovado");
    expect(valid).toContain("reprovado");
  });

  it("votacao → [homologacao] — única transição de saída", () => {
    expect(VALID_STAGE_TRANSITIONS.votacao).toEqual(["homologacao"]);
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
    expect(() => assertInvalid("rascunho", "aprovado")).toThrow("Transição inválida");
  });

  it("rascunho → concluido lança erro", () => {
    expect(() => assertInvalid("rascunho", "concluido")).toThrow("Transição inválida");
  });

  it("rascunho → votacao lança erro (deve passar por validacao)", () => {
    expect(() => assertInvalid("rascunho", "votacao")).toThrow("Transição inválida");
  });

  it("votacao → aprovado lança erro (deve passar por homologacao)", () => {
    expect(() => assertInvalid("votacao", "aprovado")).toThrow("Transição inválida");
  });

  it("votacao → reprovado lança erro (deve passar por homologacao)", () => {
    expect(() => assertInvalid("votacao", "reprovado")).toThrow("Transição inválida");
  });

  it("aprovado → concluido lança erro (deve passar por em_execucao)", () => {
    expect(() => assertInvalid("aprovado", "concluido")).toThrow("Transição inválida");
  });

  it("reprovado → qualquer estágio lança erro (terminal)", () => {
    for (const stage of PROJECT_STAGES) {
      expect(() => assertInvalid("reprovado", stage)).toThrow("Transição inválida");
    }
  });

  it("concluido → qualquer estágio lança erro (terminal)", () => {
    for (const stage of PROJECT_STAGES) {
      expect(() => assertInvalid("concluido", stage)).toThrow("Transição inválida");
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

  it("caminho pontual aprovado: validacao → aprovado (skip votacao/homologacao)", () => {
    expect(isValidTransition("validacao", "aprovado")).toBe(true);
  });

  it("caminho pontual reprovado: validacao → reprovado", () => {
    expect(isValidTransition("validacao", "reprovado")).toBe(true);
  });

  it("contestação usa update direto (não consta em VALID_STAGE_TRANSITIONS)", () => {
    // createContestation faz db.update({ stage: 'votacao' }) direto, sem passar
    // pelo mapa de transições — portanto homologacao→votacao NÃO está no mapa.
    expect(isValidTransition("homologacao", "votacao")).toBe(false);
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
