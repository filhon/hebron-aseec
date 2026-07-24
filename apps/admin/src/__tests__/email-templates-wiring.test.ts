/**
 * email-templates-wiring.test.ts — P-1.10c
 *
 * Fecha o seam identificado no CORRETIVO: `admin.email_templates` (editável
 * pelo super_admin, P-1.10b) nunca alterava um email de fato enviado —
 * `sendInvitation`/`resetPassword`/`approveSignup` sempre renderizavam o
 * componente React Email hardcoded. Este arquivo cobre:
 *
 *   1. `interpolateStoredTemplate` isolado (substituição de {{var}}, escape
 *      de HTML, placeholder desconhecido preservado).
 *   2. A integração nas três actions do Admin: com uma linha de template
 *      simulada, o email enviado usa o texto do banco; sem linha (loader
 *      retorna null), cai no componente React atual — sem regressão.
 *
 * `getEmailTemplateBySlug` é mockado (não a tabela real) para exercitar os
 * dois ramos de forma determinística, independente de quais dos 15 slugs
 * já foram customizados no banco compartilhado de dev por P-1.10b.
 *
 * Mocks: mesmo padrão de actions.test.ts (next/headers, @hebron/auth/server,
 * @supabase/supabase-js, componentes React Email). `@hebron/email` mantém
 * `interpolateStoredTemplate` real via importOriginal — só `createNotification`
 * é substituído, para capturar o argumento `email` sem enviar via Resend.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  invitations,
  auditLog,
} from "@hebron/db/schema";
import type { EmailTemplate } from "@hebron/db/schema";
import { interpolateStoredTemplate } from "@hebron/email";
import type * as EmailModule from "@hebron/email";

const ACTOR_ID = "f1000000-0000-0000-0000-000000000001";
const ACTOR_EMAIL = "tpl-wiring-actor@test.hebron";
const TARGET_ID = "f1000000-0000-0000-0000-000000000002";
const TARGET_EMAIL = "tpl-wiring-target@test.hebron";
const PENDING_ID = "f1000000-0000-0000-0000-000000000003";
const PENDING_EMAIL = "tpl-wiring-pending@test.hebron";

// ── Mocks ────────────────────────────────────────────────────────────────────

const getEmailTemplateBySlugMock =
  vi.fn<(slug: string) => Promise<EmailTemplate | null>>();
vi.mock("@hebron/db/email-templates", () => ({
  getEmailTemplateBySlug: (slug: string) => getEmailTemplateBySlugMock(slug),
}));

vi.mock("@hebron/email", async (importOriginal) => {
  const actual = await importOriginal<typeof EmailModule>();
  return {
    ...actual,
    createNotification: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
  };
});

vi.mock("@hebron/email/templates/invitation", () => ({
  InvitationEmail: vi.fn().mockReturnValue(null),
}));
vi.mock("@hebron/email/templates/welcome", () => ({
  WelcomeEmail: vi.fn().mockReturnValue(null),
}));
vi.mock("@hebron/email/templates/password-reset", () => ({
  PasswordResetEmail: vi.fn().mockReturnValue(null),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        generateLink: vi.fn().mockResolvedValue({
          data: {
            properties: { action_link: "https://example.com/reset?token=mock" },
          },
          error: null,
        }),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["super_admin"],
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
  }),
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireDefined<T>(value: T | undefined | null, label = "value"): T {
  if (value == null) throw new Error(`Expected ${label} to be defined`);
  return value;
}

function fakeTemplate(
  fields: Pick<EmailTemplate, "subject" | "bodyHtml" | "bodyText">,
): EmailTemplate {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    slug: "test-slug",
    variables: [],
    updatedBy: null,
    updatedAt: new Date(),
    ...fields,
  };
}

async function getActions() {
  const users_ = await import("../actions/users");
  const invitations_ = await import("../actions/invitations");
  return { ...users_, ...invitations_ };
}

async function lastEmailCallArg() {
  const { createNotification } = await import("@hebron/email");
  const mock = vi.mocked(createNotification);
  const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
  if (!lastCall) throw new Error("createNotification não foi chamado");
  return lastCall[0].email;
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await db
    .insert(users)
    .values({ id: ACTOR_ID, email: ACTOR_EMAIL, fullName: "Admin Convidador" })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({ id: TARGET_ID, email: TARGET_EMAIL, fullName: "Alvo do Reset" })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({
      id: PENDING_ID,
      email: PENDING_EMAIL,
      fullName: "Cadastro Pendente",
      status: "pending_approval",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "super_admin", grantedBy: ACTOR_ID })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(invitations).where(eq(invitations.invitedBy, ACTOR_ID));
  const ids = [ACTOR_ID, TARGET_ID, PENDING_ID];
  // Duas passagens antes de apagar os usuários: approveSignup grava
  // role_assignments com grantedBy = ACTOR_ID para o usuário PENDING_ID —
  // apagar users de ACTOR_ID antes dessa linha ser removida viola
  // role_assignments_granted_by_users_id_fk.
  for (const id of ids) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of ids) {
    await db.delete(roleAssignments).where(eq(roleAssignments.grantedBy, id));
  }
  for (const id of ids) {
    await db.delete(users).where(eq(users.id, id));
  }
});

beforeEach(() => {
  getEmailTemplateBySlugMock.mockReset();
  getEmailTemplateBySlugMock.mockResolvedValue(null);
});

// ── interpolateStoredTemplate (unidade) ────────────────────────────────────────

describe("interpolateStoredTemplate", () => {
  it("substitui {{var}} em subject/html/text", () => {
    const result = interpolateStoredTemplate(
      {
        subject: "Olá {{nome}}",
        bodyHtml: "<p>{{nome}}, acesse {{link}}</p>",
        bodyText: "{{nome}}, acesse {{link}}",
      },
      { nome: "Maria", link: "https://x.test/y" },
    );
    expect(result.subject).toBe("Olá Maria");
    expect(result.html).toBe("<p>Maria, acesse https://x.test/y</p>");
    expect(result.text).toBe("Maria, acesse https://x.test/y");
  });

  it("escapa HTML dos valores interpolados no corpo HTML (não no texto puro)", () => {
    const result = interpolateStoredTemplate(
      {
        subject: "{{nome}}",
        bodyHtml: "<p>{{nome}}</p>",
        bodyText: "{{nome}}",
      },
      { nome: `<script>alert("x")</script>` },
    );
    expect(result.html).toBe(
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>",
    );
    expect(result.text).toBe(`<script>alert("x")</script>`);
  });

  it("mantém placeholders desconhecidos intactos", () => {
    const result = interpolateStoredTemplate(
      {
        subject: "{{nome}} — {{campo_sem_valor}}",
        bodyHtml: "x",
        bodyText: "x",
      },
      { nome: "Maria" },
    );
    expect(result.subject).toBe("Maria — {{campo_sem_valor}}");
  });
});

// ── sendInvitation ────────────────────────────────────────────────────────────

describe("sendInvitation — templates do banco (P-1.10c)", () => {
  it("com linha para o slug 'invitation', o email usa o texto do banco", async () => {
    getEmailTemplateBySlugMock.mockResolvedValue(
      fakeTemplate({
        subject: "Convite customizado para {{papel}}",
        bodyHtml: "<p>{{nome}} chamou você. Link: {{link}}</p>",
        bodyText: "{{nome}} chamou você. Link: {{link}}",
      }),
    );

    const { sendInvitation } = await getActions();
    const result = await sendInvitation({
      email: "convidado-custom@test.hebron",
      roles: ["colaborador"],
      expiresInDays: 7,
    });

    expect(result?.serverError).toBeUndefined();
    const token = requireDefined(result?.data?.invitation.token, "token");
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";
    const inviteUrl = `${appUrl}/convite?token=${token}`;

    expect(getEmailTemplateBySlugMock).toHaveBeenCalledWith("invitation");

    const email = await lastEmailCallArg();
    expect(email?.subject).toBe("Convite customizado para colaborador");
    expect(email?.html).toBe(
      `<p>Admin Convidador chamou você. Link: ${inviteUrl}</p>`,
    );
  });

  it("sem linha para o slug, cai no componente React (fallback) sem regressão", async () => {
    getEmailTemplateBySlugMock.mockResolvedValue(null);

    const { sendInvitation } = await getActions();
    const result = await sendInvitation({
      email: "convidado-fallback@test.hebron",
      roles: ["colaborador"],
      expiresInDays: 7,
    });

    expect(result?.serverError).toBeUndefined();

    const email = await lastEmailCallArg();
    expect(email?.subject).toBe("Convite para Hebron Aseec");
    expect(email?.html).toBeUndefined();
    expect(email?.template).toBeTruthy();
  });
});

// ── resetPassword ────────────────────────────────────────────────────────────

describe("resetPassword — templates do banco (P-1.10c)", () => {
  it("com linha para o slug 'password-reset', o email usa o texto do banco", async () => {
    getEmailTemplateBySlugMock.mockResolvedValue(
      fakeTemplate({
        subject: "Redefina, {{nome}}",
        bodyHtml: "<p>{{nome}}: {{link}}</p>",
        bodyText: "{{nome}}: {{link}}",
      }),
    );

    const { resetPassword } = await getActions();
    const result = await resetPassword({ id: TARGET_ID });

    expect(result?.serverError).toBeUndefined();
    expect(getEmailTemplateBySlugMock).toHaveBeenCalledWith("password-reset");

    const email = await lastEmailCallArg();
    expect(email?.subject).toBe("Redefina, Alvo do Reset");
    expect(email?.html).toBe(
      "<p>Alvo do Reset: https://example.com/reset?token=mock</p>",
    );
  });

  it("sem linha para o slug, cai no componente React (fallback) sem regressão", async () => {
    getEmailTemplateBySlugMock.mockResolvedValue(null);

    const { resetPassword } = await getActions();
    const result = await resetPassword({ id: TARGET_ID });

    expect(result?.serverError).toBeUndefined();

    const email = await lastEmailCallArg();
    expect(email?.subject).toBe("Redefinição de senha — Hebron Aseec");
    expect(email?.html).toBeUndefined();
    expect(email?.template).toBeTruthy();
  });
});

// ── approveSignup ─────────────────────────────────────────────────────────────

describe("approveSignup — templates do banco (P-1.10c)", () => {
  it("com linha para o slug 'welcome', o email de boas-vindas usa o texto do banco", async () => {
    getEmailTemplateBySlugMock.mockResolvedValue(
      fakeTemplate({
        subject: "Boas-vindas, {{nome}}",
        bodyHtml: "<p>{{nome}} ({{papel}}): {{link}}</p>",
        bodyText: "{{nome}} ({{papel}}): {{link}}",
      }),
    );

    const { approveSignup } = await getActions();
    const result = await approveSignup({ id: PENDING_ID });

    expect(result?.serverError).toBeUndefined();
    expect(getEmailTemplateBySlugMock).toHaveBeenCalledWith("welcome");

    const email = await lastEmailCallArg();
    expect(email?.subject).toBe("Boas-vindas, Cadastro Pendente");
    expect(email?.html).toContain("Cadastro Pendente (submissor)");
  });
});
