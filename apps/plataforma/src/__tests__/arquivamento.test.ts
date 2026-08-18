/**
 * arquivamento.test.ts — Arquivamento no lugar de exclusão física, P-6.4b
 * (CORRETIVO).
 *
 * deleteCourse/deleteCourseModule/deleteLesson (actions/courses.ts) faziam
 * DELETE físico, cascateando (FK on delete cascade) para enrollments/
 * progress/certificates — apagar um curso apagava certificado já emitido.
 * Agora as três marcam `archived_at`; a linha nunca some.
 *
 * Cobertura:
 *  - deleteCourse/deleteCourseModule/deleteLesson arquivam (UPDATE), nunca
 *    excluem — a linha continua existindo depois da chamada.
 *  - Curso/módulo/aula arquivados somem de searchCourses, getCourseBySlug,
 *    getCourseModulesWithLessons (ementa), getInstructorDashboardCourses e
 *    getCourseForEditor.
 *  - Matrícula, progresso e certificado de quem já concluiu o curso
 *    sobrevivem ao arquivamento do curso, e o certificado segue verificável
 *    (getCertificateVerification).
 *  - updateCourse/updateCourseModule (edição) persistem a mudança — o
 *    formulário sabia editar, faltava o chamador (achado do prompt).
 *  - Nota: autor edita/remove a própria nota.
 *  - Post de discussão: autor edita/remove o próprio post; outro aluno não
 *    remove; super_admin remove qualquer post (moderação, sem regressão de
 *    P-6.7).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  instructors,
  courses,
  modules,
  lessons,
  enrollments,
  progress,
  certificates,
  discussions,
  discussionPosts,
  notes,
  auditLog,
} from "@hebron/db/schema";
import {
  getCourseModulesWithLessons,
  getCourseBySlug,
  getInstructorDashboardCourses,
  getCourseForEditor,
  getCertificateVerification,
  getUserEnrollmentsWithProgress,
} from "../lib/queries";
import { getStudentKpiMetrics } from "@hebron/integrations/plataforma";

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
  vi.mocked(resolveSession).mockResolvedValue({
    actorId: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: roles as any,
    designations: [],
  });
}

const IDS = {
  instructorUser: "9f000000-0000-0000-0000-000000000004",
  instructor: "9f100000-0000-0000-0000-000000000001",
  superAdmin: "9f000000-0000-0000-0000-000000000001",
  student: "9f000000-0000-0000-0000-000000000002",
  studentB: "9f000000-0000-0000-0000-000000000003",
  course: "9f200000-0000-0000-0000-000000000001",
  module: "9f300000-0000-0000-0000-000000000001",
  lessons: {
    l0: "9f400000-0000-0000-0000-000000000001",
    l1: "9f400000-0000-0000-0000-000000000002",
  },
  certificate: "9f500000-0000-0000-0000-000000000001",
  discussion: "9f600000-0000-0000-0000-000000000001",
  post: "9f700000-0000-0000-0000-000000000001",
  note: "9f800000-0000-0000-0000-000000000001",
  // P-6.16 (CORRETIVO) — fixtures dedicadas: 0082 só filtrou archived_at nas
  // policies de SELECT e em course_outline(); can_access_lesson,
  // issue_certificate, course_stats e enrollments_insert_own continuavam
  // ignorando archived_at (migration 0083).
  courseTrilha: "9f200000-0000-0000-0000-000000000002",
  moduleTrilha: "9f300000-0000-0000-0000-000000000002",
  lessonsTrilha: {
    n0: "9f400000-0000-0000-0000-000000000010",
    n1: "9f400000-0000-0000-0000-000000000011",
  },
  courseCert: "9f200000-0000-0000-0000-000000000003",
  moduleCert: "9f300000-0000-0000-0000-000000000003",
  lessonsCert: {
    cA: "9f400000-0000-0000-0000-000000000020",
    cB: "9f400000-0000-0000-0000-000000000021",
    cC: "9f400000-0000-0000-0000-000000000022",
  },
  coursePercent: "9f200000-0000-0000-0000-000000000004",
  modulePercent: "9f300000-0000-0000-0000-000000000004",
  lessonsPercent: {
    pA: "9f400000-0000-0000-0000-000000000030",
    pB: "9f400000-0000-0000-0000-000000000031",
  },
  courseKpi: "9f200000-0000-0000-0000-000000000005",
} as const;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.superAdmin,
        email: "arquiv-plat-super@test.hebron",
        fullName: "Arquivamento Plataforma SuperAdmin",
      },
      {
        id: IDS.student,
        email: "arquiv-plat-aluno@test.hebron",
        fullName: "Arquivamento Plataforma Aluno",
      },
      {
        id: IDS.studentB,
        email: "arquiv-plat-aluno-b@test.hebron",
        fullName: "Arquivamento Plataforma Aluno B",
      },
      {
        id: IDS.instructorUser,
        email: "arquiv-plat-instrutor@test.hebron",
        fullName: "Arquivamento Plataforma Instrutor",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values({
      userId: IDS.superAdmin,
      role: "super_admin",
      grantedBy: IDS.superAdmin,
    })
    .onConflictDoNothing();

  await db
    .insert(instructors)
    .values({
      id: IDS.instructor,
      userId: IDS.instructorUser,
      name: "Arquivamento Plataforma Instrutor",
    })
    .onConflictDoNothing();

  await db
    .insert(courses)
    .values({
      id: IDS.course,
      title: "Arquivamento — Curso Test",
      slug: "arquivamento-curso-test",
      description: "Curso usado para testar arquivamento em vez de exclusão",
      category: "teste",
      instructorId: IDS.instructor,
      published: true,
    })
    .onConflictDoNothing();

  await db
    .insert(modules)
    .values({
      id: IDS.module,
      courseId: IDS.course,
      title: "Módulo Test",
      order: 0,
    })
    .onConflictDoNothing();

  await db
    .insert(lessons)
    .values([
      {
        id: IDS.lessons.l0,
        moduleId: IDS.module,
        courseId: IDS.course,
        title: "Aula 0",
        type: "video",
        order: 0,
        videoUrl: "https://videos.test.hebron/arquiv-0.mp4",
      },
      {
        id: IDS.lessons.l1,
        moduleId: IDS.module,
        courseId: IDS.course,
        title: "Aula 1",
        type: "video",
        order: 1,
        videoUrl: "https://videos.test.hebron/arquiv-1.mp4",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(enrollments)
    .values({
      userId: IDS.student,
      courseId: IDS.course,
      completedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(progress)
    .values({
      userId: IDS.student,
      lessonId: IDS.lessons.l0,
      courseId: IDS.course,
      completedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(certificates)
    .values({
      id: IDS.certificate,
      courseId: IDS.course,
      userId: IDS.student,
      verificationHash: "arquiv-plat-hash-test",
    })
    .onConflictDoNothing();

  await db
    .insert(discussions)
    .values({
      id: IDS.discussion,
      lessonId: IDS.lessons.l0,
      courseId: IDS.course,
    })
    .onConflictDoNothing();

  await db
    .insert(discussionPosts)
    .values({
      id: IDS.post,
      discussionId: IDS.discussion,
      authorId: IDS.student,
      content: "Comentário original",
    })
    .onConflictDoNothing();

  await db
    .insert(notes)
    .values({
      id: IDS.note,
      userId: IDS.student,
      lessonId: IDS.lessons.l0,
      timestampSeconds: 12,
      content: "Nota original",
    })
    .onConflictDoNothing();

  // ── P-6.16 — fixtures dedicadas (courseTrilha/courseCert/coursePercent/
  // courseKpi), independentes do IDS.course acima (que este arquivo arquiva
  // por completo nos blocos finais de P-6.4b).
  await db
    .insert(courses)
    .values([
      {
        id: IDS.courseTrilha,
        title: "P-6.16 — Trilha Test",
        slug: "p616-trilha-test",
        description: "Curso para testar can_access_lesson ignorando arquivada",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
      {
        id: IDS.courseCert,
        title: "P-6.16 — Certificado Test",
        slug: "p616-certificado-test",
        description: "Curso com aula arquivada sem progresso",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
      {
        id: IDS.coursePercent,
        title: "P-6.16 — Percentual Test",
        slug: "p616-percentual-test",
        description: "Curso com aula arquivada com progresso",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
      {
        id: IDS.courseKpi,
        title: "P-6.16 — KPI Test",
        slug: "p616-kpi-test",
        description: "Curso usado só para o KPI da Intranet",
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
        id: IDS.moduleTrilha,
        courseId: IDS.courseTrilha,
        title: "Módulo",
        order: 0,
      },
      {
        id: IDS.moduleCert,
        courseId: IDS.courseCert,
        title: "Módulo",
        order: 0,
      },
      {
        id: IDS.modulePercent,
        courseId: IDS.coursePercent,
        title: "Módulo",
        order: 0,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(lessons)
    .values([
      {
        id: IDS.lessonsTrilha.n0,
        moduleId: IDS.moduleTrilha,
        courseId: IDS.courseTrilha,
        title: "N0",
        type: "video",
        order: 0,
        videoUrl: "https://videos.test.hebron/p616-n0.mp4",
      },
      {
        id: IDS.lessonsTrilha.n1,
        moduleId: IDS.moduleTrilha,
        courseId: IDS.courseTrilha,
        title: "N1",
        type: "video",
        order: 1,
        videoUrl: "https://videos.test.hebron/p616-n1.mp4",
      },
      {
        id: IDS.lessonsCert.cA,
        moduleId: IDS.moduleCert,
        courseId: IDS.courseCert,
        title: "CA",
        type: "video",
        order: 0,
        videoUrl: "https://videos.test.hebron/p616-ca.mp4",
        requiresCompletion: false,
      },
      {
        id: IDS.lessonsCert.cB,
        moduleId: IDS.moduleCert,
        courseId: IDS.courseCert,
        title: "CB",
        type: "video",
        order: 1,
        videoUrl: "https://videos.test.hebron/p616-cb.mp4",
        requiresCompletion: false,
      },
      {
        id: IDS.lessonsCert.cC,
        moduleId: IDS.moduleCert,
        courseId: IDS.courseCert,
        title: "CC",
        type: "video",
        order: 2,
        videoUrl: "https://videos.test.hebron/p616-cc.mp4",
        requiresCompletion: false,
      },
      {
        id: IDS.lessonsPercent.pA,
        moduleId: IDS.modulePercent,
        courseId: IDS.coursePercent,
        title: "PA",
        type: "video",
        order: 0,
        videoUrl: "https://videos.test.hebron/p616-pa.mp4",
        requiresCompletion: false,
      },
      {
        id: IDS.lessonsPercent.pB,
        moduleId: IDS.modulePercent,
        courseId: IDS.coursePercent,
        title: "PB",
        type: "video",
        order: 1,
        videoUrl: "https://videos.test.hebron/p616-pb.mp4",
        requiresCompletion: false,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(enrollments)
    .values([
      { userId: IDS.student, courseId: IDS.courseTrilha },
      { userId: IDS.student, courseId: IDS.courseCert },
      { userId: IDS.student, courseId: IDS.coursePercent },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.instructorUser));
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.student));
  await db.delete(notes).where(eq(notes.id, IDS.note));
  await db
    .delete(discussionPosts)
    .where(eq(discussionPosts.discussionId, IDS.discussion));
  await db.delete(discussions).where(eq(discussions.id, IDS.discussion));
  await db.delete(certificates).where(eq(certificates.id, IDS.certificate));
  await db.delete(progress).where(eq(progress.courseId, IDS.course));
  await db.delete(enrollments).where(eq(enrollments.courseId, IDS.course));
  await db.delete(courses).where(eq(courses.id, IDS.course));
  // P-6.16 — cascade (FK on delete cascade, packages/db/src/schema/
  // plataforma.ts) limpa module/lesson/enrollment/progress/certificate.
  await db
    .delete(courses)
    .where(
      inArray(courses.id, [
        IDS.courseTrilha,
        IDS.courseCert,
        IDS.coursePercent,
        IDS.courseKpi,
      ]),
    );
  await db.delete(instructors).where(eq(instructors.id, IDS.instructor));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.superAdmin));
  await db
    .delete(users)
    .where(
      inArray(users.id, [
        IDS.superAdmin,
        IDS.student,
        IDS.studentB,
        IDS.instructorUser,
      ]),
    );
});

// ── Edição — updateCourse/updateCourseModule agora têm chamador de UI ────────
// Roda antes dos blocos de arquivamento abaixo — editar um curso/módulo já
// arquivado não é o cenário que este prompt cobre.

describe("Edição — updateCourse/updateCourseModule persistem a alteração", () => {
  it("updateCourse grava o novo título", async () => {
    await actingAs(IDS.instructorUser);
    const { updateCourse } = await import("../actions/courses");
    const result = await updateCourse({
      courseId: IDS.course,
      title: "Arquivamento — Curso Test (editado)",
      slug: "arquivamento-curso-test",
      description: "Curso usado para testar arquivamento em vez de exclusão",
      category: "teste",
      instructorId: IDS.instructor,
      seriesId: null,
      coverImageUrl: null,
      isPublished: true,
    });
    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, IDS.course));
    expect(row?.title).toBe("Arquivamento — Curso Test (editado)");
  });

  it("updateCourseModule grava o novo título", async () => {
    await actingAs(IDS.instructorUser);
    const { updateCourseModule } = await import("../actions/courses");
    const result = await updateCourseModule({
      moduleId: IDS.module,
      courseId: IDS.course,
      title: "Módulo Test (editado)",
      description: null,
      order: 0,
    });
    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, IDS.module));
    expect(row?.title).toBe("Módulo Test (editado)");
  });
});

// ── Nota — autor edita/remove a própria nota ──────────────────────────────────
// Roda antes do arquivamento — mesma razão do bloco de Edição acima.

describe("Nota — autor edita e remove a própria nota", () => {
  it("updateNote grava o novo conteúdo", async () => {
    await actingAs(IDS.student);
    const { updateNote } = await import("../actions/discussions");
    const result = await updateNote({
      noteId: IDS.note,
      content: "Nota editada",
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.note.content).toBe("Nota editada");
  });

  it("deleteNote remove a nota", async () => {
    await actingAs(IDS.student);
    const { deleteNote } = await import("../actions/discussions");
    const result = await deleteNote({ noteId: IDS.note });
    expect(result?.serverError).toBeUndefined();

    const rows = await db.select().from(notes).where(eq(notes.id, IDS.note));
    expect(rows).toHaveLength(0);
  });
});

// ── Post de discussão — autor edita/remove; outro aluno não; super_admin modera ──
// Roda antes do arquivamento: discussion_posts_select_enrolled (RETURNING de
// UPDATE/DELETE) depende da visibilidade RLS de plataforma.lessons, que some
// assim que o módulo/curso é arquivado — comportamento esperado (só matrícula/
// progresso/certificado sobrevivem ao arquivamento, não a leitura de conteúdo/
// discussão), não algo para testar aqui.

describe("Post de discussão — autor edita/remove o próprio; outro aluno não; super_admin modera", () => {
  it("updateDiscussionPost (autor) grava o novo conteúdo e marca 'editado'", async () => {
    await actingAs(IDS.student);
    const { updateDiscussionPost } = await import("../actions/discussions");
    const result = await updateDiscussionPost({
      postId: IDS.post,
      content: "Comentário editado",
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.post.content).toBe("Comentário editado");
    expect(result?.data?.post.updatedAt).not.toBeNull();
  });

  it("deleteDiscussionPost (outro aluno) falha — não é autor nem super_admin", async () => {
    await actingAs(IDS.studentB);
    const { deleteDiscussionPost } = await import("../actions/discussions");
    const result = await deleteDiscussionPost({ postId: IDS.post });
    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(discussionPosts)
      .where(eq(discussionPosts.id, IDS.post));
    expect(rows).toHaveLength(1);
  });

  it("deleteDiscussionPost (autor) remove o próprio post", async () => {
    await actingAs(IDS.student);
    const { deleteDiscussionPost } = await import("../actions/discussions");
    const result = await deleteDiscussionPost({ postId: IDS.post });
    expect(result?.serverError).toBeUndefined();

    const rows = await db
      .select()
      .from(discussionPosts)
      .where(eq(discussionPosts.id, IDS.post));
    expect(rows).toHaveLength(0);
  });

  it("super_admin remove post de terceiro (moderação, sem regressão de P-6.7)", async () => {
    const [recreated] = await db
      .insert(discussionPosts)
      .values({
        discussionId: IDS.discussion,
        authorId: IDS.student,
        content: "Novo comentário para moderação",
      })
      .returning({ id: discussionPosts.id });
    if (!recreated) throw new Error("Falha ao recriar post de teste");
    const recreatedId = recreated.id;

    await actingAs(IDS.superAdmin, ["super_admin"]);
    const { deleteDiscussionPost } = await import("../actions/discussions");
    const result = await deleteDiscussionPost({ postId: recreatedId });
    expect(result?.serverError).toBeUndefined();

    const rows = await db
      .select()
      .from(discussionPosts)
      .where(eq(discussionPosts.id, recreatedId));
    expect(rows).toHaveLength(0);
  });
});

// ── deleteLesson arquiva, não exclui ──────────────────────────────────────────

describe("Arquivamento — deleteLesson marca archived_at em vez de excluir", () => {
  it("arquiva a aula 1: a linha continua existindo em plataforma.lessons", async () => {
    await actingAs(IDS.instructorUser);
    const { deleteLesson } = await import("../actions/courses");
    const result = await deleteLesson({ lessonId: IDS.lessons.l1 });
    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, IDS.lessons.l1));
    expect(row).toBeDefined();
    expect(row?.archivedAt).not.toBeNull();
  });

  it("a ementa (getCourseModulesWithLessons) não lista mais a aula arquivada", async () => {
    const { lessons: outline } = await getCourseModulesWithLessons(
      IDS.student,
      IDS.course,
    );
    expect(outline.some((l) => l.id === IDS.lessons.l1)).toBe(false);
    expect(outline.some((l) => l.id === IDS.lessons.l0)).toBe(true);
  });

  it("o editor de curso (getCourseForEditor) não lista mais a aula arquivada", async () => {
    const data = await getCourseForEditor(IDS.instructorUser, IDS.course);
    expect(data?.lessons.some((l) => l.id === IDS.lessons.l1)).toBe(false);
  });

  it("progresso de quem já concluiu a aula (l0, não arquivada) continua existindo", async () => {
    const rows = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.userId, IDS.student),
          eq(progress.lessonId, IDS.lessons.l0),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.completedAt).not.toBeNull();
  });
});

// ── deleteCourseModule arquiva, não exclui ────────────────────────────────────

describe("Arquivamento — deleteCourseModule marca archived_at em vez de excluir", () => {
  it("arquiva o módulo: a linha continua existindo em plataforma.modules", async () => {
    await actingAs(IDS.instructorUser);
    const { deleteCourseModule } = await import("../actions/courses");
    const result = await deleteCourseModule({ moduleId: IDS.module });
    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, IDS.module));
    expect(row).toBeDefined();
    expect(row?.archivedAt).not.toBeNull();
  });

  it("o editor de curso não lista mais o módulo arquivado", async () => {
    const data = await getCourseForEditor(IDS.instructorUser, IDS.course);
    expect(data?.modules.some((m) => m.id === IDS.module)).toBe(false);
  });
});

// ── deleteCourse arquiva, não exclui — matrícula/progresso/certificado sobrevivem ──

describe("Arquivamento — deleteCourse marca archived_at; matrícula/progresso/certificado sobrevivem", () => {
  it("arquiva o curso: a linha continua existindo em plataforma.courses", async () => {
    await actingAs(IDS.instructorUser);
    const { deleteCourse } = await import("../actions/courses");
    const result = await deleteCourse({ courseId: IDS.course });
    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, IDS.course));
    expect(row).toBeDefined();
    expect(row?.archivedAt).not.toBeNull();
  });

  it("some do catálogo (getCourseBySlug) e do painel do instrutor (getInstructorDashboardCourses)", async () => {
    const detail = await getCourseBySlug(
      IDS.student,
      "arquivamento-curso-test",
    );
    expect(detail).toBeNull();

    const dashboard = await getInstructorDashboardCourses(IDS.instructorUser);
    expect(dashboard.some((c) => c.course.id === IDS.course)).toBe(false);
  });

  it("some da busca (searchCourses)", async () => {
    await actingAs(IDS.student);
    const { searchCourses } = await import("../actions/courses");
    const result = await searchCourses({ query: "Arquivamento — Curso Test" });
    expect(result?.data?.courses.some((c) => c.id === IDS.course)).toBe(false);
  });

  it("matrícula, progresso e certificado do aluno continuam existindo", async () => {
    const enrollmentRows = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, IDS.student),
          eq(enrollments.courseId, IDS.course),
        ),
      );
    expect(enrollmentRows).toHaveLength(1);

    const certRows = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, IDS.certificate));
    expect(certRows).toHaveLength(1);
  });

  it("o certificado segue verificável por hash (plataforma.verify_certificate)", async () => {
    const verification = await getCertificateVerification(
      "arquiv-plat-hash-test",
    );
    expect(verification).not.toBeNull();
    expect(verification?.userName).toBe("Arquivamento Plataforma Aluno");
  });
});

// ── P-6.16 (CORRETIVO) — can_access_lesson/issue_certificate/course_stats/
// enrollments_insert_own passam a ignorar aula/módulo arquivado, mesmo
// universo de plataforma.course_outline() (migration 0083). Antes desta
// migration, arquivar a primeira aula/curso real travava a trilha, abortava
// a emissão do certificado na última aula e deixava o percentual da jornada
// passar de 100 — os cinco defeitos documentados no cabeçalho do prompt.

// ── Trilha — arquivar a aula anterior desbloqueia a seguinte ─────────────────

describe("Trilha (P-6.16) — aula arquivada não tranca a trilha para sempre", () => {
  it("antes do arquivamento: N1 bloqueada — aluno não concluiu N0", async () => {
    const { lessons: outline } = await getCourseModulesWithLessons(
      IDS.student,
      IDS.courseTrilha,
    );
    expect(outline.find((l) => l.id === IDS.lessonsTrilha.n1)?.unlocked).toBe(
      false,
    );
  });

  it("arquiva N0 (aluno sem progresso nela)", async () => {
    await actingAs(IDS.instructorUser);
    const { deleteLesson } = await import("../actions/courses");
    const result = await deleteLesson({ lessonId: IDS.lessonsTrilha.n0 });
    expect(result?.serverError).toBeUndefined();
  });

  it("depois do arquivamento: N1 desbloqueia — can_access_lesson ignora a aula arquivada", async () => {
    const { lessons: outline } = await getCourseModulesWithLessons(
      IDS.student,
      IDS.courseTrilha,
    );
    expect(outline.find((l) => l.id === IDS.lessonsTrilha.n1)?.unlocked).toBe(
      true,
    );
  });
});

// ── Certificado — aula arquivada sem progresso não aborta a emissão ──────────
// Reproduz o defeito 2: CB é arquivada sem nunca ter sido concluída pelo
// aluno — antes de 0083, plataforma.issue_certificate revalidava com
// count(*) cru em lessons (3, CB incluída) contra o progress real (2), e a
// transação inteira de markLessonComplete abortava ao concluir CC.

describe("Certificado (P-6.16) — aula arquivada sem progresso não aborta a última conclusão", () => {
  it("conclui CA: trilha ainda incompleta (CB e CC pendentes), sem certificado", async () => {
    await actingAs(IDS.student);
    const { markLessonComplete } = await import("../actions/progress");
    const result = await markLessonComplete({
      lessonId: IDS.lessonsCert.cA,
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.certificate).toBeNull();
  });

  it("arquiva CB, que nunca foi concluída", async () => {
    await actingAs(IDS.instructorUser);
    const { deleteLesson } = await import("../actions/courses");
    const result = await deleteLesson({ lessonId: IDS.lessonsCert.cB });
    expect(result?.serverError).toBeUndefined();
  });

  it("conclui CC (última aula não arquivada): certificado emitido sem exceção", async () => {
    await actingAs(IDS.student);
    const { markLessonComplete } = await import("../actions/progress");
    const result = await markLessonComplete({
      lessonId: IDS.lessonsCert.cC,
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.certificate).not.toBeNull();
    expect(result?.data?.certificate?.courseId).toBe(IDS.courseCert);

    const rows = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.courseId, IDS.courseCert),
          eq(certificates.userId, IDS.student),
        ),
      );
    expect(rows).toHaveLength(1);
  });
});

// ── Percentual — progresso de aula arquivada não infla a jornada acima de
// 100% ────────────────────────────────────────────────────────────────────
// Reproduz o defeito 3: PB é concluída e só depois arquivada — a linha de
// progresso sobrevive (por design de P-6.4b). Sem interseccionar
// progress.lesson_id com a outline, o numerador (2, PA+PB) fica maior que o
// denominador (1, só PA) e o percentual passava de 100.

describe("Percentual (P-6.16) — progresso de aula arquivada não conta, nunca passa de 100", () => {
  it("conclui PA e PB: 100% antes de qualquer arquivamento", async () => {
    await actingAs(IDS.student);
    const { markLessonComplete } = await import("../actions/progress");
    const r0 = await markLessonComplete({ lessonId: IDS.lessonsPercent.pA });
    expect(r0?.serverError).toBeUndefined();
    const r1 = await markLessonComplete({ lessonId: IDS.lessonsPercent.pB });
    expect(r1?.serverError).toBeUndefined();
    expect(r1?.data?.certificate).not.toBeNull();
  });

  it("arquiva PB — a linha de progresso de PB continua existindo", async () => {
    await actingAs(IDS.instructorUser);
    const { deleteLesson } = await import("../actions/courses");
    const result = await deleteLesson({ lessonId: IDS.lessonsPercent.pB });
    expect(result?.serverError).toBeUndefined();

    const rows = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.userId, IDS.student),
          eq(progress.lessonId, IDS.lessonsPercent.pB),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("getUserEnrollmentsWithProgress: 100%, não 200% — progresso de PB (arquivada) não soma no numerador", async () => {
    const enrollmentsWithProgress = await getUserEnrollmentsWithProgress(
      IDS.student,
    );
    const entry = enrollmentsWithProgress.find(
      (e) => e.course.id === IDS.coursePercent,
    );
    expect(entry?.progressPercent).toBe(100);
  });

  it("plataforma.course_stats: avg_percent do curso é 100, mesma régua da jornada do aluno", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.instructorUser },
      (tx) =>
        tx.execute<{ course_id: string; avg_percent: number }>(
          sql`SELECT * FROM plataforma.course_stats(ARRAY[${IDS.coursePercent}::uuid])`,
        ),
    );
    expect(rows[0]?.avg_percent).toBe(100);
  });
});

// ── Matrícula — INSERT direto negado em curso arquivado ──────────────────────
// IDS.course já foi arquivado pelo bloco "deleteCourse" acima; continuava
// published = true (arquivar não despublica), e enrollments_insert_own só
// exigia published = true — matrícula direta por RPC continuava possível.

describe("Matrícula (P-6.16) — enrollments_insert_own nega INSERT em curso arquivado", () => {
  it("enrollInCourse falha para aluno não matriculado em curso arquivado", async () => {
    await actingAs(IDS.studentB);
    const { enrollInCourse } = await import("../actions/enrollment");
    const result = await enrollInCourse({ courseId: IDS.course });
    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, IDS.studentB),
          eq(enrollments.courseId, IDS.course),
        ),
      );
    expect(rows).toHaveLength(0);
  });
});

// ── KPI da Intranet — activeCourses ignora curso arquivado ───────────────────

describe("KPI (P-6.16) — getStudentKpiMetrics().activeCourses ignora curso arquivado", () => {
  it("arquivar courseKpi reduz activeCourses em 1 (curso publicado continua published=true, só archived_at muda)", async () => {
    const before = await getStudentKpiMetrics();

    await actingAs(IDS.instructorUser);
    const { deleteCourse } = await import("../actions/courses");
    const result = await deleteCourse({ courseId: IDS.courseKpi });
    expect(result?.serverError).toBeUndefined();

    const after = await getStudentKpiMetrics();
    expect(after.activeCourses).toBe(before.activeCourses - 1);
  });
});
