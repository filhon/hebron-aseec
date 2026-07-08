import type {
  Announcement,
  CalendarEvent,
  DashboardWidget,
  DirectoryMember,
  KPI,
  MeetingDecision,
} from "@hebron/types/intranet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const d = (offsetDays: number): Date => {
  const dt = new Date("2026-07-01T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return dt;
};

const past = (daysAgo: number) => d(-daysAgo);
const future = (daysAhead: number) => d(daysAhead);

// ─── Pessoas de referência ────────────────────────────────────────────────────

const pessoas = {
  fabio: { id: "user-diretor-01", name: "Dir. Fábio Ribeiro" },
  anaPaula: { id: "user-diretor-02", name: "Dir. Ana Paula Souza" },
  marina: { id: "user-colab-01", name: "Marina Alves" },
  thiago: { id: "user-colab-02", name: "Thiago Nunes" },
};

// ─── Announcements ────────────────────────────────────────────────────────────

export const mockAnnouncements: Announcement[] = [
  {
    id: "ann-01",
    title: "Assembleia geral marcada para 25 de julho",
    body: "<p>Convocamos toda a diretoria e o conselho para a assembleia geral ordinária, às 19h, na sede da Hebron Aseec. Pauta: prestação de contas do semestre e eleição de novo conselheiro.</p>",
    priority: "urgente",
    authorId: pessoas.fabio.id,
    authorName: pessoas.fabio.name,
    publishedAt: past(1),
    createdAt: past(2),
    updatedAt: past(1),
  },
  {
    id: "ann-02",
    title: "Novo processo de prestação de contas de projetos",
    body: "<p>A partir deste mês, toda prestação de contas deve ser enviada pelo módulo Projetos, com comprovantes anexados diretamente no formulário. Deixamos de aceitar envio por e-mail.</p>",
    priority: "importante",
    authorId: pessoas.anaPaula.id,
    authorName: pessoas.anaPaula.name,
    publishedAt: past(4),
    createdAt: past(5),
    updatedAt: past(4),
  },
  {
    id: "ann-03",
    title: "Manutenção programada no Flat 2 na próxima semana",
    body: "<p>O Flat 2 ficará indisponível para reservas entre os dias 8 e 10 de julho para reparo do ar-condicionado. Reservas já confirmadas nesse período serão realocadas pela equipe operacional.</p>",
    priority: "normal",
    authorId: pessoas.marina.id,
    authorName: pessoas.marina.name,
    publishedAt: past(6),
    createdAt: past(6),
    updatedAt: past(6),
  },
  {
    id: "ann-04",
    title: "Boas-vindas ao novo colaborador de Comunicação",
    body: "<p>Damos as boas-vindas ao Thiago Nunes, que passa a integrar a equipe de Comunicação, cuidando das redes sociais e da Rádio.</p>",
    priority: "normal",
    authorId: pessoas.fabio.id,
    authorName: pessoas.fabio.name,
    publishedAt: past(12),
    createdAt: past(12),
    updatedAt: past(12),
  },
  {
    id: "ann-05",
    title: "Rascunho: balanço anual (não publicado)",
    body: "<p>Rascunho do resumo do balanço anual para revisão da diretoria antes da publicação oficial.</p>",
    priority: "importante",
    authorId: pessoas.anaPaula.id,
    authorName: pessoas.anaPaula.name,
    publishedAt: null,
    createdAt: past(1),
    updatedAt: past(1),
  },
];

// ─── KPIs ─────────────────────────────────────────────────────────────────────
// Agregados de outros módulos (BRAIN §4.6). "Doações do mês" segue a semântica
// da decisão F1-Q10: soma das despesas lançadas na categoria "Doações" do plano
// de contas do Financeiro no mês corrente (não o total de receitas).

export const mockKpis: KPI[] = [
  {
    id: "kpi-projetos-ativos",
    name: "Projetos ativos",
    value: 14,
    unit: "projetos",
    trend: "up",
    period: "Julho/2026",
    sourceModule: "projetos",
    updatedAt: past(1),
  },
  {
    id: "kpi-alunos-plataforma",
    name: "Alunos na Plataforma",
    value: 238,
    unit: "alunos",
    trend: "up",
    period: "Julho/2026",
    sourceModule: "plataforma",
    updatedAt: past(1),
  },
  {
    id: "kpi-doacoes-mes",
    name: "Doações do mês",
    value: 18450,
    unit: "R$",
    trend: "stable",
    period: "Junho/2026",
    sourceModule: "financeiro",
    updatedAt: past(3),
  },
  {
    id: "kpi-audiencia-radio",
    name: "Audiência da Rádio",
    value: 612,
    unit: "ouvintes únicos/dia",
    trend: "down",
    period: "Junho/2026",
    sourceModule: "radio",
    updatedAt: past(3),
  },
];

