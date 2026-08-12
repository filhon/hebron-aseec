"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  withAuthenticatedContext,
  withSystemRole,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import { meetingDecisions, meetingSessions } from "@hebron/db/schema";
import {
  createMeetingDecisionSchema,
  updateMeetingDecisionStatusSchema,
} from "@hebron/validators/intranet";
import { onMeetingActionItemDecided } from "@hebron/integrations/intranet";
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
// delega a packages/integrations::onMeetingActionItemDecided (BRAIN §7 —
// Intranet → Tarefas), que cria a tarefa automática (createAutoTask,
// workspace fixo "administrativo" — o formulário de decisão,
// meeting-decision-form.tsx, não coleta workspace, e decisões de reunião de
// diretoria são administrativas por padrão) e já grava o vínculo de volta em
// meeting_decisions.task_id. Falha nessa chamada NÃO desfaz a decisão já
// commitada acima nem é escondida: fica logada e a decisão retorna sem
// taskId, e a tela (/reunioes) mostra que a tarefa não foi criada (P-5.11b,
// fecha o débito de S-101 — antes, a mesma falha derrubava a decisão já
// registrada).
// ---------------------------------------------------------------------------

async function assertCanMutateSessionDecisions(
  tx: AuthenticatedTx,
  actorId: string,
  roles: readonly string[],
  meetingSessionId: string,
): Promise<void> {
  if (roles.includes("super_admin")) return;

  const [session] = await tx
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
    const decision = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        await assertCanMutateSessionDecisions(
          tx,
          ctx.actorId,
          ctx.roles,
          input.meetingSessionId,
        );

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

    // onMeetingActionItemDecided (packages/integrations) grava como o ator
    // sistema, fora do papel do usuário corrente — não entra na mesma
    // transação autenticada acima (mesmo padrão de packages/jobs: ator
    // sistema tem seu próprio caminho de escrita, fora de escopo do P-0.17).
    // Awaited (nunca fire-and-forget), mas o catch abaixo decide não
    // propagar a falha: a decisão de ata já foi commitada, não é dela que a
    // falha de tarefa deveria depender.
    let taskId: string | null = null;
    if (input.createTask) {
      try {
        taskId = await onMeetingActionItemDecided(decision.id);
      } catch (err) {
        console.error(
          JSON.stringify({
            event: "cross_app_integration_failure",
            integration: "intranet.onMeetingActionItemDecided",
            caller: "intranet/actions/decisions.ts::createMeetingDecision",
            meetingDecisionId: decision.id,
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
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
    const decision = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [existing] = await tx
          .select({ meetingSessionId: meetingDecisions.meetingSessionId })
          .from(meetingDecisions)
          .where(eq(meetingDecisions.id, input.meetingDecisionId));

        if (!existing) throw new Error("Decisão de reunião não encontrada");

        await assertCanMutateSessionDecisions(
          tx,
          ctx.actorId,
          ctx.roles,
          existing.meetingSessionId,
        );

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
