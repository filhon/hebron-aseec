// ---------------------------------------------------------------------------
// onProjectSubmitted — Projetos → Tarefas
//
// Chamado quando um projeto transiciona de rascunho para validacao.
// Stub: a integração real (createAutoTask) nasce aqui quando o módulo
// tarefas for construído (Fase 4, P-4.11 — CS-6 da auditoria).
//
// Comportamento esperado quando tarefas for construído:
//   INSERT INTO tarefas.task_lists (project_id, template_slug, ...)
//   O template "projetos-analysis-checklist" é configurável em
//   admin.system_settings chave "projetos_analysis_checklist_template"
//   (ver @hebron/db/settings::getSystemSetting).
//
// Itens padrão do checklist de análise:
//   1. Verificar documentação da organização (CNPJ, estatuto, situação jurídica)
//   2. Confirmar elegibilidade do submissor e da organização
//   3. Validar orçamento dentro da faixa permitida pelo edital
//   4. Revisar alinhamento com objetivos estratégicos da Hebron Aseec
//   5. Verificar conflito de interesses dos avaliadores designados
//   6. Checar histórico da organização (projetos anteriores, inadimplência)
//   7. Confirmar que todos os anexos obrigatórios foram enviados
//
// Uma vez implementada de verdade, esta função cria dados em outro schema —
// o chamador deve `await` (nunca fire-and-forget) para que uma falha seja
// visível e tratável, mesmo que a decisão de negócio seja não abortar a
// submissão do projeto por causa dela.
// ---------------------------------------------------------------------------

export async function onProjectSubmitted(projectId: string): Promise<void> {
  // Stub — nenhuma ação real até que o módulo tarefas seja construído.
  // Quando implementado, criar task_list e vincular ao projeto.
  console.info(
    `[integrations/projetos-tarefas] stub — checklist de análise pendente para projectId=${projectId}`,
  );
}
