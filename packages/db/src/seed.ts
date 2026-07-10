import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";

// dotenv precisa terminar antes de qualquer módulo que leia DATABASE_URL no
// escopo do módulo (./client, importado transitivamente por ./system-actor e
// ./settings) — um `import` estático é hoisted para o topo do arquivo em ESM
// e rodaria antes do config() abaixo, então o carregamento do resto do
// gráfico é adiado para dentro de `ensureEnvLoaded` via `import()` dinâmico
// (mesmo problema que packages/db/src/__tests__/setup-env.ts resolve para os
// testes, rodando como setupFile antes de qualquer import estático).
async function ensureEnvLoaded(): Promise<void> {
  if (process.env.DATABASE_URL) return;
  const { config } = await import("dotenv");
  config({ path: "../../.env" });
  config({ path: "../../.env.local", override: true });
}

// ---------------------------------------------------------------------------
// seedProjetosChecklistTemplate — PATCH-019 / débito registrado em S-83.
//
// `onProjectSubmitted` (packages/integrations/src/projetos-tarefas.ts) já
// cria o checklist de análise via createAutoTaskChecklist, mas depende de
// admin.system_settings["projetos_analysis_checklist_template"] apontar
// para um tarefas.task_templates ativo com itens. Nenhuma migration ou UI
// cria essa chave/template — em um ambiente novo, a primeira submissão real
// falha e só notifica super_admin, sem lhe dar meio de resolver. Este seed
// fecha o buraco: idempotente, roda com `pnpm db:seed` (ou automaticamente,
// se um dia entrar em pipeline de provisionamento de ambiente).
//
// Não é uma migration SQL porque `task_templates.created_by` e
// `system_settings.updated_by` são NOT NULL com FK para `public.users`, e o
// único ator "de sistema" (getSystemActorId) é provisionado via Supabase
// Admin API — não existe como INSERT puro em SQL (ver comentário em
// system-actor.ts).
// ---------------------------------------------------------------------------

export const PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY =
  "projetos_analysis_checklist_template";

const PROJETOS_CHECKLIST_TEMPLATE_NAME = "Checklist de análise de projeto";

const CHECKLIST_ITEMS: Array<{
  title: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  dueOffsetDays: number | null;
}> = [
  {
    title: "Validar documentação enviada",
    priority: "alta",
    dueOffsetDays: 3,
  },
  {
    title: "Revisar resumo e versão compacta",
    priority: "media",
    dueOffsetDays: 5,
  },
  {
    title: "Conferir orçamento e teto institucional",
    priority: "alta",
    dueOffsetDays: 5,
  },
  {
    title: "Preparar pauta de avaliação",
    priority: "media",
    dueOffsetDays: 7,
  },
  {
    title: "Registrar pendências para o submissor, se houver",
    priority: "media",
    dueOffsetDays: 7,
  },
];

export interface SeedProjetosChecklistTemplateResult {
  templateId: string;
  /** false quando o seed encontrou configuração válida e não mudou nada. */
  created: boolean;
}

export async function seedProjetosChecklistTemplate(): Promise<SeedProjetosChecklistTemplateResult> {
  await ensureEnvLoaded();
  const [
    { db },
    { taskTemplates, templateItems, workspaces },
    { systemSettings },
    { getSystemActorId },
    { getSystemSetting },
  ] = await Promise.all([
    import("./client"),
    import("./schema/tarefas"),
    import("./schema/admin"),
    import("./system-actor"),
    import("./settings"),
  ]);

  const existingTemplateId = await getSystemSetting<string>(
    PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY,
  );
  if (existingTemplateId) {
    const [existingTemplate] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, existingTemplateId))
      .limit(1);
    if (existingTemplate?.isActive) {
      return { templateId: existingTemplate.id, created: false };
    }
  }

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "administrativo"))
    .limit(1);
  if (!workspace) {
    throw new Error(
      'Workspace "administrativo" não encontrado — rode as migrations de tarefas (0031_tarefas.sql) antes do seed.',
    );
  }

  const systemActorId = await getSystemActorId();

  const [reusableTemplate] = await db
    .select()
    .from(taskTemplates)
    .where(
      and(
        eq(taskTemplates.name, PROJETOS_CHECKLIST_TEMPLATE_NAME),
        eq(taskTemplates.workspaceId, workspace.id),
      ),
    )
    .limit(1);

  let templateId: string;
  let created: boolean;

  if (reusableTemplate) {
    templateId = reusableTemplate.id;
    created = false;

    const existingItems = await db
      .select({ id: templateItems.id })
      .from(templateItems)
      .where(eq(templateItems.taskTemplateId, reusableTemplate.id))
      .limit(1);

    if (existingItems.length === 0) {
      await db.insert(templateItems).values(
        CHECKLIST_ITEMS.map((item, index) => ({
          taskTemplateId: reusableTemplate.id,
          title: item.title,
          priority: item.priority,
          dueOffsetDays: item.dueOffsetDays,
          order: index,
        })),
      );
    }

    if (!reusableTemplate.isActive) {
      await db
        .update(taskTemplates)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(taskTemplates.id, reusableTemplate.id));
    }
  } else {
    created = true;
    templateId = await db.transaction(async (tx) => {
      const [template] = await tx
        .insert(taskTemplates)
        .values({
          name: PROJETOS_CHECKLIST_TEMPLATE_NAME,
          description:
            "Checklist padrão criado automaticamente quando um projeto é submetido para análise.",
          workspaceId: workspace.id,
          triggerSourceModule: "projetos",
          triggerEvent: "project.submitted",
          isActive: true,
          createdBy: systemActorId,
        })
        .returning({ id: taskTemplates.id });
      if (!template) {
        throw new Error(
          "Falha ao criar template de checklist de análise de projeto",
        );
      }

      await tx.insert(templateItems).values(
        CHECKLIST_ITEMS.map((item, index) => ({
          taskTemplateId: template.id,
          title: item.title,
          priority: item.priority,
          dueOffsetDays: item.dueOffsetDays,
          order: index,
        })),
      );

      return template.id;
    });
  }

  await db
    .insert(systemSettings)
    .values({
      key: PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY,
      value: templateId,
      label: "Template de checklist de análise de projeto",
      description:
        "Template usado por Projetos → Tarefas ao submeter um projeto para análise (BRAIN §7).",
      updatedBy: systemActorId,
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: templateId,
        updatedBy: systemActorId,
        updatedAt: new Date(),
      },
    });

  return { templateId, created };
}

async function main() {
  const result = await seedProjetosChecklistTemplate();
  console.log(
    result.created
      ? `Criado template "${PROJETOS_CHECKLIST_TEMPLATE_NAME}" (${result.templateId}) e configurado admin.system_settings.`
      : `Checklist de análise de projeto já configurado (${result.templateId}) — nada a fazer.`,
  );
  // `db` (./client) é um pool compartilhado sem `.end()` exposto (singleton
  // pensado para o runtime da app, reaproveitado aqui por getSystemActorId/
  // getSystemSetting) — sem isto o processo do script nunca sai sozinho.
  process.exit(0);
}

// Só roda o seed quando este arquivo é executado diretamente (tsx src/seed.ts),
// nunca quando importado por testes (packages/db/src/__tests__/seed.test.ts).
const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main().catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
