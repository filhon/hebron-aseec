import { cookies } from "next/headers";
import { desc, eq, gte, inArray } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import {
  createSupabaseServerActionClient,
  resolveSession,
} from "@hebron/auth/server";
import {
  withAuthenticatedContext,
  withSystemRole,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  meetingSessions,
  meetingDecisions,
} from "@hebron/db/schema";
import { getConsentsForUsers } from "@hebron/db/consents";
import { getFeed, type FeedModule } from "@hebron/integrations/feed";
import type { Role } from "@hebron/types/roles";
import type {
  Announcement,
  CalendarEvent,
  DirectoryMember,
  MeetingDecision,
} from "@hebron/types/intranet";
import { listAnnouncements } from "../actions/announcements";
import type { FeedItem, FeedIconKey } from "../components/feed-widget";

// ---------------------------------------------------------------------------
// getAuthUser — sessão + papéis do usuário autenticado, para o gate de papel
// do layout (G5) e para decisões de UI por papel (ex.: quem vê "Criar
// anúncio").
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  fullName: string | null;
  email: string | null;
  roles: Role[];
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerActionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Server Component — não pode setar cookies, ignorar
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Leitura própria (users_select_own/role_assignments_select_own,
  // 0000_initial.sql) — sem exceção service-level, o próprio auth.uid() já
  // é user.id.
  const [userRow, roleRows] = await withAuthenticatedContext(
    { actorId: user.id },
    (tx) =>
      Promise.all([
        tx
          .select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1),
        tx
          .select({ role: roleAssignments.role })
          .from(roleAssignments)
          .where(eq(roleAssignments.userId, user.id)),
      ]),
  );

  return {
    id: user.id,
    fullName: userRow[0]?.fullName ?? null,
    email: user.email ?? null,
    roles: roleRows.map((r) => r.role),
  };
}

/**
 * Resolve o actorId da sessão corrente para as funções de leitura abaixo,
 * que não recebem `ctx` de uma Server Action (são chamadas direto de Server
 * Components) — mesmo padrão de apps/financeiro/src/lib/queries.ts.
 */
async function getActorId(): Promise<string> {
  const cookieStore = await cookies();
  const { actorId } = await resolveSession(cookieStore);
  return actorId;
}

// ---------------------------------------------------------------------------
// Rótulos de papel (mesmo dicionário de apps/admin/.../usuarios/[id]/page.tsx
// — não importado de lá, apps nunca importam de outro app, G6.5).
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super administrador",
  diretor: "Diretor(a)",
  conselheiro: "Conselheiro(a)",
  colaborador: "Colaborador(a)",
  submissor: "Submissor(a)",
  aluno: "Aluno(a)",
  hospede: "Hóspede",
  ouvinte: "Ouvinte",
};

const ROLE_PRIORITY: Role[] = [
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
  "submissor",
  "aluno",
  "hospede",
  "ouvinte",
];

function primaryRoleLabel(roles: Role[]): string {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return ROLE_LABEL[role];
  }
  return "—";
}

// ---------------------------------------------------------------------------
// getDirectoryMembers — nome, foto, papel e contato INSTITUCIONAL de
// public.users (equipe interna: colaborador/diretor/conselheiro/super_admin).
// Não despejamos public.users inteiro: nenhum campo de status/CPF/anonimização
// sai daqui. Telefone só aparece com consentimento "comunicacao" registrado
// (P-0.13) — não há finalidade específica de "telefone pessoal" no enum, e
// "comunicacao" é a mais próxima do caso de uso (contato direto pela
// intranet). Bio (P-5.1b) é autoatendimento livre — sem gate de consentimento,
// mesmo padrão do nome/foto.
// ---------------------------------------------------------------------------

