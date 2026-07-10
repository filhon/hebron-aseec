/**
 * projetos-tarefas.test.ts — onProjectSubmitted (PATCH-019 / débito S-83)
 *
 * Sem mock: roda contra o banco real. Cobre os dois cenários exigidos pelo
 * patch — setting ausente (falha logada + super_admin notificado, sem criar
 * tarefas) e setting presente apontando para o template seedado (checklist
 * real criado, sem configuração manual).
 *
 * `clearSettingsCache` (packages/db/src/settings.ts) é usado entre os dois
 * cenários para não depender do TTL real de 30s do cache em memória de
 * `getSystemSetting` — sem isso o segundo teste leria o valor cacheado do
 * primeiro em vez do valor recém-gravado no banco.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  notifications,
  tasks,
} from "@hebron/db/schema";
import { systemSettings } from "@hebron/db/schema";
import { clearSettingsCache } from "@hebron/db/settings";
import { getSystemActorId } from "@hebron/db/system-actor";
import { PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY } from "@hebron/db/seed";
import { seedProjetosChecklistTemplate } from "@hebron/db/seed";
import { onProjectSubmitted } from "../projetos-tarefas";

const ADMIN_ID = "af000000-0000-0000-0000-000000000001";
const ADMIN_EMAIL = "projetos-tarefas-test-admin@test.hebron";
const PROJECT_ID = "af000000-0000-0000-0000-0000000000f1";

let seededTemplateId: string;

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      fullName: "Projetos Tarefas Test Admin",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: ADMIN_ID, role: "super_admin" })
    .onConflictDoNothing();

  const result = await seedProjetosChecklistTemplate();
  seededTemplateId = result.templateId;
});

afterAll(async () => {
  // Restaura o setting para o template seedado (estado esperado em produção),
  // gravado pelo ator sistema — nunca pelo admin de teste, que é apagado
  // logo abaixo (deixar updated_by apontando pra ele violaria a FK).
  const systemActorId = await getSystemActorId();
  await db
    .update(systemSettings)
    .set({ value: seededTemplateId, updatedBy: systemActorId })
    .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY));
  clearSettingsCache();

  await db
    .delete(notifications)
    .where(sql`${notifications.payload} ->> 'projectId' = ${PROJECT_ID}`);
  await db
    .delete(tasks)
    .where(sql`${tasks.sourceRef} ->> 'sourceId' = ${PROJECT_ID}`);
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, ADMIN_ID));
  await db.delete(users).where(eq(users.id, ADMIN_ID));
});

describe("onProjectSubmitted", () => {
  it("lança e notifica super_admin quando o template não está configurado", async () => {
    await db
      .update(systemSettings)
      .set({ value: "", updatedBy: ADMIN_ID })
      .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY));
    clearSettingsCache();

    await expect(onProjectSubmitted(PROJECT_ID)).rejects.toThrow(
      /não configurado/,
    );

    const notifs = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ADMIN_ID),
          eq(notifications.type, "projeto.checklist_analise_falhou"),
        ),
      );
    expect(notifs.length).toBeGreaterThan(0);

    const createdTasks = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.sourceRef} ->> 'sourceId' = ${PROJECT_ID}`);
    expect(createdTasks.length).toBe(0);
  });

  it("cria o checklist sem configuração manual quando o template está seedado", async () => {
    await db
      .update(systemSettings)
      .set({ value: seededTemplateId, updatedBy: ADMIN_ID })
      .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY));
    clearSettingsCache();

    await expect(onProjectSubmitted(PROJECT_ID)).resolves.toBeUndefined();

    const createdTasks = await db
      .select()
      .from(tasks)
      .where(sql`${tasks.sourceRef} ->> 'sourceId' = ${PROJECT_ID}`);
    expect(createdTasks.length).toBe(5);
    for (const task of createdTasks) {
      expect(task.source).toBe("auto");
      expect(task.needsManualAssignment).toBe(true);
    }
  });
});
