/**
 * documentos-edital-closing.test.ts — runEditalClosingReminders (P-0.14)
 *
 * Movida de apps/documentos/src/jobs/edital-closing-reminders.ts — pronta
 * desde P-1.27, nunca invocada por falta de scheduler (S-30/S1-06/CS-5).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments, documents, editals } from "@hebron/db/schema";
import { runEditalClosingReminders } from "../crons/documentos";

vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
}));

const IDS = {
  author: "fdaa0000-0000-0000-0000-000000000001",
  submissor: "fdaa0000-0000-0000-0000-000000000002",
  edital: "fdbb0000-0000-0000-0000-000000000001",
};

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      { id: IDS.author, email: "edital-author@test.hebron", fullName: "Autor" },
      {
        id: IDS.submissor,
        email: "edital-submissor@test.hebron",
        fullName: "Submissor EC",
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.submissor, role: "submissor" })
    .onConflictDoNothing();

  const closesAt = new Date();
  closesAt.setUTCDate(closesAt.getUTCDate() + 7);

  await db.insert(documents).values({
    id: IDS.edital,
    title: "Edital de teste — fechamento em 7 dias",
    slug: `edital-teste-${IDS.edital}`,
    authorId: IDS.author,
    publishedAt: new Date(),
  });
  await db.insert(editals).values({ id: IDS.edital, closesAt });
});

afterAll(async () => {
  await db.delete(editals).where(eq(editals.id, IDS.edital));
  await db.delete(documents).where(eq(documents.id, IDS.edital));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.submissor));
  await db.delete(users).where(eq(users.id, IDS.author));
  await db.delete(users).where(eq(users.id, IDS.submissor));
});

describe("runEditalClosingReminders", () => {
  it("notifica submissores de edital que fecha em 7 dias", async () => {
    const { createNotification } = await import("@hebron/email");
    await runEditalClosingReminders();

    const call = vi
      .mocked(createNotification)
      .mock.calls.find((c) => c[0].data.userId === IDS.submissor);

    expect(call).toBeDefined();
    expect(call?.[0].data.type).toBe("edital.closing");
  });
});
