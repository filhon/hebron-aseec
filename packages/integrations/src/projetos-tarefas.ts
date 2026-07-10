import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { roleAssignments, users } from "@hebron/db/schema";
import { getSystemSetting } from "@hebron/db/settings";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY } from "@hebron/db/seed";
import { createAutoTaskChecklist } from "./tarefas";

// ---------------------------------------------------------------------------
// onProjectSubmitted — Projetos → Tarefas
//
// Chamado quando um projeto transiciona de rascunho para validacao. Cria o
// checklist de análise (BRAIN §7: "Tarefas → Projetos: submissão cria
// checklist padrão de análise") via createAutoTaskChecklist, a partir de um
// `tarefas.task_templates` configurável pelo Admin em
// `admin.system_settings["projetos_analysis_checklist_template"]`
// (BRAIN §7 "Configuração cross-app"). A chave nasce via seed idempotente
// (packages/db/src/seed.ts::seedProjetosChecklistTemplate, PATCH-019) e é
// trocável sem SQL manual via apps/admin/src/actions/settings.ts
// ::setProjetosChecklistTemplate.
//
// Esta é uma integração de MUTAÇÃO CRÍTICA, não de leitura (BRAIN §7,
// padrão S1-22): nunca roda fire-and-forget. O chamador
// (apps/projetos/src/actions/projects.ts::submitProject) sempre dá `await`
// e decide não abortar a submissão do projeto por causa de uma falha aqui —
// mas a falha em si nunca é engolida: é logada de forma estruturada e
// sinalizada a todo super_admin via notificação in-app, para que alguém
// resolva manualmente (ex.: trocar o template no Admin, ou criar o
// checklist à mão em apps/tarefas, caso o seed nunca tenha rodado).
// ---------------------------------------------------------------------------

export async function onProjectSubmitted(projectId: string): Promise<void> {
  try {
    const templateId = await getSystemSetting<string>(
      PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY,
    );
    if (!templateId) {
      throw new Error(
        `Template de checklist de análise não configurado (admin.system_settings: "${PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY}"). Rode "pnpm db:seed" (packages/db/src/seed.ts) para provisionar o template padrão.`,
      );
    }

    await createAutoTaskChecklist({
      templateId,
      sourceModule: "projetos",
      sourceId: projectId,
    });
  } catch (err) {
    await notifyChecklistCreationFailure(projectId, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// notifyChecklistCreationFailure — log estruturado + notificação in-app a
// todo super_admin (padrão S1-22 para mutação crítica que não aborta o fluxo
// principal). Nunca lança: uma falha ao notificar não pode mascarar o erro
// original que o chamador de onProjectSubmitted precisa ver.
// ---------------------------------------------------------------------------

async function notifyChecklistCreationFailure(
  projectId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);

  console.error(
    JSON.stringify({
      event: "cross_app_integration_failure",
      integration: "projetos-tarefas.onProjectSubmitted",
      projectId,
      message,
      timestamp: new Date().toISOString(),
    }),
  );

  try {
    const admins = await db
      .selectDistinct({ id: users.id })
      .from(roleAssignments)
      .innerJoin(users, eq(users.id, roleAssignments.userId))
      .where(eq(roleAssignments.role, "super_admin"));

    const insert = makeNotificationInserter();
    await Promise.allSettled(
      admins.map((admin) =>
        insert({
          userId: admin.id,
          channel: "in_app",
          type: "projeto.checklist_analise_falhou",
          title: "Falha ao criar checklist de análise do projeto",
          body: `Projeto ${projectId}: ${message}`,
          payload: { projectId, message },
        }),
      ),
    );
  } catch (notifyErr) {
    console.error(
      JSON.stringify({
        event: "cross_app_integration_notify_failure",
        integration: "projetos-tarefas.onProjectSubmitted",
        projectId,
        message:
          notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      }),
    );
  }
}
