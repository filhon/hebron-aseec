"use server";

import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { categories, subscriptions } from "@hebron/db/schema";
import { authenticatedAction } from "../lib/safe-action";
import { BusinessError } from "@hebron/auth/safe-action-error";

// ─── saveSubscriptions ──────────────────────────────────────────────────────
// Upsert por (user_id, category_id): categorias com os dois toggles desligados
// perdem a linha (nenhuma inscrição órfã); as demais gravam onNewVersion /
// onEditalOpen como enviados. Substitui o par subscribe/unsubscribe — a UI
// não faz mais diff entre estado anterior/novo, só envia o estado desejado.

const subscriptionItemSchema = z.object({
  categoryId: z.string().uuid(),
  onNewVersion: z.boolean(),
  onEditalOpen: z.boolean(),
});

export const saveSubscriptions = authenticatedAction
  .schema(z.object({ items: z.array(subscriptionItemSchema) }))
  .action(async ({ parsedInput, ctx }) => {
    const saved = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const categoryIds = parsedInput.items.map((item) => item.categoryId);
        if (categoryIds.length > 0) {
          const existing = await tx
            .select({ id: categories.id })
            .from(categories)
            .where(inArray(categories.id, categoryIds));
          const existingIds = new Set(existing.map((c) => c.id));
          if (categoryIds.some((id) => !existingIds.has(id))) {
            throw new BusinessError("Categoria não encontrada");
          }
        }

        const results = [];
        for (const item of parsedInput.items) {
          if (!item.onNewVersion && !item.onEditalOpen) {
            await tx
              .delete(subscriptions)
              .where(
                and(
                  eq(subscriptions.userId, ctx.actorId),
                  eq(subscriptions.categoryId, item.categoryId),
                ),
              );
            continue;
          }

          const [row] = await tx
            .insert(subscriptions)
            .values({
              userId: ctx.actorId,
              categoryId: item.categoryId,
              onNewVersion: item.onNewVersion,
              onEditalOpen: item.onEditalOpen,
            })
            .onConflictDoUpdate({
              target: [subscriptions.userId, subscriptions.categoryId],
              set: {
                onNewVersion: item.onNewVersion,
                onEditalOpen: item.onEditalOpen,
              },
            })
            .returning();

          if (!row) throw new BusinessError("Falha ao salvar inscrição");
          results.push(row);
        }

        return results;
      },
    );

    return { subscriptions: saved };
  });

// ─── listSubscriptions ────────────────────────────────────────────────────────

export const listSubscriptions = authenticatedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const rows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select({
            subscription: subscriptions,
            category: categories,
          })
          .from(subscriptions)
          .innerJoin(categories, eq(subscriptions.categoryId, categories.id))
          .where(eq(subscriptions.userId, ctx.actorId)),
    );

    return { subscriptions: rows };
  });

// ─── getSubscriptionStatus ────────────────────────────────────────────────────

export const getSubscriptionStatus = authenticatedAction
  .schema(z.object({ categoryId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const row = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, ctx.actorId),
              eq(subscriptions.categoryId, parsedInput.categoryId),
            ),
          )
          .limit(1);
        return row;
      },
    );

    return { subscribed: !!row };
  });
