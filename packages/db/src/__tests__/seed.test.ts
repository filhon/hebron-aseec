/**
 * seed.test.ts — seedProjetosChecklistTemplate (PATCH-019 / débito S-83)
 *
 * Sem mock: roda contra o banco real. Cobre o cenário "ambiente novo" (chave
 * ausente em admin.system_settings) e a idempotência de rodar o seed mais de
 * uma vez — os dois cenários exigidos pelos critérios de aceite do patch.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { systemSettings } from "../schema/admin";
import { taskTemplates, templateItems } from "../schema/tarefas";
import {
  seedProjetosChecklistTemplate,
  PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY,
} from "../seed";

const TEMPLATE_NAME = "Checklist de análise de projeto";

async function deleteSeededRows(): Promise<void> {
  const [template] = await db
    .select({ id: taskTemplates.id })
    .from(taskTemplates)
    .where(eq(taskTemplates.name, TEMPLATE_NAME))
    .limit(1);

  if (template) {
    await db
      .delete(templateItems)
      .where(eq(templateItems.taskTemplateId, template.id));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, template.id));
  }

  await db
    .delete(systemSettings)
    .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY));
}

beforeAll(deleteSeededRows);
afterAll(deleteSeededRows);

describe("seedProjetosChecklistTemplate", () => {
  it("cria o template e a chave de settings quando o ambiente está vazio", async () => {
    const result = await seedProjetosChecklistTemplate();
    expect(result.created).toBe(true);

    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, result.templateId))
      .limit(1);
    expect(template?.name).toBe(TEMPLATE_NAME);
    expect(template?.isActive).toBe(true);
    expect(template?.triggerSourceModule).toBe("projetos");
    expect(template?.triggerEvent).toBe("project.submitted");

    const items = await db
      .select()
      .from(templateItems)
      .where(eq(templateItems.taskTemplateId, result.templateId));
    expect(items.length).toBe(5);

    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY))
      .limit(1);
    expect(setting?.value).toBe(result.templateId);
  });

  it("é idempotente — rodar de novo não duplica template nem itens", async () => {
    const first = await seedProjetosChecklistTemplate();
    const second = await seedProjetosChecklistTemplate();

    expect(second.created).toBe(false);
    expect(second.templateId).toBe(first.templateId);

    const templatesWithName = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.name, TEMPLATE_NAME));
    expect(templatesWithName.length).toBe(1);

    const items = await db
      .select()
      .from(templateItems)
      .where(eq(templateItems.taskTemplateId, first.templateId));
    expect(items.length).toBe(5);
  });
});
