import { and, eq } from "drizzle-orm";
import { meetingSessions } from "@hebron/db/schema";
import { withSystemRole, type AuthenticatedTx } from "@hebron/db/authenticated";

/**
 * Prazo de contestação do submissor (Q32/Q33, PATCH-029): fecha 7 dias antes
 * da próxima reunião mensal agendada — a mesma fonte que
 * `runEvaluationReminders` usa (packages/jobs/src/crons/projetos.ts). `null`
 * quando não há reunião mensal agendada — o canal fica aberto (nenhum prazo
 * iminente a fechar).
 *
 * `admin.meeting_sessions` só concede SELECT via RLS a
 * super_admin/diretor/conselheiro ("meeting_sessions_select_board",
 * 0002_admin.sql) — um submissor não a lê pela própria sessão autenticada.
 * `withSystemRole` contorna a RLS para este cálculo, que precisa valer
 * também quando quem chama é o próprio submissor.
 */
export async function getSubmitterContestationDeadline(
  tx: AuthenticatedTx,
): Promise<Date | null> {
  const rows = await withSystemRole(tx, (sysTx) =>
    sysTx
      .select({ date: meetingSessions.date })
      .from(meetingSessions)
      .where(
        and(
          eq(meetingSessions.type, "mensal"),
          eq(meetingSessions.status, "scheduled"),
        ),
      ),
  );

  const now = new Date();
  const upcoming = rows
    .map((r) => r.date)
    .filter((d) => d >= now)
    .sort((a, b) => a.getTime() - b.getTime());

  const nextMeeting = upcoming[0];
  if (!nextMeeting) return null;

  const deadline = new Date(nextMeeting);
  deadline.setDate(deadline.getDate() - 7);
  return deadline;
}
