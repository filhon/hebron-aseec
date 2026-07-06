import { ensureMonthlyMeetings } from "@hebron/db/meetings";
import { getSystemActorId } from "@hebron/db/system-actor";
import { inngest } from "../client";

/**
 * Reunião mensal (BRAIN §6.1) — 1ª quarta-feira do mês, criada com
 * antecedência para os próximos 3 meses. Núcleo em `@hebron/db/meetings`
 * (compartilhado com a action manual `autoCreateMonthlyMeetings` em
 * apps/admin). Origem: SESSIONS.md S-15 — "action exposta mas trigger não
 * configurado" (S1-06/CS-5, P-0.14).
 *
 * Roda 1x/mês (dia 1, 06:00 UTC); idempotente (pula meses que já têm reunião
 * mensal agendada), então uma reexecução manual não duplica nada.
 */
export const ensureMonthlyMeetingsCron = inngest.createFunction(
  {
    id: "admin-ensure-monthly-meetings",
    name: "Admin: garantir reuniões mensais",
  },
  { cron: "0 6 1 * *" },
  async ({ step }) => {
    const actorId = await step.run("get-system-actor", () =>
      getSystemActorId(),
    );
    return step.run("ensure-monthly-meetings", () =>
      ensureMonthlyMeetings({ monthsAhead: 3 }, actorId),
    );
  },
);
