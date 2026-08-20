"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import { categories, documents } from "@hebron/db/schema";
import { editorAction } from "../lib/safe-action";
import { logDocumentAudit } from "../lib/audit";

type DbExecutor = Pick<
  AuthenticatedTx,
  "select" | "insert" | "update" | "delete"
>;

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
  .action(async ({ parsedInput, ctx }) => {
    const all = await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
      tx.select().from(categories),
    );

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

    const category = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [category] = await tx
          .insert(categories)
          .values({
            name: parsedInput.name,
            slug,
            parentId: parsedInput.parentId ?? null,
          })
          .returning();

        if (!category) throw new BusinessError("Falha ao criar categoria");

        await withSystemRole(tx, (sysTx) =>
          logDocumentAudit(
            {
              actorId: ctx.actorId,
              action: "category.created",
              entity: "category",
              entityId: category.id,
              diff: {
                after: { name: category.name, parentId: category.parentId },
              },
            },
            sysTx,
          ),
        );

        return category;
      },
    );

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

    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [before] = await tx
          .select()
          .from(categories)
          .where(eq(categories.id, id))
          .limit(1);

        if (!before) throw new BusinessError("Categoria não encontrada");

        // Previne ciclo: não deixa mover categoria para um de seus descendentes
        if (parentId !== undefined && parentId !== null) {
          const isDescendant = await checkIsDescendant(tx, id, parentId);
          if (isDescendant) {
            throw new BusinessError(
              "Não é possível mover uma categoria para um de seus descendentes",
            );
          }
        }

        const updateValues: Partial<typeof categories.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (name !== undefined) updateValues.name = name;
        if (parentId !== undefined) updateValues.parentId = parentId ?? null;

        const [updated] = await tx
          .update(categories)
          .set(updateValues)
          .where(eq(categories.id, id))
          .returning();

        if (!updated) throw new BusinessError("Falha ao atualizar categoria");

        await withSystemRole(tx, (sysTx) =>
          logDocumentAudit(
            {
              actorId: ctx.actorId,
              action: "category.updated",
              entity: "category",
              entityId: id,
              diff: {
                before: { name: before.name, parentId: before.parentId },
                after: { name: updated.name, parentId: updated.parentId },
              },
            },
            sysTx,
          ),
        );

        return updated;
      },
    );

    return { category: updated };
  });

// ─── deleteCategory ───────────────────────────────────────────────────────────
// Só remove se não houver documentos vinculados (não-deletados).
// Filhos passam a ter parentId = null (orphaned para root).

export const deleteCategory = editorAction
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [category] = await tx
        .select()
        .from(categories)
        .where(eq(categories.id, parsedInput.id))
        .limit(1);

      if (!category) throw new BusinessError("Categoria não encontrada");

      // Verifica documentos ativos vinculados
      const [docRow] = await tx
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
        throw new BusinessError(
          "Não é possível remover categoria com documentos ativos. Mova ou remova os documentos primeiro.",
        );
      }

      // Filhos são reparentados para a raiz
      await tx
        .update(categories)
        .set({ parentId: null, updatedAt: new Date() })
        .where(eq(categories.parentId, parsedInput.id));

      await tx.delete(categories).where(eq(categories.id, parsedInput.id));

      await withSystemRole(tx, (sysTx) =>
        logDocumentAudit(
          {
            actorId: ctx.actorId,
            action: "category.deleted",
            entity: "category",
            entityId: parsedInput.id,
            diff: {
              deleted: { name: category.name, parentId: category.parentId },
            },
          },
          sysTx,
        ),
      );
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

    const updated = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        if (newParentId !== null) {
          const isDescendant = await checkIsDescendant(tx, id, newParentId);
          if (isDescendant) {
            throw new BusinessError(
              "Destino inválido: categoria não pode ser movida para um de seus descendentes",
            );
          }
        }

        const [updated] = await tx
          .update(categories)
          .set({ parentId: newParentId, updatedAt: new Date() })
          .where(eq(categories.id, id))
          .returning();

        if (!updated) throw new BusinessError("Categoria não encontrada");

        await withSystemRole(tx, (sysTx) =>
          logDocumentAudit(
            {
              actorId: ctx.actorId,
              action: "category.updated",
              entity: "category",
              entityId: id,
              diff: {
                parentId: { before: updated.parentId, after: newParentId },
              },
            },
            sysTx,
          ),
        );

        return updated;
      },
    );

    return { category: updated };
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function checkIsDescendant(
  executor: DbExecutor,
  ancestorId: string,
  candidateId: string,
): Promise<boolean> {
  const all = await executor
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
