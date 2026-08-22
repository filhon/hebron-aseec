/**
 * video-upload.test.ts — Upload de vídeo via Bunny.net Stream, P-6.20.
 *
 * Mocka packages/integrations/src/bunny-stream.ts (chamadas HTTP reais à
 * Bunny fora do escopo do teste) e cobre a garantia central do prompt:
 * getLessonVideoPlaybackUrl nunca aceita um videoId vindo do cliente — o
 * guid é lido de `lessons` sob a mesma RLS de SELECT que já gate video_url
 * (lessons_select_enrolled/lessons_mutate_staff, 0020_plataforma_rls.sql).
 * Sem matrícula (ou aula ainda trancada pela trilha), a query não devolve
 * linha e a action falha — nunca reproduz a partir do guid cru.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  instructors,
  courses,
  modules,
  lessons,
  enrollments,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

vi.mock("@hebron/integrations/bunny-stream", () => ({
  createBunnyVideo: vi.fn().mockResolvedValue({ videoId: "mock-guid" }),
  createBunnyTusUploadCredentials: vi.fn().mockReturnValue({
    endpoint: "https://video.bunnycdn.com/tusupload",
    videoId: "mock-guid",
    libraryId: "mock-library",
    authorizationSignature: "mock-signature",
    authorizationExpire: 1234567890,
  }),
  signBunnyPlaybackUrl: vi
    .fn()
    .mockImplementation(
      (videoId: string) =>
        `https://cdn.test/${videoId}/playlist.m3u8?token=mock`,
    ),
}));

async function actingAs(userId: string, roles: string[] = []) {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: roles as any,
    designations: [],
  });
}

const IDS = {
  student: "9f000000-0000-0000-0000-000000000001",
  outsider: "9f000000-0000-0000-0000-000000000002",
  instructorUser: "9f000000-0000-0000-0000-000000000003",
  instructor: "9f100000-0000-0000-0000-000000000001",
  course: "9f200000-0000-0000-0000-000000000001",
  module: "9f300000-0000-0000-0000-000000000001",
  lessonUnlocked: "9f400000-0000-0000-0000-000000000001",
  lessonLocked: "9f400000-0000-0000-0000-000000000002",
} as const;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.student,
        email: "video-upload-aluno@test.hebron",
        fullName: "Video Upload Aluno",
      },
      {
        id: IDS.outsider,
        email: "video-upload-outsider@test.hebron",
        fullName: "Video Upload Outsider",
      },
      {
        id: IDS.instructorUser,
        email: "video-upload-instrutor@test.hebron",
        fullName: "Video Upload Instrutor",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(instructors)
    .values({
      id: IDS.instructor,
      userId: IDS.instructorUser,
      name: "Video Upload Instrutor",
    })
    .onConflictDoNothing();

  await db
    .insert(courses)
    .values({
      id: IDS.course,
      title: "Video Upload Test",
      slug: "video-upload-test",
      description: "Curso para teste de upload de vídeo",
      category: "teste",
      instructorId: IDS.instructor,
      published: true,
    })
    .onConflictDoNothing();

  await db
    .insert(modules)
    .values({ id: IDS.module, courseId: IDS.course, title: "Módulo", order: 0 })
    .onConflictDoNothing();

  await db
    .insert(lessons)
    .values([
      {
        id: IDS.lessonUnlocked,
        moduleId: IDS.module,
        courseId: IDS.course,
        title: "Aula liberada",
        type: "video",
        order: 0,
        videoId: "bunny-guid-unlocked",
      },
      {
        id: IDS.lessonLocked,
        moduleId: IDS.module,
        courseId: IDS.course,
        title: "Aula trancada",
        type: "video",
        order: 1,
        videoId: "bunny-guid-locked",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(enrollments)
    .values({ userId: IDS.student, courseId: IDS.course })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(courses).where(eq(courses.id, IDS.course));
  await db.delete(instructors).where(eq(instructors.id, IDS.instructor));
  await db
    .delete(users)
    .where(inArray(users.id, [IDS.student, IDS.outsider, IDS.instructorUser]));
});

describe("getLessonVideoPlaybackUrl", () => {
  it("aluno matriculado com a aula liberada recebe a URL assinada", async () => {
    const { getLessonVideoPlaybackUrl } = await import("../actions/uploads");
    await actingAs(IDS.student);

    const result = await getLessonVideoPlaybackUrl({
      lessonId: IDS.lessonUnlocked,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.url).toBe(
      "https://cdn.test/bunny-guid-unlocked/playlist.m3u8?token=mock",
    );
  });

  it("aluno matriculado mas com a aula ainda trancada pela trilha não recebe URL", async () => {
    const { getLessonVideoPlaybackUrl } = await import("../actions/uploads");
    await actingAs(IDS.student);

    const result = await getLessonVideoPlaybackUrl({
      lessonId: IDS.lessonLocked,
    });

    expect(result?.data).toBeUndefined();
    expect(result?.serverError).toBeDefined();
  });

  it("usuário não matriculado no curso não recebe URL, mesmo sabendo o lessonId", async () => {
    const { getLessonVideoPlaybackUrl } = await import("../actions/uploads");
    await actingAs(IDS.outsider);

    const result = await getLessonVideoPlaybackUrl({
      lessonId: IDS.lessonUnlocked,
    });

    expect(result?.data).toBeUndefined();
    expect(result?.serverError).toBeDefined();
  });

  it("instrutor (dado) lê qualquer aula do curso, mesmo sem matrícula", async () => {
    const { getLessonVideoPlaybackUrl } = await import("../actions/uploads");
    await actingAs(IDS.instructorUser);

    const result = await getLessonVideoPlaybackUrl({
      lessonId: IDS.lessonLocked,
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.url).toBe(
      "https://cdn.test/bunny-guid-locked/playlist.m3u8?token=mock",
    );
  });
});

describe("createLessonVideoUpload", () => {
  it("nega acesso a quem não é super_admin nem instrutor", async () => {
    const { createLessonVideoUpload } = await import("../actions/uploads");
    await actingAs(IDS.student);

    const result = await createLessonVideoUpload({ title: "Aula nova" });

    expect(result?.data).toBeUndefined();
    expect(result?.serverError).toBeDefined();
  });

  it("instrutor recebe videoId e credenciais de upload TUS", async () => {
    const { createLessonVideoUpload } = await import("../actions/uploads");
    await actingAs(IDS.instructorUser);

    const result = await createLessonVideoUpload({ title: "Aula nova" });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.videoId).toBe("mock-guid");
    expect(result?.data?.upload.endpoint).toBe(
      "https://video.bunnycdn.com/tusupload",
    );
  });
});
