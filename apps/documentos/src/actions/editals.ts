"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@hebron/db/client";
import { documents, editals } from "@hebron/db/schema";
import { adminDocAction } from "../lib/safe-action";
import { logDocumentAudit } from "../lib/audit";

const visibilityEnum = z.enum(["public", "internal", "restricted"]);

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

// ─── createEdital ─────────────────────────────────────────────────────────────
// Cria o documento base + registro no editals em transação.

export const createEdital = adminDocAction
  .schema(
    z
      .object({
        title: z.string().min(3).max(200),
        contentMd: z.string().optional(),
        storagePath: z.string().optional(),
        visibility: visibilityEnum.default("public"),
        categoryId: z.string().uuid().optional(),
        cycleType: z.enum(["pontual", "anual"]),
        opensAt: z
          .string()
          .datetime({ message: "Data de abertura inválida" })
          .nullable()
          .optional(),
        closesAt: z
          .string()
          .datetime({ message: "Data de fechamento inválida" })
          .nullable()
          .optional(),
        projectType: z.string().max(100).nullable().optional(),
        projectCategoryId: z.string().uuid().nullable().optional(),
      })
      .superRefine(async (data, ctx) => {
        if (data.cycleType === "anual") {
          if (!data.opensAt) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["opensAt"],
              message: "Data de abertura obrigatória para editais anuais",
            });
          }
          if (!data.closesAt) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["closesAt"],
              message: "Data de fechamento obrigatória para editais anuais",
            });
          }
          if (data.opensAt && data.closesAt && data.opensAt >= data.closesAt) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["closesAt"],
              message:
                "Data de fechamento deve ser posterior à data de abertura",
            });
          }
        }
      }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const slug = `${slugify(parsedInput.title)}-${crypto.randomUUID().slice(0, 8)}`;

    // Transação: insere documento base e edital em conjunto
    const result = await db.transaction(async (tx) => {
      const [document] = await tx
        .insert(documents)
        .values({
          title: parsedInput.title,
          slug,
          contentMd: parsedInput.contentMd ?? null,
          fileUrl: parsedInput.storagePath ?? null,
          visibility: parsedInput.visibility,
          categoryId: parsedInput.categoryId ?? null,
          authorId: ctx.actorId,
        })
        .returning();

      if (!document) throw new Error("Falha ao criar documento do edital");

      const [edital] = await tx
        .insert(editals)
        .values({
          id: document.id,
          opensAt: parsedInput.opensAt ? new Date(parsedInput.opensAt) : null,
          closesAt: parsedInput.closesAt
            ? new Date(parsedInput.closesAt)
            : null,
          projectType: parsedInput.projectType ?? null,
          projectCategoryId: parsedInput.projectCategoryId ?? null,
        })
        .returning();

      if (!edital) throw new Error("Falha ao criar edital");

      return { document, edital };
    });

    await logDocumentAudit({
      actorId: ctx.actorId,
      action: "edital.created",
      entity: "edital",
      entityId: result.document.id,
      diff: {
        after: {
          title: result.document.title,
          opensAt: result.edital.opensAt,
          closesAt: result.edital.closesAt,
          projectType: result.edital.projectType,
        },
      },
    });

    return result;
  });

// ─── updateEdital ─────────────────────────────────────────────────────────────

export const updateEdital = adminDocAction
  .schema(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(3).max(200).optional(),
      contentMd: z.string().optional(),
      storagePath: z.string().optional(),
      visibility: visibilityEnum.optional(),
      categoryId: z.string().uuid().nullable().optional(),
      opensAt: z.string().datetime().nullable().optional(),
      closesAt: z.string().datetime().nullable().optional(),
      projectType: z.string().max(100).nullable().optional(),
      projectCategoryId: z.string().uuid().nullable().optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const {
      id,
      opensAt,
      closesAt,
      projectType,
      projectCategoryId,
      ...docFields
    } = parsedInput;

    const [existingDoc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), isNull(documents.deletedAt)))
      .limit(1);

    if (!existingDoc) throw new Error("Edital não encontrado");

    const result = await db.transaction(async (tx) => {
      const docUpdate: Partial<typeof documents.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (docFields.title !== undefined) docUpdate.title = docFields.title;
      if (docFields.contentMd !== undefined)
        docUpdate.contentMd = docFields.contentMd;
      if (docFields.storagePath !== undefined)
        docUpdate.fileUrl = docFields.storagePath;
      if (docFields.visibility !== undefined)
        docUpdate.visibility = docFields.visibility;
      if ("categoryId" in docFields)
        docUpdate.categoryId = docFields.categoryId ?? null;

      const [updatedDoc] = await tx
        .update(documents)
        .set(docUpdate)
        .where(eq(documents.id, id))
        .returning();

      const editalUpdate: Partial<typeof editals.$inferInsert> = {};
      if (opensAt !== undefined)
        editalUpdate.opensAt = opensAt ? new Date(opensAt) : null;
      if (closesAt !== undefined)
        editalUpdate.closesAt = closesAt ? new Date(closesAt) : null;
      if (projectType !== undefined)
        editalUpdate.projectType = projectType ?? null;
      if (projectCategoryId !== undefined)
        editalUpdate.projectCategoryId = projectCategoryId ?? null;

      const [updatedEdital] = await tx
        .update(editals)
        .set(editalUpdate)
        .where(eq(editals.id, id))
        .returning();

      return { document: updatedDoc, edital: updatedEdital };
    });

    await logDocumentAudit({
      actorId: ctx.actorId,
      action: "edital.updated",
      entity: "edital",
      entityId: id,
      diff: {
        before: { title: existingDoc.title },
        after: { title: result.document?.title, opensAt, closesAt },
      },
    });

    return result;
  });

// ─── deleteEdital ─────────────────────────────────────────────────────────────
// Soft delete no documento pai — o edital é removido em cascata via FK (mas
// como o documento só faz soft delete via deleted_at, o edital permanece na DB).

export const deleteEdital = adminDocAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const [doc] = await db
      .select({ deletedAt: documents.deletedAt, title: documents.title })
      .from(documents)
      .where(eq(documents.id, parsedInput.id))
      .limit(1);

    if (!doc) throw new Error("Edital não encontrado");
    if (doc.deletedAt) throw new Error("Edital já foi removido");

    const now = new Date();
    const [updated] = await db
      .update(documents)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(documents.id, parsedInput.id))
      .returning();

    await logDocumentAudit({
      actorId: ctx.actorId,
      action: "document.deleted",
      entity: "edital",
      entityId: parsedInput.id,
      diff: { deletedAt: { before: null, after: now }, title: doc.title },
    });

    return { document: updated };
  });

// ─── listEditals ──────────────────────────────────────────────────────────────

export const listEditals = adminDocAction
  .schema(
    z.object({
      includeDeleted: z.boolean().default(false),
    }),
  )
  .action(async ({ parsedInput }) => {
    const rows = await db
      .select({
        document: documents,
        edital: editals,
      })
      .from(editals)
      .innerJoin(documents, eq(editals.id, documents.id))
      .where(
        parsedInput.includeDeleted ? undefined : isNull(documents.deletedAt),
      );

    return { editals: rows };
  });
