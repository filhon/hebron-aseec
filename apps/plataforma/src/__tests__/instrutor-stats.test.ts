/**
 * instrutor-stats.test.ts — Painel do instrutor que sempre lia zero, P-6.3c
 * (CORRETIVO).
 *
 * getInstructorDashboardCourses (queries.ts) agregava enrollments/progress/
 * certificates no cliente, dentro de withAuthenticatedContext com o
 * actorId do instrutor. As três tabelas são "só o próprio"
 * (enrollments_select_own/progress_select_own/certificates_select_own,
 * 0020_plataforma_rls.sql) — um instrutor não passa em nenhuma delas
 * (plataforma.is_instructor() ≠ super_admin), então todo agregado dava
 * zero para exatamente o público da tela.
 *
 * Cobertura:
 *  - Instrutor lê matrículas/certificados/progresso médio reais de um
 *    curso com dois alunos, via getInstructorDashboardCourses (dashboard)
 *    e via chamada direta a plataforma.course_stats() (contrato da
 *    função).
 *  - Curso sem matrícula exibe 0 em tudo, não erro.
 *  - Aluno comum que chama plataforma.course_stats() diretamente recebe
 *    conjunto vazio (guarda super_admin OU is_instructor()).
 *  - Nenhum dos dois consegue SELECT direto em plataforma.progress de
 *    outro usuário (contrato de P-6.7 sem regressão — rls.test.ts:288-314
 *    segue verde, sem alteração).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  instructors,
  courses,
  modules,
  lessons,
  enrollments,
  progress,
  certificates,
} from "@hebron/db/schema";
import { getInstructorDashboardCourses } from "../lib/queries";

const IDS = {
  instructorUser: "9e000000-0000-0000-0000-000000000001",
  studentA: "9e000000-0000-0000-0000-000000000002",
  studentB: "9e000000-0000-0000-0000-000000000003",
  instructor: "9e100000-0000-0000-0000-000000000001",
  course: "9e200000-0000-0000-0000-000000000001",
  emptyCourse: "9e200000-0000-0000-0000-000000000002",
  module: "9e300000-0000-0000-0000-000000000001",
  emptyModule: "9e300000-0000-0000-0000-000000000002",
  lessons: {
    l0: "9e400000-0000-0000-0000-000000000001",
    l1: "9e400000-0000-0000-0000-000000000002",
    l2: "9e400000-0000-0000-0000-000000000003",
    l3: "9e400000-0000-0000-0000-000000000004",
  },
  progressA: {
    l0: "9e500000-0000-0000-0000-000000000001",
    l1: "9e500000-0000-0000-0000-000000000002",
  },
  certificate: "9e600000-0000-0000-0000-000000000001",
} as const;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.instructorUser,
        email: "instrutor-stats-instrutor@test.hebron",
        fullName: "Instrutor Stats Instrutor",
      },
      {
        id: IDS.studentA,
        email: "instrutor-stats-aluno-a@test.hebron",
        fullName: "Instrutor Stats Aluno A",
      },
      {
        id: IDS.studentB,
        email: "instrutor-stats-aluno-b@test.hebron",
        fullName: "Instrutor Stats Aluno B",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(instructors)
    .values({
      id: IDS.instructor,
      userId: IDS.instructorUser,
      name: "Instrutor Stats",
    })
    .onConflictDoNothing();

  await db
    .insert(courses)
    .values([
      {
        id: IDS.course,
        title: "Painel do Instrutor Test",
        slug: "painel-instrutor-test",
        description: "Curso com dois alunos matriculados",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
      {
        id: IDS.emptyCourse,
        title: "Painel do Instrutor — Sem Matrícula",
        slug: "painel-instrutor-sem-matricula-test",
        description: "Curso publicado sem nenhum aluno",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(modules)
    .values([
      { id: IDS.module, courseId: IDS.course, title: "Módulo Único", order: 0 },
      {
        id: IDS.emptyModule,
        courseId: IDS.emptyCourse,
        title: "Módulo Único",
        order: 0,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(lessons)
    .values([
      {
        id: IDS.lessons.l0,
        moduleId: IDS.module,
        courseId: IDS.course,
        title: "L0",
        type: "video",
        order: 0,
        videoUrl: "https://videos.test.hebron/l0.mp4",
        requiresCompletion: false,
      },
      {
        id: IDS.lessons.l1,
        moduleId: IDS.module,
        courseId: IDS.course,
        title: "L1",
        type: "video",
        order: 1,
        videoUrl: "https://videos.test.hebron/l1.mp4",
        requiresCompletion: false,
      },
      {
        id: IDS.lessons.l2,
        moduleId: IDS.module,
        courseId: IDS.course,
        title: "L2",
        type: "video",
        order: 2,
        videoUrl: "https://videos.test.hebron/l2.mp4",
        requiresCompletion: false,
      },
      {
        id: IDS.lessons.l3,
        moduleId: IDS.module,
        courseId: IDS.course,
        title: "L3",
        type: "video",
        order: 3,
        videoUrl: "https://videos.test.hebron/l3.mp4",
        requiresCompletion: false,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(enrollments)
    .values([
      { userId: IDS.studentA, courseId: IDS.course },
      { userId: IDS.studentB, courseId: IDS.course },
    ])
    .onConflictDoNothing();

  // studentA conclui 2 de 4 aulas (50%); studentB nenhuma (0%) — média 25%.
  await db
    .insert(progress)
    .values([
      {
        id: IDS.progressA.l0,
        userId: IDS.studentA,
        lessonId: IDS.lessons.l0,
        courseId: IDS.course,
        completedAt: new Date(),
      },
      {
        id: IDS.progressA.l1,
        userId: IDS.studentA,
        lessonId: IDS.lessons.l1,
        courseId: IDS.course,
        completedAt: new Date(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(certificates)
    .values({
      id: IDS.certificate,
      courseId: IDS.course,
      userId: IDS.studentA,
      verificationHash: "instrutor-stats-test-hash",
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(courses)
    .where(inArray(courses.id, [IDS.course, IDS.emptyCourse]));
  await db.delete(instructors).where(eq(instructors.id, IDS.instructor));
  await db
    .delete(users)
    .where(inArray(users.id, [IDS.instructorUser, IDS.studentA, IDS.studentB]));
});

// ── Dashboard do instrutor lê números reais ────────────────────────────────

describe("getInstructorDashboardCourses — instrutor lê agregado real", () => {
  it("curso com dois alunos: 2 matrículas, 1 certificado, 25% de progresso médio", async () => {
    const rows = await getInstructorDashboardCourses(IDS.instructorUser);
    const entry = rows.find((r) => r.course.id === IDS.course);

    expect(entry).toBeDefined();
    expect(entry?.enrollmentCount).toBe(2);
    expect(entry?.certificateCount).toBe(1);
    expect(entry?.avgPercent).toBe(25);
  });

  it("curso sem matrícula exibe 0 em tudo, não erro", async () => {
    const rows = await getInstructorDashboardCourses(IDS.instructorUser);
    const entry = rows.find((r) => r.course.id === IDS.emptyCourse);

    expect(entry).toBeDefined();
    expect(entry?.enrollmentCount).toBe(0);
    expect(entry?.certificateCount).toBe(0);
    expect(entry?.avgPercent).toBe(0);
  });
});

// ── Contrato direto de plataforma.course_stats() ───────────────────────────

describe("plataforma.course_stats() — guarda super_admin OU is_instructor()", () => {
  it("instrutor recebe os números reais do curso", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.instructorUser },
      (tx) =>
        tx.execute<{
          course_id: string;
          enrollment_count: number;
          certificate_count: number;
          avg_percent: number;
        }>(
          sql`SELECT * FROM plataforma.course_stats(ARRAY[${IDS.course}::uuid])`,
        ),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.enrollment_count).toBe(2);
    expect(rows[0]?.certificate_count).toBe(1);
    expect(rows[0]?.avg_percent).toBe(25);
  });

  it("aluno comum recebe conjunto vazio", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.studentA },
      (tx) =>
        tx.execute(
          sql`SELECT * FROM plataforma.course_stats(ARRAY[${IDS.course}::uuid])`,
        ),
    );

    expect(rows).toHaveLength(0);
  });
});

// ── Sem regressão de P-6.7: nenhum SELECT direto em progress de terceiro ──

describe("plataforma.progress — instrutor e aluno continuam sem SELECT direto no progresso alheio", () => {
  it("instrutor não lê a linha de progresso de studentA via SELECT direto", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.instructorUser },
      (tx) =>
        tx
          .select({ id: progress.id })
          .from(progress)
          .where(eq(progress.id, IDS.progressA.l0)),
    );

    expect(rows).toHaveLength(0);
  });

  it("studentB não lê a linha de progresso de studentA via SELECT direto", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.studentB },
      (tx) =>
        tx
          .select({ id: progress.id })
          .from(progress)
          .where(eq(progress.id, IDS.progressA.l0)),
    );

    expect(rows).toHaveLength(0);
  });
});
