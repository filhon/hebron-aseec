"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  featureFlags,
  systemSettings,
  taskTemplates,
  templateItems,
} from "@hebron/db/schema";
import { PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY } from "@hebron/db/seed";
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
    const { before, updated } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const beforeRows = await tx
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

        const updatedRows = await tx
          .update(featureFlags)
          .set(patch)
          .where(eq(featureFlags.key, parsedInput.key))
          .returning();

        const updated = updatedRows[0];
        if (!updated) throw new Error("Falha ao atualizar feature flag");

        return { before, updated };
      },
    );

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
    const { before, updated } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const beforeRows = await tx
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, parsedInput.key));

        const before = beforeRows[0];
        if (!before)
          throw new Error(`Configuração "${parsedInput.key}" não encontrada`);

        const updatedRows = await tx
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

        return { before, updated };
      },
    );

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

// ─── setProjetosChecklistTemplate ─────────────────────────────────────────────
//
// Aponta admin.system_settings["projetos_analysis_checklist_template"]
// (lido por onProjectSubmitted, packages/integrations/src/projetos-tarefas.ts,
// para criar o checklist de análise ao submeter um projeto) para outro
// tarefas.task_templates — sem editar o banco manualmente (PATCH-019). A
// linha em si nasce via seed idempotente
// (packages/db/src/seed.ts::seedProjetosChecklistTemplate); esta action só
// troca o valor, nunca cria a chave do zero.

export const setProjetosChecklistTemplate = adminAction
  .schema(z.object({ templateId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { before, updated, template } = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [template] = await tx
          .select()
          .from(taskTemplates)
          .where(eq(taskTemplates.id, parsedInput.templateId))
          .limit(1);
        if (!template) throw new Error("Template não encontrado");
        if (!template.isActive) {
          throw new Error(
            `Template "${template.name}" está inativo — ative-o antes de associá-lo a Projetos`,
          );
        }

        const items = await tx
          .select({ id: templateItems.id })
          .from(templateItems)
          .where(eq(templateItems.taskTemplateId, template.id))
          .limit(1);
        if (items.length === 0) {
          throw new Error(
            `Template "${template.name}" não possui tarefas definidas`,
          );
        }

        const beforeRows = await tx
          .select()
          .from(systemSettings)
          .where(
            eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY),
          );

        const before = beforeRows[0];
        if (!before) {
          throw new Error(
            `Configuração "${PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY}" não encontrada — rode "pnpm db:seed" antes de trocar o template`,
          );
        }

        const updatedRows = await tx
          .update(systemSettings)
          .set({
            value: template.id,
            updatedBy: ctx.actorId,
            updatedAt: new Date(),
          })
          .where(
            eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY),
          )
          .returning();

        const updated = updatedRows[0];
        if (!updated) throw new Error("Falha ao atualizar configuração");

        return { before, updated, template };
      },
    );

    await logAudit({
      actorId: ctx.actorId,
      action: "setting.updated",
      entity: "system_setting",
      entityId: updated.id,
      diff: {
        value: { before: before.value, after: updated.value },
      },
    });

    return { setting: updated, template };
  });
