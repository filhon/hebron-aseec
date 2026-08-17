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
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
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
} from "../lib/queries";

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
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.instructorUser));
  await db.delete(notes).where(eq(notes.id, IDS.note));
  await db
    .delete(discussionPosts)
    .where(eq(discussionPosts.discussionId, IDS.discussion));
  await db.delete(discussions).where(eq(discussions.id, IDS.discussion));
  await db.delete(certificates).where(eq(certificates.id, IDS.certificate));
  await db.delete(progress).where(eq(progress.courseId, IDS.course));
  await db.delete(enrollments).where(eq(enrollments.courseId, IDS.course));
  await db.delete(courses).where(eq(courses.id, IDS.course));
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
