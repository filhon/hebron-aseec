// ─── ProjectStage ─────────────────────────────────────────────────────────────
// 9-state lifecycle: rascunho → validacao → votacao → homologacao (7d) →
// aprovado/reprovado → em_execucao → concluido | cancelado (any stage)

export type ProjectStage =
  | "rascunho"
  | "validacao"
  | "votacao"
  | "homologacao"
  | "aprovado"
  | "reprovado"
  | "em_execucao"
  | "concluido"
  | "cancelado";

// ─── ProjectType ──────────────────────────────────────────────────────────────

export type ProjectType = "pontual" | "anual";

// ─── ProjectCategory ──────────────────────────────────────────────────────────

export type ProjectCategory =
  | "evangelismo"
  | "missoes_transculturais"
  | "educacao_crista"
  | "assistencia_social"
  | "saude"
  | "capacitacao_lideranca"
  | "infraestrutura_ministerial"
  | "plantacao_de_igrejas"
  | "discipulado"
  | "outros";

// ─── Organization ─────────────────────────────────────────────────────────────
// Institutions submissores are linked to (N:N via DB).

export interface Organization {
  id: string;
  name: string;
  cnpj: string | null;
  description: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  region: string;
  city: string | null;
  state: string | null;
  country: string;
  approvedAt: Date | null;
  approvedBy: string | null; // user ID
  createdAt: Date;
  updatedAt: Date;
}

// ─── ProjectVersion ───────────────────────────────────────────────────────────
// Immutable snapshot created on every stage transition.

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  stage: ProjectStage;
  snapshot: Record<string, unknown>;
  createdBy: string; // user ID
  createdByName: string;
  createdAt: Date;
  notes: string | null;
}

// ─── Evaluation ───────────────────────────────────────────────────────────────
// Director/conselheiro opinion — visible to other directors; NOT a vote.

