"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { courses, instructors } from "@hebron/db/schema";
import { createInstructorSchema } from "@hebron/validators";
import { superAdminAction } from "../lib/safe-action";

// ---------------------------------------------------------------------------
// instructors — CRUD restrito a super_admin (RLS `instructors_mutate_admin`,
// 0020_plataforma_rls.sql). Gap S-113: até P-6.13, a única forma de popular
// plataforma.instructors era INSERT manual no banco, deixando o select
// "Instrutor" do CourseForm vazio em qualquer instalação nova.
// ---------------------------------------------------------------------------

export const createInstructor = superAdminAction
  .schema(createInstructorSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const instructor = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(instructors)
          .values({
            userId: input.userId,
            name: input.name,
            avatarUrl: input.avatarUrl,
            bio: input.bio,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar instrutor");
        return row;
      },
    );

    return { instructor };
  });

const updateInstructorSchema = createInstructorSchema.extend({
  instructorId: z.string().uuid(),
});

export const updateInstructor = superAdminAction
  .schema(updateInstructorSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const instructor = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(instructors)
          .set({
            userId: input.userId,
            name: input.name,
            avatarUrl: input.avatarUrl,
            bio: input.bio,
            updatedAt: new Date(),
          })
          .where(eq(instructors.id, input.instructorId))
          .returning();
        if (!row) throw new Error("Instrutor não encontrado");
        return row;
      },
    );

    return { instructor };
  });

const deleteInstructorSchema = z.object({ instructorId: z.string().uuid() });

/**
 * Remoção bloqueada se houver curso vinculado — nunca deixar
 * courses.instructor_id órfão (courses.instructor_id é NOT NULL + FK sem
 * onDelete, então o banco já rejeitaria; a checagem aqui só existe para dar
 * uma mensagem legível em vez do erro cru de violação de FK).
 */
export const deleteInstructor = superAdminAction
  .schema(deleteInstructorSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [countRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(courses)
        .where(eq(courses.instructorId, input.instructorId));
      if ((countRow?.count ?? 0) > 0) {
        throw new Error(
          "Não é possível remover: há cursos vinculados a este instrutor",
        );
      }

      const [row] = await tx
        .delete(instructors)
        .where(eq(instructors.id, input.instructorId))
        .returning({ id: instructors.id });
      if (!row) throw new Error("Instrutor não encontrado");
    });

    return { success: true };
  });
