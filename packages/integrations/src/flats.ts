import { asc, eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  reservations,
  roleAssignments,
  taskTemplates,
  templateItems,
  users,
} from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import {
  FLATS_CLEANING_PRE_STAY_TEMPLATE_NAME,
  FLATS_CLEANING_POST_STAY_TEMPLATE_NAME,
} from "@hebron/db/seed/tarefas-templates";
import type { Workspace } from "@hebron/types/tarefas";
import { createAutoTask } from "./tarefas";

// ---------------------------------------------------------------------------
// onFlatsReservationConfirmed — Flats → Tarefas (P-7.11 — CS-6 da auditoria)
//
// Reserva confirmada gera 2 tarefas de limpeza (pré e pós-estadia), uma para
// cada `tarefas.task_templates` seedado com nome estável
// (packages/db/src/seed/tarefas-templates.ts::seedFlatsCleaningTemplates —
// resolvido por NOME, não por UUID, já que nenhum prompt anterior tem como
// conhecer o id gerado em runtime). Datas derivadas do período confirmado da
// reserva (`due_offset_days` do item somado ao check-in para a tarefa
// pré-estadia, ao check-out para a pós-estadia) — não de "agora", por isso
// `createAutoTask` é chamado diretamente para cada tarefa, em vez de
// `createAutoTaskChecklist` (que assume uma única âncora de data para todas
// as tarefas de um template).
//
// Mutação cross-schema, mesmo padrão de `onProjectSubmitted`
// (projetos-tarefas.ts): o chamador SEMPRE dá `await`, mesmo que a decisão
// de negócio seja não bloquear a confirmação da reserva por uma falha aqui
// (a reserva já foi commitada como "confirmada" antes deste ponto) — a
// falha é logada de forma estruturada e sinalizada a todo super_admin via
// notificação in-app antes de ser relançada, para que alguém resolva
// manualmente (ex.: rodar o seed que faltou, ou criar as tarefas à mão em
// apps/tarefas).
// ---------------------------------------------------------------------------

interface CleaningTemplateItem {
  isActive: boolean;
  title: string;
  description: string | null;
  priority: "baixa" | "media" | "alta" | "urgente";
  dueOffsetDays: number | null;
}

const FLATS_CLEANING_WORKSPACE: Workspace = "administrativo";

async function loadCleaningTemplateItem(
  templateName: string,
): Promise<CleaningTemplateItem | null> {
  const [row] = await db
    .select({
      isActive: taskTemplates.isActive,
      title: templateItems.title,
      description: templateItems.description,
      priority: templateItems.priority,
      dueOffsetDays: templateItems.dueOffsetDays,
    })
    .from(taskTemplates)
    .innerJoin(
      templateItems,
      eq(templateItems.taskTemplateId, taskTemplates.id),
    )
    .where(eq(taskTemplates.name, templateName))
    .orderBy(asc(templateItems.order))
    .limit(1);

  return row ?? null;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function onFlatsReservationConfirmed(
  reservationId: string,
): Promise<void> {
  try {
    const [reservation] = await db
      .select({ selectedPeriod: reservations.selectedPeriod })
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);

    if (!reservation?.selectedPeriod) {
      throw new Error(
        "Reserva sem período confirmado — não é possível gerar as tarefas de limpeza",
      );
    }

    const checkIn = new Date(`${reservation.selectedPeriod.start}T00:00:00Z`);
    const checkOut = new Date(`${reservation.selectedPeriod.end}T00:00:00Z`);

    const [preItem, postItem] = await Promise.all([
      loadCleaningTemplateItem(FLATS_CLEANING_PRE_STAY_TEMPLATE_NAME),
      loadCleaningTemplateItem(FLATS_CLEANING_POST_STAY_TEMPLATE_NAME),
    ]);

    if (!preItem?.isActive || !postItem?.isActive) {
      throw new Error(
        `Templates de limpeza não seedados ou inativos ("${FLATS_CLEANING_PRE_STAY_TEMPLATE_NAME}" / "${FLATS_CLEANING_POST_STAY_TEMPLATE_NAME}" em tarefas.task_templates) — rode "pnpm --filter @hebron/db db:seed:flats-tarefas".`,
      );
    }

    await createAutoTask({
      title: preItem.title,
      description: preItem.description,
      workspace: FLATS_CLEANING_WORKSPACE,
      priority: preItem.priority,
      dueDate: addDays(checkIn, preItem.dueOffsetDays ?? -1),
      sourceModule: "flats",
      sourceId: reservationId,
    });

    await createAutoTask({
      title: postItem.title,
      description: postItem.description,
      workspace: FLATS_CLEANING_WORKSPACE,
      priority: postItem.priority,
      dueDate: addDays(checkOut, postItem.dueOffsetDays ?? 1),
      sourceModule: "flats",
      sourceId: reservationId,
    });
  } catch (err) {
    await notifyCleaningTaskCreationFailure(reservationId, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// notifyCleaningTaskCreationFailure — log estruturado + notificação in-app a
// todo super_admin (mesmo padrão de notifyChecklistCreationFailure,
// projetos-tarefas.ts). Nunca lança: uma falha ao notificar não pode
// mascarar o erro original que o chamador de onFlatsReservationConfirmed
// precisa ver.
// ---------------------------------------------------------------------------

async function notifyCleaningTaskCreationFailure(
  reservationId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);

  console.error(
    JSON.stringify({
      event: "cross_app_integration_failure",
      integration: "flats.onFlatsReservationConfirmed",
      reservationId,
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
          type: "flats.tarefas_limpeza_falhou",
          title: "Falha ao criar tarefas de limpeza da reserva",
          body: `Reserva ${reservationId}: ${message}`,
          payload: { reservationId, message },
        }),
      ),
    );
  } catch (notifyErr) {
    console.error(
      JSON.stringify({
        event: "cross_app_integration_notify_failure",
        integration: "flats.onFlatsReservationConfirmed",
        reservationId,
        message:
          notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      }),
    );
  }
}
