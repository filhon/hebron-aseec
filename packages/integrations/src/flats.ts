// ---------------------------------------------------------------------------
// onFlatsReservationConfirmed — Flats → Tarefas
//
// Stub: a integração real nasce quando o módulo Flats for construído (Fase
// 7, P-7.11 — CS-6 da auditoria). Comportamento esperado (BRAIN.md, tabela
// de integrações cross-app §"Flats → Tarefas"):
//   Reserva confirmada gera 2 tarefas de limpeza (pré e pós-estadia), cada
//   uma a partir de um `tarefas.task_templates` seedado com slug estável
//   ("limpeza-pre-estadia" / "limpeza-pos-estadia" — P-7.11 resolve por
//   slug, não por UUID, já que nenhum prompt anterior tem como conhecer o
//   UUID gerado em runtime), via `createAutoTaskChecklist`
//   (packages/integrations/src/tarefas.ts). Datas derivadas do período da
//   reserva (dueOffsetDays do template item, relativo ao check-in/check-out
//   informado aqui), não de "agora".
//
// Uma vez implementada de verdade, esta função cria dados em outro schema —
// o chamador deve `await` (nunca fire-and-forget), mesmo que a decisão de
// negócio seja não bloquear a confirmação da reserva por causa de uma falha
// aqui (mesmo padrão documentado em onProjectSubmitted, projetos-tarefas.ts).
// ---------------------------------------------------------------------------

export async function onFlatsReservationConfirmed(
  reservationId: string,
): Promise<void> {
  // Stub — nenhuma ação real até que o módulo flats seja construído.
  console.info(
    `[integrations/flats] stub — tarefas de limpeza pré/pós-estadia pendentes para reservationId=${reservationId}`,
  );
}
