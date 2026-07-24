/**
 * email-templates-wiring.test.ts — P-1.10c
 *
 * Cobre o wiring de `acceptInvitation` (email de boas-vindas) com
 * `admin.email_templates`, complementando invitations.test.ts (que já cobre
 * o fluxo completo de criação de conta/papéis sem mock). Ver
 * apps/admin/src/__tests__/email-templates-wiring.test.ts para o mesmo
 * padrão nas actions do Admin (convite, reset de senha, aprovação de
 * cadastro).
 *
 * `getEmailTemplateBySlug` é mockado (não a tabela real) para exercitar os
 * dois ramos — linha customizada / ausente — de forma determinística.
 * `createTestAuthUser`/`deleteTestAuthUser` seguem reais (mesmo padrão de
 * invitations.test.ts): a criação de conta é o que valida que o wiring do
 * template não quebrou o fluxo de aceite.
 */
import { describe, it, expect, afterAll, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { invitations, roleAssignments, users } from "@hebron/db/schema";
import type { EmailTemplate } from "@hebron/db/schema";
import { deleteTestAuthUser } from "@hebron/auth/testing";
import type * as EmailModule from "@hebron/email";

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
vi.mock("@hebron/email/templates/welcome", () => ({
  WelcomeEmail: vi.fn().mockReturnValue(null),
}));

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

// acceptInvitation dispara dois createNotification: o email de boas-vindas
// (channel "email") e, em seguida, notifyInvitationAccepted — um in_app para
// o convidador, sem campo `email`. Pega a última chamada com canal "email",
// não a última chamada de todas.
async function lastEmailCallArg() {
  const { createNotification } = await import("@hebron/email");
  const mock = vi.mocked(createNotification);
  const emailCalls = mock.mock.calls.filter(
    (call) => call[0].data.channel === "email",
  );
  const lastCall = emailCalls[emailCalls.length - 1];
  if (!lastCall)
    throw new Error("createNotification (channel email) não foi chamado");
  return lastCall[0].email;
}

const createdAuthUserIds: string[] = [];
const createdInvitationIds: string[] = [];

afterAll(async () => {
  for (const id of createdAuthUserIds) {
    await deleteTestAuthUser(id);
  }
  for (const id of createdInvitationIds) {
    await db.delete(invitations).where(eq(invitations.id, id));
  }
});

beforeEach(async () => {
  getEmailTemplateBySlugMock.mockReset();
  getEmailTemplateBySlugMock.mockResolvedValue(null);
  const { createNotification } = await import("@hebron/email");
  vi.mocked(createNotification).mockClear();
});

async function createInvitation(params: {
  email: string;
  roles: string[];
  invitedBy: string;
}) {
  const token = `test-token-tpl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [row] = await db
    .insert(invitations)
    .values({
      email: params.email,
      roles: params.roles,
      token,
      invitedBy: params.invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .returning();
  if (!row) throw new Error("Falha ao criar convite de teste");
  createdInvitationIds.push(row.id);
  return row;
}

describe("acceptInvitation — templates do banco (P-1.10c)", () => {
  it("com linha para o slug 'welcome', o email de boas-vindas usa o texto do banco", async () => {
    getEmailTemplateBySlugMock.mockResolvedValue(
      fakeTemplate({
        subject: "Boas-vindas customizado, {{nome}}",
        bodyHtml: "<p>{{nome}} ({{papel}}): {{link}}</p>",
        bodyText: "{{nome}} ({{papel}}): {{link}}",
      }),
    );

    const { createTestAuthUser } = await import("@hebron/auth/testing");
    const inviterId = await createTestAuthUser(
      `tpl-welcome-inviter-${Date.now()}@test.hebron`,
      "T3st-Tpl-Inviter!",
    );
    createdAuthUserIds.push(inviterId);
    await db.insert(roleAssignments).values({
      userId: inviterId,
      role: "super_admin",
      grantedBy: inviterId,
    });

    const inviteeEmail = `tpl-welcome-aceito-${Date.now()}@test.hebron`;
    const invitation = await createInvitation({
      email: inviteeEmail,
      roles: ["aluno"],
      invitedBy: inviterId,
    });

    const { acceptInvitation } = await import("../actions/invitations");
    const result = await acceptInvitation({
      token: invitation.token,
      name: "Novo Aluno Tpl",
      password: "T3st-Novo-Aluno!",
    });

    expect(result?.serverError).toBeUndefined();
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.email, inviteeEmail));
    if (userRow) createdAuthUserIds.push(userRow.id);

    expect(getEmailTemplateBySlugMock).toHaveBeenCalledWith("welcome");

    const email = await lastEmailCallArg();
    expect(email?.subject).toBe("Boas-vindas customizado, Novo Aluno Tpl");
    expect(email?.html).toContain("Novo Aluno Tpl (aluno):");
  });

  it("sem linha para o slug, cai no componente React (fallback) sem regressão", async () => {
    getEmailTemplateBySlugMock.mockResolvedValue(null);

    const { createTestAuthUser } = await import("@hebron/auth/testing");
    const inviterId = await createTestAuthUser(
      `tpl-welcome-fb-inviter-${Date.now()}@test.hebron`,
      "T3st-Tpl-Inviter!",
    );
    createdAuthUserIds.push(inviterId);
    await db.insert(roleAssignments).values({
      userId: inviterId,
      role: "super_admin",
      grantedBy: inviterId,
    });

    const inviteeEmail = `tpl-welcome-fb-${Date.now()}@test.hebron`;
    const invitation = await createInvitation({
      email: inviteeEmail,
      roles: ["aluno"],
      invitedBy: inviterId,
    });

    const { acceptInvitation } = await import("../actions/invitations");
    const result = await acceptInvitation({
      token: invitation.token,
      name: "Aluno Fallback",
      password: "T3st-Novo-Aluno!",
    });

    expect(result?.serverError).toBeUndefined();
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.email, inviteeEmail));
    if (userRow) createdAuthUserIds.push(userRow.id);

    const email = await lastEmailCallArg();
    expect(email?.subject).toBe("Bem-vindo(a) à Hebron Aseec");
    expect(email?.html).toBeUndefined();
    expect(email?.template).toBeTruthy();
  });
});
