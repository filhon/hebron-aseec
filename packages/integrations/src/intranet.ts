import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { meetingDecisions, meetingSessions, users } from "@hebron/db/schema";
import { createAutoTask } from "./tarefas";

// ---------------------------------------------------------------------------
// onMeetingActionItemDecided — Intranet → Tarefas
//
// Chamado quando uma decisão de ata marca "criar tarefa" (checkbox do
// formulário, P-5.4). Cria a tarefa avulsa via `createAutoTask` — sem
// template, diferente do checklist de Projetos → Tarefas: a decisão já tem
// descrição/responsável/prazo definidos na própria ata (BRAIN §7, "Intranet
// → Tarefas") — e grava o vínculo de volta em
// `intranet.meeting_decisions.task_id`, para que `/reunioes` saiba que a
// tarefa existe (P-5.11b, fecha o débito de S-101).
//
// Único chamador é `apps/intranet/src/actions/decisions.ts::createMeetingDecision`,
// sempre com `await` (nunca fire-and-forget): a decisão de ata já foi
// commitada antes desta chamada, e a decisão de negócio de não desfazê-la
// por causa de uma falha aqui é do chamador — esta função só lança (mesmo
// padrão de `onProjectSubmitted`, projetos-tarefas.ts) para que o chamador
// veja o erro e decida.
//
// Roda com o client de serviço (`@hebron/db/client`, sem RLS) como
// `createAutoTask` já faz — o vínculo de volta é a mesma escrita de sistema,
// não uma ação do usuário autenticado.
// ---------------------------------------------------------------------------

// Duplicado de apps/intranet/src/lib/queries.ts::MEETING_TYPE_LABEL: este
// package não pode importar de um app (G6.5, PROMPTS.md) — mesma razão da
// duplicação de computeNextRun/WORKSPACE_LABEL neste package.
const MEETING_TYPE_LABEL: Record<string, string> = {
  mensal: "Mensal",
  ordinaria: "Ordinária",
  extraordinaria: "Extraordinária",
};

// Intranet não tem variável própria em ECOSYSTEM_APPS (packages/ui) — mesmo
// fallback fixo usado em packages/jobs/src/crons/briefing.ts e
// apps/intranet/src/lib/notifications.ts.
const INTRANET_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";

export async function onMeetingActionItemDecided(
  meetingDecisionId: string,
): Promise<string> {
  const [decision] = await db
    .select()
    .from(meetingDecisions)
    .where(eq(meetingDecisions.id, meetingDecisionId));
  if (!decision) {
    throw new Error(`Decisão de reunião não encontrada: ${meetingDecisionId}`);
  }

  const [session] = await db
    .select({
      type: meetingSessions.type,
      date: meetingSessions.date,
    })
    .from(meetingSessions)
    .where(eq(meetingSessions.id, decision.meetingSessionId));
  if (!session) {
    throw new Error(
      `Sessão de reunião não encontrada para a decisão ${meetingDecisionId}`,
    );
  }

  const [responsible] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, decision.responsibleId));

  const typeLabel = MEETING_TYPE_LABEL[session.type] ?? session.type;
  const meetingDateLabel = session.date.toLocaleDateString("pt-BR");
  const description = [
    `Responsável indicado na ata: ${responsible?.fullName ?? "—"}.`,
    `Reunião ${typeLabel} de ${meetingDateLabel}.`,
    `Ata: ${INTRANET_BASE_URL}/reunioes#reuniao-${decision.meetingSessionId}`,
  ].join(" ");

  const { taskId } = await createAutoTask({
    title: `Decisão de reunião: ${decision.description}`.slice(0, 200),
    description,
    workspace: "administrativo",
    dueDate: decision.dueDate,
    sourceModule: "intranet",
    sourceId: decision.id,
  });

  await db
    .update(meetingDecisions)
    .set({ taskId, updatedAt: new Date() })
    .where(eq(meetingDecisions.id, decision.id));

  return taskId;
}
