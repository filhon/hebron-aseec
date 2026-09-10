/**
 * attachment-kinds.test.ts — P-2.20 CORRETIVO
 *
 * AUDIT/06 §1.7, Q47/Q54: vídeo de apresentação (até 3 min), planilha de
 * orçamento por etapas e carta de recomendação passam a ser anexos tipados
 * (`projetos.project_attachment_kind`), obrigatórios no anual e opcionais
 * (mas com os campos presentes) no pontual. Cobre a dupla camada de defesa:
 * o schema Zod do wizard (createAnnualDraft) e a reconferência em
 * submitProject — nunca só no cliente.
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
  projectAttachments,
  auditLog,
  notifications,
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
    submissor: "a2200000-0000-0000-0000-000000000001",
    admin: "a2200000-0000-0000-0000-000000000002",
  },
  org: "a2210000-0000-0000-0000-000000000001",
} as const;

const PROJECT_LEGACY_RASCUNHO_ID = "a2220000-0000-0000-0000-000000000001";
const PROJECT_PONTUAL_ID = "a2220000-0000-0000-0000-000000000002";

const createdProjectIds: string[] = [];

async function mockActor(actorId: string, roles: Role[]) {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId,
    roles,
    designations: [],
  });
}

function validAnnualInput(
  attachments?: Array<{
    kind: "video" | "planilha" | "carta";
    fileUrl?: string;
    bunnyVideoId?: string;
    fileName: string;
    fileSize: number;
  }>,
) {
  return {
    titulo: "Projeto de teste dos anexos obrigatórios",
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
    valorTotal: 12000,
    numeroParcelas: 1,
    mesesPagamento: [6],
    attachments,
  };
}

const REQUIRED_ATTACHMENTS = [
  {
    kind: "video" as const,
    bunnyVideoId: "test-video-id",
    fileName: "video.mp4",
    fileSize: 1000,
  },
  {
    kind: "planilha" as const,
    fileUrl: "https://example.test/planilha.xlsx",
    fileName: "planilha.xlsx",
    fileSize: 1000,
  },
  {
    kind: "carta" as const,
    fileUrl: "https://example.test/carta.pdf",
    fileName: "carta.pdf",
    fileSize: 1000,
  },
];

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.users.submissor,
        email: "attk-sub@test.hebron",
        fullName: "AttK Submissor",
      },
      {
        id: IDS.users.admin,
        email: "attk-admin@test.hebron",
        fullName: "AttK Admin",
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
      nome: "Org Anexos Test",
      createdBy: IDS.users.submissor,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.users.submissor })
    .onConflictDoNothing();

  // Rascunho anual inserido direto (simula um projeto que já existia antes
  // deste corretivo, sem passar pelo wizard) — usado para testar a
  // reconferência em submitProject isolada do schema Zod de criação.
  await db
    .insert(projects)
    .values({
      id: PROJECT_LEGACY_RASCUNHO_ID,
      title: "Rascunho anual sem anexos obrigatórios",
      tipo: "anual",
      stage: "rascunho",
      organizationId: IDS.org,
      submitterId: IDS.users.submissor,
      evaluationYear: new Date().getFullYear(),
      budgetTotal: "8000.00",
      parcelas: 1,
      meses: 1,
    })
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values({
      id: PROJECT_PONTUAL_ID,
      title: "Rascunho pontual sem nenhum anexo",
      tipo: "pontual",
      stage: "rascunho",
      organizationId: IDS.org,
      submitterId: IDS.users.submissor,
      evaluationYear: new Date().getFullYear(),
      budgetTotal: "3000.00",
      parcelas: 1,
      meses: 1,
    })
    .onConflictDoNothing();

  // Anexo legado sem `kind` explícito — cai no default 'outro' da migration
  // 0099. Prova que uma linha pré-existente continua válida (critério de
  // aceite: "projetos anteriores continuam válidos").
  await db.insert(projectAttachments).values({
    projectId: PROJECT_LEGACY_RASCUNHO_ID,
    fileUrl: "https://example.test/legado.pdf",
    fileName: "legado.pdf",
    uploadedBy: IDS.users.submissor,
  });
});

afterAll(async () => {
  const allProjectIds = [
    ...createdProjectIds,
    PROJECT_LEGACY_RASCUNHO_ID,
    PROJECT_PONTUAL_ID,
  ];
  for (const id of allProjectIds) {
    await db.delete(auditLog).where(eq(auditLog.entityId, id));
    await db.delete(projectVersions).where(eq(projectVersions.projectId, id));
  }
  for (const id of allProjectIds) {
    await db.delete(projects).where(eq(projects.id, id));
  }
  await db
    .delete(notifications)
    .where(eq(notifications.userId, IDS.users.submissor));
  await db
    .delete(notifications)
    .where(eq(notifications.userId, IDS.users.admin));
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

describe("createAnnualDraft — anexos obrigatórios do anual (P-2.20 CORRETIVO)", () => {
  it("recusa no schema Zod quando faltam vídeo, planilha e carta", async () => {
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { createAnnualDraft } = await import("../actions/projects");

    const result = await createAnnualDraft(validAnnualInput([]));

    expect(result?.validationErrors).toBeDefined();
    const attachmentErrors = (
      result?.validationErrors as
        | { attachments?: { _errors?: string[] } }
        | undefined
    )?.attachments?._errors;
    expect(attachmentErrors?.some((m) => m.includes("Vídeo"))).toBe(true);
    expect(attachmentErrors?.some((m) => m.includes("Planilha"))).toBe(true);
    expect(
      attachmentErrors?.some((m) => m.includes("Carta de recomendação")),
    ).toBe(true);
  });

  it("cria normalmente quando os três anexos estão presentes", async () => {
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { createAnnualDraft } = await import("../actions/projects");

    const result = await createAnnualDraft(
      validAnnualInput(REQUIRED_ATTACHMENTS),
    );

    expect(result?.serverError).toBeUndefined();
    expect(result?.validationErrors).toBeUndefined();
    const projectId = result?.data?.project?.id;
    expect(projectId).toBeDefined();
    if (projectId) createdProjectIds.push(projectId);

    const rows = await db
      .select()
      .from(projectAttachments)
      .where(eq(projectAttachments.projectId, projectId as string));
    expect(rows.map((r) => r.kind).sort()).toEqual([
      "carta",
      "planilha",
      "video",
    ]);
    const video = rows.find((r) => r.kind === "video");
    expect(video?.bunnyVideoId).toBe("test-video-id");
    expect(video?.fileUrl).toBeNull();
  });
});

describe("submitProject — reconfere os anexos obrigatórios (P-2.20 CORRETIVO)", () => {
  it("recusa um rascunho anual pré-existente sem os três anexos", async () => {
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { submitProject } = await import("../actions/projects");

    const result = await submitProject({
      projectId: PROJECT_LEGACY_RASCUNHO_ID,
    });

    expect(result?.serverError).toContain("Anexos obrigatórios ausentes");

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, PROJECT_LEGACY_RASCUNHO_ID));
    expect(project?.stage).toBe("rascunho");

    // O anexo legado (kind='outro', default da migration 0099) continua
    // legível — não foi invalidado por este corretivo.
    const [legacy] = await db
      .select()
      .from(projectAttachments)
      .where(eq(projectAttachments.projectId, PROJECT_LEGACY_RASCUNHO_ID));
    expect(legacy?.kind).toBe("outro");
  });

  it("pontual submete sem nenhum dos três anexos", async () => {
    // Ator super_admin: a policy RLS "projects_update_rascunho_owner"
    // (0007_projetos.sql) exige, via WITH CHECK, stage='rascunho' após o
    // UPDATE — um submissor comum nunca passa nessa policy ao transicionar
    // o próprio projeto (mesmo caminho de submission-window.test.ts). Aqui
    // importa só que a ausência dos três anexos não bloqueia o pontual.
    await mockActor(IDS.users.admin, ["super_admin"]);
    const { submitProject } = await import("../actions/projects");

    const result = await submitProject({ projectId: PROJECT_PONTUAL_ID });

    expect(result?.serverError).toBeUndefined();
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, PROJECT_PONTUAL_ID));
    expect(project?.stage).toBe("validacao");
  });
});
