"use server";

import { z } from "zod";
import { and, asc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import {
  courses,
  discussions,
  instructors,
  lessons,
  modules,
  series,
} from "@hebron/db/schema";
import {
  createCourseModuleSchema,
  createCourseSchema,
  createLessonSchema,
  updateCourseSchema,
} from "@hebron/validators";
import { plataformaAction, staffAction } from "../lib/safe-action";
import { logPlataformaAudit } from "../lib/audit";
import { notifyNewCoursePublished } from "../lib/notifications";
import {
  getInstructors,
  getSeriesList,
  getCourseCategories,
} from "../lib/queries";

// ---------------------------------------------------------------------------
// courses — CRUD (super_admin/instrutor); publicação com audit central
// (escopo P-6.8). CourseForm (P-6.4) envia coverImageUrl/isPublished — os
// nomes divergem das colunas do banco (coverUrl/published), mapeados abaixo.
// ---------------------------------------------------------------------------

export const createCourse = staffAction
  .schema(createCourseSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const course = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(courses)
          .values({
            title: input.title,
            slug: input.slug,
            description: input.description,
            coverUrl: input.coverImageUrl,
            category: input.category,
            instructorId: input.instructorId,
            seriesId: input.seriesId,
            published: input.isPublished,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar curso");

        if (row.published) {
          await withSystemRole(tx, (sysTx) =>
            logPlataformaAudit(
              {
                actorId: ctx.actorId,
                action: "course.published",
                entity: "course",
                entityId: row.id,
                diff: { title: row.title },
              },
              sysTx,
            ),
          );
        }

        return row;
      },
    );

    // Notificação best-effort, fora da transação (P-6.10) — só a usuários
    // com opt-in de newsletter (notifyNewCoursePublished já filtra).
    if (course.published) {
      await notifyNewCoursePublished(course.id);
    }

    return { course };
  });

export const updateCourse = staffAction
  .schema(updateCourseSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const { course, newlyPublished } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [existing] = await tx
          .select({ published: courses.published })
          .from(courses)
          .where(eq(courses.id, input.courseId))
          .limit(1);
        if (!existing) throw new Error("Curso não encontrado");

        const [row] = await tx
          .update(courses)
          .set({
            title: input.title,
            slug: input.slug,
            description: input.description,
            coverUrl: input.coverImageUrl,
            category: input.category,
            instructorId: input.instructorId,
            seriesId: input.seriesId,
            published: input.isPublished,
            updatedAt: new Date(),
          })
          .where(eq(courses.id, input.courseId))
          .returning();
        if (!row) throw new Error("Curso não encontrado");

        const newlyPublished = !existing.published && row.published;
        if (newlyPublished) {
          await withSystemRole(tx, (sysTx) =>
            logPlataformaAudit(
              {
                actorId: ctx.actorId,
                action: "course.published",
                entity: "course",
                entityId: row.id,
                diff: { title: row.title },
              },
              sysTx,
            ),
          );
        }

        return { course: row, newlyPublished };
      },
    );

    // Notificação best-effort, fora da transação (P-6.10) — só quando o
    // curso passa de rascunho para publicado, não a cada edição.
    if (newlyPublished) {
      await notifyNewCoursePublished(course.id);
    }

    return { course };
  });

const deleteCourseSchema = z.object({ courseId: z.string().uuid() });

// Arquiva em vez de excluir (P-6.4b) — DELETE físico cascateia para
// enrollments/progress/certificates (FK on delete cascade,
// packages/db/src/schema/plataforma.ts), apagando certificado já emitido.
// Nunca mais que uma linha muda de estado aqui.
export const deleteCourse = staffAction
  .schema(deleteCourseSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [row] = await tx
        .update(courses)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(courses.id, input.courseId))
        .returning({ id: courses.id });
      if (!row) throw new Error("Curso não encontrado");
    });

    return { success: true };
  });

// Reúne as listas usadas pelo CourseForm em modo de edição
// (instrutores/séries/categorias) — o editor de curso
// (apps/instrutor/curso/[id]/page.tsx) não está na lista de arquivos
// permitidos deste prompt para ganhar um novo fetch de Server Component, e
// CourseEditorView é Client Component; a mesma leitura de novo-curso/page.tsx
// fica disponível aqui via Server Action, chamada sob demanda ao abrir o
// diálogo de edição (decisão registrada em SESSIONS.md).
export const getCourseEditOptions = staffAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const [instructorsList, seriesList, categories] = await Promise.all([
      getInstructors(ctx.actorId),
      getSeriesList(ctx.actorId),
      getCourseCategories(ctx.actorId),
    ]);

    return { instructors: instructorsList, series: seriesList, categories };
  });

// ---------------------------------------------------------------------------
// modules
// ---------------------------------------------------------------------------

export const createCourseModule = staffAction
  .schema(createCourseModuleSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const courseModule = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(modules)
          .values({
            courseId: input.courseId,
            title: input.title,
            description: input.description,
            order: input.order,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar módulo");
        return row;
      },
    );

    return { courseModule };
  });

const updateCourseModuleSchema = createCourseModuleSchema.extend({
  moduleId: z.string().uuid(),
});

export const updateCourseModule = staffAction
  .schema(updateCourseModuleSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const courseModule = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(modules)
          .set({
            title: input.title,
            description: input.description,
            order: input.order,
            updatedAt: new Date(),
          })
          .where(eq(modules.id, input.moduleId))
          .returning();
        if (!row) throw new Error("Módulo não encontrado");
        return row;
      },
    );

    return { courseModule };
  });

