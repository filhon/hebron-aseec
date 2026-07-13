// ---------------------------------------------------------------------------
// getStudentProgressMetrics — Plataforma → Intranet
//
// Stub: a integração real nasce quando o módulo Plataforma (LMS) for
// construído (Fase 6). Comportamento esperado (BRAIN.md, tabela de
// integrações cross-app §"Plataforma → Intranet"):
//   Métricas de progresso dos alunos (matrículas ativas, trilhas concluídas,
//   certificados emitidos) alimentam o widget de KPI do dashboard da
//   Intranet (BRAIN §6.10 — "alunos na Plataforma").
//
// Vive em packages/integrations (P-0.15) — o dashboard da Intranet nunca
// importa direto de apps/plataforma (G6.5, PROMPTS.md).
// ---------------------------------------------------------------------------

export interface StudentProgressMetrics {
  activeEnrollments: number;
  completedTracks: number;
  certificatesIssued: number;
}

export async function getStudentProgressMetrics(): Promise<StudentProgressMetrics> {
  // Stub — nenhum dado real até que o módulo Plataforma exista (Fase 6).
  console.info(
    "[integrations/plataforma] stub — métricas de progresso de alunos pendentes (Fase 6)",
  );
  return { activeEnrollments: 0, completedTracks: 0, certificatesIssued: 0 };
}
