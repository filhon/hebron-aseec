/**
 * materials.test.ts — faixas (upload R2), materiais exclusivos e termo de
 * uso (P-8.8: actions/tracks.ts, actions/materials.ts, actions/terms.ts).
 *
 * Mocks:
 *   - next/headers        → cookies sem contexto de request
 *   - @hebron/auth/server → resolveSession por cenário (super_admin / ouvinte)
 *   - ../lib/r2            → client R2 real (@aws-sdk/client-s3) não é
 *     chamado — sem rede, sem credenciais reais exercitadas
 *   - @hebron/email        → createNotification como spy (sem envio real)
 *
 * A constraint de banco que garante "duplo aceite retorna erro"
 * (`term_acceptances.user_id` UNIQUE) é testada em rls.test.ts; aqui testamos
 * o comportamento real da Server Action `acceptTerm`, que é deliberadamente
 * idempotente (retorna o aceite existente em vez de tentar inserir de novo —
 * ver actions/terms.ts).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  authors,
  tracks,
  exclusiveMaterials,
  termAcceptances,
  auditLog,
} from "@hebron/db/schema";

const IDS = {
  users: {
    superAdmin: "8a140000-0000-0000-0000-000000000001",
    withTerm: "8a140000-0000-0000-0000-000000000002",
    noTerm: "8a140000-0000-0000-0000-000000000003",
  },
  author: "8a141000-0000-0000-0000-000000000001",
} as const;

const MOCK_UPLOAD_URL = "https://mock-r2.test/upload";
const MOCK_DOWNLOAD_URL = "https://mock-r2.test/download";
const DOWNLOAD_URL_EXPIRES_IN_SECONDS = 60 * 60; // critério de aceite: 1h

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: IDS.users.superAdmin,
    roles: ["super_admin"],
    designations: [],
  }),
}));

vi.mock("../lib/r2", () => ({
  getR2UploadUrl: vi.fn().mockResolvedValue(MOCK_UPLOAD_URL),
  getR2DownloadUrl: vi.fn().mockResolvedValue(MOCK_DOWNLOAD_URL),
  getR2PublicUrl: vi.fn((key: string) => `https://mock-r2.test/public/${key}`),
}));

vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notification-id" }),
}));

const createdMaterialIds: string[] = [];

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.users.superAdmin,
        email: "materials-test-super@test.hebron",
        fullName: "Materials Test SuperAdmin",
      },
      {
        id: IDS.users.withTerm,
        email: "materials-test-com-termo@test.hebron",
        fullName: "Materials Test Com Termo",
      },
      {
        id: IDS.users.noTerm,
        email: "materials-test-sem-termo@test.hebron",
        fullName: "Materials Test Sem Termo",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.users.superAdmin,
        role: "super_admin",
        grantedBy: IDS.users.superAdmin,
      },
      {
        userId: IDS.users.withTerm,
        role: "ouvinte",
        grantedBy: IDS.users.superAdmin,
      },
      {
        userId: IDS.users.noTerm,
        role: "ouvinte",
        grantedBy: IDS.users.superAdmin,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(authors)
    .values({ id: IDS.author, name: "Materials Test Autor" })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(termAcceptances)
    .where(inArray(termAcceptances.userId, Object.values(IDS.users)));
  if (createdMaterialIds.length > 0) {
    await db
      .delete(exclusiveMaterials)
      .where(inArray(exclusiveMaterials.id, createdMaterialIds));
  }
  await db.delete(tracks).where(eq(tracks.authorId, IDS.author));
  await db.delete(authors).where(eq(authors.id, IDS.author));
  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorId, Object.values(IDS.users)));
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, Object.values(IDS.users)));
  await db.delete(users).where(inArray(users.id, Object.values(IDS.users)));
});

// ── getTrackUploadUrl / createTrack — upload de faixa para R2 ─────────────

describe("getTrackUploadUrl — upload de faixa para R2", () => {
  it("super_admin recebe signed upload URL e key sob tracks/*.mp3", async () => {
    const { getTrackUploadUrl } = await import("../actions/tracks");

    const result = await getTrackUploadUrl({
      fileName: "sermao-domingo.mp3",
      contentType: "audio/mpeg",
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.uploadUrl).toBe(MOCK_UPLOAD_URL);
    expect(result?.data?.key).toMatch(/^tracks\/.+\.mp3$/);
  });

  it("createTrack grava a faixa apontando para a key retornada pelo upload", async () => {
    const { getTrackUploadUrl, createTrack } =
      await import("../actions/tracks");

    const uploadResult = await getTrackUploadUrl({
      fileName: "sermao-quarta.mp3",
      contentType: "audio/mpeg",
    });
    const key = uploadResult?.data?.key as unknown as string;
    expect(key).toBeTruthy();

    const createResult = await createTrack({
      title: "Faixa Upload Teste",
      authorId: IDS.author,
      fileUrl: key,
      durationSeconds: 1200,
    });

    expect(createResult?.serverError).toBeUndefined();
    expect(createResult?.data?.track?.fileUrl).toBe(key);
  });

  it("não super_admin não consegue gerar upload URL", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: IDS.users.noTerm,
      roles: ["ouvinte"],
      designations: [],
    });

    const { getTrackUploadUrl } = await import("../actions/tracks");
    const result = await getTrackUploadUrl({
      fileName: "invasor.mp3",
      contentType: "audio/mpeg",
    });

    expect(result?.serverError).toBeDefined();
  });
});

// ── acceptTerm — aceite único por usuário (idempotente) ────────────────────

describe("acceptTerm — termo aceito 1x por usuário", () => {
  it("primeiro aceite grava term_acceptances", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: IDS.users.withTerm,
      roles: ["ouvinte"],
      designations: [],
    });

    const { acceptTerm } = await import("../actions/terms");
    const result = await acceptTerm({ accepted: true });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.acceptedAt).toBeDefined();

    const rows = await db
      .select()
      .from(termAcceptances)
      .where(eq(termAcceptances.userId, IDS.users.withTerm));
    expect(rows).toHaveLength(1);
  });

  it("segundo aceite do mesmo usuário é idempotente — retorna o mesmo registro, sem duplicar linha", async () => {
    const { resolveSession } = await import("@hebron/auth/server");

    const first = await db
      .select()
      .from(termAcceptances)
      .where(eq(termAcceptances.userId, IDS.users.withTerm));
    expect(first).toHaveLength(1);

    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: IDS.users.withTerm,
      roles: ["ouvinte"],
      designations: [],
    });

    const { acceptTerm } = await import("../actions/terms");
    const second = await acceptTerm({ accepted: true });

    expect(second?.serverError).toBeUndefined();
    expect(
      new Date(second?.data?.acceptedAt as unknown as string).getTime(),
    ).toBe(first[0]?.acceptedAt.getTime());

    const rows = await db
      .select()
      .from(termAcceptances)
      .where(eq(termAcceptances.userId, IDS.users.withTerm));
    expect(rows).toHaveLength(1);
  });
});

// ── getMaterialDownloadUrl — signed URL expira em 1h; exige termo aceito ──

describe("getMaterialDownloadUrl — material exclusivo exige termo; signed URL expira em 1h", () => {
  let materialId: string;
  let materialFileUrl: string;

  beforeAll(async () => {
    const { createMaterial } = await import("../actions/materials");

    const result = await createMaterial({
      title: "Material Exclusivo Teste",
      fileUrl: "materials/teste-download.pdf",
      requiresTerm: true,
    });
    materialId = result?.data?.material?.id as unknown as string;
    materialFileUrl = result?.data?.material?.fileUrl as unknown as string;
    expect(materialId).toBeTruthy();
    createdMaterialIds.push(materialId);
  });

  it("usuário SEM termo aceito não consegue baixar o material", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: IDS.users.noTerm,
      roles: ["ouvinte"],
      designations: [],
    });

    const { getMaterialDownloadUrl } = await import("../actions/materials");
    const result = await getMaterialDownloadUrl({ materialId });

    expect(result?.serverError).toBeDefined();
  });

  it("usuário COM termo aceito recebe signed URL que expira em 3600s (1h)", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { getR2DownloadUrl } = await import("../lib/r2");
    vi.mocked(getR2DownloadUrl).mockClear();

    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: IDS.users.withTerm,
      roles: ["ouvinte"],
      designations: [],
    });

    const { getMaterialDownloadUrl } = await import("../actions/materials");
    const result = await getMaterialDownloadUrl({ materialId });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.url).toBe(MOCK_DOWNLOAD_URL);
    expect(vi.mocked(getR2DownloadUrl)).toHaveBeenCalledWith(
      materialFileUrl,
      DOWNLOAD_URL_EXPIRES_IN_SECONDS,
    );
  });
});
