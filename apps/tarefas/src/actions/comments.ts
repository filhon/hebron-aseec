"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { comments, tasks } from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { createCommentSchema } from "@hebron/validators/tarefas";
import { staffAction } from "../lib/safe-action";

const insertNotification = makeNotificationInserter();

// ---------------------------------------------------------------------------
// createComment — comentário com @menções (BRAIN §6.9). Cada usuário
// mencionado recebe uma notificação in_app; falha ao notificar não deve
// desfazer o comentário já criado (best-effort, fora da criação em si).
// ---------------------------------------------------------------------------

export const createComment = staffAction
  .schema(createCommentSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const [task] = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), isNull(tasks.deletedAt)))
      .limit(1);
    if (!task) throw new Error("Tarefa não encontrada");

    const comment = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(comments)
          .values({
            taskId: input.taskId,
            authorId: ctx.actorId,
            content: input.content,
            mentions: input.mentions,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar comentário");
        return row;
      },
    );

    for (const mentionedUserId of input.mentions) {
      if (mentionedUserId === ctx.actorId) continue;
      await createNotification({
        insert: insertNotification,
        data: {
          userId: mentionedUserId,
          channel: "in_app",
          type: "task.comment.mention",
          title: `Você foi mencionado em "${task.title}"`,
          body: input.content,
          payload: {
            taskId: task.id,
            commentId: comment.id,
            href: `/tarefa/${task.id}`,
          },
        },
      });
    }

    return { comment };
  });
