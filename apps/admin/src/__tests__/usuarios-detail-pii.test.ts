/**
 * usuarios-detail-pii.test.ts — D8-002 (LGPD art. 37: log de acesso a PII de
 * terceiro).
 *
 * "Abre a tela" no sentido do critério de aceite do PACOTE 1: chama o
 * Server Component `UserDetailPage` diretamente (é só uma função async —
 * App Router não exige um servidor HTTP rodando para isso) e verifica a
 * linha de `pii.accessed` gravada em admin.audit_log, contra o banco real.
 * Não renderiza a árvore React (não precisamos do HTML, só do efeito
 * colateral de `logPiiAccess` que a página dispara antes de montar a UI).
 *
 * Requer `esbuild.jsx: "automatic"` em vitest.config.ts (tsconfig usa
 * "preserve", que só o SWC do Next sabe transformar).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments, auditLog } from "@hebron/db/schema";

const VIEWER_ID = "d1a00000-0000-0000-0000-000000000001";
const SUBJECT_ID = "d1a00000-0000-0000-0000-000000000002";
const VIEWER_EMAIL = "usuarios-detail-viewer@test.hebron";
const SUBJECT_EMAIL = "usuarios-detail-subject@test.hebron";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
  }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: VIEWER_ID,
    roles: ["super_admin"],
  }),
}));

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      { id: VIEWER_ID, email: VIEWER_EMAIL, fullName: "Viewer Admin" },
      {
        id: SUBJECT_ID,
        email: SUBJECT_EMAIL,
        fullName: "Subject User",
        documentCpf: "52998224725",
        phone: "11955554444",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values({ userId: VIEWER_ID, role: "super_admin", grantedBy: VIEWER_ID })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, VIEWER_ID));
  for (const id of [VIEWER_ID, SUBJECT_ID]) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("UserDetailPage — leitura de terceiro grava pii.accessed", () => {
  it("super_admin abrindo o cadastro de outro usuário grava pii.accessed com CPF/telefone nos campos", async () => {
    const { default: UserDetailPage } =
      await import("../app/(dashboard)/usuarios/[id]/page");

    await UserDetailPage({
      params: Promise.resolve({ id: SUBJECT_ID }),
      searchParams: Promise.resolve({}),
    });

    const entries = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "pii.accessed"),
          eq(auditLog.actorId, VIEWER_ID),
          eq(auditLog.entityId, SUBJECT_ID),
        ),
      );
    expect(entries).toHaveLength(1);
    const diffJson = JSON.stringify(entries[0]?.diff);
    expect(diffJson).toContain("documentCpf");
    expect(diffJson).toContain("phone");
    // Nunca o valor lido, só os nomes dos campos.
    expect(diffJson).not.toContain("52998224725");
  });

  it("super_admin abrindo o próprio cadastro NÃO grava pii.accessed (não é leitura de terceiro)", async () => {
    const { default: UserDetailPage } =
      await import("../app/(dashboard)/usuarios/[id]/page");

    await UserDetailPage({
      params: Promise.resolve({ id: VIEWER_ID }),
      searchParams: Promise.resolve({}),
    });

    const entries = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "pii.accessed"),
          eq(auditLog.actorId, VIEWER_ID),
          eq(auditLog.entityId, VIEWER_ID),
        ),
      );
    expect(entries).toHaveLength(0);
  });
});
