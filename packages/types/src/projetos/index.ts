// ─── ProjetoStatus ────────────────────────────────────────────────────────────

export type ProjetoStatus =
  | "rascunho"
  | "submetido"
  | "em_analise"
  | "aprovado"
  | "reprovado"
  | "cancelado";

// ─── ProjetoBase ──────────────────────────────────────────────────────────────
// Receptor dos query params gerados pelo módulo Documentos (P-1.23).
// A recepção completa no wizard será implementada na fase 2.

export interface ProjetoBase {
  id: string;
  titulo: string;
  status: ProjetoStatus;
  /** Edital de origem; pré-preenchido via query param ?edital_id= */
  editalId?: string;
  tipo?: string;
  categoria?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

// ─── ProjetoNovoParams ────────────────────────────────────────────────────────
// Shape dos query params recebidos em projetos.hebronaseec.com.br/novo

export interface ProjetoNovoParams {
  edital_id?: string;
  tipo?: string;
  categoria?: string;
}
