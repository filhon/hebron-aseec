"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { meetingDecisions } from "@hebron/db/schema";
import { createMeetingDecisionSchema } from "@hebron/validators/intranet";
import { createAutoTask } from "@hebron/integrations/tarefas";
import { superAdminAction } from "../lib/safe-action";
import { logIntranetAudit } from "../lib/audit";

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
    const [decision] = await db
      .insert(meetingDecisions)
      .values({
        meetingSessionId: input.meetingSessionId,
        description: input.description,
        responsibleId: input.responsibleId,
        dueDate: input.dueDate,
      })
      .returning();

    if (!decision) throw new Error("Falha ao registrar decisão de reunião");

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

      await db
        .update(meetingDecisions)
        .set({ taskId, updatedAt: new Date() })
        .where(eq(meetingDecisions.id, decision.id));
    }

    await logIntranetAudit({
      actorId: ctx.actorId,
      action: "meeting_decision.created",
      entity: "meeting_decision",
      entityId: decision.id,
      diff: {
        meetingSessionId: decision.meetingSessionId,
        responsibleId: decision.responsibleId,
        taskId,
      },
    });

    return { decision: { ...decision, taskId: taskId ?? decision.taskId } };
  });
