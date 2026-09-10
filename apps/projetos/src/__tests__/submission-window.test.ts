/**
 * submission-window.test.ts — P-2.19 (CORRETIVO)
 *
 * AUDIT/06 §1.6: createAnnualDraft e submitProject nunca consultavam
 * admin.system_settings["projetos_janela_anual"] antes de aceitar a
 * submissão do projeto anual, apesar do PRD/BRAIN §6.2 exigirem uma janela
 * aberto/fechado definida pelo super_admin. Cobre: sem configuração = aberto,
 * bloqueio antes/depois da janela, pontual imune (Q91/Q54), e a exceção de
 * super_admin registrada no audit (reaproveitando "project.created"/
 * "project.submitted" via campo extra no diff — sem novo valor no enum
 * admin.audit_action, G6.3).
 *
 * `singleFork: true` (vitest.config.ts) serializa os arquivos de teste deste
 * pacote contra o banco de dev compartilhado — `afterEach` sempre devolve a
 * janela ao estado neutro para nunca vazar um fechamento para outro arquivo
 * (feedback_interrupted_test_run_pollution).
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  projectVersions,
  auditLog,
  systemSettings,
} from "@hebron/db/schema";
import { PROJETOS_JANELA_ANUAL_SETTING_KEY } from "@hebron/db/seed";
import { getSystemActorId } from "@hebron/db/system-actor";
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

vi.mock("@hebron/ai/projects/duplicate-detection", () => ({
  generateProjectEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0)),
  DEFAULT_DUPLICATE_THRESHOLD: 0.92,
}));

vi.mock("@hebron/integrations/projetos-tarefas", () => ({
  onProjectSubmitted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/notifications", () => ({
  notifyProjectSubmitted: vi.fn().mockResolvedValue(undefined),
  notifyProjectInValidation: vi.fn().mockResolvedValue(undefined),
  notifyVotingOpen: vi.fn().mockResolvedValue(undefined),
  notifyContestation: vi.fn().mockResolvedValue(undefined),
}));

const IDS = {
  users: {
    submissor: "e19a0000-0000-0000-0000-000000000001",
    admin: "e19a0000-0000-0000-0000-000000000002",
  },
  org: "e19b0000-0000-0000-0000-000000000001",
  drafts: {
    anual: "e19c0000-0000-0000-0000-000000000001",
    pontual: "e19c0000-0000-0000-0000-000000000002",
    anualSuperAdmin: "e19c0000-0000-0000-0000-000000000003",
  },
} as const;

const createdProjectIds: string[] = [];

async function mockActor(actorId: string, roles: Role[]) {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId,
    roles,
    designations: [],
  });
}

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// updatedBy usa o ator sistema (packages/db/src/system-actor.ts, mesmo
// mecanismo do seed real) em vez de um usuário deste arquivo — a linha é
// global/compartilhada com outros arquivos de teste e com o app real,
// nunca deve depender do ciclo de vida das fixtures daqui.
async function setJanela(abertura: string, fechamento: string) {
  const systemActorId = await getSystemActorId();
  await db
    .insert(systemSettings)
    .values({
      key: PROJETOS_JANELA_ANUAL_SETTING_KEY,
      value: { abertura, fechamento },
      label: "Janela de submissão do projeto anual",
      isPublic: true,
      updatedBy: systemActorId,
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: { abertura, fechamento }, updatedAt: new Date() },
    });
}

function validAnnualInput() {
  return {
    titulo: "Projeto de teste da janela de submissão",
    categoria: "evangelismo" as const,
    organizacaoId: IDS.org,
    anoReferencia: new Date().getFullYear(),
    objetivos:
      "Objetivos de teste com pelo menos cinquenta caracteres para passar na validação do schema.",
    justificativa:
      "Justificativa de teste com pelo menos cinquenta caracteres para passar na validação do schema.",
    metodologia:
      "Metodologia de teste com pelo menos cinquenta caracteres para passar na validação do schema.",
    contextoMinisterial: "Contexto ministerial de teste com trinta caracteres.",
    tempoMinisterioAnos: 5,
    regiao: "Nordeste",
    pais: "Brasil",
    beneficiariosQuantidade: 100,
    beneficiariosDescricao: "Descrição dos beneficiários de teste.",
    resultadosEsperados:
      "Resultados esperados de teste com pelo menos cinquenta caracteres para validação do schema.",
    cartaRecomendacao: true,
    valorTotal: 12000,
    numeroParcelas: 1,
    mesesPagamento: [6],
  };
}

function draftFixture(id: string, tipo: "anual" | "pontual") {
  return {
    id,
    title: `Rascunho ${tipo} janela test`,
    tipo,
    stage: "rascunho" as const,
    organizationId: IDS.org,
    submitterId: IDS.users.submissor,
    evaluationYear: new Date().getFullYear(),
    budgetTotal: "5000.00",
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
        email: "window-sub@test.hebron",
        fullName: "Window Submissor",
      },
      {
        id: IDS.users.admin,
        email: "window-admin@test.hebron",
        fullName: "Window Admin",
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
      nome: "Org Janela Test",
      createdBy: IDS.users.submissor,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.users.submissor })
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values([
      draftFixture(IDS.drafts.anual, "anual"),
      draftFixture(IDS.drafts.pontual, "pontual"),
      draftFixture(IDS.drafts.anualSuperAdmin, "anual"),
    ])
    .onConflictDoNothing();

  await setJanela("", "");
});

afterEach(async () => {
  await setJanela("", "");
});

afterAll(async () => {
  const allProjectIds = [...createdProjectIds, ...Object.values(IDS.drafts)];
  for (const id of allProjectIds) {
    await db.delete(auditLog).where(eq(auditLog.entityId, id));
    await db.delete(projectVersions).where(eq(projectVersions.projectId, id));
  }
  for (const id of allProjectIds) {
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

describe("createAnnualDraft — janela de submissão (P-2.19 CORRETIVO)", () => {
  it("sem janela configurada, nada é bloqueado", async () => {
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { createAnnualDraft } = await import("../actions/projects");

    const result = await createAnnualDraft(validAnnualInput());

    expect(result?.serverError).toBeUndefined();
    const projectId = result?.data?.project?.id;
    expect(projectId).toBeDefined();
    if (projectId) createdProjectIds.push(projectId);
  });

  it("janela ainda não abriu recusa o submissor com a data de abertura", async () => {
    await setJanela(isoDateOffset(5), isoDateOffset(10));
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { createAnnualDraft } = await import("../actions/projects");

    const result = await createAnnualDraft(validAnnualInput());

    expect(result?.serverError).toContain("ainda não abriu");
  });

  it("janela já encerrada recusa o submissor", async () => {
    await setJanela(isoDateOffset(-10), isoDateOffset(-5));
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { createAnnualDraft } = await import("../actions/projects");

    const result = await createAnnualDraft(validAnnualInput());

    expect(result?.serverError).toContain("encerrou");
  });

  it("dentro da janela, o submissor cria normalmente", async () => {
    await setJanela(isoDateOffset(-1), isoDateOffset(1));
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { createAnnualDraft } = await import("../actions/projects");

    const result = await createAnnualDraft(validAnnualInput());

    expect(result?.serverError).toBeUndefined();
    const projectId = result?.data?.project?.id;
    expect(projectId).toBeDefined();
    if (projectId) createdProjectIds.push(projectId);
  });

  it("super_admin atravessa a janela fechada e a exceção fica no audit", async () => {
    await setJanela(isoDateOffset(-10), isoDateOffset(-5));
    await mockActor(IDS.users.admin, ["super_admin"]);
    const { createAnnualDraft } = await import("../actions/projects");

    const result = await createAnnualDraft(validAnnualInput());

    expect(result?.serverError).toBeUndefined();
    const projectId = result?.data?.project?.id;
    expect(projectId).toBeDefined();
    if (!projectId) return;
    createdProjectIds.push(projectId);

    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, projectId));
    expect(auditRow?.action).toBe("project.created");
    expect(
      (auditRow?.diff as { submissionWindowException?: string } | null)
        ?.submissionWindowException,
    ).toBeTruthy();
  });
});

describe("submitProject — janela de submissão (P-2.19 CORRETIVO)", () => {
  it("pontual submete em qualquer data, mesmo com a janela do anual fechada", async () => {
    // Ator super_admin (não submissor): policy RLS "projects_update_rascunho_
    // owner" (0007_projetos.sql) exige, via WITH CHECK, stage='rascunho' após
    // o UPDATE — um submissor comum nunca passa nessa policy ao transicionar
    // o próprio projeto (lacuna pré-existente, documentada em SESSIONS.md
    // S-207/P-2.10b, fora de escopo aqui). super_admin usa a policy
    // "projects_update_admin" em vez disso — o que importa para este teste é
    // só que pontual ignora a janela, não o papel de quem submete.
    await setJanela(isoDateOffset(-10), isoDateOffset(-5));
    await mockActor(IDS.users.admin, ["super_admin"]);
    const { submitProject } = await import("../actions/projects");

    const result = await submitProject({ projectId: IDS.drafts.pontual });

    expect(result?.serverError).toBeUndefined();
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.drafts.pontual));
    expect(project?.stage).toBe("validacao");
  });

  it("janela fechada recusa a submissão do anual pelo submissor", async () => {
    await setJanela(isoDateOffset(-10), isoDateOffset(-5));
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { submitProject } = await import("../actions/projects");

    const result = await submitProject({ projectId: IDS.drafts.anual });

    expect(result?.serverError).toContain("encerrou");
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.drafts.anual));
    expect(project?.stage).toBe("rascunho");
  });

  it("super_admin submete o anual fora da janela e a exceção fica no audit", async () => {
    await setJanela(isoDateOffset(-10), isoDateOffset(-5));
    await mockActor(IDS.users.admin, ["super_admin"]);
    const { submitProject } = await import("../actions/projects");

    const result = await submitProject({
      projectId: IDS.drafts.anualSuperAdmin,
    });

    expect(result?.serverError).toBeUndefined();
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.drafts.anualSuperAdmin));
    expect(project?.stage).toBe("validacao");

    const [auditRow] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, IDS.drafts.anualSuperAdmin));
    expect(auditRow?.action).toBe("project.submitted");
    expect(
      (auditRow?.diff as { submissionWindowException?: string } | null)
        ?.submissionWindowException,
    ).toBeTruthy();
  });
});
