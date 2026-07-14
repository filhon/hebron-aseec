/**
 * certificates.test.ts — Emissão automática de certificado, P-6.8
 * (checkAndIssueCertificate, actions/certificates.ts + migration 0045
 * plataforma.issue_certificate).
 *
 * Mesmo padrão de mock de sessão/e-mail de progress.test.ts — as mutações
 * passam pelas Server Actions reais (markLessonComplete, submitQuizAttempt),
 * sob RLS de verdade.
 *
 * Cobertura:
 *  - Certificado emitido quando 100% das aulas da trilha estão concluídas.
 *  - Curso com aula-quiz só certifica depois que o quiz é aprovado — uma
 *    tentativa reprovada não emite certificado, mesmo com as demais aulas
 *    concluídas.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  instructors,
  courses,
  modules,
  lessons,
  enrollments,
  certificates,
  quizzes,
  quizQuestions,
  auditLog,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

const createNotificationMock = vi.fn().mockResolvedValue({ id: "mock-id" });
vi.mock("@hebron/email", () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
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
  student: "9c000000-0000-0000-0000-000000000001",
  instructor: "9c100000-0000-0000-0000-000000000001",
  fullTrack: {
    course: "9c200000-0000-0000-0000-000000000001",
    module: "9c300000-0000-0000-0000-000000000001",
    lesson1: "9c400000-0000-0000-0000-000000000001",
    lesson2: "9c400000-0000-0000-0000-000000000002",
  },
  quizGated: {
    course: "9c200000-0000-0000-0000-000000000002",
    module: "9c300000-0000-0000-0000-000000000002",
    videoLesson: "9c400000-0000-0000-0000-000000000003",
    quizLesson: "9c400000-0000-0000-0000-000000000004",
    quiz: "9c500000-0000-0000-0000-000000000001",
  },
} as const;

function quizQuestionsFixture(quizId: string) {
  return [1, 2].map((n, index) => ({
    quizId,
    text: `Pergunta ${n}`,
    order: index,
    options: [
      { id: "a", text: "Alternativa A" },
      { id: "b", text: "Alternativa B" },
    ],
    correctOptionId: "a",
  }));
}

// Preenchido no beforeAll com os ids gerados pelo banco (quiz_questions.id é
// uuid com defaultRandom — não pode ser fixado como fixture literal).
let quizGatedQuestionIds: string[] = [];

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.student,
      email: "cert-plat-aluno@test.hebron",
      fullName: "Certificados Plataforma Aluno",
    })
    .onConflictDoNothing();

  await db
    .insert(instructors)
    .values({ id: IDS.instructor, name: "Certificados Plataforma Instrutor" })
    .onConflictDoNothing();

  await db
    .insert(courses)
    .values([
      {
        id: IDS.fullTrack.course,
        title: "Certificado — Trilha Completa Test",
        slug: "certificado-trilha-completa-test",
        description: "Curso com 2 aulas de vídeo",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
      {
        id: IDS.quizGated.course,
        title: "Certificado — Curso com Quiz Final Test",
        slug: "certificado-quiz-final-test",
        description: "Curso com 1 aula de vídeo + 1 aula-quiz",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(modules)
    .values([
      {
        id: IDS.fullTrack.module,
        courseId: IDS.fullTrack.course,
        title: "Módulo",
        order: 0,
      },
      {
        id: IDS.quizGated.module,
        courseId: IDS.quizGated.course,
        title: "Módulo",
        order: 0,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(lessons)
    .values([
      {
        id: IDS.fullTrack.lesson1,
        moduleId: IDS.fullTrack.module,
        courseId: IDS.fullTrack.course,
        title: "Aula 1",
        type: "video",
        order: 0,
      },
      {
        id: IDS.fullTrack.lesson2,
        moduleId: IDS.fullTrack.module,
        courseId: IDS.fullTrack.course,
        title: "Aula 2",
        type: "video",
        order: 1,
      },
      {
        id: IDS.quizGated.videoLesson,
        moduleId: IDS.quizGated.module,
        courseId: IDS.quizGated.course,
        title: "Aula de vídeo",
        type: "video",
        order: 0,
      },
      {
        id: IDS.quizGated.quizLesson,
        moduleId: IDS.quizGated.module,
        courseId: IDS.quizGated.course,
        title: "Aula-quiz final",
        type: "quiz",
        order: 1,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(quizzes)
    .values({
      id: IDS.quizGated.quiz,
      lessonId: IDS.quizGated.quizLesson,
      passingScore: 60,
    })
    .onConflictDoNothing();

  const insertedQuestions = await db
    .insert(quizQuestions)
    .values(quizQuestionsFixture(IDS.quizGated.quiz))
    .returning({ id: quizQuestions.id, order: quizQuestions.order });
  quizGatedQuestionIds = insertedQuestions
    .sort((a, b) => a.order - b.order)
    .map((q) => q.id);

  await db
    .insert(enrollments)
    .values([
      { userId: IDS.student, courseId: IDS.fullTrack.course },
      { userId: IDS.student, courseId: IDS.quizGated.course },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.student));
  await db
    .delete(courses)
    .where(inArray(courses.id, [IDS.fullTrack.course, IDS.quizGated.course]));
  await db.delete(instructors).where(eq(instructors.id, IDS.instructor));
  await db.delete(users).where(eq(users.id, IDS.student));
});

// ── Certificado emitido ao concluir 100% da trilha ────────────────────────────

describe("Certificado — emitido automaticamente quando todas as aulas estão concluídas", () => {
  it("nenhum certificado antes de concluir a trilha", async () => {
    const rows = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.courseId, IDS.fullTrack.course),
          eq(certificates.userId, IDS.student),
        ),
      );
    expect(rows).toHaveLength(0);
  });

  it("conclui aula 1: ainda sem certificado (trilha incompleta)", async () => {
    await actingAs(IDS.student);
    const { markLessonComplete } = await import("../actions/progress");
    const result = await markLessonComplete({
      lessonId: IDS.fullTrack.lesson1,
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.certificate).toBeNull();
  });

  it("conclui aula 2 (última): certificado emitido automaticamente", async () => {
    await actingAs(IDS.student);
    const { markLessonComplete } = await import("../actions/progress");
    const result = await markLessonComplete({
      lessonId: IDS.fullTrack.lesson2,
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.certificate).not.toBeNull();
    expect(result?.data?.certificate?.courseId).toBe(IDS.fullTrack.course);
    expect(result?.data?.certificate?.userId).toBe(IDS.student);
    expect(result?.data?.certificate?.verificationHash).toBeTruthy();

    const rows = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.courseId, IDS.fullTrack.course),
          eq(certificates.userId, IDS.student),
        ),
      );
    expect(rows).toHaveLength(1);
  });
});

// ── Curso com aula-quiz: certificado só após quiz aprovado ────────────────────

describe("Certificado — curso com aula-quiz só certifica após o quiz ser aprovado", () => {
  it("conclui a aula de vídeo (1ª aula): ainda sem certificado", async () => {
    await actingAs(IDS.student);
    const { markLessonComplete } = await import("../actions/progress");
    const result = await markLessonComplete({
      lessonId: IDS.quizGated.videoLesson,
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.certificate).toBeNull();
  });

  it("attempt reprovado no quiz: aula-quiz continua incompleta, sem certificado", async () => {
    await actingAs(IDS.student);
    const { submitQuizAttempt } = await import("../actions/quizzes");
    const result = await submitQuizAttempt({
      quizId: IDS.quizGated.quiz,
      answers: [
        { questionId: quizGatedQuestionIds[0] ?? "", optionId: "a" },
        { questionId: quizGatedQuestionIds[1] ?? "", optionId: "b" },
      ],
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.attempt?.passed).toBe(false);
    expect(result?.data?.certificate).toBeNull();

    const rows = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.courseId, IDS.quizGated.course),
          eq(certificates.userId, IDS.student),
        ),
      );
    expect(rows).toHaveLength(0);
  });

  it("attempt aprovado no quiz: aula-quiz conclui e certificado é emitido", async () => {
    await actingAs(IDS.student);
    const { submitQuizAttempt } = await import("../actions/quizzes");
    const result = await submitQuizAttempt({
      quizId: IDS.quizGated.quiz,
      answers: [
        { questionId: quizGatedQuestionIds[0] ?? "", optionId: "a" },
        { questionId: quizGatedQuestionIds[1] ?? "", optionId: "a" },
      ],
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.attempt?.passed).toBe(true);
    expect(result?.data?.certificate).not.toBeNull();
    expect(result?.data?.certificate?.courseId).toBe(IDS.quizGated.course);

    const rows = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.courseId, IDS.quizGated.course),
          eq(certificates.userId, IDS.student),
        ),
      );
    expect(rows).toHaveLength(1);
  });
});
