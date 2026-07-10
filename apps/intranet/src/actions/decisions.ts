"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { meetingDecisions } from "@hebron/db/schema";
import { createMeetingDecisionSchema } from "@hebron/validators/intranet";
import { createAutoTask } from "@hebron/integrations/tarefas";
import { superAdminAction } from "../lib/safe-action";
import { logIntranetAudit } from "../lib/audit";
import { notifyMeetingDecisionCreated } from "../lib/notifications";

// ---------------------------------------------------------------------------
// createMeetingDecision — registra a decisão de uma reunião (ata).
// 0037_intranet_rls.sql restringe escrita em intranet.meeting_decisions a
// super_admin (meeting_decisions_mutate_admin); diretor/conselheiro só têm
// SELECT (meeting_decisions_select_board).
//
// "Criar tarefa" é opcional (checkbox do formulário, P-5.4): quando marcado,
// cria uma tarefa automática via packages/integrations::createAutoTask
// (BRAIN §7 — Intranet → Tarefas). Workspace fixo "administrativo": o
// formulário de decisão (meeting-decision-form.tsx) não coleta workspace, e
// decisões de reunião de diretoria são administrativas por padrão.
// ---------------------------------------------------------------------------

const createMeetingDecisionActionSchema = createMeetingDecisionSchema.extend({
  createTask: z.boolean().default(false),
});

export const createMeetingDecision = superAdminAction
  .schema(createMeetingDecisionActionSchema)
  .action(async ({ parsedInput: input, ctx }) => {
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
