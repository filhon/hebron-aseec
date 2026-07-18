"use server";

import { and, eq, isNull } from "drizzle-orm";
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
    const { comment, taskTitle } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [task] = await tx
          .select({ id: tasks.id, title: tasks.title })
          .from(tasks)
          .where(and(eq(tasks.id, input.taskId), isNull(tasks.deletedAt)))
          .limit(1);
        if (!task) throw new Error("Tarefa não encontrada");

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

        return { comment: row, taskTitle: task.title };
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
          title: `Você foi mencionado em "${taskTitle}"`,
          body: input.content,
          payload: {
            taskId: comment.taskId,
            commentId: comment.id,
            href: `/tarefa/${comment.taskId}`,
          },
        },
      });
    }

    return { comment };
  });
