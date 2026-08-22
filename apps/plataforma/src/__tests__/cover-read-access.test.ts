/**
 * cover-read-access.test.ts — getCourseCoverReadUrl, posse de storagePath
 * (D1-006, AUDIT/04-BACKLOG-CORRECAO.md PACOTE 9).
 *
 * Antes desta correção, a action assinava uma URL de leitura para QUALQUER
 * storagePath enviado pelo cliente, sem checar se pertencia a um curso real
 * nem ao próprio upload do ator — getMyAvatarUploadUrl (mesmo arquivo) já
 * mostrava o padrão certo: o path nasce de ctx.actorId, nunca é aceito cru
 * do cliente. getCourseCoverReadUrl agora só assina quando o path (a) começa
 * com `{actorId}/` (upload próprio, ainda não persistido) ou (b) é o
 * cover_url de um curso real (edição de um curso existente, qualquer staff).
 *
 * @supabase/supabase-js é mockado (mesmo padrão de
 * apps/financeiro/src/__tests__/attachments.test.ts) — o storage real não
 * participa deste teste, só a checagem de posse antes de chamá-lo.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, instructors, courses } from "@hebron/db/schema";

const MOCK_SIGNED_URL = "https://storage.test/plataforma-capas/mock-signed";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: MOCK_SIGNED_URL },
          error: null,
        }),
      }),
    },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
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

const IDS = {
  instructorUser: "9e000000-0000-0000-0000-000000000001",
  instructor: "9e100000-0000-0000-0000-000000000001",
  otherStaffUser: "9e000000-0000-0000-0000-000000000002",
  otherInstructor: "9e100000-0000-0000-0000-000000000002",
  course: "9e200000-0000-0000-0000-000000000001",
} as const;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.instructorUser,
        email: "cover-access-instrutor@test.hebron",
        fullName: "Cover Access Instrutor",
      },
      {
        id: IDS.otherStaffUser,
        email: "cover-access-outro-staff@test.hebron",
        fullName: "Cover Access Outro Staff",
      },
    ])
    .onConflictDoNothing();

  // staffAction (apps/plataforma) é orientado a dado, não a role: exige
  // super_admin OU uma linha em plataforma.instructors para o userId — o
  // claim de `roles` no resolveSession mockado é ignorado por essa action.
  // otherStaffUser precisa da própria linha de instrutor para ser "staff"
  // legítimo e ainda assim não ser o dono do upload original.
  await db
    .insert(instructors)
    .values([
      {
        id: IDS.instructor,
        userId: IDS.instructorUser,
        name: "Cover Access Instrutor",
      },
      {
        id: IDS.otherInstructor,
        userId: IDS.otherStaffUser,
        name: "Cover Access Outro Staff",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(courses)
    .values({
      id: IDS.course,
      title: "Cover Access Test",
      slug: "cover-access-test",
      description: "Curso para teste de posse de capa",
      category: "teste",
      instructorId: IDS.instructor,
      coverUrl: `${IDS.instructorUser}/real-cover.png`,
      published: true,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(courses).where(eq(courses.id, IDS.course));
  await db.delete(instructors).where(eq(instructors.id, IDS.instructor));
  await db.delete(instructors).where(eq(instructors.id, IDS.otherInstructor));
  await db.delete(users).where(eq(users.id, IDS.instructorUser));
  await db.delete(users).where(eq(users.id, IDS.otherStaffUser));
});

describe("getCourseCoverReadUrl", () => {
  it("assina o path do próprio upload recém-feito (prefixo {actorId}/)", async () => {
    const { getCourseCoverReadUrl } = await import("../actions/uploads");
    await actingAs(IDS.instructorUser, ["diretor"]);

    const result = await getCourseCoverReadUrl({
      storagePath: `${IDS.instructorUser}/novo-upload.png`,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.url).toBe(MOCK_SIGNED_URL);
  });

  it("assina o cover_url de um curso real, mesmo para staff que não é o dono do upload original", async () => {
    const { getCourseCoverReadUrl } = await import("../actions/uploads");
    await actingAs(IDS.otherStaffUser, ["colaborador"]);

    const result = await getCourseCoverReadUrl({
      storagePath: `${IDS.instructorUser}/real-cover.png`,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.url).toBe(MOCK_SIGNED_URL);
  });

  it("recusa um storagePath que não é upload próprio nem cover_url de curso algum", async () => {
    const { getCourseCoverReadUrl } = await import("../actions/uploads");
    await actingAs(IDS.otherStaffUser, ["colaborador"]);

    const result = await getCourseCoverReadUrl({
      storagePath: `${IDS.instructorUser}/nao-persistido-em-curso-algum.png`,
    });

    expect(result?.data).toBeUndefined();
    expect(result?.serverError).toBeDefined();
  });
});
