/**
 * progress.test.ts — Trilha sequencial e Quiz (submissão e scoring), P-6.8.
 *
 * Chama as Server Actions diretamente (markLessonComplete, submitQuizAttempt)
 * com `next/headers`/`@hebron/auth/server` mockados para simular a sessão do
 * aluno — mesmo padrão de apps/financeiro/src/__tests__/governance.test.ts.
 * As mutações reais rodam sob RLS de verdade (withAuthenticatedContext), não
 * como o `db` superuser usado só para seed/limpeza dos fixtures.
 *
 * Cobertura:
 *  - Trilha: aula 3 inacessível se aula 2 não concluída (plataforma.
 *    can_access_lesson via progress_insert_own, 0020_plataforma_rls.sql).
 *  - Quiz: score calculado sobre o total de perguntas (decisão D-5,
 *    quizzes.ts) e attempt abaixo do passing_score não conclui a aula.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray, and } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  instructors,
  courses,
  modules,
  lessons,
  enrollments,
  progress,
  quizzes,
  quizQuestions,
  quizAttempts,
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
  student: "9b000000-0000-0000-0000-000000000001",
  instructor: "9b100000-0000-0000-0000-000000000001",
  trilha: {
    course: "9b200000-0000-0000-0000-000000000001",
    module: "9b300000-0000-0000-0000-000000000001",
    lesson1: "9b400000-0000-0000-0000-000000000001",
    lesson2: "9b400000-0000-0000-0000-000000000002",
    lesson3: "9b400000-0000-0000-0000-000000000003",
  },
  quizPass: {
    course: "9b200000-0000-0000-0000-000000000002",
    module: "9b300000-0000-0000-0000-000000000002",
    lesson: "9b400000-0000-0000-0000-000000000004",
    quiz: "9b500000-0000-0000-0000-000000000001",
  },
  quizFail: {
    course: "9b200000-0000-0000-0000-000000000003",
    module: "9b300000-0000-0000-0000-000000000003",
    lesson: "9b400000-0000-0000-0000-000000000005",
    quiz: "9b500000-0000-0000-0000-000000000002",
  },
} as const;

function quizQuestionsFixture(quizId: string) {
  return [1, 2, 3, 4].map((n, index) => ({
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

// Preenchidos no beforeAll com os ids gerados pelo banco (quiz_questions.id
// é uuid com defaultRandom — não pode ser fixado como fixture literal).
let quizPassQuestionIds: string[] = [];
let quizFailQuestionIds: string[] = [];

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.student,
      email: "progress-plat-aluno@test.hebron",
      fullName: "Progress Plataforma Aluno",
    })
    .onConflictDoNothing();

  await db
    .insert(instructors)
    .values({ id: IDS.instructor, name: "Progress Plataforma Instrutor" })
    .onConflictDoNothing();

  await db
    .insert(courses)
    .values([
      {
        id: IDS.trilha.course,
        title: "Trilha Sequencial Test",
        slug: "trilha-sequencial-test",
        description: "Curso com 3 aulas sequenciais",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
      {
        id: IDS.quizPass.course,
        title: "Quiz Scoring Test",
        slug: "quiz-scoring-test",
        description: "Curso de aula única, tipo quiz",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
      {
        id: IDS.quizFail.course,
        title: "Quiz Below Passing Test",
        slug: "quiz-below-passing-test",
        description: "Curso de aula única, tipo quiz (attempt reprovado)",
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
        id: IDS.trilha.module,
        courseId: IDS.trilha.course,
        title: "Módulo",
        order: 0,
      },
      {
        id: IDS.quizPass.module,
        courseId: IDS.quizPass.course,
        title: "Módulo",
        order: 0,
      },
      {
        id: IDS.quizFail.module,
        courseId: IDS.quizFail.course,
        title: "Módulo",
        order: 0,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(lessons)
    .values([
      {
        id: IDS.trilha.lesson1,
        moduleId: IDS.trilha.module,
        courseId: IDS.trilha.course,
        title: "Aula 1",
        type: "video",
        order: 0,
      },
      {
        id: IDS.trilha.lesson2,
        moduleId: IDS.trilha.module,
        courseId: IDS.trilha.course,
        title: "Aula 2",
        type: "video",
        order: 1,
      },
      {
        id: IDS.trilha.lesson3,
        moduleId: IDS.trilha.module,
        courseId: IDS.trilha.course,
        title: "Aula 3",
        type: "video",
        order: 2,
      },
      {
        id: IDS.quizPass.lesson,
        moduleId: IDS.quizPass.module,
        courseId: IDS.quizPass.course,
        title: "Aula Quiz",
        type: "quiz",
        order: 0,
      },
      {
        id: IDS.quizFail.lesson,
        moduleId: IDS.quizFail.module,
        courseId: IDS.quizFail.course,
        title: "Aula Quiz",
        type: "quiz",
        order: 0,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(quizzes)
    .values([
      {
        id: IDS.quizPass.quiz,
        lessonId: IDS.quizPass.lesson,
        passingScore: 70,
      },
      {
        id: IDS.quizFail.quiz,
        lessonId: IDS.quizFail.lesson,
        passingScore: 70,
      },
    ])
    .onConflictDoNothing();

  const insertedPassQuestions = await db
    .insert(quizQuestions)
    .values(quizQuestionsFixture(IDS.quizPass.quiz))
    .returning({ id: quizQuestions.id, order: quizQuestions.order });
  quizPassQuestionIds = insertedPassQuestions
    .sort((a, b) => a.order - b.order)
    .map((q) => q.id);

  const insertedFailQuestions = await db
    .insert(quizQuestions)
    .values(quizQuestionsFixture(IDS.quizFail.quiz))
    .returning({ id: quizQuestions.id, order: quizQuestions.order });
  quizFailQuestionIds = insertedFailQuestions
    .sort((a, b) => a.order - b.order)
    .map((q) => q.id);

  await db
    .insert(enrollments)
    .values([
      { userId: IDS.student, courseId: IDS.trilha.course },
      { userId: IDS.student, courseId: IDS.quizPass.course },
      { userId: IDS.student, courseId: IDS.quizFail.course },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.student));
  await db
    .delete(courses)
    .where(
      inArray(courses.id, [
        IDS.trilha.course,
        IDS.quizPass.course,
        IDS.quizFail.course,
      ]),
    );
  await db.delete(instructors).where(eq(instructors.id, IDS.instructor));
  await db.delete(users).where(eq(users.id, IDS.student));
});

// ── Trilha sequencial ──────────────────────────────────────────────────────────

describe("Trilha sequencial — aula N só desbloqueia após aula N-1 concluída", () => {
  it("aula 1 (primeira) conclui normalmente, sem depender de nada antes", async () => {
    await actingAs(IDS.student);
    const { markLessonComplete } = await import("../actions/progress");
    const result = await markLessonComplete({ lessonId: IDS.trilha.lesson1 });
    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.userId, IDS.student),
          eq(progress.lessonId, IDS.trilha.lesson1),
        ),
      );
    expect(row?.completedAt).not.toBeNull();
  });

  it("aula 3 inacessível se aula 2 não concluída (progress_insert_own + can_access_lesson)", async () => {
    await actingAs(IDS.student);
    const { markLessonComplete } = await import("../actions/progress");
    const result = await markLessonComplete({ lessonId: IDS.trilha.lesson3 });
    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.userId, IDS.student),
          eq(progress.lessonId, IDS.trilha.lesson3),
        ),
      );
    expect(rows).toHaveLength(0);
  });

  it("aula 3 acessível assim que aula 2 é concluída", async () => {
    await actingAs(IDS.student);
    const { markLessonComplete } = await import("../actions/progress");

    const lesson2Result = await markLessonComplete({
      lessonId: IDS.trilha.lesson2,
    });
    expect(lesson2Result?.serverError).toBeUndefined();

    await actingAs(IDS.student);
    const lesson3Result = await markLessonComplete({
      lessonId: IDS.trilha.lesson3,
    });
    expect(lesson3Result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.userId, IDS.student),
          eq(progress.lessonId, IDS.trilha.lesson3),
        ),
      );
    expect(row?.completedAt).not.toBeNull();
  });
});

// ── Quiz: scoring ──────────────────────────────────────────────────────────────

describe("Quiz — score calculado sobre o total de perguntas (decisão D-5)", () => {
  it("3 de 4 respostas corretas: score = 75, passed = true (passingScore 70)", async () => {
    await actingAs(IDS.student);
    const { submitQuizAttempt } = await import("../actions/quizzes");
    const result = await submitQuizAttempt({
      quizId: IDS.quizPass.quiz,
      answers: [
        { questionId: quizPassQuestionIds[0] ?? "", optionId: "a" },
        { questionId: quizPassQuestionIds[1] ?? "", optionId: "a" },
        { questionId: quizPassQuestionIds[2] ?? "", optionId: "a" },
        { questionId: quizPassQuestionIds[3] ?? "", optionId: "b" },
      ],
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.attempt?.score).toBe(75);
    expect(result?.data?.attempt?.passed).toBe(true);

    const [progressRow] = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.userId, IDS.student),
          eq(progress.lessonId, IDS.quizPass.lesson),
        ),
      );
    expect(progressRow?.completedAt).not.toBeNull();
  });
});

describe("Quiz — attempt abaixo do passing_score não conclui a aula (semântica P-6.8)", () => {
  it("1 de 4 respostas corretas: score = 25, passed = false, aula continua incompleta", async () => {
    await actingAs(IDS.student);
    const { submitQuizAttempt } = await import("../actions/quizzes");
    const result = await submitQuizAttempt({
      quizId: IDS.quizFail.quiz,
      answers: [
        { questionId: quizFailQuestionIds[0] ?? "", optionId: "b" },
        { questionId: quizFailQuestionIds[1] ?? "", optionId: "b" },
        { questionId: quizFailQuestionIds[2] ?? "", optionId: "b" },
        { questionId: quizFailQuestionIds[3] ?? "", optionId: "a" },
      ],
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.attempt?.score).toBe(25);
    expect(result?.data?.attempt?.passed).toBe(false);
    expect(result?.data?.certificate).toBeNull();

    const rows = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.userId, IDS.student),
          eq(progress.lessonId, IDS.quizFail.lesson),
        ),
      );
    expect(rows).toHaveLength(0);

    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, IDS.quizFail.quiz),
          eq(quizAttempts.userId, IDS.student),
        ),
      );
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.passed).toBe(false);
  });
});
