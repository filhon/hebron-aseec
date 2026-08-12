/**
 * notifications.test.ts — P-5.10b (CORRETIVO).
 *
 * Cobre os quatro defeitos do fan-out de anúncio urgente: a metade in_app
 * nunca pode depender do email ter saído (achado #1), o fan-out nunca pode
 * derrubar a publicação já commitada (achado #2), o envio respeita um teto
 * de concorrência declarado no código em vez de uma conexão por destinatário
 * (achado #3), e o texto salvo em admin.email_templates é o que o
 * destinatário recebe (achado #4).
 *
 * `createNotification` é mockado por inteiro (mesmo padrão de
 * apps/financeiro/src/__tests__/governance.test.ts) — o mock chama
 * `opts.insert(...)` para simular a inserção real que a implementação real
 * faz *depois* do envio, e não a chama no ramo de falha, replicando o
 * contrato de packages/email/src/lib/send.ts ("envia, depois insere") sem
 * depender de RESEND_API_KEY real nem de uma conta Resend.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  vi,
} from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  announcements,
  auditLog,
  notifications,
  emailTemplates,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

interface MockCreateNotificationOpts {
  insert: (data: Record<string, unknown>) => Promise<{ id: string }>;
  data: { userId: string; channel: string; [key: string]: unknown };
  email?: { subject?: string; html?: string; to?: string; template?: unknown };
}

let failFor = new Set<string>();
let inFlight = 0;
let maxInFlight = 0;
// Delay pequeno o bastante para não deixar o teste lento, grande o
// suficiente para garantir sobreposição real entre chamadas concorrentes.
const SEND_DELAY_MS = 15;

const createNotificationMock = vi.fn(
  async (opts: MockCreateNotificationOpts) => {
    if (opts.data.channel === "email") {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
      inFlight--;
      if (failFor.has(opts.data.userId)) {
        throw new Error("Falha simulada de envio (Resend)");
      }
    }
    return opts.insert({ ...opts.data, sentAt: new Date().toISOString() });
  },
);

vi.mock("@hebron/email", () => ({
  createNotification: (opts: MockCreateNotificationOpts) =>
    createNotificationMock(opts),
}));

async function actingAs(userId: string, roles: string[]): Promise<void> {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: roles as any,
    designations: [],
  });
}

function testUserId(n: number): string {
  return `e5aa0000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

const AUTHOR_ID = testUserId(900);
const RECIPIENT_COUNT = 25;
const RECIPIENT_IDS = Array.from({ length: RECIPIENT_COUNT }, (_, i) =>
  testUserId(i),
);
const ALL_TEST_USER_IDS = [AUTHOR_ID, ...RECIPIENT_IDS];

const createdAnnouncementIds: string[] = [];

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: AUTHOR_ID,
        email: "notif-author@test.hebron",
        fullName: "Diretor Notif",
      },
      ...RECIPIENT_IDS.map((id, i) => ({
        id,
        email: `notif-recipient-${i}@test.hebron`,
        fullName: `Recipiente Notif ${i}`,
      })),
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: AUTHOR_ID, role: "diretor" as const },
      ...RECIPIENT_IDS.map((id) => ({
        userId: id,
        role: "colaborador" as const,
      })),
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(notifications)
    .where(inArray(notifications.userId, ALL_TEST_USER_IDS));
  if (createdAnnouncementIds.length > 0) {
    await db
      .delete(auditLog)
      .where(inArray(auditLog.entityId, createdAnnouncementIds));
    await db
      .delete(announcements)
      .where(inArray(announcements.id, createdAnnouncementIds));
  }
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, ALL_TEST_USER_IDS));
  await db.delete(users).where(inArray(users.id, ALL_TEST_USER_IDS));
  await db
    .delete(emailTemplates)
    .where(eq(emailTemplates.slug, "intranet-urgent-announcement"));
});

beforeEach(() => {
  createNotificationMock.mockClear();
  failFor = new Set();
  inFlight = 0;
  maxInFlight = 0;
});

afterEach(async () => {
  await db
    .delete(notifications)
    .where(inArray(notifications.userId, ALL_TEST_USER_IDS));
});

describe("notifyUrgentAnnouncement — in_app nunca depende do email (P-5.10b)", () => {
  it("quando o envio falha para todos, cada destinatário ainda recebe a notificação in_app", async () => {
    failFor = new Set(RECIPIENT_IDS);
    const { notifyUrgentAnnouncement } = await import("../lib/notifications");

    const result = await notifyUrgentAnnouncement({
      id: "00000000-0000-0000-0000-0000000000a1",
      title: "Manutenção programada",
      body: "Sistemas indisponíveis das 6h às 8h.",
      authorName: "Diretor Notif",
      publishedAt: new Date(),
    });

    // `recipients` é o total de internos ativos no banco (banco de dev
    // compartilhado, ~150 usuários reais, CLAUDE.md) — sempre >= o conjunto
    // de teste. `emailFailures` é exato: só os IDs de teste estão em
    // `failFor`, então só eles falham, não importa quantos outros existam.
    expect(result.recipients).toBeGreaterThanOrEqual(RECIPIENT_COUNT);
    expect(result.emailFailures).toBe(RECIPIENT_COUNT);

    const rows = await db
      .select()
      .from(notifications)
      .where(inArray(notifications.userId, RECIPIENT_IDS));
    expect(rows).toHaveLength(RECIPIENT_COUNT);
    for (const row of rows) {
      expect(row.channel).toBe("in_app");
      expect(row.sentAt).toBeNull();
      expect(row.title).toBe("Manutenção programada");
    }
  });

  it("falha de envio para um destinatário não impede os outros", async () => {
    const [firstFail, ...rest] = RECIPIENT_IDS;
    failFor = new Set([firstFail as string]);
    const { notifyUrgentAnnouncement } = await import("../lib/notifications");

    const result = await notifyUrgentAnnouncement({
      id: "00000000-0000-0000-0000-0000000000a2",
      title: "Assembleia geral",
      body: "Corpo do anúncio de teste.",
      authorName: "Diretor Notif",
      publishedAt: new Date(),
    });

    expect(result.emailFailures).toBe(1);

    const failedRows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, firstFail as string));
    expect(failedRows).toHaveLength(1);
    expect(failedRows[0]?.channel).toBe("in_app");
    expect(failedRows[0]?.sentAt).toBeNull();

    const succeededRows = await db
      .select()
      .from(notifications)
      .where(inArray(notifications.userId, rest));
    expect(succeededRows).toHaveLength(rest.length);
    for (const row of succeededRows) {
      expect(row.channel).toBe("email");
      expect(row.sentAt).not.toBeNull();
    }
  });
});

describe("notifyUrgentAnnouncement — teto de concorrência (P-5.10b)", () => {
  it("nunca processa mais destinatários em paralelo do que o teto declarado no código", async () => {
    const { notifyUrgentAnnouncement } = await import("../lib/notifications");

    await notifyUrgentAnnouncement({
      id: "00000000-0000-0000-0000-0000000000a3",
      title: "Aviso de concorrência",
      body: "Corpo do anúncio de teste.",
      authorName: "Diretor Notif",
      publishedAt: new Date(),
    });

    // RECIPIENT_COUNT (25) é bem maior que qualquer teto razoável — antes
    // da correção, um Promise.all sobre todos os destinatários levaria
    // maxInFlight a 25 (uma conexão por destinatário, achado #3).
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(10);
  });
});

describe("notifyUrgentAnnouncement — texto editável no Admin (P-5.10b)", () => {
  afterEach(async () => {
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.slug, "intranet-urgent-announcement"));
  });

  it("usa o texto salvo em admin.email_templates quando existir", async () => {
    await db.insert(emailTemplates).values({
      slug: "intranet-urgent-announcement",
      subject: "TESTE OVERRIDE — {{titulo}}",
      bodyHtml: "<p>override {{nome}} — {{corpo}} — {{autor}} — {{link}}</p>",
      bodyText: "override",
      variables: ["nome", "titulo", "corpo", "autor", "dataPublicacao", "link"],
      updatedBy: AUTHOR_ID,
    });

    const { notifyUrgentAnnouncement } = await import("../lib/notifications");
    const target = RECIPIENT_IDS[0] as string;

    await notifyUrgentAnnouncement({
      id: "00000000-0000-0000-0000-0000000000a4",
      title: "Manutenção",
      body: "Texto do corpo do anúncio de teste.",
      authorName: "Diretor Notif",
      publishedAt: new Date("2026-07-22T14:30:00-03:00"),
    });

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0].data.userId === target,
    );
    expect(call).toBeDefined();
    const email = call?.[0].email;
    expect(email?.subject).toBe("TESTE OVERRIDE — Manutenção");
    expect(email?.html).toContain("Texto do corpo do anúncio de teste.");
    expect(email?.html).not.toContain("{{corpo}}");
  });

  it("sem linha salva, cai no componente React (fallback) sem regressão", async () => {
    const { notifyUrgentAnnouncement } = await import("../lib/notifications");
    const target = RECIPIENT_IDS[0] as string;

    await notifyUrgentAnnouncement({
      id: "00000000-0000-0000-0000-0000000000a5",
      title: "Sem override",
      body: "Corpo do anúncio de teste.",
      authorName: "Diretor Notif",
      publishedAt: new Date(),
    });

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0].data.userId === target,
    );
    const email = call?.[0].email;
    expect(email?.subject).toBe("[Urgente] Sem override");
    expect(email?.html).toBeUndefined();
    expect(email?.template).toBeTruthy();
  });
});

describe("createAnnouncement — fan-out nunca derruba a publicação (P-5.10b)", () => {
  it("anúncio urgente é publicado mesmo quando todo o envio de email falha", async () => {
    failFor = new Set(RECIPIENT_IDS);
    await actingAs(AUTHOR_ID, ["diretor"]);
    const { createAnnouncement } = await import("../actions/announcements");

    const result = await createAnnouncement({
      title: "Urgente — teste de publicação",
      body: "Corpo do anúncio urgente de teste.",
      priority: "urgente",
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.announcement).toBeTruthy();
    expect(result?.data?.emailFailures).toBe(RECIPIENT_COUNT);
    const announcementId = result?.data?.announcement?.id;
    if (announcementId) createdAnnouncementIds.push(announcementId);

    const inAppRows = await db
      .select()
      .from(notifications)
      .where(inArray(notifications.userId, RECIPIENT_IDS));
    expect(inAppRows).toHaveLength(RECIPIENT_COUNT);
    for (const row of inAppRows) {
      expect(row.channel).toBe("in_app");
    }
  });

  it("anúncio normal/importante não dispara email em massa", async () => {
    await actingAs(AUTHOR_ID, ["diretor"]);
    const { createAnnouncement } = await import("../actions/announcements");

    const result = await createAnnouncement({
      title: "Normal — teste sem email",
      body: "Corpo do anúncio normal de teste.",
      priority: "normal",
    });

    expect(result?.serverError).toBeUndefined();
    const announcementId = result?.data?.announcement?.id;
    if (announcementId) createdAnnouncementIds.push(announcementId);
    expect(result?.data?.emailFailures).toBeNull();
    expect(createNotificationMock).not.toHaveBeenCalled();

    const rows = await db
      .select()
      .from(notifications)
      .where(inArray(notifications.userId, RECIPIENT_IDS));
    expect(rows).toHaveLength(0);
  });
});