const STAFF_ROLES: Role[] = [
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variáveis Supabase não configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

const AVATAR_READ_URL_EXPIRES_IN_SECONDS = 60 * 60;

/**
 * users.avatar_url (P-5.1b) guarda o storage path em perfil-avatares, não uma
 * URL exibível — bucket privado, resolvida sob demanda a cada leitura (mesmo
 * padrão de apps/plataforma/src/actions/uploads.ts para plataforma-capas,
 * nunca uma URL assinada de longa duração persistida).
 */
export async function resolveAvatarReadUrl(
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("perfil-avatares")
    .createSignedUrl(storagePath, AVATAR_READ_URL_EXPIRES_IN_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Versão em lote de `resolveAvatarReadUrl` (P-5.9e CORRETIVO) — uma única
 * chamada `createSignedUrls` para todos os caminhos, em vez de uma
 * `createSignedUrl` por pessoa. Caminhos duplicados são deduplicados antes
 * da chamada; a chave do Map é o storage path, não o usuário, para servir
 * qualquer chamador que tenha 1:N usuário→path.
 */
export async function resolveAvatarReadUrls(
  storagePaths: string[],
): Promise<Map<string, string>> {
  const uniquePaths = [...new Set(storagePaths)];
  const result = new Map<string, string>();
  if (uniquePaths.length === 0) return result;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("perfil-avatares")
    .createSignedUrls(uniquePaths, AVATAR_READ_URL_EXPIRES_IN_SECONDS);
  if (error || !data) return result;

  for (const item of data) {
    if (item.path && item.signedUrl) result.set(item.path, item.signedUrl);
  }
  return result;
}

/**
 * Exceção service-level (mesmo padrão de getUsersMap em
 * apps/financeiro/src/lib/queries.ts, F3-15/S-57): o diretório é uma tela
 * de toda a equipe interna, mas `role_assignments_select_admin`/
 * `users_select_admin` (0000_initial.sql) só cobrem super_admin/diretor —
 * sob RLS normal um colaborador veria o próprio diretório vazio. Isolado
 * de `getDirectoryMembers`/`getStaffOptions` (P-5.9e CORRETIVO) para que o
 * segundo não precise pagar as colunas de foto/telefone/bio que só o
 * primeiro usa.
 */
async function getStaffRoleAssignments(
  sysTx: AuthenticatedTx,
): Promise<{ rolesByUser: Map<string, Role[]>; userIds: string[] }> {
  const roleRows = await sysTx
    .select({
      userId: roleAssignments.userId,
      role: roleAssignments.role,
    })
    .from(roleAssignments)
    .where(inArray(roleAssignments.role, STAFF_ROLES));

  const rolesByUser = new Map<string, Role[]>();
  for (const row of roleRows) {
    const list = rolesByUser.get(row.userId) ?? [];
    list.push(row.role);
    rolesByUser.set(row.userId, list);
  }

  return { rolesByUser, userIds: [...rolesByUser.keys()] };
}

export async function getDirectoryMembers(): Promise<DirectoryMember[]> {
  const actorId = await getActorId();

  const { rolesByUser, userRows } = await withAuthenticatedContext(
    { actorId },
    (tx) =>
      withSystemRole(tx, async (sysTx) => {
        const { rolesByUser, userIds } = await getStaffRoleAssignments(sysTx);

        const userRows =
          userIds.length === 0
            ? []
            : await sysTx
                .select({
                  id: users.id,
                  fullName: users.fullName,
                  email: users.email,
                  avatarUrl: users.avatarUrl,
                  phone: users.phone,
                  bio: users.bio,
                  status: users.status,
                  anonymizedAt: users.anonymizedAt,
                  createdAt: users.createdAt,
                  updatedAt: users.updatedAt,
                })
                .from(users)
                .where(inArray(users.id, userIds));

        return { rolesByUser, userRows };
      }),
  );

  const activeUserRows = userRows.filter(
    (u) => u.status === "active" && u.anonymizedAt === null,
  );

  // Duas idas totais para o lote inteiro (uma por finalidade de
  // consentimento, uma por assinatura de avatares) em vez de duas por
  // pessoa — o que motivou este CORRETIVO (P-5.9e).
  const [consentByUser, avatarUrlByPath] = await Promise.all([
    getConsentsForUsers(
      activeUserRows.map((u) => u.id),
      "comunicacao",
    ),
    resolveAvatarReadUrls(
      activeUserRows
        .map((u) => u.avatarUrl)
        .filter((path): path is string => path !== null),
    ),
  ]);

  const members: DirectoryMember[] = activeUserRows.map((u) => ({
    id: u.id,
    userId: u.id,
    name: u.fullName ?? u.email,
    avatarUrl: u.avatarUrl ? (avatarUrlByPath.get(u.avatarUrl) ?? null) : null,
    role: primaryRoleLabel(rolesByUser.get(u.id) ?? []),
    email: u.email,
    phone: consentByUser.get(u.id)?.granted ? u.phone : null,
    bio: u.bio,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  return members.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export interface StaffOption {
  id: string;
  name: string;
}

/**
 * Opções de responsável para o formulário de decisão de reunião — id e
 * nome, nada mais (P-5.9e CORRETIVO: antes reaproveitava
 * `getDirectoryMembers` inteiro e pagava foto + consentimento de todo mundo
 * só para preencher um `<select>`). Mesma restrição de papel e mesma
 * exceção service-level de `getDirectoryMembers` acima — só o conjunto de
 * colunas lidas muda.
 */
export async function getStaffOptions(): Promise<StaffOption[]> {
  const actorId = await getActorId();

  const userRows = await withAuthenticatedContext({ actorId }, (tx) =>
    withSystemRole(tx, async (sysTx) => {
      const { userIds } = await getStaffRoleAssignments(sysTx);
      if (userIds.length === 0) return [];

      return sysTx
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          status: users.status,
          anonymizedAt: users.anonymizedAt,
        })
        .from(users)
        .where(inArray(users.id, userIds));
    }),
  );

  return userRows
    .filter((u) => u.status === "active" && u.anonymizedAt === null)
    .map((u) => ({ id: u.id, name: u.fullName ?? u.email }));
}

// ---------------------------------------------------------------------------
// admin.meeting_sessions — Calendário do Bloco A é mock (CalendarEvent com
// tipos prazo/evento/outro); não existe tabela para isso ainda. P-5.9 entrega
// o que o critério de aceite pede: "Calendário com meeting_sessions reais".
// ---------------------------------------------------------------------------

// Exportado para actions/search.ts (P-5.8c CORRETIVO): fonte única do rótulo
// de reunião — a busca global não pode recriar este dicionário.
export const MEETING_TYPE_LABEL: Record<string, string> = {
  mensal: "Mensal",
  ordinaria: "Ordinária",
  extraordinaria: "Extraordinária",
};

export interface MeetingSessionOption {
  id: string;
  label: string;
  date: Date;
}

// Teto de leitura (P-5.9d CORRETIVO, critério "nenhuma leitura de
// meeting_sessions/meeting_decisions sem janela ou teto em lib/queries.ts").
// Dropdown de seleção de sessão no formulário de decisão — 200 sessões
// (mais de 15 anos de reuniões mensais) cobre qualquer uso real sem exigir
// aviso de corte na tela, que aqui não existe.
const MEETING_SESSION_OPTIONS_LIMIT = 200;

// `chairUserId` restringe às sessões presididas por esse usuário (PATCH-017:
// diretor/conselheiro só podem registrar/atualizar decisões da própria
// sessão — a mesma regra de 0040_intranet_meeting_decisions_chair_rls.sql).
// Omitido (ou super_admin, que muta qualquer sessão) retorna todas.
export async function getMeetingSessionOptions(
  chairUserId?: string,
): Promise<MeetingSessionOption[]> {
  const actorId = await getActorId();

  // `meeting_sessions_select_board` (0002_admin.sql) só cobre
  // super_admin/diretor/conselheiro — sem exceção: um colaborador que
  // navegue até /reunioes deve mesmo ver 0 opções, RLS de propósito.
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select()
      .from(meetingSessions)
      .where(
        chairUserId ? eq(meetingSessions.chairUserId, chairUserId) : undefined,
      )
      .orderBy(desc(meetingSessions.date))
      .limit(MEETING_SESSION_OPTIONS_LIMIT),
  );

  return rows.map((m) => ({
    id: m.id,
    label: `${MEETING_TYPE_LABEL[m.type] ?? m.type} — ${m.date.toLocaleDateString("pt-BR")}`,
    date: m.date,
  }));
}

export interface MeetingSessionWithDecisions {
  id: string;
  date: Date;
  type: string;
  typeLabel: string;
  status: string;
  notes: string | null;
  chairUserId: string | null;
  chairName: string | null;
  decisions: MeetingDecision[];
}

// Janela + teto (P-5.9d CORRETIVO): sem eles, a leitura crescia com a
// tabela inteira a cada carga de `/`, `/calendario` e `/reunioes` — mesmo
// crescimento sem limite que P-5.3b fechou em `listAnnouncements` e P-4.6b
// fechou no painel de Atividade de Tarefas. Padrão: sessões dos últimos
// MEETING_SESSIONS_WINDOW_MONTHS meses + todas as futuras (`since` cobre os
// dois — toda data futura já é >= `since`), ordenadas da mais futura/recente
// para a mais antiga e tetadas em `limit`. Cada chamador ajusta o que
// precisa: painel (feedLimit, o bastante para o feed e o dia atual),
// /calendario (padrão, a janela da agenda), /reunioes (histórico completo —
// `since` no epoch — tetado em MEETING_SESSIONS_LIST_LIMIT, com aviso de
// corte, mesmo desenho de P-5.3b em /anuncios).
const MEETING_SESSIONS_WINDOW_MONTHS = 12;
export const MEETING_SESSIONS_LIST_LIMIT = 50;

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

export interface MeetingSessionsQuery {
  /** Sessões com data >= este limite. Padrão: hoje menos 12 meses. */
  since?: Date;
  /** Teto de sessões retornadas. Padrão: MEETING_SESSIONS_LIST_LIMIT. */
  limit?: number;
}

export async function getMeetingSessionsWithDecisions(
  query: MeetingSessionsQuery = {},
): Promise<MeetingSessionWithDecisions[]> {
  const actorId = await getActorId();
  const since = query.since ?? monthsAgo(MEETING_SESSIONS_WINDOW_MONTHS);
  const limit = query.limit ?? MEETING_SESSIONS_LIST_LIMIT;

  // meeting_sessions/meeting_decisions: sem exceção (mesma razão de
  // getMeetingSessionOptions acima — `meeting_sessions_select_board`/
  // `meeting_decisions_select_board`+`_select_admin` já restringem a
  // super_admin/diretor/conselheiro, de propósito). O nome de
  // chair/responsible, porém, é a mesma exceção service-level de
  // getDirectoryMembers (fullName de terceiros).
  const { sessions, decisionRows, nameRows } = await withAuthenticatedContext(
    { actorId },
    async (tx) => {
      const sessions = await tx
        .select()
        .from(meetingSessions)
        .where(gte(meetingSessions.date, since))
        .orderBy(desc(meetingSessions.date))
        .limit(limit);

      // Decisões só das sessões carregadas acima — nunca a tabela inteira.
      const sessionIds = sessions.map((s) => s.id);
      const decisionRows =
        sessionIds.length > 0
          ? await tx
              .select()
              .from(meetingDecisions)
              .where(inArray(meetingDecisions.meetingSessionId, sessionIds))
          : [];

      const userIds = new Set<string>();
      for (const session of sessions) {
        if (session.chairUserId) userIds.add(session.chairUserId);
      }
      for (const decision of decisionRows) userIds.add(decision.responsibleId);

      const nameRows =
        userIds.size > 0
          ? await withSystemRole(tx, (sysTx) =>
              sysTx
                .select({ id: users.id, fullName: users.fullName })
                .from(users)
                .where(inArray(users.id, [...userIds])),
            )
          : [];

      return { sessions, decisionRows, nameRows };
    },
  );
  const nameById = new Map(nameRows.map((r) => [r.id, r.fullName ?? "—"]));

  const decisionsBySession = new Map<string, MeetingDecision[]>();
  for (const decision of decisionRows) {
    const list = decisionsBySession.get(decision.meetingSessionId) ?? [];
    list.push({
      id: decision.id,
      meetingSessionId: decision.meetingSessionId,
      description: decision.description,
      responsibleId: decision.responsibleId,
      responsibleName: nameById.get(decision.responsibleId) ?? "—",
      dueDate: decision.dueDate,
      status: decision.status,
      taskId: decision.taskId,
      createdAt: decision.createdAt,
      updatedAt: decision.updatedAt,
    });
    decisionsBySession.set(decision.meetingSessionId, list);
  }

  return sessions.map((session) => ({
    id: session.id,
    date: session.date,
    type: session.type,
    typeLabel: MEETING_TYPE_LABEL[session.type] ?? session.type,
    status: session.status,
    notes: session.notes,
    chairUserId: session.chairUserId,
    chairName: session.chairUserId
      ? (nameById.get(session.chairUserId) ?? null)
      : null,
    decisions: decisionsBySession.get(session.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// getAnnouncementsWithAuthors — reaproveita a leitura já gated de
// actions/announcements.ts (listAnnouncements, staffAction) e só acrescenta o
// nome do autor, que a tabela intranet.announcements não guarda (só author_id).
// ---------------------------------------------------------------------------

export async function getAnnouncementsWithAuthors(): Promise<Announcement[]> {
  const result = await listAnnouncements({});
  const rows = result?.data?.announcements ?? [];
  if (rows.length === 0) return [];

  const actorId = await getActorId();
  const authorIds = [...new Set(rows.map((r) => r.authorId))];
  // Exceção service-level (mesma razão de getDirectoryMembers): autor pode
  // ser qualquer membro da diretoria, não só o próprio ator lendo o feed.
  const nameRows = await withAuthenticatedContext({ actorId }, (tx) =>
    withSystemRole(tx, (sysTx) =>
      sysTx
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, authorIds)),
    ),
  );
  const nameById = new Map(nameRows.map((r) => [r.id, r.fullName ?? "—"]));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    priority: r.priority,
    authorId: r.authorId,
    authorName: nameById.get(r.authorId) ?? "—",
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// getFeedItems — consome getFeed (@hebron/integrations/feed, P-5.11) e
// converte FeedEvent → FeedItem (rótulo de módulo + iconKey do lado
// client). Sem reimplementação de visibilidade: quem filtra por papel
// continua sendo a RLS dentro de getFeed (withAuthenticatedContext).
// ---------------------------------------------------------------------------

const FEED_MODULE_LABEL: Record<FeedModule, string> = {
  projetos: "Projetos",
  financeiro: "Financeiro",
  tarefas: "Tarefas",
};

const FEED_MODULE_ICON: Record<FeedModule, FeedIconKey> = {
  projetos: "projeto",
  financeiro: "financeiro",
  tarefas: "tarefa",
};

export async function getFeedItems(limit: number): Promise<FeedItem[]> {
  const actorId = await getActorId();
  const events = await getFeed({ actorId, limit });

  return events.map((event) => ({
    id: `${event.module}-${event.id}`,
    module: FEED_MODULE_LABEL[event.module],
    title: event.title,
    description: event.description ?? undefined,
    occurredAt: event.occurredAt,
    iconKey: FEED_MODULE_ICON[event.module],
  }));
}

// ---------------------------------------------------------------------------
// meetingSessionsToCalendarEvents — adapta admin.meeting_sessions e as
// decisões de ata para o formato CalendarEvent que CalendarWidget (P-5.2) já
// sabe renderizar. Usado pelo Dashboard e pela página de Calendário — os
// únicos dois lugares que precisam do CalendarWidget, por isso vive aqui em
// vez de um componente à parte.
//
// P-5.9d CORRETIVO: cada decisão com `dueDate` e status diferente de
// "concluida" também vira um CalendarEvent de tipo "prazo" — decisão
// concluída não é mais pendência, não entra na agenda.
// ---------------------------------------------------------------------------

export function meetingSessionsToCalendarEvents(
  sessions: MeetingSessionWithDecisions[],
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const session of sessions) {
    events.push({
      id: session.id,
      title: `Reunião ${session.typeLabel}`,
      description: session.notes,
      type: "reuniao",
      startAt: session.date,
      endAt: null,
      location: null,
      meetingSessionId: session.id,
      createdBy: "",
      createdByName: session.chairName ?? "—",
      createdAt: session.date,
      updatedAt: session.date,
    });

    for (const decision of session.decisions) {
      if (!decision.dueDate || decision.status === "concluida") continue;
      events.push({
        id: `decision-${decision.id}`,
        // Sem prefixo "Prazo:" aqui — o rótulo já vem do tipo do evento
        // (badge em CalendarWidget); repetir no título duplicava a palavra.
        title: decision.description,
        description: `Reunião ${session.typeLabel} — responsável ${decision.responsibleName}`,
        type: "prazo",
        startAt: decision.dueDate,
        endAt: null,
        location: null,
        meetingSessionId: session.id,
        createdBy: decision.responsibleId,
        createdByName: decision.responsibleName,
        createdAt: decision.createdAt,
        updatedAt: decision.updatedAt,
      });
    }
  }

  return events;
}
