/**
 * projetos-report-reminders.test.ts — runReportReminders (P-0.14)
 *
 * Fecha o critério [~] de P-2.10: "Relatório pendente: 3 lembretes (7d
 * antes, no dia, 7d antes de expirar)". `notifyReportReminder` já existia
 * (P-2.10) sem scheduler; este teste cobre a varredura das 3 janelas.
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
  reports,
} from "@hebron/db/schema";
import { runReportReminders } from "../crons/projetos";

vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
}));

const IDS = {
  submitter: "fbaa0000-0000-0000-0000-000000000001",
  org: "fbbb0000-0000-0000-0000-000000000001",
  project: "fbcc0000-0000-0000-0000-000000000001",
  reportDueIn7: "fbdd0000-0000-0000-0000-000000000001",
  reportDueToday: "fbdd0000-0000-0000-0000-000000000002",
  reportUnrelatedDate: "fbdd0000-0000-0000-0000-000000000003",
};

function dateOnlyUTC(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  const iso = d.toISOString().split("T")[0];
  if (!iso) throw new Error("invalid date");
  return iso;
}

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.submitter,
      email: "report-reminder@test.hebron",
      fullName: "Submissor RR",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.submitter, role: "submissor" })
    .onConflictDoNothing();
  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Report Reminder Test",
      createdBy: IDS.submitter,
    })
    .onConflictDoNothing();
  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.submitter })
    .onConflictDoNothing();
  await db.insert(projects).values({
    id: IDS.project,
    title: "Projeto com relatórios pendentes",
    tipo: "anual",
    stage: "em_execucao",
    submitterId: IDS.submitter,
    organizationId: IDS.org,
  });

  await db.insert(reports).values([
    {
      id: IDS.reportDueIn7,
      projectId: IDS.project,
      status: "pendente",
      dueDate: dateOnlyUTC(7),
    },
    {
      id: IDS.reportDueToday,
      projectId: IDS.project,
      status: "pendente",
      dueDate: dateOnlyUTC(0),
    },
    {
      id: IDS.reportUnrelatedDate,
      projectId: IDS.project,
      status: "pendente",
      dueDate: dateOnlyUTC(15), // fora de qualquer janela do cron
    },
  ]);
});

afterAll(async () => {
  await db.delete(reports).where(eq(reports.projectId, IDS.project));
  await db.delete(projects).where(eq(projects.id, IDS.project));
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.submitter));
  await db.delete(users).where(eq(users.id, IDS.submitter));
});

describe("runReportReminders", () => {
  it("notifica relatórios pendentes que vencem em 7 dias e hoje, ignorando datas fora das janelas", async () => {
    const { createNotification } = await import("@hebron/email");
    await runReportReminders();

    const calledTypes = vi
      .mocked(createNotification)
      .mock.calls.map((call) => call[0].data.type);

    expect(calledTypes).toContain("report.reminder.seven_days_before");
    expect(calledTypes).toContain("report.reminder.due_today");
    expect(calledTypes).not.toContain(
      "report.reminder.seven_days_before_expiry",
    );
  });
});
