"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { featureFlags, systemSettings } from "@hebron/db/schema";
import { adminAction } from "../lib/safe-action";
import { logAudit, computeDiff } from "../lib/audit";

// ─── toggleFeatureFlag ────────────────────────────────────────────────────────

export const toggleFeatureFlag = adminAction
  .schema(
    z.object({
      key: z.string().min(1),
      enabled: z.boolean(),
      rolloutPercent: z.number().int().min(0).max(100).optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const beforeRows = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, parsedInput.key));

    const before = beforeRows[0];
    if (!before)
      throw new Error(`Feature flag "${parsedInput.key}" não encontrada`);

    const patch: Partial<typeof featureFlags.$inferInsert> = {
      enabled: parsedInput.enabled,
      updatedBy: ctx.actorId,
      updatedAt: new Date(),
    };

    if (parsedInput.rolloutPercent !== undefined) {
      patch.rolloutPercent = parsedInput.rolloutPercent;
    }

    const updatedRows = await db
      .update(featureFlags)
      .set(patch)
      .where(eq(featureFlags.key, parsedInput.key))
      .returning();

    const updated = updatedRows[0];
    if (!updated) throw new Error("Falha ao atualizar feature flag");

    await logAudit({
      actorId: ctx.actorId,
      action: "feature_flag.toggled",
      entity: "feature_flag",
      entityId: updated.id,
      diff: computeDiff(
        before as Record<string, unknown>,
        updated as Record<string, unknown>,
      ),
    });

    return { flag: updated };
  });

// ─── updateSystemSetting ──────────────────────────────────────────────────────

export const updateSystemSetting = adminAction
  .schema(
    z.object({
      key: z.string().min(1),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.record(z.unknown()),
        z.array(z.unknown()),
      ]),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const beforeRows = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, parsedInput.key));

    const before = beforeRows[0];
    if (!before)
      throw new Error(`Configuração "${parsedInput.key}" não encontrada`);

    const updatedRows = await db
      .update(systemSettings)
      .set({
        value: parsedInput.value,
        updatedBy: ctx.actorId,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.key, parsedInput.key))
      .returning();

    const updated = updatedRows[0];
    if (!updated) throw new Error("Falha ao atualizar configuração");

    await logAudit({
      actorId: ctx.actorId,
      action: "setting.updated",
      entity: "system_setting",
      entityId: updated.id,
      diff: {
        value: { before: before.value, after: updated.value },
      },
    });

    return { setting: updated };
  });
