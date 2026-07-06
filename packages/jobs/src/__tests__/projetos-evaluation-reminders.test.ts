/**
 * projetos-evaluation-reminders.test.ts — runEvaluationReminders (P-0.14)
 *
 * Fecha o segundo critério [~] de P-2.10: "Lista de projetos designados →
 * avaliador (7d antes da reunião)".
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
  evaluations,
  meetingSessions,
} from "@hebron/db/schema";
import { runEvaluationReminders } from "../crons/projetos";

vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
}));

const IDS = {
  submitter: "fcaa0000-0000-0000-0000-000000000001",
  evaluator: "fcaa0000-0000-0000-0000-000000000002",
  org: "fcbb0000-0000-0000-0000-000000000001",
  project: "fccc0000-0000-0000-0000-000000000001",
  meeting: "fcdd0000-0000-0000-0000-000000000001",
};

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.submitter,
        email: "eval-reminder-sub@test.hebron",
        fullName: "Submissor ER",
      },
      {
        id: IDS.evaluator,
        email: "eval-reminder-eval@test.hebron",
        fullName: "Avaliador ER",
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.submitter, role: "submissor" },
      { userId: IDS.evaluator, role: "diretor" },
    ])
    .onConflictDoNothing();
  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Eval Reminder Test",
      createdBy: IDS.submitter,
    })
    .onConflictDoNothing();
  await db
    .insert(organizationMembers)
    .values({ organizationId: IDS.org, userId: IDS.submitter })
    .onConflictDoNothing();
  await db.insert(projects).values({
    id: IDS.project,
    title: "Projeto com avaliação pendente",
    tipo: "anual",
    stage: "votacao",
    submitterId: IDS.submitter,
    organizationId: IDS.org,
  });
  await db.insert(evaluations).values({
    projectId: IDS.project,
    evaluatorId: IDS.evaluator,
    // submittedAt não definido — avaliação pendente
  });

  const meetingDate = new Date();
  meetingDate.setUTCDate(meetingDate.getUTCDate() + 7);
  await db.insert(meetingSessions).values({
    id: IDS.meeting,
    date: meetingDate,
    type: "mensal",
    status: "scheduled",
  });
});

afterAll(async () => {
  await db.delete(meetingSessions).where(eq(meetingSessions.id, IDS.meeting));
  await db.delete(evaluations).where(eq(evaluations.projectId, IDS.project));
  await db.delete(projects).where(eq(projects.id, IDS.project));
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.submitter));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.evaluator));
  await db.delete(users).where(eq(users.id, IDS.submitter));
  await db.delete(users).where(eq(users.id, IDS.evaluator));
});

describe("runEvaluationReminders", () => {
  it("notifica avaliador com avaliação pendente quando há reunião mensal em 7 dias", async () => {
    const { createNotification } = await import("@hebron/email");
    await runEvaluationReminders();

    const call = vi
      .mocked(createNotification)
      .mock.calls.find((c) => c[0].data.userId === IDS.evaluator);

    expect(call).toBeDefined();
    expect(call?.[0].data.type).toBe("project.evaluation.reminder");
  });
});
