// ─── AnnouncementPriority ─────────────────────────────────────────────────────

export type AnnouncementPriority = "normal" | "importante" | "urgente";

// ─── Announcement ─────────────────────────────────────────────────────────────
// body é HTML gerado pelo editor rich text compartilhado de packages/ui (D-1).

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  authorId: string;
  authorName: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── DashboardWidgetType ──────────────────────────────────────────────────────

export type DashboardWidgetType = "kpi" | "chart" | "feed" | "calendar";

// ─── DashboardWidget ──────────────────────────────────────────────────────────
// Configurável por usuário — cada colaborador/diretor monta seu próprio
// dashboard (BRAIN §4.6).

export interface DashboardWidget {
  id: string;
  userId: string;
  type: DashboardWidgetType;
  position: number;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── KPITrend ─────────────────────────────────────────────────────────────────

export type KPITrend = "up" | "down" | "stable";

// ─── KPI ──────────────────────────────────────────────────────────────────────
// Indicadores agregados de outros módulos (projetos, plataforma, financeiro,
// rádio). sourceModule identifica a origem para o widget tipo "kpi" renderizar
// o ícone/link correto.

export interface KPI {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: KPITrend;
  /** Período textual a que o valor se refere (ex: "Julho/2026") */
  period: string;
  sourceModule: string | null;
  updatedAt: Date;
}

// ─── DirectoryMember ──────────────────────────────────────────────────────────

export interface DirectoryMember {
  id: string;
  /** ID em public.users, quando o membro do diretório também é usuário do sistema */
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  role: string;
  email: string;
  phone: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── CalendarEventType ────────────────────────────────────────────────────────

export type CalendarEventType = "reuniao" | "prazo" | "evento" | "outro";

// ─── CalendarEvent ────────────────────────────────────────────────────────────
// Calendário do Bloco A é mock; integração com Google Calendar fica em P-5.13
// (feed ICS, decisão D-2).

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  type: CalendarEventType;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  /** Reunião vinculada, quando type = "reuniao" */
  meetingSessionId: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── MeetingDecisionStatus ────────────────────────────────────────────────────

export type MeetingDecisionStatus = "pendente" | "em_andamento" | "concluida";

// ─── MeetingDecision ──────────────────────────────────────────────────────────
// Vinculada a admin.MeetingSession (@hebron/types/admin). Decisões de ata podem
// virar tarefas em Tarefas (BRAIN §4.6) — taskId guarda essa referência quando
// existir.

export interface MeetingDecision {
  id: string;
  meetingSessionId: string;
  description: string;
  responsibleId: string;
  responsibleName: string;
  dueDate: Date | null;
  status: MeetingDecisionStatus;
  taskId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
