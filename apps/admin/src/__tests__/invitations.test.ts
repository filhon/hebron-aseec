/**
 * invitations.test.ts — sendInvitation, conflito de interesse (D6-002)
 *
 * PACOTE 9 (AUDIT/04-BACKLOG-CORRECAO.md): a regra de conflito de interesse
 * (BRAIN.md §6.1 — diretor/conselheiro não pode ser submissor/hóspede) só
 * era verificada em assignRole. sendInvitation aceitava
 * roles: ["diretor", "submissor"] sem reclamar, gravando o convite — e
 * quem aceitasse acabaria com a combinação proibida. A checagem roda ANTES
 * de qualquer escrita (findRoleSetConflict, @hebron/db/conflict-of-interest),
 * então este teste não precisa mockar e-mail/notificação: a rejeição
 * acontece antes de qualquer um dos dois ser alcançado.
 */
import { describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { invitations } from "@hebron/db/schema";

const ACTOR_ID = "d4000000-0000-0000-0000-000000000001";

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
}));

async function getActions() {
  return await import("../actions/invitations");
}

describe("sendInvitation — conflito de interesse (D6-002, BRAIN.md §6.1)", () => {
  it("recusa convite com diretor + submissor combinados, antes de gravar", async () => {
    const { sendInvitation } = await getActions();
    const email = `convite-conflito-${Date.now()}@test.hebron`;

    const result = await sendInvitation({
      email,
      roles: ["diretor", "submissor"],
    });

    expect(result?.serverError).toBeDefined();
    expect(result?.serverError).toContain("Conflito de interesse");

    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.email, email));
    expect(rows).toHaveLength(0);
  });

  it("recusa convite com conselheiro + hospede combinados — sentido oposto", async () => {
    const { sendInvitation } = await getActions();
    const email = `convite-conflito2-${Date.now()}@test.hebron`;

    const result = await sendInvitation({
      email,
      roles: ["conselheiro", "hospede"],
    });

    expect(result?.serverError).toBeDefined();
    expect(result?.serverError).toContain("Conflito de interesse");

    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.email, email));
    expect(rows).toHaveLength(0);
  });
});