export interface Evaluation {
  id: string;
  projectId: string;
  evaluatorId: string; // user ID
  evaluatorName: string;
  recommendation: "sim" | "nao";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Vote ─────────────────────────────────────────────────────────────────────
// Secret vote — voter identity never exposed outside the raw DB row.

export interface Vote {
  id: string;
  projectId: string;
  inFavor: boolean;
  castAt: Date;
}

// ─── VoteSummary ──────────────────────────────────────────────────────────────

export interface VoteSummary {
  projectId: string;
  totalEligible: number;
  totalVoted: number;
  inFavor: number;
  against: number;
  quorumMet: boolean;
  /** null while voting is still open */
  approved: boolean | null;
}

// ─── Contestation ─────────────────────────────────────────────────────────────
// Max 2 per project; each eligible person may contest once.
// Triggers return to votacao stage.

export interface Contestation {
  id: string;
  projectId: string;
  contestantId: string; // user ID
  contestantName: string;
  reason: string;
  createdAt: Date;
  resolvedAt: Date | null;
}

// ─── ReportAttachment ─────────────────────────────────────────────────────────

export interface ReportAttachment {
  id: string;
  reportId: string;
  storageKey: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: Date;
}

// ─── Report ───────────────────────────────────────────────────────────────────
// Formal structured narrative — default cadence quarterly.

export type ReportStatus = "pendente" | "entregue" | "em_atraso" | "aceito";

export interface Report {
  id: string;
  projectId: string;
  period: string; // e.g. "2025-Q1"
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date;
  status: ReportStatus;
  narrativa: string;
  resultadosAlcancados: string;
  dificuldades: string | null;
  proximosPassos: string | null;
  beneficiariosAtingidos: number;
  attachments: ReportAttachment[];
  submittedBy: string | null; // user ID
  submittedByName: string | null;
  submittedAt: Date | null;
  reviewedBy: string | null; // user ID
  reviewedAt: Date | null;
  reviewNotes: string | null;
}

// ─── CompactVersion ───────────────────────────────────────────────────────────
// AI-generated executive summary created at end of submission.

export interface CompactVersion {
  id: string;
  projectId: string;
  content: string; // Markdown
  generatedBy: "ai" | "manual";
  generatedAt: Date;
  version: number;
  templateId: string | null; // references Admin template config
}

// ─── MeetingAgenda ────────────────────────────────────────────────────────────

export interface MeetingAgendaItem {
  id: string;
  order: number;
  title: string;
  description: string | null;
  /** Links this agenda item to a specific project for review */
  projectId: string | null;
  durationMinutes: number | null;
}

export interface MeetingAgenda {
  id: string;
  title: string;
  scheduledAt: Date;
  location: string | null;
  items: MeetingAgendaItem[];
  minutesText: string | null;
  closedAt: Date | null;
  presidentId: string; // user ID
  presidentName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Project base ─────────────────────────────────────────────────────────────

interface ProjectBase {
  id: string;
  type: ProjectType;
  stage: ProjectStage;
  titulo: string;
  categoria: ProjectCategory;
  organizacaoId: string;
  organizacao: Organization;
  submittedBy: string; // user ID
  submittedByName: string;
  /** Originating edital — pre-filled via ?edital_id= query param */
  editalId: string | null;
  /** Renewal link — preserved history, stages reset */
  parentProjectId: string | null;
  valorTotal: number;
  /** AI score — visible only to super_admin, diretor, conselheiro */
  aiScore: number | null;
  aiSummary: string | null;
  compactVersion: CompactVersion | null;
  currentVersionNumber: number;
  versions: ProjectVersion[];
  evaluations: Evaluation[];
  voteSummary: VoteSummary | null;
  contestations: Contestation[];
  reports: Report[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
}

// ─── AnnualProject ────────────────────────────────────────────────────────────
// Formulário estruturado completo — 10+ campos obrigatórios.
// Submissão dentro de janela definida no Admin; workflow completo.

export interface AnnualProject extends ProjectBase {
  type: "anual";
  anoReferencia: number;
  objetivos: string;
  justificativa: string;
  metodologia: string;
  contextoMinisterial: string;
  tempoMinisterioAnos: number;
  regiao: string;
  pais: string;
  beneficiariosQuantidade: number;
  beneficiariosDescricao: string;
  resultadosEsperados: string;
  cartaRecomendacao: boolean;
  numeroParcelas: number;
  /** Month numbers 1–12 when each installment is due */
  mesesPagamento: number[];
  // Optional enrichment fields
  cofinancimento: string | null;
  parcerias: string | null;
  riscos: string | null;
  indicadoresExito: string | null;
}

// ─── PontualProject ───────────────────────────────────────────────────────────
// Formulário simplificado — 6 campos obrigatórios.
// Avaliado mensalmente, consenso presencial, pagamento único.

export interface PontualProject extends ProjectBase {
  type: "pontual";
  motivoEmergencial: string;
  descricao: string;
  prazoNecessidade: Date;
  beneficiariosQuantidade: number;
  regiao: string;
  pais: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export type Project = AnnualProject | PontualProject;

// ─── CompactProjectView ───────────────────────────────────────────────────────
// Minimal shape for list/table views — avoids loading full nested objects.

export interface CompactProjectView {
  id: string;
  type: ProjectType;
  stage: ProjectStage;
  titulo: string;
  categoria: ProjectCategory;
  organizacaoNome: string;
  submittedByName: string;
  valorTotal: number;
  anoReferencia: number | null; // only annual
  aiScore: number | null;
  pendingReports: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Legacy aliases (kept for backwards compat with P-1.x consumers) ──────────

/** @deprecated use ProjectStage */
export type ProjetoStatus = ProjectStage;

/** @deprecated use Project */
export interface ProjetoBase {
  id: string;
  titulo: string;
  status: ProjectStage;
  editalId?: string;
  tipo?: string;
  categoria?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ProjetoNovoParams {
  edital_id?: string;
  tipo?: string;
  categoria?: string;
}
