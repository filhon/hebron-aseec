/**
 * duplicate-detection.test.ts — P-2.14
 *
 * Cobre o caminho de ponta a ponta que `packages/ai/src/__tests__/
 * duplicate-detection.test.ts` não alcança: a query real de similaridade de
 * cosseno (pgvector `<=>`) dentro de `submitProject`, a gravação do
 * snapshot (`possible_duplicate`/`duplicate_candidates`) e a regra de
 * visibilidade (nunca ao submissor). `generateProjectEmbedding` é mockado
 * (rede/quota da OpenAI indisponível neste ambiente) para retornar vetores
 * determinísticos — a comparação em si roda contra o banco real via
 * pgvector, não mockada.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  projectVersions,
  notifications,
  auditLog,
} from "@hebron/db/schema";
import type { Role } from "@hebron/types/roles";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

vi.mock("@hebron/ai/projects/scoring", () => ({
  scoreProject: vi
    .fn()
    .mockResolvedValue({ score: 80, breakdown: {}, aiJustification: "" }),
  DEFAULT_SCORING_CRITERIA: { maxScore: 100, criteria: [] },
}));

vi.mock("@hebron/ai/projects/compact-version", () => ({
  generateCompactVersion: vi
    .fn()
    .mockResolvedValue({ content: "Resumo de teste" }),
  DEFAULT_COMPACT_TEMPLATE: { sections: [] },
}));

const mockGenerateProjectEmbedding = vi.fn();
vi.mock("@hebron/ai/projects/duplicate-detection", () => ({
  generateProjectEmbedding: (...args: unknown[]) =>
    mockGenerateProjectEmbedding(...args),
  DEFAULT_DUPLICATE_THRESHOLD: 0.92,
}));

vi.mock("@hebron/integrations/projetos-tarefas", () => ({
  onProjectSubmitted: vi.fn().mockResolvedValue(undefined),
}));

// Isola este teste do envio real de e-mail (RESEND_API_KEY está configurada
// em .env.local neste ambiente — createNotification faz uma chamada HTTP
// real ao Resend por notificação de canal "email", sem timeout próprio,
// aguardada via Promise.allSettled). notifications.test.ts (P-2.10b) é o
// único arquivo que legitimamente não pode mockar isto, e paga esse custo
// (ali documentado como próximo do limiar de 30s); este arquivo testa
// duplicidade, não entrega de notificação — mesmo raciocínio de isolamento
// já aplicado a scoring/compact-version/projetos-tarefas acima.
vi.mock("../lib/notifications", () => ({
  notifyProjectSubmitted: vi.fn().mockResolvedValue(undefined),
  notifyProjectInValidation: vi.fn().mockResolvedValue(undefined),
  notifyVotingOpen: vi.fn().mockResolvedValue(undefined),
  notifyContestation: vi.fn().mockResolvedValue(undefined),
}));

// Vetores determinísticos de 1536 dims (dimensão real da coluna
// `embedding`). `base`/`similar` compartilham os 10 primeiros índices como
// 1.0 (`similar` soma um 11º índice pequeno) → cosseno ≈ 0.9999, acima do
// limiar padrão (0.92). `distinct` usa índices totalmente disjuntos (500-509)
// → produto escalar 0 → cosseno = 0, abaixo do limiar.
const DIMS = 1536;

function makeVector(entries: Array<[number, number]>): number[] {
  const v = new Array(DIMS).fill(0);
  for (const [i, value] of entries) v[i] = value;
  return v;
}

const BASE_VECTOR = makeVector(
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [i, 1]),
);
const SIMILAR_VECTOR = makeVector(
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => [i, i === 10 ? 0.05 : 1]),
);
const DISTINCT_VECTOR = makeVector(
  [500, 501, 502, 503, 504, 505, 506, 507, 508, 509].map((i) => [i, 1]),
);

const IDS = {
  users: {
    submissor: "d2aa0000-0000-0000-0000-000000000001",
    admin: "d2aa0000-0000-0000-0000-000000000002",
  },
  org: "d2bb0000-0000-0000-0000-000000000001",
  existingProject: "d2cc0000-0000-0000-0000-000000000001",
  similarDraft: "d2cc0000-0000-0000-0000-000000000002",
  distinctDraft: "d2cc0000-0000-0000-0000-000000000003",
  aiFailureDraft: "d2cc0000-0000-0000-0000-000000000004",
} as const;

const ALL_PROJECT_IDS = [
  IDS.existingProject,
  IDS.similarDraft,
  IDS.distinctDraft,
  IDS.aiFailureDraft,
] as const;

async function mockActor(actorId: string, roles: Role[]) {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId,
    roles,
    designations: [],
  });
}

function draftProjectFixture(id: string, title: string) {
  return {
    id,
    title,
    tipo: "anual" as const,
    stage: "rascunho" as const,
    organizationId: IDS.org,
    submitterId: IDS.users.submissor,
    evaluationYear: 2026,
    budgetTotal: "12000.00",
    parcelas: 1,
    meses: 1,
    objectives: "Objetivos de teste",
    justification: "Justificativa de teste",
  };
}

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.users.submissor,
        email: "dup-sub@test.hebron",
        fullName: "Dup Submissor",
      },
      {
        id: IDS.users.admin,
        email: "dup-admin@test.hebron",
        fullName: "Dup Admin",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.users.submissor,
        role: "submissor" as const,
        grantedBy: IDS.users.admin,
      },
      {
        userId: IDS.users.admin,
        role: "super_admin" as const,
        grantedBy: IDS.users.admin,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Duplicidade Test",
      createdBy: IDS.users.submissor,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.users.submissor })
    .onConflictDoNothing();

  // Projeto já submetido (candidato) — inserido direto com embedding, sem
  // passar por submitProject (equivalente a uma submissão anterior real).
  await db
    .insert(projects)
    .values({
      ...draftProjectFixture(IDS.existingProject, "Projeto Base Já Submetido"),
      stage: "validacao",
      submittedAt: new Date(),
      embedding: BASE_VECTOR,
    })
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values(draftProjectFixture(IDS.similarDraft, "Projeto Quase Idêntico"))
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values(
      draftProjectFixture(IDS.distinctDraft, "Projeto Claramente Distinto"),
    )
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values(draftProjectFixture(IDS.aiFailureDraft, "Projeto Falha de IA"))
    .onConflictDoNothing();
});

afterAll(async () => {
  for (const id of ALL_PROJECT_IDS) {
    await db.delete(auditLog).where(eq(auditLog.entityId, id));
    await db.delete(projectVersions).where(eq(projectVersions.projectId, id));
  }
  await db
    .delete(notifications)
    .where(eq(notifications.userId, IDS.users.submissor));
  await db
    .delete(notifications)
    .where(eq(notifications.userId, IDS.users.admin));
  for (const id of ALL_PROJECT_IDS) {
    await db.delete(projects).where(eq(projects.id, id));
  }
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("submitProject — detecção de duplicidade via embeddings (P-2.14)", () => {
  it("texto quase idêntico a um projeto já submetido é marcado como possível duplicata", async () => {
    mockGenerateProjectEmbedding.mockResolvedValueOnce(SIMILAR_VECTOR);
    await mockActor(IDS.users.admin, ["super_admin"]);
    const { submitProject } = await import("../actions/projects");

    const result = await submitProject({ projectId: IDS.similarDraft });
    expect(result?.serverError).toBeUndefined();

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.similarDraft));

    expect(project?.possibleDuplicate).toBe(true);
    expect(project?.duplicateCandidates).toHaveLength(1);
    expect(project?.duplicateCandidates?.[0]?.projectId).toBe(
      IDS.existingProject,
    );
    expect(project?.duplicateCandidates?.[0]?.similarity).toBeGreaterThan(0.92);
  });

  it("texto claramente distinto não é marcado como possível duplicata", async () => {
    mockGenerateProjectEmbedding.mockResolvedValueOnce(DISTINCT_VECTOR);
    await mockActor(IDS.users.admin, ["super_admin"]);
    const { submitProject } = await import("../actions/projects");

    const result = await submitProject({ projectId: IDS.distinctDraft });
    expect(result?.serverError).toBeUndefined();

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.distinctDraft));

    expect(project?.possibleDuplicate).toBe(false);
    expect(project?.duplicateCandidates).toEqual([]);
  });

  it("falha da IA (embedding) não impede a submissão", async () => {
    mockGenerateProjectEmbedding.mockRejectedValueOnce(
      new Error("simulated OpenAI failure"),
    );
    await mockActor(IDS.users.admin, ["super_admin"]);
    const { submitProject } = await import("../actions/projects");

    const result = await submitProject({ projectId: IDS.aiFailureDraft });
    expect(result?.serverError).toBeUndefined();

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.aiFailureDraft));

    expect(project?.stage).toBe("validacao");
    expect(project?.possibleDuplicate).toBe(false);
    expect(project?.embedding).toBeNull();
  });

  it("submissor nunca vê possibleDuplicate/duplicateCandidates (getSubmissorProjectDetail não seleciona essas colunas)", async () => {
    const { getSubmissorProjectDetail } = await import("../lib/queries");

    const detail = await getSubmissorProjectDetail(
      IDS.similarDraft,
      IDS.users.submissor,
    );

    expect(detail).not.toBeNull();
    expect(detail).not.toHaveProperty("possibleDuplicate");
    expect(detail).not.toHaveProperty("duplicateCandidates");
  });
});
