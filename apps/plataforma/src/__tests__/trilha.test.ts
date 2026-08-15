/**
 * trilha.test.ts — Ementa visível antes da matrícula e progresso sobre o
 * total real da trilha, P-6.2b (CORRETIVO).
 *
 * Chama `lib/queries.ts` diretamente (getCourseModulesWithLessons,
 * getUserEnrollmentsWithProgress) — funções puras que recebem `actorId`,
 * sem sessão HTTP para mockar (diferente de progress.test.ts/
 * certificates.test.ts, que passam por Server Actions). As leituras rodam
 * sob RLS de verdade (withAuthenticatedContext), incluindo
 * plataforma.course_outline() (SECURITY DEFINER, migration 0080).
 *
 * Cobertura:
 *  - Visitante não matriculado enxerga a ementa inteira (10 aulas), sem
 *    nenhum campo de conteúdo (video_url/content/download_url).
 *  - Aluno com 1 de 10 aulas concluídas: conteúdo só nas aulas que a trilha
 *    já libera; progresso 10%, não 50% (getUserEnrollmentsWithProgress).
 *  - nextLessonId derivado por (module.order, lesson.order), inclusive
 *    atravessando a fronteira de módulo.
 *
 * O contrato de P-6.7 (aula fora da trilha liberada barrada no INSERT de
 * progress) não muda aqui — continua coberto, sem alteração, por
 * progress.test.ts:275-341.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  instructors,
  courses,
  modules,
  lessons,
  enrollments,
  progress,
} from "@hebron/db/schema";
import {
  getCourseModulesWithLessons,
  getUserEnrollmentsWithProgress,
} from "../lib/queries";

const IDS = {
  student: "9d000000-0000-0000-0000-000000000001",
  visitor: "9d000000-0000-0000-0000-000000000002",
  instructor: "9d100000-0000-0000-0000-000000000001",
  course: "9d200000-0000-0000-0000-000000000001",
  moduleA: "9d300000-0000-0000-0000-000000000001",
  moduleB: "9d300000-0000-0000-0000-000000000002",
  lessons: {
    a0: "9d400000-0000-0000-0000-000000000001",
    a1: "9d400000-0000-0000-0000-000000000002",
    a2: "9d400000-0000-0000-0000-000000000003",
    a3: "9d400000-0000-0000-0000-000000000004",
    a4: "9d400000-0000-0000-0000-000000000005",
    b0: "9d400000-0000-0000-0000-000000000006",
    b1: "9d400000-0000-0000-0000-000000000007",
    b2: "9d400000-0000-0000-0000-000000000008",
    b3: "9d400000-0000-0000-0000-000000000009",
    b4: "9d400000-0000-0000-0000-00000000000a",
  },
} as const;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.student,
        email: "trilha-plat-aluno@test.hebron",
        fullName: "Trilha Plataforma Aluno",
      },
      {
        id: IDS.visitor,
        email: "trilha-plat-visitante@test.hebron",
        fullName: "Trilha Plataforma Visitante",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(instructors)
    .values({ id: IDS.instructor, name: "Trilha Plataforma Instrutor" })
    .onConflictDoNothing();

  await db
    .insert(courses)
    .values({
      id: IDS.course,
      title: "Trilha Visível Test",
      slug: "trilha-visivel-test",
      description: "Curso com 10 aulas em 2 módulos",
      category: "teste",
      instructorId: IDS.instructor,
      published: true,
    })
    .onConflictDoNothing();

  await db
    .insert(modules)
    .values([
      { id: IDS.moduleA, courseId: IDS.course, title: "Módulo A", order: 0 },
      { id: IDS.moduleB, courseId: IDS.course, title: "Módulo B", order: 1 },
    ])
    .onConflictDoNothing();

  await db
    .insert(lessons)
    .values([
      {
        id: IDS.lessons.a0,
        moduleId: IDS.moduleA,
        courseId: IDS.course,
        title: "A0",
        type: "video",
        order: 0,
        videoUrl: "https://videos.test.hebron/a0.mp4",
      },
      {
        id: IDS.lessons.a1,
        moduleId: IDS.moduleA,
        courseId: IDS.course,
        title: "A1",
        type: "video",
        order: 1,
        videoUrl: "https://videos.test.hebron/a1.mp4",
      },
      {
        id: IDS.lessons.a2,
        moduleId: IDS.moduleA,
        courseId: IDS.course,
        title: "A2",
        type: "video",
        order: 2,
        videoUrl: "https://videos.test.hebron/a2.mp4",
      },
      {
        id: IDS.lessons.a3,
        moduleId: IDS.moduleA,
        courseId: IDS.course,
        title: "A3",
        type: "video",
        order: 3,
        videoUrl: "https://videos.test.hebron/a3.mp4",
      },
      {
        id: IDS.lessons.a4,
        moduleId: IDS.moduleA,
        courseId: IDS.course,
        title: "A4",
        type: "video",
        order: 4,
        videoUrl: "https://videos.test.hebron/a4.mp4",
      },
      {
        id: IDS.lessons.b0,
        moduleId: IDS.moduleB,
        courseId: IDS.course,
        title: "B0",
        type: "video",
        order: 0,
        videoUrl: "https://videos.test.hebron/b0.mp4",
      },
      {
        id: IDS.lessons.b1,
        moduleId: IDS.moduleB,
        courseId: IDS.course,
        title: "B1",
        type: "video",
        order: 1,
        videoUrl: "https://videos.test.hebron/b1.mp4",
      },
      {
        id: IDS.lessons.b2,
        moduleId: IDS.moduleB,
        courseId: IDS.course,
        title: "B2",
        type: "video",
        order: 2,
        videoUrl: "https://videos.test.hebron/b2.mp4",
      },
      {
        id: IDS.lessons.b3,
        moduleId: IDS.moduleB,
        courseId: IDS.course,
        title: "B3",
        type: "video",
        order: 3,
        videoUrl: "https://videos.test.hebron/b3.mp4",
      },
      {
        id: IDS.lessons.b4,
        moduleId: IDS.moduleB,
        courseId: IDS.course,
        title: "B4 — material",
        type: "download",
        order: 4,
        downloadUrl: "plataforma-anexos/trilha-visivel-test/b4.pdf",
        downloadFileName: "b4.pdf",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(enrollments)
    .values({ userId: IDS.student, courseId: IDS.course })
    .onConflictDoNothing();

  await db
    .insert(progress)
    .values({
      userId: IDS.student,
      lessonId: IDS.lessons.a0,
      courseId: IDS.course,
      completedAt: new Date(),
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(courses).where(eq(courses.id, IDS.course));
  await db.delete(instructors).where(eq(instructors.id, IDS.instructor));
  await db.delete(users).where(inArray(users.id, [IDS.student, IDS.visitor]));
});

// ── Ementa visível antes da matrícula ─────────────────────────────────────────

describe("Ementa — visitante não matriculado enxerga a trilha inteira, sem conteúdo", () => {
  it("lista as 10 aulas do curso, nenhuma com video_url/content/download_url", async () => {
    const { lessons: outline } = await getCourseModulesWithLessons(
      IDS.visitor,
      IDS.course,
    );

    expect(outline).toHaveLength(10);
    for (const lesson of outline) {
      expect(lesson.videoUrl).toBeNull();
      expect(lesson.textContent).toBeNull();
      expect(lesson.downloadUrl).toBeNull();
    }
  });

  it("primeira aula da trilha aparece desbloqueada; as demais, bloqueadas (sem progresso do visitante)", async () => {
    const { lessons: outline } = await getCourseModulesWithLessons(
      IDS.visitor,
      IDS.course,
    );
    const a0 = outline.find((l) => l.id === IDS.lessons.a0);
    const a1 = outline.find((l) => l.id === IDS.lessons.a1);

    expect(a0?.unlocked).toBe(true);
    expect(a1?.unlocked).toBe(false);
  });
});

// ── Conteúdo só nas aulas que a trilha libera para o aluno ────────────────────

describe("Ementa — aluno matriculado vê conteúdo só nas aulas liberadas pela trilha", () => {
  it("A0 (concluída) e A1 (liberada por A0) trazem video_url; A2 em diante, não", async () => {
    const { lessons: outline } = await getCourseModulesWithLessons(
      IDS.student,
      IDS.course,
    );

    const byId = new Map(outline.map((l) => [l.id, l]));
    expect(byId.get(IDS.lessons.a0)?.videoUrl).toBeTruthy();
    expect(byId.get(IDS.lessons.a0)?.unlocked).toBe(true);
    expect(byId.get(IDS.lessons.a1)?.videoUrl).toBeTruthy();
    expect(byId.get(IDS.lessons.a1)?.unlocked).toBe(true);
    expect(byId.get(IDS.lessons.a2)?.videoUrl).toBeNull();
    expect(byId.get(IDS.lessons.a2)?.unlocked).toBe(false);
    expect(byId.get(IDS.lessons.b4)?.downloadUrl).toBeNull();
    expect(byId.get(IDS.lessons.b4)?.unlocked).toBe(false);
  });
});

// ── Progresso sobre o total real da trilha ────────────────────────────────────

describe("Progresso — denominador é o total da trilha, não o que a RLS libera", () => {
  it("1 de 10 aulas concluídas: 10%, não 50%", async () => {
    const enrollmentsWithProgress = await getUserEnrollmentsWithProgress(
      IDS.student,
    );
    const entry = enrollmentsWithProgress.find(
      (e) => e.course.id === IDS.course,
    );

    expect(entry).toBeDefined();
    expect(entry?.progressPercent).toBe(10);
  });
});

// ── nextLessonId derivado ─────────────────────────────────────────────────────

describe("nextLessonId — derivado de (module.order, lesson.order), sem coluna", () => {
  it("aponta a aula seguinte dentro do módulo e atravessando a fronteira de módulo", async () => {
    const { lessons: outline } = await getCourseModulesWithLessons(
      IDS.student,
      IDS.course,
    );
    const byId = new Map(outline.map((l) => [l.id, l]));

    expect(byId.get(IDS.lessons.a0)?.nextLessonId).toBe(IDS.lessons.a1);
    expect(byId.get(IDS.lessons.a4)?.nextLessonId).toBe(IDS.lessons.b0);
    expect(byId.get(IDS.lessons.b4)?.nextLessonId).toBeNull();
  });
});
