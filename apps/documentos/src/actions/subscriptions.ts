"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { categories, subscriptions } from "@hebron/db/schema";
import { authenticatedAction } from "../lib/safe-action";

// ─── subscribe ────────────────────────────────────────────────────────────────

export const subscribe = authenticatedAction
  .schema(z.object({ categoryId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const subscription = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [category] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, parsedInput.categoryId))
          .limit(1);

        if (!category) throw new Error("Categoria não encontrada");

        const [existing] = await tx
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, ctx.actorId),
              eq(subscriptions.categoryId, parsedInput.categoryId),
            ),
          )
          .limit(1);

        if (existing) throw new Error("Já inscrito nesta categoria");

        const [subscription] = await tx
          .insert(subscriptions)
          .values({
            userId: ctx.actorId,
            categoryId: parsedInput.categoryId,
          })
          .returning();

        if (!subscription) throw new Error("Falha ao criar inscrição");
        return subscription;
      },
    );

    return { subscription };
  });

// ─── unsubscribe ──────────────────────────────────────────────────────────────

export const unsubscribe = authenticatedAction
  .schema(z.object({ categoryId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const deleted = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .delete(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, ctx.actorId),
              eq(subscriptions.categoryId, parsedInput.categoryId),
            ),
          )
          .returning(),
    );

    if (!deleted.length) throw new Error("Inscrição não encontrada");

    return { unsubscribed: true };
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