const deleteCourseModuleSchema = z.object({ moduleId: z.string().uuid() });

// Arquiva em vez de excluir (P-6.4b) — mesma razão de deleteCourse.
export const deleteCourseModule = staffAction
  .schema(deleteCourseModuleSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [row] = await tx
        .update(modules)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(modules.id, input.moduleId))
        .returning({ id: modules.id });
      if (!row) throw new Error("Módulo não encontrado");
    });

    return { success: true };
  });

const reorderCourseModulesSchema = z.object({
  courseId: z.string().uuid(),
  orderedModuleIds: z.array(z.string().uuid()).min(1),
});

export const reorderCourseModules = staffAction
  .schema(reorderCourseModulesSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      for (const [index, moduleId] of input.orderedModuleIds.entries()) {
        await tx
          .update(modules)
          .set({ order: index, updatedAt: new Date() })
          .where(
            and(eq(modules.id, moduleId), eq(modules.courseId, input.courseId)),
          );
      }
    });

    return { success: true };
  });

// ---------------------------------------------------------------------------
// lessons — createLessonSchema.textContent mapeia para a coluna `content`.
// Cada aula ganha um fórum próprio (plataforma.discussions, 1:1) já na
// criação, para que discussion-thread.tsx sempre tenha onde postar (BRAIN
// §6.3 — "fórum por aula"; decisão registrada em SESSIONS.md, já que o
// escopo de P-6.8 não modela `discussions` como CRUD explícito de usuário).
// ---------------------------------------------------------------------------

export const createLesson = staffAction
  .schema(createLessonSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const lesson = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(lessons)
          .values({
            moduleId: input.moduleId,
            courseId: input.courseId,
            title: input.title,
            type: input.type,
            order: input.order,
            videoUrl: input.videoUrl,
            videoDurationSeconds: input.videoDurationSeconds,
            content: input.textContent,
            downloadUrl: input.downloadUrl,
            downloadFileName: input.downloadFileName,
            downloadFileSizeBytes: input.downloadFileSizeBytes,
            requiresCompletion: input.requiresCompletion,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar aula");

        await tx.insert(discussions).values({
          lessonId: row.id,
          courseId: row.courseId,
        });

        return row;
      },
    );

    return { lesson };
  });

const updateLessonSchema = createLessonSchema.and(
  z.object({ lessonId: z.string().uuid() }),
);

export const updateLesson = staffAction
  .schema(updateLessonSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const lesson = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(lessons)
          .set({
            title: input.title,
            type: input.type,
            order: input.order,
            videoUrl: input.videoUrl,
            videoDurationSeconds: input.videoDurationSeconds,
            content: input.textContent,
            downloadUrl: input.downloadUrl,
            downloadFileName: input.downloadFileName,
            downloadFileSizeBytes: input.downloadFileSizeBytes,
            requiresCompletion: input.requiresCompletion,
            updatedAt: new Date(),
          })
          .where(eq(lessons.id, input.lessonId))
          .returning();
        if (!row) throw new Error("Aula não encontrada");
        return row;
      },
    );

    return { lesson };
  });

const deleteLessonSchema = z.object({ lessonId: z.string().uuid() });

// Arquiva em vez de excluir (P-6.4b) — mesma razão de deleteCourse.
export const deleteLesson = staffAction
  .schema(deleteLessonSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [row] = await tx
        .update(lessons)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(lessons.id, input.lessonId))
        .returning({ id: lessons.id });
      if (!row) throw new Error("Aula não encontrada");
    });

    return { success: true };
  });

const reorderLessonsSchema = z.object({
  moduleId: z.string().uuid(),
  orderedLessonIds: z.array(z.string().uuid()).min(1),
});

export const reorderLessons = staffAction
  .schema(reorderLessonsSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      for (const [index, lessonId] of input.orderedLessonIds.entries()) {
        await tx
          .update(lessons)
          .set({ order: index, updatedAt: new Date() })
          .where(
            and(eq(lessons.id, lessonId), eq(lessons.moduleId, input.moduleId)),
          );
      }
    });

    return { success: true };
  });

// ---------------------------------------------------------------------------
// searchCourses — busca simples (título, série, categoria), filtrando de
// fato por series_id (PATCH-024). Roda como authenticated: a RLS
// (courses_select_published / courses_mutate_staff) já resolve visibilidade
// — publicados para todos, rascunhos só para super_admin/instrutor.
// ---------------------------------------------------------------------------

const searchCoursesSchema = z.object({
  query: z.string().trim().max(200).optional(),
  seriesId: z.string().uuid().optional(),
  category: z.string().max(100).optional(),
});

export const searchCourses = plataformaAction
  .schema(searchCoursesSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const conditions: SQL[] = [isNull(courses.archivedAt)];
    if (input.seriesId) conditions.push(eq(courses.seriesId, input.seriesId));
    if (input.category) conditions.push(eq(courses.category, input.category));
    if (input.query) {
      const term = `%${input.query}%`;
      const searchCondition = or(
        ilike(courses.title, term),
        ilike(series.name, term),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const rows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select({
            course: courses,
            instructorName: instructors.name,
            seriesName: series.name,
          })
          .from(courses)
          .leftJoin(instructors, eq(instructors.id, courses.instructorId))
          .leftJoin(series, eq(series.id, courses.seriesId))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(courses.title)),
    );

    const results = rows.map((r) => ({
      ...r.course,
      instructorName: r.instructorName ?? "",
      seriesName: r.seriesName,
    }));

    return { courses: results };
  });
