"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { discussionPosts, discussions, notes } from "@hebron/db/schema";
import { createDiscussionPostSchema } from "@hebron/validators";
import { plataformaAction, superAdminAction } from "../lib/safe-action";
import { notifyDiscussionReply } from "../lib/notifications";

// ---------------------------------------------------------------------------
// discussion posts — fórum por aula (BRAIN §6.3). O registro plataforma.
// discussions em si é criado automaticamente por createLesson (courses.ts),
// não por uma action de usuário — o escopo de P-6.8 fala em "CRUD de
// discussões e posts" mas só posts têm autor/dono; a linha de discussion é
// infraestrutura 1:1 com a aula. Moderação (editar/remover post de
// terceiro) é só super_admin (suposição G1 registrada em SESSIONS.md de
// P-6.7) — RLS não tem policy de UPDATE/DELETE de post alheio nem para
// instrutor.
// ---------------------------------------------------------------------------

export const createDiscussionPost = plataformaAction
  .schema(createDiscussionPostSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const post = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [discussion] = await tx
          .select({ id: discussions.id })
          .from(discussions)
          .where(eq(discussions.lessonId, input.lessonId))
          .limit(1);
        if (!discussion)
          throw new Error("Discussão não encontrada para esta aula");

        const [row] = await tx
          .insert(discussionPosts)
          .values({
            discussionId: discussion.id,
            authorId: ctx.actorId,
            content: input.content,
            parentPostId: input.parentPostId,
          })
          .returning();
        if (!row) throw new Error("Falha ao publicar comentário");
        return row;
      },
    );

    // Notificação best-effort, fora da transação (P-6.10) — só quando é
    // resposta a outro post (notifyDiscussionReply ignora o resto).
    if (post.parentPostId) {
      await notifyDiscussionReply(post.id);
    }

    return { post };
  });

const updateDiscussionPostSchema = z.object({
  postId: z.string().uuid(),
  content: z
    .string()
    .min(1, "Comentário não pode ser vazio")
    .max(3000, "Comentário deve ter no máximo 3000 caracteres"),
});

export const updateDiscussionPost = plataformaAction
  .schema(updateDiscussionPostSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const post = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(discussionPosts)
          .set({ content: input.content, updatedAt: new Date() })
          .where(
            and(
              eq(discussionPosts.id, input.postId),
              eq(discussionPosts.authorId, ctx.actorId),
            ),
          )
          .returning();
        if (!row) {
          throw new Error("Comentário não encontrado ou você não é o autor");
        }
        return row;
      },
    );

    return { post };
  });

const deleteDiscussionPostSchema = z.object({ postId: z.string().uuid() });

export const deleteDiscussionPost = superAdminAction
  .schema(deleteDiscussionPostSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [row] = await tx
        .delete(discussionPosts)
        .where(eq(discussionPosts.id, input.postId))
        .returning({ id: discussionPosts.id });
      if (!row) throw new Error("Comentário não encontrado");
    });

    return { success: true };
  });

// ---------------------------------------------------------------------------
// notes — nota pessoal ancorada a um timestamp da aula. Sem createNoteSchema
// em @hebron/validators (packages/validators não está na lista de arquivos
// permitidos de P-6.8 — mesmo débito já registrado em note-form.tsx/
// note-widget.tsx, P-6.4); schema local até um prompt que edite validators
// consolidar isso no pacote compartilhado.
// ---------------------------------------------------------------------------

const createNoteSchema = z.object({
  lessonId: z.string().uuid(),
  timestampSeconds: z.number().int().min(0),
  content: z.string().min(1, "Escreva algo antes de salvar").max(2000),
});

export const createNote = plataformaAction
  .schema(createNoteSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const note = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(notes)
          .values({
            userId: ctx.actorId,
            lessonId: input.lessonId,
            timestampSeconds: input.timestampSeconds,
            content: input.content,
          })
          .returning();
        if (!row) throw new Error("Falha ao salvar nota");
        return row;
      },
    );

    return { note };
  });

const updateNoteSchema = z.object({
  noteId: z.string().uuid(),
  content: z.string().min(1, "Escreva algo antes de salvar").max(2000),
});

export const updateNote = plataformaAction
  .schema(updateNoteSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const note = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(notes)
          .set({ content: input.content })
          .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.actorId)))
          .returning();
        if (!row) throw new Error("Nota não encontrada");
        return row;
      },
    );

    return { note };
  });

const deleteNoteSchema = z.object({ noteId: z.string().uuid() });

export const deleteNote = plataformaAction
  .schema(deleteNoteSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [row] = await tx
        .delete(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.actorId)))
        .returning({ id: notes.id });
      if (!row) throw new Error("Nota não encontrada");
    });

    return { success: true };
  });
