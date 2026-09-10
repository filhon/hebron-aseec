/**
 * notifications.test.ts — P-2.10b
 *
 * Cobre a submissão de projeto: `submitProject` deve gerar notificação
 * in_app para todo super_admin (`notifyProjectSubmitted`) e para o próprio
 * submissor (`notifyProjectInValidation`) — antes deste prompt nenhuma das
 * sete funções de `lib/notifications.ts` tinha chamador. Verifica também que
 * o `href` gerado aponta para uma rota que existe de fato no app (antes
 * apontava para `/projetos/<id>`, inexistente), diferenciada por papel:
 * diretoria em `(diretoria)/pipeline/[id]`, submissor em `(submissor)/[id]`.
 */

import { existsSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  projectVersions,
  projectAttachments,
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

// Isola o teste de notificação das integrações de IA e do cross-app
// Tarefas — ambas já cobertas por seus próprios testes; aqui importa só
// que `submitProject` chegue ao ponto de notificar.
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

const IDS = {
  users: {
    submissor: "d1aa0000-0000-0000-0000-000000000001",
    admin: "d1aa0000-0000-0000-0000-000000000002",
  },
  org: "d1bb0000-0000-0000-0000-000000000001",
  project: "d1cc0000-0000-0000-0000-000000000001",
} as const;

async function mockActor(actorId: string, roles: Role[]) {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId,
    roles,
    designations: [],
  });
}

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.users.submissor,
        email: "notif-sub@test.hebron",
        fullName: "Notif Submissor",
      },
      {
        id: IDS.users.admin,
        email: "notif-admin@test.hebron",
        fullName: "Notif Admin",
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
      nome: "Org Notificações Test",
      createdBy: IDS.users.submissor,
    })
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.users.submissor })
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values({
      id: IDS.project,
      title: "Projeto Notificações Test",
      tipo: "anual",
      stage: "rascunho",
      organizationId: IDS.org,
      submitterId: IDS.users.submissor,
      evaluationYear: 2026,
      budgetTotal: "12000.00",
      parcelas: 1,
      meses: 1,
    })
    .onConflictDoNothing();

  // P-2.20 CORRETIVO: submitProject reconfere os 3 anexos obrigatórios do
  // anual — o rascunho acima é inserido direto (sem passar pelo wizard/
  // createAnnualDraft), então precisa dos anexos aqui.
  await db
    .insert(projectAttachments)
    .values(
      (["video", "planilha", "carta"] as const).map((kind) => ({
        projectId: IDS.project,
        kind,
        fileUrl: kind === "video" ? null : `https://example.test/${kind}.bin`,
        fileName: `${kind}.bin`,
        bunnyVideoId: kind === "video" ? "test-video-id" : null,
        uploadedBy: IDS.users.submissor,
      })),
    )
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(notifications)
    .where(eq(notifications.userId, IDS.users.submissor));
  await db
    .delete(notifications)
    .where(eq(notifications.userId, IDS.users.admin));
  await db.delete(auditLog).where(eq(auditLog.entityId, IDS.project));
  await db
    .delete(projectVersions)
    .where(eq(projectVersions.projectId, IDS.project));
  await db.delete(projects).where(eq(projects.id, IDS.project));
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

describe("Submissão de projeto notifica super_admin e submissor (P-2.10b)", () => {
  it("submitProject não retorna erro", async () => {
    // Ator: super_admin, não o submissor dono do projeto. A policy RLS
    // "projects_update_rascunho_owner" (0007_projetos.sql) exige, via
    // WITH CHECK, que o estágio da linha permaneça "rascunho" após o
    // UPDATE — ou seja, um submissor comum nunca passa no RLS ao transicionar
    // o próprio projeto para "validacao" por essa policy (só
    // "projects_update_admin" permite a transição). Achado fora do escopo
    // de P-2.10b (nenhum arquivo de RLS está na lista de arquivos
    // permitidos deste prompt) — registrado em SESSIONS.md para um
    // corretivo futuro. submitProject já permite super_admin submeter em
    // nome de qualquer submissor (checagem de negócio em
    // actions/projects.ts), então o teste usa esse caminho, que hoje é o
    // único que passa no RLS real.
    await mockActor(IDS.users.admin, ["super_admin"]);
    const { submitProject } = await import("../actions/projects");

    const result = await submitProject({ projectId: IDS.project });

    expect(result?.serverError).toBeUndefined();

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, IDS.project));
    expect(project?.stage).toBe("validacao");
  });

  it("super_admin recebe in_app com href para a rota real da diretoria", async () => {
    const [notif] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, IDS.users.admin),
          eq(notifications.type, "project.submitted"),
          eq(notifications.channel, "in_app"),
        ),
      );

    expect(notif).toBeDefined();
    const payload = notif?.payload as {
      module?: string;
      href?: string;
    } | null;
    expect(payload?.module).toBe("projetos");
    expect(payload?.href).toBe(`/pipeline/${IDS.project}`);

    // A rota precisa existir de fato — antes apontava para `/projetos/<id>`.
    const pipelinePage = resolve(
      __dirname,
      "../app/(diretoria)/pipeline/[id]/page.tsx",
    );
    expect(existsSync(pipelinePage)).toBe(true);
  });

  it("submissor recebe in_app com href para a rota real do submissor", async () => {
    const [notif] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, IDS.users.submissor),
          eq(notifications.type, "project.in_validation"),
          eq(notifications.channel, "in_app"),
        ),
      );

    expect(notif).toBeDefined();
    const payload = notif?.payload as {
      module?: string;
      href?: string;
    } | null;
    expect(payload?.module).toBe("projetos");
    expect(payload?.href).toBe(`/${IDS.project}`);

    const submissorPage = resolve(
      __dirname,
      "../app/(submissor)/[id]/page.tsx",
    );
    expect(existsSync(submissorPage)).toBe(true);
  });
});
