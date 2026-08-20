"use server";

import { z } from "zod";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import {
  auditLog,
  documents,
  documentTags,
  documentVersions,
  editals,
  views,
} from "@hebron/db/schema";
import { editorAction, authenticatedAction } from "../lib/safe-action";
import { logDocumentAudit } from "../lib/audit";
import {
  notifyNewDocument,
  notifyEditalOpen,
  notifyVersionUpdate,
} from "../lib/notifications";

const visibilityEnum = z.enum(["public", "internal", "restricted"]);
const documentTypeEnum = z.enum([
  "edital",
  "legal",
  "fiscal",
  "sop",
  "cargo_description",
  "policy",
  "report",
  "other",
]);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new BusinessError("Variáveis Supabase não configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── getUploadUrl ─────────────────────────────────────────────────────────────
// Gera URL de upload assinada para que o cliente faça o PUT direto ao Storage.

export const getUploadUrl = editorAction
  .schema(
    z.object({
      fileName: z.string().min(1).max(255),
      mimeType: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const supabase = getSupabaseAdmin();
    const ext = parsedInput.fileName.split(".").pop() ?? "pdf";
    const path = `documents/${ctx.actorId}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("hebron-docs")
      .createSignedUploadUrl(path);

    if (error)
      throw new BusinessError(`Falha ao gerar URL de upload: ${error.message}`);

    return { uploadUrl: data.signedUrl, storagePath: path };
  });

// ─── createDocument ───────────────────────────────────────────────────────────

export const createDocument = editorAction
  .schema(
    z.object({
      title: z.string().min(3).max(200),
      contentMd: z.string().optional(),
      storagePath: z.string().optional(),
      fileSizeBytes: z.number().int().nonnegative().optional(),
      mimeType: z.string().optional(),
      visibility: visibilityEnum.default("internal"),
      type: documentTypeEnum.default("other"),
      categoryId: z.string().uuid().optional(),
      tagIds: z.array(z.string().uuid()).optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const baseSlug = slugify(parsedInput.title);
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    const document = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [document] = await tx
          .insert(documents)
          .values({
            title: parsedInput.title,
            slug,
            contentMd: parsedInput.contentMd ?? null,
            fileUrl: parsedInput.storagePath ?? null,
            visibility: parsedInput.visibility,
            type: parsedInput.type,
            categoryId: parsedInput.categoryId ?? null,
            authorId: ctx.actorId,
          })
          .returning();

        if (!document) throw new BusinessError("Falha ao criar documento");

        await tx.insert(documentVersions).values({
          documentId: document.id,
          contentMd: parsedInput.contentMd ?? null,
          fileUrl: parsedInput.storagePath ?? null,
          fileSizeBytes: parsedInput.fileSizeBytes ?? null,
          mimeType: parsedInput.mimeType ?? null,
          versionNumber: 1,
          createdBy: ctx.actorId,
        });

        if (parsedInput.tagIds?.length) {
          await tx.insert(documentTags).values(
            parsedInput.tagIds.map((tagId) => ({
              documentId: document.id,
              tagId,
            })),
          );
        }

        await withSystemRole(tx, (sysTx) =>
          logDocumentAudit(
            {
              actorId: ctx.actorId,
              action: "document.created",
              entity: "document",
              entityId: document.id,
              diff: {
                after: {
                  title: document.title,
                  visibility: document.visibility,
                },
              },
            },
            sysTx,
          ),
        );

        return document;
      },
    );

    return { document };
  });

// ─── updateDocument ───────────────────────────────────────────────────────────
// Cada edição cria uma nova versão automaticamente.

export const updateDocument = editorAction
  .schema(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(3).max(200).optional(),
      contentMd: z.string().optional(),
      storagePath: z.string().optional(),
      fileSizeBytes: z.number().int().nonnegative().optional(),
      mimeType: z.string().optional(),
      visibility: visibilityEnum.optional(),
      type: documentTypeEnum.optional(),
      categoryId: z.string().uuid().nullable().optional(),
      tagIds: z.array(z.string().uuid()).optional(),
      notes: z.string().max(2000).optional(),
      notifySubscribers: z.boolean().optional().default(false),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { id, tagIds, notes, notifySubscribers, ...fields } = parsedInput;

    const { updated, nextVersion, wasPublished } =
      await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
        const [before] = await tx
          .select()
          .from(documents)
          .where(and(eq(documents.id, id), isNull(documents.deletedAt)))
          .limit(1);

        if (!before) throw new BusinessError("Documento não encontrado");

        const updateValues: Partial<typeof documents.$inferInsert> = {};
        if (fields.title !== undefined) updateValues.title = fields.title;
        if (fields.contentMd !== undefined)
          updateValues.contentMd = fields.contentMd;
        if (fields.storagePath !== undefined)
          updateValues.fileUrl = fields.storagePath;
        if (fields.visibility !== undefined)
          updateValues.visibility = fields.visibility;
        if (fields.type !== undefined) updateValues.type = fields.type;
        if ("categoryId" in fields)
          updateValues.categoryId = fields.categoryId ?? null;

        const [updated] = await tx
          .update(documents)
          .set({ ...updateValues, updatedAt: new Date() })
          .where(eq(documents.id, id))
          .returning();

        if (!updated) throw new BusinessError("Falha ao atualizar documento");

        // Última versão — usada para next version number e para herdar
        // fileSizeBytes/mimeType quando a edição não troca o arquivo.
        const [latestVersion] = await tx
          .select()
          .from(documentVersions)
          .where(eq(documentVersions.documentId, id))
          .orderBy(desc(documentVersions.versionNumber))
          .limit(1);

        const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

        await tx.insert(documentVersions).values({
          documentId: id,
          contentMd: fields.contentMd ?? before.contentMd,
          fileUrl: fields.storagePath ?? before.fileUrl,
          fileSizeBytes:
            fields.fileSizeBytes ?? latestVersion?.fileSizeBytes ?? null,
          mimeType: fields.mimeType ?? latestVersion?.mimeType ?? null,
          notes: notes ?? null,
          versionNumber: nextVersion,
          createdBy: ctx.actorId,
        });

        // Atualiza tags se fornecidas
        if (tagIds !== undefined) {
          await tx.delete(documentTags).where(eq(documentTags.documentId, id));
          if (tagIds.length > 0) {
            await tx
              .insert(documentTags)
              .values(tagIds.map((tagId) => ({ documentId: id, tagId })));
          }
        }

        await withSystemRole(tx, (sysTx) =>
          logDocumentAudit(
            {
              actorId: ctx.actorId,
              action: "document.updated",
              entity: "document",
              entityId: id,
              diff: {
                before: {
                  title: before.title,
                  visibility: before.visibility,
                  type: before.type,
                },
                after: {
                  title: updated.title,
                  visibility: updated.visibility,
                  type: updated.type,
                },
                version: nextVersion,
              },
            },
            sysTx,
          ),
        );

        return { updated, nextVersion, wasPublished: !!before.publishedAt };
      });

    if (wasPublished && notifySubscribers) {
      await notifyVersionUpdate(id, nextVersion, notes ?? null);
    }

    return { document: updated, version: nextVersion };
  });

// ─── publishDocument ──────────────────────────────────────────────────────────

export const publishDocument = editorAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { updated, isEdital, alreadyNotifiedBefore } =
      await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
        const [before] = await tx
          .select({ publishedAt: documents.publishedAt })
          .from(documents)
          .where(
            and(eq(documents.id, parsedInput.id), isNull(documents.deletedAt)),
          )
          .limit(1);

        if (!before) throw new BusinessError("Documento não encontrado");
        if (before.publishedAt)
          throw new BusinessError("Documento já está publicado");

        // Republicar (despublicar + publicar de novo) não é primeira
        // publicação: `published_at` volta a NULL ao despublicar, então o
        // sinal disponível sem migration é a existência de um audit anterior
        // de "document.published" para este id (P-1.22b).
        const alreadyNotifiedBefore = await withSystemRole(
          tx,
          async (sysTx) => {
            const [existing] = await sysTx
              .select({ id: auditLog.id })
              .from(auditLog)
              .where(
                and(
                  eq(auditLog.entity, "document"),
                  eq(auditLog.entityId, parsedInput.id),
                  eq(auditLog.action, "document.published"),
                ),
              )
              .limit(1);
            return !!existing;
          },
        );

        const now = new Date();
        const [updated] = await tx
          .update(documents)
          .set({ publishedAt: now, updatedAt: now })
          .where(eq(documents.id, parsedInput.id))
          .returning();

        if (!updated) throw new BusinessError("Falha ao publicar documento");

        await withSystemRole(tx, (sysTx) =>
          logDocumentAudit(
            {
              actorId: ctx.actorId,
              action: "document.published",
              entity: "document",
              entityId: parsedInput.id,
              diff: { publishedAt: { before: null, after: now } },
            },
            sysTx,
          ),
        );

        const [editalRow] = await tx
          .select({ id: editals.id })
          .from(editals)
          .where(eq(editals.id, parsedInput.id))
          .limit(1);

        return { updated, isEdital: !!editalRow, alreadyNotifiedBefore };
      });

    // Notificação por email: fan-out para todos os inscritos/submissores,
    // não escopado pelo papel/escopo do ator — mesmo padrão de exceção
    // service-level de lib/notifications.ts (ver decisão em SESSIONS.md).
    // Só dispara na primeira publicação — republicar (P-1.22b) não repete o
    // "novo documento"/"edital aberto".
    if (!alreadyNotifiedBefore) {
      if (isEdital) {
        await notifyEditalOpen(parsedInput.id);
      } else {
        await notifyNewDocument(parsedInput.id);
      }
    }

    return { document: updated };
  });

// ─── unpublishDocument ────────────────────────────────────────────────────────

export const unpublishDocument = editorAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [before] = await tx
          .select({ publishedAt: documents.publishedAt })
          .from(documents)
          .where(
            and(eq(documents.id, parsedInput.id), isNull(documents.deletedAt)),
          )
          .limit(1);

        if (!before) throw new BusinessError("Documento não encontrado");
        if (!before.publishedAt)
          throw new BusinessError("Documento não está publicado");

        const [updated] = await tx
          .update(documents)
          .set({ publishedAt: null, updatedAt: new Date() })
          .where(eq(documents.id, parsedInput.id))
          .returning();

        if (!updated) throw new BusinessError("Falha ao despublicar documento");

        await withSystemRole(tx, (sysTx) =>
          logDocumentAudit(
            {
              actorId: ctx.actorId,
              action: "document.unpublished",
              entity: "document",
              entityId: parsedInput.id,
              diff: {
                publishedAt: { before: before.publishedAt, after: null },
              },
            },
            sysTx,
          ),
        );

        return updated;
      },
    );

    return { document: updated };
  });

// ─── deleteDocument ───────────────────────────────────────────────────────────
// Soft delete: define deleted_at, não remove registros.

export const deleteDocument = editorAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [before] = await tx
          .select()
          .from(documents)
          .where(eq(documents.id, parsedInput.id))
          .limit(1);

        if (!before) throw new BusinessError("Documento não encontrado");
        if (before.deletedAt)
          throw new BusinessError("Documento já foi removido");

        const now = new Date();
        const [updated] = await tx
          .update(documents)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(documents.id, parsedInput.id))
          .returning();

        if (!updated) throw new BusinessError("Falha ao remover documento");

        await withSystemRole(tx, (sysTx) =>
          logDocumentAudit(
            {
              actorId: ctx.actorId,
              action: "document.deleted",
              entity: "document",
              entityId: parsedInput.id,
              diff: {
                deletedAt: { before: null, after: now },
                title: before.title,
              },
            },
            sysTx,
          ),
        );

        return updated;
      },
    );

    return { document: updated };
  });

// ─── restoreDocument ──────────────────────────────────────────────────────────
// Reverte o soft delete: deleted_at = NULL. Sem hard delete — imutabilidade.

export const restoreDocument = editorAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [before] = await tx
          .select()
          .from(documents)
          .where(eq(documents.id, parsedInput.id))
          .limit(1);

        if (!before) throw new BusinessError("Documento não encontrado");
        if (!before.deletedAt)
          throw new BusinessError("Documento não está na lixeira");

        const now = new Date();
        const [updated] = await tx
          .update(documents)
          .set({ deletedAt: null, updatedAt: now })
          .where(eq(documents.id, parsedInput.id))
          .returning();

        if (!updated) throw new BusinessError("Falha ao restaurar documento");

        await withSystemRole(tx, (sysTx) =>
          logDocumentAudit(
            {
              actorId: ctx.actorId,
              action: "document.updated",
              entity: "document",
              entityId: parsedInput.id,
              diff: {
                deletedAt: { before: before.deletedAt, after: null },
                title: before.title,
              },
            },
            sysTx,
          ),
        );

        return updated;
      },
    );

    return { document: updated };
  });

// ─── registerView ─────────────────────────────────────────────────────────────
// Só conta leituras autenticadas: a policy views_insert_authenticated exige
// auth.uid(), então anônimo nunca grava aqui (P-1.20c, item 3 — mantém o KPI
// só na fração LGPD-compatível sem trabalho novo de consentimento).

const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export const registerView = authenticatedAction
  .schema(z.object({ documentId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      // Verifica se o documento existe e está visível
      const [doc] = await tx
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.id, parsedInput.documentId),
            isNull(documents.deletedAt),
            sql`${documents.publishedAt} IS NOT NULL`,
          ),
        )
        .limit(1);

      if (!doc) throw new BusinessError("Documento não encontrado");

      // Dedupe: mesmo usuário + mesmo documento dentro da janela não grava
      // segunda linha (um F5 não pode virar métrica).
      const dedupeSince = new Date(Date.now() - VIEW_DEDUPE_WINDOW_MS);
      const [recent] = await tx
        .select({ id: views.id })
        .from(views)
        .where(
          and(
            eq(views.documentId, parsedInput.documentId),
            eq(views.userId, ctx.actorId),
            gte(views.viewedAt, dedupeSince),
          ),
        )
        .limit(1);

      if (recent) return;

      await tx.insert(views).values({
        documentId: parsedInput.documentId,
        userId: ctx.actorId,
      });
    });

    return { recorded: true };
  });

// ─── listDocumentVersions ─────────────────────────────────────────────────────

export const listDocumentVersions = editorAction
  .schema(z.object({ documentId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const versions = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select()
          .from(documentVersions)
          .where(eq(documentVersions.documentId, parsedInput.documentId))
          .orderBy(desc(documentVersions.versionNumber)),
    );

    return { versions };
  });
