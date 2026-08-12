/**
 * briefing.test.ts — runBriefing (P-5.10, cron registrado em
 * packages/jobs/src/crons/briefing.ts). Cobre o critério de aceite "Briefing:
 * cron registrado em packages/jobs respeitando enabled + frequency por
 * usuário (teste)" e, desde P-5.10b (CORRETIVO), que o link aponta para o
 * painel real (não para "/dashboard", achado #5) e que o texto salvo em
 * admin.email_templates é o que o destinatário recebe (achado #4, mesmo
 * desenho de packages/jobs/src/__tests__/financeiro.test.ts).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  briefingPreferences,
  emailTemplates,
} from "@hebron/db/schema";
import { runBriefing } from "../crons/briefing";

const createNotificationMock = vi
  .fn()
  .mockResolvedValue({ id: "mock-notif-id" });
vi.mock("@hebron/email", () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

const IDS = {
  daily: "fdee0000-0000-0000-0000-000000000001",
  weekly: "fdee0000-0000-0000-0000-000000000002",
  disabled: "fdee0000-0000-0000-0000-000000000003",
};

// Segunda-feira fixa — runBriefing({ today }) só envia briefing "semanal"
// quando today cai numa segunda (isWeeklyRunDay, crons/briefing.ts).
const MONDAY = new Date("2026-07-13T07:00:00Z");
const TUESDAY = new Date("2026-07-14T07:00:00Z");

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.daily,
        email: "briefing-daily@test.hebron",
        fullName: "Diário BR",
      },
      {
        id: IDS.weekly,
        email: "briefing-weekly@test.hebron",
        fullName: "Semanal BR",
      },
      {
        id: IDS.disabled,
        email: "briefing-disabled@test.hebron",
        fullName: "Desativado BR",
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.daily, role: "colaborador" },
      { userId: IDS.weekly, role: "colaborador" },
      { userId: IDS.disabled, role: "colaborador" },
    ])
    .onConflictDoNothing();
  await db
    .insert(briefingPreferences)
    .values([
      { userId: IDS.daily, enabled: true, frequency: "diario" },
      { userId: IDS.weekly, enabled: true, frequency: "semanal" },
      { userId: IDS.disabled, enabled: false, frequency: "diario" },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(briefingPreferences)
    .where(eq(briefingPreferences.userId, IDS.daily));
  await db
    .delete(briefingPreferences)
    .where(eq(briefingPreferences.userId, IDS.weekly));
  await db
    .delete(briefingPreferences)
    .where(eq(briefingPreferences.userId, IDS.disabled));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, IDS.daily));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.weekly));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.disabled));
  await db.delete(users).where(eq(users.id, IDS.daily));
  await db.delete(users).where(eq(users.id, IDS.weekly));
  await db.delete(users).where(eq(users.id, IDS.disabled));
  await db
    .delete(emailTemplates)
    .where(eq(emailTemplates.slug, "intranet-briefing"));
});

describe("runBriefing", () => {
  it("em dia útil comum, envia só para quem optou por frequência diária", async () => {
    createNotificationMock.mockClear();

    await runBriefing({ today: TUESDAY });

    const calls = createNotificationMock.mock.calls;
    expect(calls.some((c) => c[0].data.userId === IDS.daily)).toBe(true);
    expect(calls.some((c) => c[0].data.userId === IDS.weekly)).toBe(false);
    expect(calls.some((c) => c[0].data.userId === IDS.disabled)).toBe(false);
  });

  it("na segunda-feira, envia também para quem optou por frequência semanal", async () => {
    createNotificationMock.mockClear();

    await runBriefing({ today: MONDAY });

    const calls = createNotificationMock.mock.calls;
    expect(calls.some((c) => c[0].data.userId === IDS.daily)).toBe(true);
    expect(calls.some((c) => c[0].data.userId === IDS.weekly)).toBe(true);
    expect(calls.some((c) => c[0].data.userId === IDS.disabled)).toBe(false);
  });

  it("usuário desativado (enabled=false) nunca recebe, mesmo com frequência correspondente", async () => {
    createNotificationMock.mockClear();

    await runBriefing({ today: MONDAY });

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0].data.userId === IDS.disabled,
    );
    expect(call).toBeUndefined();
  });

  it("o link do briefing aponta para o painel ('/'), não para '/dashboard' (achado #5, P-5.10b)", async () => {
    createNotificationMock.mockClear();

    await runBriefing({ today: TUESDAY });

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0].data.userId === IDS.daily,
    );
    expect(call).toBeDefined();
    const email = call?.[0].email as {
      template?: { props?: { intranetUrl?: string } };
    };
    expect(email.template?.props?.intranetUrl).not.toMatch(/\/dashboard$/);
  });
});

describe("Template de email do briefing — override do Admin (P-5.10b)", () => {
  afterAll(async () => {
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.slug, "intranet-briefing"));
  });

  it("runBriefing usa o texto salvo em admin.email_templates quando existir", async () => {
    await db
      .insert(emailTemplates)
      .values({
        slug: "intranet-briefing",
        subject: "TESTE OVERRIDE BRIEFING — {{cadencia}}",
        bodyHtml: "<p>override {{nome}} {{periodo}}</p>{{kpis}}{{eventos}}",
        bodyText: "override",
        variables: ["nome", "cadencia", "periodo", "kpis", "eventos", "link"],
        updatedBy: IDS.daily,
      })
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: {
          subject: "TESTE OVERRIDE BRIEFING — {{cadencia}}",
          bodyHtml: "<p>override {{nome}} {{periodo}}</p>{{kpis}}{{eventos}}",
        },
      });

    createNotificationMock.mockClear();
    await runBriefing({ today: TUESDAY });

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0].data.userId === IDS.daily,
    );
    expect(call).toBeDefined();
    const email = call?.[0].email as { subject: string; html: string };
    expect(email.subject).toBe("TESTE OVERRIDE BRIEFING — diário");
    expect(email.html).toContain("override");
    expect(email.html).not.toContain("{{periodo}}");
  });
});
