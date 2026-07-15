// ─── Unit ──────────────────────────────────────────────────────────────────
// 2 apartamentos fixos, gratuitos (BRAIN §6.8) — não há cadastro dinâmico de
// novas unidades na v1, mas o tipo permanece genérico para eventual expansão.

export interface Unit {
  id: string;
  name: string;
  description: string | null;
  /** Fixo em 6 (BRAIN §6.8) */
  capacity: number;
  /** Fixo em 2 (BRAIN §6.8) */
  bedrooms: number;
  /** Um dos 2 quartos é suíte (BRAIN §6.8) */
  hasSuite: boolean;
  photos: string[];
  amenities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── PreferredPeriod ──────────────────────────────────────────────────────
// Faixa de data aberta (não bloco fixo de 7 dias) — o hóspede submete 3
// destas por Reservation; máximo 7 dias consecutivos por período (BRAIN §6.8).

export interface PreferredPeriod {
  start: Date;
  end: Date;
}

// ─── MinistryType ─────────────────────────────────────────────────────────
// Elegibilidade (BRAIN §6.8): pastores em exercício, missionários em contexto
// transcultural, cônjuges de pastores/missionários. Diretores/conselheiros
// NÃO podem se hospedar (verificado na camada de Server Action, não aqui).

export type MinistryType =
  | "pastor"
  | "missionario"
  | "conjuge_pastor"
  | "conjuge_missionario";

// ─── Companion ────────────────────────────────────────────────────────────
// Acompanhante ou criança menor de 3 anos (Respostas10 Q158): nome completo,
// CPF e data de nascimento são obrigatórios — dados exigidos pela portaria
// do condomínio.

export interface Companion {
  id: string;
  name: string;
  cpf: string;
  birthDate: Date;
  /** Não conta na capacidade de 6 pessoas da unidade (BRAIN §6.8 / Respostas10 Q158) */
  isUnder3: boolean;
}

// ─── Guest ────────────────────────────────────────────────────────────────
// Responsável pela reserva + acompanhantes. Até 6 acompanhantes e até 2
// crianças menores de 3 anos (P-7.1, critério de aceite).

export interface Guest {
  id: string;
  /** Vinculado a public.users quando o responsável já tem conta no ecossistema */
  userId: string | null;
  responsibleName: string;
  responsibleCpf: string;
  responsibleEmail: string;
  responsiblePhone: string;
  responsibleBirthDate: Date;
  /** Foto/PDF do documento do responsável — storage bucket `flats-documentos` (BRAIN §5) */
  responsibleDocumentUrl: string | null;
  ministryType: MinistryType;
  /** Usado no critério de scoring (a) — tempo de ministério, 1pt/ano */
  ministryStartDate: Date;
  /** Máx. 6 (P-7.1, critério de aceite) */
  companions: Companion[];
  /** Máx. 2, não contam na capacidade da unidade (P-7.1, critério de aceite) */
  youngChildren: Companion[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Vehicle ──────────────────────────────────────────────────────────────
// Obrigatório apenas quando Reservation.arrivesByCar é true (Respostas10 Q158).

export interface Vehicle {
  id: string;
  reservationId: string;
  plate: string;
  color: string;
  model: string;
  brand: string;
}

// ─── ReservationStatus ────────────────────────────────────────────────────
// solicitada → aprovada/rejeitada → confirmada → em_curso → concluida
// cancelada é alcançável a partir de qualquer estado não-terminal (política
// de cancelamento configurável — .docs/Claude.md §4.8).

export type ReservationStatus =
  | "solicitada"
  | "aprovada"
  | "rejeitada"
  | "confirmada"
  | "em_curso"
  | "concluida"
  | "cancelada";

// ─── UsageFrequency / MinistryLocation / RestPeriod / MinistryIntensity / SupportType ──
// Enums das respostas brutas usadas para calcular os pontos automáticos do
// scoring (BRAIN §6.8).

export type UsageFrequency = "nunca" | "mais_de_1_ano" | "menos_de_12_meses";

export type MinistryLocation = "remota" | "periferia" | "centro";

export type LastRestOutsideCity =
  | "mais_de_2_anos"
  | "entre_1_e_2_anos"
  | "menos_de_1_ano";

export type MinistryIntensity = "alta" | "media" | "baixa";

export type SupportType = "dependente" | "parcial" | "autossustentado";

// ─── ScoringCriteria ──────────────────────────────────────────────────────
// 10 critérios (a-j), pontuação 100% determinística pela tabela do BRAIN §6.8.
// NOTA (P-7.1): o cabeçalho do BRAIN §6.8 e o critério de aceite deste prompt
// citam "máx. 80 pontos", mas a soma real dos 10 critérios documentados é 75
// (a10+b10+c10+d5+e5+f10+g10+h5+i5+j5) — d) foi reduzida de 3 níveis
// (0/5/10, com laudo) para binária (0/5) em Respostas10.md Q156, e o total
// nunca foi atualizado. Confirmado com Filipe: usar 75 como máximo real.
//
// Critérios d (saúde autodeclarada) e g (intensidade ministerial) recebem
// sugestão de IA (P-7.13, PATCH-012); o gestor sempre confirma ou ajusta
// antes de salvar — a IA nunca decide sozinha.

export const SCORING_MAX_POINTS = 75;

export interface ScoringCriteria {
  id: string;
  reservationId: string;

  /** a) Tempo de ministério — 1pt/ano, máx. 10 */
  ministryYears: number;
  ministryYearsPoints: number;

  /** b) Frequência de uso — nunca (10), >1 ano (5), <12 meses (0) */
  usageFrequency: UsageFrequency;
  usageFrequencyPoints: number;

  /** c) Local/contexto de atuação — remota (10), periferia (5), centro (0) */
  ministryLocation: MinistryLocation;
  ministryLocationPoints: number;

  /** d) Saúde autodeclarada, binário — sim (5), não (0). Sem laudos nem dados confidenciais */
  healthDeclared: boolean;
  healthDeclaredPoints: number;
  /** Sugestão de IA a partir do texto livre (P-7.13, PATCH-012) */
  aiSuggestedHealthDeclaredPoints: number | null;

  /** e) Situação familiar especial — até 5, avaliação do gestor sobre texto livre */
  specialFamilySituation: string | null;
  specialFamilySituationPoints: number;

  /** f) Último descanso fora da cidade — >2 anos (10), 1-2 anos (5), <1 ano (0) */
  lastRestOutsideCity: LastRestOutsideCity;
  lastRestOutsideCityPoints: number;

  /** g) Intensidade ministerial atual — alta (10), média (5), baixa (0) */
  ministryIntensity: MinistryIntensity;
  ministryIntensityPoints: number;
  /** Sugestão de IA a partir do texto livre (P-7.13, PATCH-012) */
  aiSuggestedMinistryIntensityPoints: number | null;

  /** h) Carta de recomendação — sim (5), não (0) */
  hasRecommendationLetter: boolean;
  recommendationLetterPoints: number;

  /** i) Tipo de sustento — dependente (5), parcial (3), autossustentado (0) */
  supportType: SupportType;
  supportTypePoints: number;

  /** j) Participação em projetos Hebron — sim (5), não (0). Auto-calculado via módulo Projetos (Respostas10 Q157) */
  participatedInHebronProjects: boolean;
  participatedInHebronProjectsPoints: number;

  /** Soma dos 10 critérios — máx. real 75 (ver SCORING_MAX_POINTS) */
  totalPoints: number;

  /** Diretor gestor que confirmou/ajustou os pontos sugeridos por IA */
  confirmedBy: string | null;
  confirmedByName: string | null;
  confirmedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Reservation ──────────────────────────────────────────────────────────
// Regra (BRAIN §6.8): máx. 7 dias consecutivos por período de 12 meses, POR
// INDIVÍDUO (não por instituição) — verificação de histórico ocorre na
// camada de Server Action (Bloco B), não é representável apenas com este tipo.

export interface Reservation {
  id: string;
  guestId: string;
  /** Definida pelo diretor gestor na aprovação, com base em scoring + conflitos de calendário */
  unitId: string | null;
  /** Exatamente 3 preferências de data, abertas (não blocos fixos) */
  preferredPeriods: [PreferredPeriod, PreferredPeriod, PreferredPeriod];
  /** Período efetivamente confirmado pelo gestor, dentro de uma das 3 preferências */
  confirmedPeriod: PreferredPeriod | null;
  status: ReservationStatus;
  purpose: string;
  arrivesByCar: boolean;
  /** Obrigatório quando arrivesByCar é true */
  vehicle: Vehicle | null;
  scoring: ScoringCriteria | null;
  aidRequest: AidRequest | null;
  managerNotes: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── TransportMode ────────────────────────────────────────────────────────

export type TransportMode = "aereo" | "combustivel" | "nenhum";

// ─── AidRequestStatus ─────────────────────────────────────────────────────

export type AidRequestStatus = "solicitado" | "aprovado" | "rejeitado";

// ─── AidRequest ───────────────────────────────────────────────────────────
// Auxílio opcional: diária fixa + transporte. Aprovado caso a caso; quando
// aprovado, cria despesa automática no Financeiro com data = dia anterior ao
// início da reserva (BRAIN §6.8).

export interface AidRequest {
  id: string;
  reservationId: string;
  requestsDailyAllowance: boolean;
  /** Valor da diária fixa, definido pela gestão na aprovação */
  dailyAllowanceAmount: number | null;
  transportMode: TransportMode;
  /** Obrigatório quando transportMode é "aereo" — usado no cálculo R$1.000/pessoa */
  transportPassengerCount: number | null;
  /** Valor total do transporte (aéreo = passageiros × R$1.000, ou valor de combustível informado/aprovado) */
  transportAmount: number | null;
  status: AidRequestStatus;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  /** ID da despesa criada em financeiro.payables quando aprovado */
  financeiroExpenseId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Compact views for lists/tables ──────────────────────────────────────

export interface CompactReservationView {
  id: string;
  guestId: string;
  responsibleName: string;
  unitId: string | null;
  unitName: string | null;
  preferredPeriods: [PreferredPeriod, PreferredPeriod, PreferredPeriod];
  confirmedPeriod: PreferredPeriod | null;
  status: ReservationStatus;
  totalPoints: number | null;
  createdAt: Date;
}
