"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { meetingDecisions, meetingSessions } from "@hebron/db/schema";
import {
  createMeetingDecisionSchema,
  updateMeetingDecisionStatusSchema,
} from "@hebron/validators/intranet";
import { createAutoTask } from "@hebron/integrations/tarefas";
import { boardAction } from "../lib/safe-action";
import { logIntranetAudit } from "../lib/audit";
import { notifyMeetingDecisionCreated } from "../lib/notifications";

// ---------------------------------------------------------------------------
// createMeetingDecision / updateMeetingDecisionStatus — registram e
// atualizam a decisão de uma reunião (ata).
// 0040_intranet_meeting_decisions_chair_rls.sql (PATCH-017): super_admin
// muta qualquer decisão; diretor/conselheiro só mutam decisões de sessões
// que presidem (admin.meeting_sessions.chair_user_id = auth.uid()), conforme
// BRAIN.md §6.6 ("presidente de sessão registra decisões"). A checagem
// abaixo é a camada de aplicação (G, mensagem de erro amigável); a RLS é
// quem de fato barra a escrita — não é a única camada de segurança.
//
// "Criar tarefa" é opcional (checkbox do formulário, P-5.4): quando marcado,
// cria uma tarefa automática via packages/integrations::createAutoTask
// (BRAIN §7 — Intranet → Tarefas). Workspace fixo "administrativo": o
// formulário de decisão (meeting-decision-form.tsx) não coleta workspace, e
// decisões de reunião de diretoria são administrativas por padrão.
// ---------------------------------------------------------------------------

async function assertCanMutateSessionDecisions(
  actorId: string,
  roles: readonly string[],
  meetingSessionId: string,
): Promise<void> {
  if (roles.includes("super_admin")) return;

  const [session] = await db
    .select({ chairUserId: meetingSessions.chairUserId })
    .from(meetingSessions)
    .where(eq(meetingSessions.id, meetingSessionId));

  if (!session || session.chairUserId !== actorId) {
    throw new Error(
      "Acesso negado: apenas o presidente da sessão ou super_admin pode registrar decisões desta reunião",
    );
  }
}

const createMeetingDecisionActionSchema = createMeetingDecisionSchema.extend({
  createTask: z.boolean().default(false),
});

export const createMeetingDecision = boardAction
  .schema(createMeetingDecisionActionSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await assertCanMutateSessionDecisions(
      ctx.actorId,
      ctx.roles,
      input.meetingSessionId,
    );

    const decision = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(meetingDecisions)
          .values({
            meetingSessionId: input.meetingSessionId,
            description: input.description,
            responsibleId: input.responsibleId,
            dueDate: input.dueDate,
          })
          .returning();
        if (!row) throw new Error("Falha ao registrar decisão de reunião");
        return row;
      },
    );

    // createAutoTask (packages/integrations) grava como o ator sistema
    // (getSystemActorId), fora do papel do usuário corrente — não entra na
    // mesma transação autenticada acima (mesmo padrão de packages/jobs:
    // ator sistema tem seu próprio caminho de escrita, fora de escopo do
    // P-0.17).
    let taskId: string | null = null;
    if (input.createTask) {
      const taskTitle = `Decisão de reunião: ${input.description}`.slice(
        0,
        200,
      );
      const { taskId: createdTaskId } = await createAutoTask({
        title: taskTitle,
        workspace: "administrativo",
        dueDate: input.dueDate,
        sourceModule: "intranet",
        sourceId: decision.id,
      });
      taskId = createdTaskId;

      await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
        tx
          .update(meetingDecisions)
          .set({ taskId, updatedAt: new Date() })
          .where(eq(meetingDecisions.id, decision.id)),
      );
    }

    await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
      withSystemRole(tx, (sysTx) =>
        logIntranetAudit(
          {
            actorId: ctx.actorId,
            action: "meeting_decision.created",
            entity: "meeting_decision",
            entityId: decision.id,
            diff: {
              meetingSessionId: decision.meetingSessionId,
              responsibleId: decision.responsibleId,
              taskId,
            },
          },
          sysTx,
        ),
      ),
    );

    // Decisão de reunião: in_app para a diretoria (critério de aceite P-5.10).
    await notifyMeetingDecisionCreated({
      id: decision.id,
      description: decision.description,
    });

    return { decision: { ...decision, taskId: taskId ?? decision.taskId } };
  });

export const updateMeetingDecisionStatus = boardAction
  .schema(updateMeetingDecisionStatusSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const [existing] = await db
      .select({ meetingSessionId: meetingDecisions.meetingSessionId })
      .from(meetingDecisions)
      .where(eq(meetingDecisions.id, input.meetingDecisionId));

    if (!existing) throw new Error("Decisão de reunião não encontrada");

    await assertCanMutateSessionDecisions(
      ctx.actorId,
      ctx.roles,
      existing.meetingSessionId,
    );

    const decision = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(meetingDecisions)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(meetingDecisions.id, input.meetingDecisionId))
          .returning();
        if (!row)
          throw new Error("Falha ao atualizar status da decisão de reunião");
        return row;
      },
    );

    await withAuthenticatedContext({ actorId: ctx.actorId }, (tx) =>
      withSystemRole(tx, (sysTx) =>
        logIntranetAudit(
          {
            actorId: ctx.actorId,
            action: "meeting_decision.status_updated",
            entity: "meeting_decision",
            entityId: decision.id,
            diff: { status: decision.status },
          },
          sysTx,
        ),
      ),
    );

    return { decision };
  });
