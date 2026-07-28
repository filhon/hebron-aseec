/**
 * reports.test.ts — P-2.6b
 *
 * Cobre o ciclo de relatório que antes não tinha volta: rejeição sem
 * parecer, rejeição com parecer reabrindo o relatório (submitted → pendente,
 * reenviável), e a distinção entre "report.submitted" (envio do submissor) e
 * "report.reviewed" (decisão do diretor) no audit log — antes a mesma ação.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  reports,
  auditLog,
} from "@hebron/db/schema";
import type { Role } from "@hebron/types/roles";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

const IDS = {
  users: {
    diretor: "cfaa0000-0000-0000-0000-000000000001",
    submissor: "cfaa0000-0000-0000-0000-000000000002",
  },
  org: "cfbb0000-0000-0000-0000-000000000001",
  project: "cfcc0000-0000-0000-0000-000000000001",
  report: "cfdd0000-0000-0000-0000-000000000001",
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
        id: IDS.users.diretor,
        email: "reports-dir@test.hebron",
        fullName: "Reports Diretor",
      },
      {
        id: IDS.users.submissor,
        email: "reports-sub@test.hebron",
        fullName: "Reports Submissor",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.users.diretor,
        role: "diretor" as const,
        grantedBy: IDS.users.diretor,
      },
      {
        userId: IDS.users.submissor,
        role: "submissor" as const,
        grantedBy: IDS.users.diretor,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Reports Test",
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
      title: "Projeto Reports Test",
      tipo: "anual",
      stage: "em_execucao",
      organizationId: IDS.org,
      submitterId: IDS.users.submissor,
      evaluationYear: 2026,
      budgetTotal: "10000.00",
      parcelas: 1,
      meses: 1,
    })
    .onConflictDoNothing();

  await db
    .insert(reports)
    .values({
      id: IDS.report,
      projectId: IDS.project,
      status: "pendente",
      dueDate: "2026-06-01",
      periodStart: "2026-01-01",
      periodEnd: "2026-03-31",
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.entityId, IDS.report));
  await db.delete(reports).where(eq(reports.id, IDS.report));
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

describe("Ciclo de relatório — rejeição → reenvio → aprovação (P-2.6b)", () => {
  it("1. submissor envia o relatório: pendente → submitted", async () => {
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { submitReport } = await import("../actions/reports");

    const result = await submitReport({
      reportId: IDS.report,
      content: "Atividades do trimestre realizadas conforme planejado. ".repeat(
        3,
      ),
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, IDS.report));
    expect(row?.status).toBe("submitted");
  });

  it("2. diretor tenta rejeitar sem parecer: schema recusa (não só o componente)", async () => {
    await mockActor(IDS.users.diretor, ["diretor"]);
    const { reviewReport } = await import("../actions/reports");

    const result = await reviewReport({
      reportId: IDS.report,
      decision: "rejected",
    });

    expect(result?.validationErrors).toBeDefined();
    const notesErrors = (
      result?.validationErrors as { notes?: { _errors?: string[] } } | undefined
    )?.notes?._errors;
    expect(notesErrors?.[0]).toMatch(/parecer/i);

    // Nada mudou: continua "submitted", esperando revisão válida.
    const [row] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, IDS.report));
    expect(row?.status).toBe("submitted");
  });

  it("3. diretor rejeita com parecer: submitted → pendente (reabre o ciclo)", async () => {
    await mockActor(IDS.users.diretor, ["diretor"]);
    const { reviewReport } = await import("../actions/reports");

    const result = await reviewReport({
      reportId: IDS.report,
      decision: "rejected",
      notes: "Faltou o comprovante fiscal do segundo mês do trimestre.",
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, IDS.report));
    // Volta a "pendente" (não fica travado em "rejected") — reativa o cron
    // de inadimplência, que só olha status = "pendente".
    expect(row?.status).toBe("pendente");
    expect(row?.reviewedBy).toBe(IDS.users.diretor);
    expect(row?.reviewNotes).toBe(
      "Faltou o comprovante fiscal do segundo mês do trimestre.",
    );
  });

  it("4. submissor reenvia o relatório rejeitado: pendente → submitted novamente", async () => {
    await mockActor(IDS.users.submissor, ["submissor"]);
    const { submitReport } = await import("../actions/reports");

    const result = await submitReport({
      reportId: IDS.report,
      content: "Versão corrigida com o comprovante fiscal anexado. ".repeat(3),
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, IDS.report));
    expect(row?.status).toBe("submitted");
    // Parecer do ciclo anterior é preservado (imutabilidade) até a próxima
    // revisão sobrescrever.
    expect(row?.reviewNotes).toBe(
      "Faltou o comprovante fiscal do segundo mês do trimestre.",
    );
  });

  it("5. diretor aprova: submitted → approved", async () => {
    await mockActor(IDS.users.diretor, ["diretor"]);
    const { reviewReport } = await import("../actions/reports");

    const result = await reviewReport({
      reportId: IDS.report,
      decision: "approved",
    });

    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, IDS.report));
    expect(row?.status).toBe("approved");
    expect(row?.reviewNotes).toBeNull();
  });

  it("6. audit distingue report.submitted de report.reviewed", async () => {
    const rows = await db
      .select({ action: auditLog.action, diff: auditLog.diff })
      .from(auditLog)
      .where(
        and(eq(auditLog.entity, "report"), eq(auditLog.entityId, IDS.report)),
      )
      .orderBy(asc(auditLog.createdAt));

    const submittedRows = rows.filter((r) => r.action === "report.submitted");
    const reviewedRows = rows.filter((r) => r.action === "report.reviewed");

    // Dois envios (steps 1 e 4), duas revisões (steps 3 e 5) — cada ação com
    // seu próprio valor de enum, não mais "report.submitted" para as duas.
    expect(submittedRows).toHaveLength(2);
    expect(reviewedRows).toHaveLength(2);

    const [rejection, approval] = reviewedRows;
    expect((rejection?.diff as { decision?: string } | null)?.decision).toBe(
      "rejected",
    );
    expect((approval?.diff as { decision?: string } | null)?.decision).toBe(
      "approved",
    );
  });
});
