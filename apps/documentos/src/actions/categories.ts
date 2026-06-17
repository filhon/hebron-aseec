"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@hebron/db/client";
import { categories, documents } from "@hebron/db/schema";
import { editorAction } from "../lib/safe-action";
import { logDocumentAudit } from "../lib/audit";

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

// ─── listCategories ───────────────────────────────────────────────────────────

export const listCategories = editorAction
  .schema(z.object({ parentId: z.string().uuid().nullable().optional() }))
  .action(async ({ parsedInput }) => {
    const all = await db.select().from(categories);

    // Filtra por parentId se fornecido
    if (parsedInput.parentId !== undefined) {
      const filtered = all.filter(
        (c) => c.parentId === (parsedInput.parentId ?? null),
      );
      return { categories: filtered };
    }

    return { categories: all };
  });

// ─── createCategory ───────────────────────────────────────────────────────────

export const createCategory = editorAction
  .schema(
    z.object({
      name: z.string().min(2).max(100),
      parentId: z.string().uuid().nullable().optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const baseSlug = slugify(parsedInput.name);
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    const [category] = await db
      .insert(categories)
      .values({
        name: parsedInput.name,
        slug,
        parentId: parsedInput.parentId ?? null,
      })
      .returning();

    if (!category) throw new Error("Falha ao criar categoria");

    await logDocumentAudit({
      actorId: ctx.actorId,
      action: "category.created",
      entity: "category",
      entityId: category.id,
      diff: { after: { name: category.name, parentId: category.parentId } },
    });

    return { category };
  });

// ─── updateCategory ───────────────────────────────────────────────────────────

export const updateCategory = editorAction
  .schema(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(2).max(100).optional(),
      parentId: z.string().uuid().nullable().optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { id, name, parentId } = parsedInput;

    const [before] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!before) throw new Error("Categoria não encontrada");

    // Previne ciclo: não deixa mover categoria para um de seus descendentes
    if (parentId !== undefined && parentId !== null) {
      const isDescendant = await checkIsDescendant(id, parentId);
      if (isDescendant) {
        throw new Error(
          "Não é possível mover uma categoria para um de seus descendentes",
        );
      }
    }

    const updateValues: Partial<typeof categories.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateValues.name = name;
    if (parentId !== undefined) updateValues.parentId = parentId ?? null;

    const [updated] = await db
      .update(categories)
      .set(updateValues)
      .where(eq(categories.id, id))
      .returning();

    if (!updated) throw new Error("Falha ao atualizar categoria");

    await logDocumentAudit({
      actorId: ctx.actorId,
      action: "category.updated",
      entity: "category",
      entityId: id,
      diff: {
        before: { name: before.name, parentId: before.parentId },
        after: { name: updated.name, parentId: updated.parentId },
      },
    });

    return { category: updated };
  });

// ─── deleteCategory ───────────────────────────────────────────────────────────
// Só remove se não houver documentos vinculados (não-deletados).
// Filhos passam a ter parentId = null (orphaned para root).

export const deleteCategory = editorAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, parsedInput.id))
      .limit(1);

    if (!category) throw new Error("Categoria não encontrada");

    // Verifica documentos ativos vinculados
    const [docRow] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.categoryId, parsedInput.id),
          isNull(documents.deletedAt),
        ),
      )
      .limit(1);

    if (docRow) {
      throw new Error(
        "Não é possível remover categoria com documentos ativos. Mova ou remova os documentos primeiro.",
      );
    }

    // Filhos são reparentados para a raiz
    await db
      .update(categories)
      .set({ parentId: null, updatedAt: new Date() })
      .where(eq(categories.parentId, parsedInput.id));

    await db.delete(categories).where(eq(categories.id, parsedInput.id));

    await logDocumentAudit({
      actorId: ctx.actorId,
      action: "category.deleted",
      entity: "category",
      entityId: parsedInput.id,
      diff: { deleted: { name: category.name, parentId: category.parentId } },
    });

    return { deleted: true };
  });

// ─── moveCategoryInTree ───────────────────────────────────────────────────────
// Reordena / move uma categoria na árvore trocando seu parentId.

export const moveCategoryInTree = editorAction
  .schema(
    z.object({
      id: z.string().uuid(),
      newParentId: z.string().uuid().nullable(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { id, newParentId } = parsedInput;

    if (newParentId !== null) {
      const isDescendant = await checkIsDescendant(id, newParentId);
      if (isDescendant) {
        throw new Error(
          "Destino inválido: categoria não pode ser movida para um de seus descendentes",
        );
      }
    }

    const [updated] = await db
      .update(categories)
      .set({ parentId: newParentId, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    if (!updated) throw new Error("Categoria não encontrada");

    await logDocumentAudit({
      actorId: ctx.actorId,
      action: "category.updated",
      entity: "category",
      entityId: id,
      diff: { parentId: { before: updated.parentId, after: newParentId } },
    });

    return { category: updated };
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function checkIsDescendant(
  ancestorId: string,
  candidateId: string,
): Promise<boolean> {
  const all = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories);

  const visited = new Set<string>();
  let current: string | null = candidateId;

  while (current !== null && !visited.has(current)) {
    if (current === ancestorId) return true;
    visited.add(current);
    const row = all.find((c) => c.id === current);
    current = row?.parentId ?? null;
  }

  return false;
}