// ─── DashboardWidgets ─────────────────────────────────────────────────────────
// Arranjo configurado pelo diretor Fábio (BRAIN §4.6 — dashboard por usuário).

export const mockDashboardWidgets: DashboardWidget[] = [
  {
    id: "widget-01",
    userId: pessoas.fabio.id,
    type: "kpi",
    position: 0,
    config: { kpiId: "kpi-projetos-ativos" },
    createdAt: past(60),
    updatedAt: past(10),
  },
  {
    id: "widget-02",
    userId: pessoas.fabio.id,
    type: "kpi",
    position: 1,
    config: { kpiId: "kpi-doacoes-mes" },
    createdAt: past(60),
    updatedAt: past(10),
  },
  {
    id: "widget-03",
    userId: pessoas.fabio.id,
    type: "feed",
    position: 2,
    config: { feedLimit: 5 },
    createdAt: past(60),
    updatedAt: past(60),
  },
  {
    id: "widget-04",
    userId: pessoas.fabio.id,
    type: "calendar",
    position: 3,
    config: { daysAhead: 14 },
    createdAt: past(60),
    updatedAt: past(60),
  },
  {
    id: "widget-05",
    userId: pessoas.fabio.id,
    type: "chart",
    position: 4,
    config: { kpiId: "kpi-alunos-plataforma", chartType: "line" },
    createdAt: past(30),
    updatedAt: past(30),
  },
  {
    id: "widget-06",
    userId: pessoas.fabio.id,
    type: "kpi",
    position: 5,
    config: { kpiId: "kpi-audiencia-radio" },
    createdAt: past(30),
    updatedAt: past(30),
  },
];

// ─── DirectoryMembers ─────────────────────────────────────────────────────────

export const mockDirectoryMembers: DirectoryMember[] = [
  {
    id: "dir-01",
    userId: pessoas.fabio.id,
    name: "Fábio Ribeiro",
    avatarUrl: null,
    role: "Diretor Presidente",
    email: "fabio.ribeiro@hebronaseec.com.br",
    phone: "+55 81 99111-0001",
    bio: "À frente da Hebron Aseec há 12 anos, responsável pela representação institucional e pela governança financeira.",
    createdAt: past(365),
    updatedAt: past(30),
  },
  {
    id: "dir-02",
    userId: pessoas.anaPaula.id,
    name: "Ana Paula Souza",
    avatarUrl: null,
    role: "Diretora Financeira",
    email: "ana.souza@hebronaseec.com.br",
    phone: "+55 81 99111-0002",
    bio: "Responsável pela aprovação de despesas e pela prestação de contas anual.",
    createdAt: past(365),
    updatedAt: past(30),
  },
  {
    id: "dir-03",
    userId: null,
    name: "Cons. Ricardo Melo",
    avatarUrl: null,
    role: "Conselheiro",
    email: "ricardo.melo@hebronaseec.com.br",
    phone: "+55 81 99111-0003",
    bio: "Conselheiro desde a fundação, acompanha os projetos missionários da região Nordeste.",
    createdAt: past(365),
    updatedAt: past(200),
  },
  {
    id: "dir-04",
    userId: null,
    name: "Cons. Helena Duarte",
    avatarUrl: null,
    role: "Conselheira",
    email: "helena.duarte@hebronaseec.com.br",
    phone: "+55 81 99111-0004",
    bio: "Advogada, apoia a diretoria em questões jurídicas e de compliance.",
    createdAt: past(300),
    updatedAt: past(200),
  },
  {
    id: "dir-05",
    userId: pessoas.marina.id,
    name: "Marina Alves",
    avatarUrl: null,
    role: "Coordenadora Administrativa",
    email: "marina.alves@hebronaseec.com.br",
    phone: "+55 81 99111-0005",
    bio: "Cuida da operação do dia a dia: flats, documentos e apoio à diretoria.",
    createdAt: past(240),
    updatedAt: past(60),
  },
  {
    id: "dir-06",
    userId: pessoas.thiago.id,
    name: "Thiago Nunes",
    avatarUrl: null,
    role: "Analista de Comunicação",
    email: "thiago.nunes@hebronaseec.com.br",
    phone: "+55 81 99111-0006",
    bio: "Responsável pelas redes sociais institucionais e pela produção de conteúdo da Rádio.",
    createdAt: past(12),
    updatedAt: past(12),
  },
];

