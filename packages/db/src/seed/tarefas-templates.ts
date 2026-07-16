import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";

// dotenv precisa terminar antes de qualquer módulo que leia DATABASE_URL no
// escopo do módulo (./client) — mesmo racional documentado em
// ../seed.ts::ensureEnvLoaded (import dinâmico depois do config(), nunca um
// import estático hoisted para o topo do arquivo).
async function ensureEnvLoaded(): Promise<void> {
  if (process.env.DATABASE_URL) return;
  const { config } = await import("dotenv");
  config({ path: "../../.env" });
  config({ path: "../../.env.local", override: true });
}

// ---------------------------------------------------------------------------
// seedFlatsCleaningTemplates — P-7.11 (Integrações Cross-App Flats).
//
// `onFlatsReservationConfirmed` (packages/integrations/src/flats.ts) resolve
// estes templates por NOME estável ("limpeza-pre-estadia" /
// "limpeza-pos-estadia"), nunca por UUID — nenhum prompt anterior tem como
// conhecer o id gerado em runtime (mesmo racional de
// PROJETOS_CHECKLIST_TEMPLATE_NAME em ../seed.ts). `tarefas.task_templates`
// não tem coluna `slug` própria — fora da lista de arquivos permitidos deste
// prompt alterar o schema —, então `name` faz esse papel aqui, comparado
// por igualdade exata em `onFlatsReservationConfirmed`.
//
// Cada template tem exatamente 1 `template_items`. `due_offset_days` é
// interpretado por `onFlatsReservationConfirmed` em relação ao check-in
// (template pré-estadia) ou ao check-out (template pós-estadia) da reserva
// confirmada — não em relação a "agora", como em `createAutoTaskChecklist`
// (packages/integrations/src/tarefas.ts). Essa função genérica não serve
// aqui porque as duas tarefas têm âncoras de data diferentes entre si
// (uma antes do check-in, outra depois do check-out), então
// `onFlatsReservationConfirmed` chama `createAutoTask` diretamente, uma vez
// por template, com a data já calculada.
//
// Idempotente, mesmo padrão de seedProjetosChecklistTemplate (../seed.ts):
// roda com `pnpm --filter @hebron/db db:seed:flats-tarefas` ou é chamada
// diretamente pelos testes de packages/integrations.
// ---------------------------------------------------------------------------

export const FLATS_CLEANING_PRE_STAY_TEMPLATE_NAME = "limpeza-pre-estadia";
export const FLATS_CLEANING_POST_STAY_TEMPLATE_NAME = "limpeza-pos-estadia";

interface CleaningTemplateSpec {
  name: string;
  description: string;
  item: {
    title: string;
    description: string;
    priority: "baixa" | "media" | "alta" | "urgente";
    dueOffsetDays: number;
  };
}

const CLEANING_TEMPLATES: CleaningTemplateSpec[] = [
  {
    name: FLATS_CLEANING_PRE_STAY_TEMPLATE_NAME,
    description:
      "Limpeza do flat antes da chegada do hóspede — disparado quando a reserva é confirmada.",
    item: {
      title: "Limpeza pré-estadia",
      description:
        "Preparar a unidade (limpeza + enxoval) antes da chegada do hóspede.",
      priority: "alta",
      dueOffsetDays: -1,
    },
  },
  {
    name: FLATS_CLEANING_POST_STAY_TEMPLATE_NAME,
    description:
      "Limpeza do flat após a saída do hóspede — disparado quando a reserva é confirmada.",
    item: {
      title: "Limpeza pós-estadia",
      description: "Higienizar a unidade após a saída do hóspede.",
      priority: "media",
      dueOffsetDays: 1,
    },
  },
];

export interface SeedFlatsCleaningTemplatesResult {
  templates: Record<string, { templateId: string; created: boolean }>;
}

export async function seedFlatsCleaningTemplates(): Promise<SeedFlatsCleaningTemplatesResult> {
  await ensureEnvLoaded();
  const [
    { db },
    { taskTemplates, templateItems, workspaces },
    { getSystemActorId },
  ] = await Promise.all([
    import("../client"),
    import("../schema/tarefas"),
    import("../system-actor"),
  ]);

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
  const templates: SeedFlatsCleaningTemplatesResult["templates"] = {};

  for (const spec of CLEANING_TEMPLATES) {
    const [existing] = await db
      .select()
      .from(taskTemplates)
      .where(
        and(
          eq(taskTemplates.name, spec.name),
          eq(taskTemplates.workspaceId, workspace.id),
        ),
      )
      .limit(1);

    let templateId: string;
    let created: boolean;

    if (existing) {
      templateId = existing.id;
      created = false;

      const existingItems = await db
        .select({ id: templateItems.id })
        .from(templateItems)
        .where(eq(templateItems.taskTemplateId, existing.id))
        .limit(1);

      if (existingItems.length === 0) {
        await db.insert(templateItems).values({
          taskTemplateId: existing.id,
          title: spec.item.title,
          description: spec.item.description,
          priority: spec.item.priority,
          dueOffsetDays: spec.item.dueOffsetDays,
          order: 0,
        });
      }

      if (!existing.isActive) {
        await db
          .update(taskTemplates)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(taskTemplates.id, existing.id));
      }
    } else {
      created = true;
      templateId = await db.transaction(async (tx) => {
        const [template] = await tx
          .insert(taskTemplates)
          .values({
            name: spec.name,
            description: spec.description,
            workspaceId: workspace.id,
            triggerSourceModule: "flats",
            triggerEvent: "reservation.confirmed",
            isActive: true,
            createdBy: systemActorId,
          })
          .returning({ id: taskTemplates.id });
        if (!template) {
          throw new Error(`Falha ao criar template de limpeza: ${spec.name}`);
        }

        await tx.insert(templateItems).values({
          taskTemplateId: template.id,
          title: spec.item.title,
          description: spec.item.description,
          priority: spec.item.priority,
          dueOffsetDays: spec.item.dueOffsetDays,
          order: 0,
        });

        return template.id;
      });
    }

    templates[spec.name] = { templateId, created };
  }

  return { templates };
}

async function main() {
  const result = await seedFlatsCleaningTemplates();
  for (const [name, { templateId, created }] of Object.entries(
    result.templates,
  )) {
    console.log(
      created
        ? `Criado template "${name}" (${templateId}).`
        : `Template "${name}" já existia (${templateId}) — nada a fazer.`,
    );
  }
  // `db` (../client) é um pool compartilhado sem `.end()` exposto — sem isto
  // o processo do script nunca sai sozinho (mesmo padrão de ../seed.ts).
  process.exit(0);
}

// Só roda o seed quando este arquivo é executado diretamente (tsx
// src/seed/tarefas-templates.ts), nunca quando importado por testes.
const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main().catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
