/**
 * settings-actions.test.ts — setProjetosChecklistTemplate (PATCH-019)
 *
 * Sem mock de banco: exercita a action real contra o banco real, só
 * mockando sessão (super_admin) e cookies (logAudit), como em actions.test.ts.
 * Cobre a troca válida, e as duas rejeições (template inativo, template sem
 * tarefas) exigidas pela UI do Admin ("Sistema") não permitir apontar
 * admin.system_settings para um template inválido.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { getSystemActorId } from "@hebron/db/system-actor";
import { PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY } from "@hebron/db/seed";
import {
  users,
  auditLog,
  roleAssignments,
  systemSettings,
  taskTemplates,
  templateItems,
  workspaces,
} from "@hebron/db/schema";

const ACTOR_ID = "ae000000-0000-0000-0000-000000000001";
const ACTOR_EMAIL = "settings-actions-actor@test.hebron";

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["super_admin"],
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
  }),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

let workspaceId: string;
let activeTemplateId: string;
let inactiveTemplateId: string;
let emptyTemplateId: string;
let originalSettingValue: unknown;

async function createTemplate(params: {
  name: string;
  isActive: boolean;
  withItem: boolean;
}): Promise<string> {
  const [template] = await db
    .insert(taskTemplates)
    .values({
      name: params.name,
      workspaceId,
      isActive: params.isActive,
      createdBy: ACTOR_ID,
    })
    .returning({ id: taskTemplates.id });
  if (!template) throw new Error("Falha ao criar template de teste");

  if (params.withItem) {
    await db.insert(templateItems).values({
      taskTemplateId: template.id,
      title: "Item de teste",
      priority: "media",
      order: 0,
    });
  }

  return template.id;
}

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: ACTOR_EMAIL,
      fullName: "Settings Actions Actor",
    })
    .onConflictDoNothing();

  // setProjetosChecklistTemplate agora lê/escreve via withAuthenticatedContext
  // (P-9.1b-1) — o mock de sessão sozinho não basta, RLS avalia has_role()
  // contra role_assignments de verdade (mesmo padrão de actions.test.ts).
  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "super_admin", grantedBy: ACTOR_ID })
    .onConflictDoNothing();

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "administrativo"))
    .limit(1);
  if (!ws)
    throw new Error(
      'Workspace "administrativo" não encontrado — rode as migrations.',
    );
  workspaceId = ws.id;

  activeTemplateId = await createTemplate({
    name: "PATCH-019 test — template ativo",
    isActive: true,
    withItem: true,
  });
  inactiveTemplateId = await createTemplate({
    name: "PATCH-019 test — template inativo",
    isActive: false,
    withItem: true,
  });
  emptyTemplateId = await createTemplate({
    name: "PATCH-019 test — template sem tarefas",
    isActive: true,
    withItem: false,
  });

  const [setting] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY))
    .limit(1);
  originalSettingValue = setting?.value ?? null;
});

afterAll(async () => {
  const systemActorId = await getSystemActorId();
  if (originalSettingValue !== null) {
    await db
      .update(systemSettings)
      .set({ value: originalSettingValue, updatedBy: systemActorId })
      .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY));
  }

  for (const id of [activeTemplateId, inactiveTemplateId, emptyTemplateId]) {
    await db.delete(templateItems).where(eq(templateItems.taskTemplateId, id));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id));
  }

  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

describe("setProjetosChecklistTemplate", () => {
  it("troca o template quando o novo é ativo e tem tarefas", async () => {
    const { setProjetosChecklistTemplate } =
      await import("../actions/settings");

    const result = await setProjetosChecklistTemplate({
      templateId: activeTemplateId,
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.setting.value).toBe(activeTemplateId);

    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY))
      .limit(1);
    expect(row?.value).toBe(activeTemplateId);

    const [entry] = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.actorId, ACTOR_ID),
          eq(auditLog.action, "setting.updated"),
        ),
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(1);
    expect(entry).toBeDefined();
  });

  it("rejeita template inativo", async () => {
    const { setProjetosChecklistTemplate } =
      await import("../actions/settings");

    const result = await setProjetosChecklistTemplate({
      templateId: inactiveTemplateId,
    });
    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY))
      .limit(1);
    expect(row?.value).not.toBe(inactiveTemplateId);
  });

  it("rejeita template sem tarefas definidas", async () => {
    const { setProjetosChecklistTemplate } =
      await import("../actions/settings");

    const result = await setProjetosChecklistTemplate({
      templateId: emptyTemplateId,
    });
    expect(result?.serverError).toBeDefined();

    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY))
      .limit(1);
    expect(row?.value).not.toBe(emptyTemplateId);
  });
});
