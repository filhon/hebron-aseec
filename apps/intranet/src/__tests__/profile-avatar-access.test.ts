/**
 * profile-avatar-access.test.ts — getMyAvatarReadUrl, posse de storagePath
 * (D1-006, AUDIT/04-BACKLOG-CORRECAO.md PACOTE 9).
 *
 * Antes desta correção, a action assinava uma URL de leitura para QUALQUER
 * storagePath enviado pelo cliente — incluindo o avatar de outro usuário,
 * bastando conhecer (ou adivinhar) o path — sem checar posse. O único
 * chamador real (profile-form.tsx) sempre passa o próprio path recém-
 * enviado, mas a action em si não impunha isso. getMyAvatarUploadUrl (mesmo
 * arquivo) já constrói o path a partir de ctx.actorId — getMyAvatarReadUrl
 * agora exige o mesmo prefixo.
 *
 * @supabase/supabase-js é mockado (mesmo padrão de
 * apps/plataforma/src/__tests__/cover-read-access.test.ts) — o storage real
 * não participa deste teste, só a checagem de posse antes de chamá-lo.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments } from "@hebron/db/schema";

const MOCK_SIGNED_URL = "https://storage.test/perfil-avatares/mock-signed";

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
  owner: "e5000000-0000-0000-0000-000000000001",
  outro: "e5000000-0000-0000-0000-000000000002",
} as const;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.owner,
        email: "avatar-access-owner@test.hebron",
        fullName: "Avatar Access Owner",
      },
      {
        id: IDS.outro,
        email: "avatar-access-outro@test.hebron",
        fullName: "Avatar Access Outro",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.owner, role: "colaborador", grantedBy: IDS.owner },
      { userId: IDS.outro, role: "colaborador", grantedBy: IDS.outro },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, Object.values(IDS)));
  await db.delete(users).where(inArray(users.id, Object.values(IDS)));
});

describe("getMyAvatarReadUrl", () => {
  it("assina o próprio avatar (storagePath com prefixo {actorId}/)", async () => {
    const { getMyAvatarReadUrl } = await import("../actions/profile");
    await actingAs(IDS.owner, ["colaborador"]);

    const result = await getMyAvatarReadUrl({
      storagePath: `${IDS.owner}/avatar.png`,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.url).toBe(MOCK_SIGNED_URL);
  });

  it("recusa assinar o avatar de outro usuário, mesmo sabendo o storagePath exato", async () => {
    const { getMyAvatarReadUrl } = await import("../actions/profile");
    await actingAs(IDS.outro, ["colaborador"]);

    const result = await getMyAvatarReadUrl({
      storagePath: `${IDS.owner}/avatar.png`,
    });

    expect(result?.data).toBeUndefined();
    expect(result?.serverError).toBeDefined();
  });
});
