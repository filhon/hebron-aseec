/**
 * Catálogo de jobs planejados cuja lógica de negócio ainda não existe no
 * código (os prompts que a criam ainda não rodaram) — P-0.14 (AUDIT/04
 * §4, escopo) pede para "deixar registro documentado" para estes, em vez
 * de criar uma `inngest.createFunction` vazia que não faria nada real e
 * passaria por "implementada" sem estar. Quando o prompt-fonte rodar, a
 * função Inngest real entra em `src/crons/<módulo>.ts` e este registro
 * deve ser removido da lista (ou movido para o topo do arquivo, marcado
 * como implementado, se preferir manter o histórico).
 *
 * Convenção (G6.6, PROMPTS.md): todo P-X.6/P-X.8/P-X.10 que precisar de um
 * cron novo deve, ao implementá-lo, registrar aqui a remoção da entrada
 * correspondente como parte do seu critério de aceite.
 */
export interface PlannedJob {
  /** Mesmo formato do `id` que a função Inngest real vai usar quando existir. */
  id: string;
  name: string;
  /** Expressão cron planejada (sujeita a ajuste quando implementada). */
  cron: string;
  /** Prompt que introduz a lógica de negócio necessária. */
  sourcePrompt: string;
  description: string;
}

export const PLANNED_JOBS: PlannedJob[] = [
  {
    id: "flats-checkin-reminder",
    name: "Flats: instruções de check-in (3 dias antes)",
    cron: "0 8 * * *",
    sourcePrompt: "P-7.10",
    description:
      "Envia instruções de check-in 3 dias antes da reserva. Aguarda P-7.10.",
  },
  {
    id: "flats-checkout-reminder",
    name: "Flats: lembrete de check-out (no dia)",
    cron: "0 6 * * *",
    sourcePrompt: "P-7.10",
    description: "Lembrete de check-out no dia da saída. Aguarda P-7.10.",
  },
  {
    id: "radio-audiencia-snapshot",
    name: "Rádio: snapshot de audiência",
    cron: "*/15 * * * *",
    sourcePrompt: "P-8.11",
    description:
      "Agrega heartbeats do player (D-3: sessões únicas/dia + horas " +
      "ouvidas) em `radio.listener_stats`. Aguarda P-8.11.",
  },
];
