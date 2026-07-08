// ---------------------------------------------------------------------------
// onMeetingActionItemDecided — Intranet → Tarefas
//
// Stub: a integração real nasce quando o módulo de reuniões da Intranet for
// construído (Fase 5, P-5.11 — CS-6 da auditoria). Comportamento esperado
// (BRAIN.md, tabela de integrações cross-app §"Intranet → Tarefas"):
//   Action item decidido em ata de reunião vira uma tarefa avulsa via
//   `createAutoTask` (packages/integrations/src/tarefas.ts) — sem template,
//   diferente do checklist de Projetos → Tarefas: cada action item já tem
//   título/responsável sugerido/prazo definidos na própria ata.
//
// Uma vez implementada de verdade, esta função cria dados em outro schema —
// o chamador deve `await` (nunca fire-and-forget), mesmo que a decisão de
// negócio seja não bloquear o encerramento da reunião por causa de uma
// falha aqui (mesmo padrão documentado em onProjectSubmitted,
// projetos-tarefas.ts).
// ---------------------------------------------------------------------------

export async function onMeetingActionItemDecided(
  actionItemId: string,
): Promise<void> {
  // Stub — nenhuma ação real até que o módulo de reuniões da Intranet seja
  // construído.
  console.info(
    `[integrations/intranet] stub — tarefa de action item de reunião pendente para actionItemId=${actionItemId}`,
  );
}