// ─── CalendarEvents ───────────────────────────────────────────────────────────

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: "cal-01",
    title: "Assembleia geral ordinária",
    description: "Prestação de contas do semestre e eleição de conselheiro.",
    type: "reuniao",
    startAt: future(17),
    endAt: future(17),
    location: "Sede Hebron Aseec",
    meetingSessionId: "meeting-01",
    createdBy: pessoas.fabio.id,
    createdByName: pessoas.fabio.name,
    createdAt: past(10),
    updatedAt: past(2),
  },
  {
    id: "cal-02",
    title: "Reunião ordinária de diretoria",
    description: "Pauta mensal: acompanhamento de projetos e fluxo de caixa.",
    type: "reuniao",
    startAt: future(3),
    endAt: future(3),
    location: "Sala de reuniões",
    meetingSessionId: "meeting-02",
    createdBy: pessoas.anaPaula.id,
    createdByName: pessoas.anaPaula.name,
    createdAt: past(20),
    updatedAt: past(20),
  },
  {
    id: "cal-03",
    title: "Prazo: relatório trimestral de projetos",
    description:
      "Envio do relatório consolidado de execução dos projetos ativos.",
    type: "prazo",
    startAt: future(9),
    endAt: null,
    location: null,
    meetingSessionId: null,
    createdBy: pessoas.marina.id,
    createdByName: pessoas.marina.name,
    createdAt: past(30),
    updatedAt: past(30),
  },
  {
    id: "cal-04",
    title: "Culto de gratidão — 40 anos da Hebron Aseec",
    description: "Celebração aberta a colaboradores, diretoria e conselho.",
    type: "evento",
    startAt: future(25),
    endAt: future(25),
    location: "Auditório Central",
    meetingSessionId: null,
    createdBy: pessoas.fabio.id,
    createdByName: pessoas.fabio.name,
    createdAt: past(15),
    updatedAt: past(15),
  },
  {
    id: "cal-05",
    title: "Reunião extraordinária — aprovação de novo projeto",
    description: "Avaliação de proposta recebida fora do calendário regular.",
    type: "reuniao",
    startAt: past(5),
    endAt: past(5),
    location: "Sala de reuniões",
    meetingSessionId: "meeting-03",
    createdBy: pessoas.fabio.id,
    createdByName: pessoas.fabio.name,
    createdAt: past(9),
    updatedAt: past(5),
  },
  {
    id: "cal-06",
    title: "Visita técnica a projeto missionário",
    description: null,
    type: "outro",
    startAt: future(6),
    endAt: future(7),
    location: "Caruaru/PE",
    meetingSessionId: null,
    createdBy: pessoas.anaPaula.id,
    createdByName: pessoas.anaPaula.name,
    createdAt: past(4),
    updatedAt: past(4),
  },
];

// ─── MeetingDecisions ─────────────────────────────────────────────────────────
// Vinculadas a admin.MeetingSession por meetingSessionId (mesmos IDs mock usados
// em CalendarEvent acima). Decisões com taskId preenchido já viraram tarefas em
// Tarefas (BRAIN §4.6).

export const mockMeetingDecisions: MeetingDecision[] = [
  {
    id: "dec-01",
    meetingSessionId: "meeting-03",
    description:
      'Aprovar o projeto "Casa de Apoio ao Migrante" com orçamento de R$ 42.000.',
    responsibleId: pessoas.anaPaula.id,
    responsibleName: pessoas.anaPaula.name,
    dueDate: past(2),
    status: "concluida",
    taskId: "task-mock-01",
    createdAt: past(5),
    updatedAt: past(2),
  },
  {
    id: "dec-02",
    meetingSessionId: "meeting-03",
    description:
      "Solicitar parecer jurídico sobre convênio com a nova instituição parceira.",
    responsibleId: pessoas.fabio.id,
    responsibleName: pessoas.fabio.name,
    dueDate: future(10),
    status: "em_andamento",
    taskId: "task-mock-02",
    createdAt: past(5),
    updatedAt: past(1),
  },
  {
    id: "dec-03",
    meetingSessionId: "meeting-02",
    description:
      "Revisar tabela de valores de aluguel dos imóveis administrados pela Aseec.",
    responsibleId: pessoas.marina.id,
    responsibleName: pessoas.marina.name,
    dueDate: future(20),
    status: "pendente",
    taskId: null,
    createdAt: past(20),
    updatedAt: past(20),
  },
];
