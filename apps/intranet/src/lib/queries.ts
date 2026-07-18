import { cookies } from "next/headers";
import { desc, eq, inArray } from "drizzle-orm";
import {
  createSupabaseServerActionClient,
  resolveSession,
} from "@hebron/auth/server";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  meetingSessions,
  meetingDecisions,
} from "@hebron/db/schema";
import { getConsent } from "@hebron/db/consents";
import type { Role } from "@hebron/types/roles";
import type {
  Announcement,
  CalendarEvent,
  DirectoryMember,
  MeetingDecision,
} from "@hebron/types/intranet";
import { listAnnouncements } from "../actions/announcements";

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
// intranet). Sem coluna de bio em public.users — sempre null (não há fonte de
// verdade para esse campo até um cadastro de perfil ser modelado).
// ---------------------------------------------------------------------------

const STAFF_ROLES: Role[] = [
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
];

export async function getDirectoryMembers(): Promise<DirectoryMember[]> {
  const actorId = await getActorId();

  // Exceção service-level (mesmo padrão de getUsersMap em
  // apps/financeiro/src/lib/queries.ts, F3-15/S-57): o diretório é uma tela
  // de toda a equipe interna, mas `role_assignments_select_admin`/
  // `users_select_admin` (0000_initial.sql) só cobrem super_admin/diretor —
  // sob RLS normal um colaborador veria o próprio diretório vazio. Só
  // fullName/avatar/papel/email/telefone(consent-gated) saem daqui — os
  // mesmos campos que esta tela sempre expôs a todo o staff.
  const { rolesByUser, userRows } = await withAuthenticatedContext(
    { actorId },
    (tx) =>
      withSystemRole(tx, async (sysTx) => {
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

        const userIds = [...rolesByUser.keys()];
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

  const members = await Promise.all(
    userRows
      .filter((u) => u.status === "active" && u.anonymizedAt === null)
      .map(async (u) => {
        const consent = await getConsent(u.id, "comunicacao");
        const member: DirectoryMember = {
          id: u.id,
          userId: u.id,
          name: u.fullName ?? u.email,
          avatarUrl: u.avatarUrl,
          role: primaryRoleLabel(rolesByUser.get(u.id) ?? []),
          email: u.email,
          phone: consent?.granted ? u.phone : null,
          bio: null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
        return member;
      }),
  );

  return members.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export interface StaffOption {
  id: string;
  name: string;
}

/** Opções de responsável para o formulário de decisão de reunião. */
export async function getStaffOptions(): Promise<StaffOption[]> {
  const members = await getDirectoryMembers();
  return members.map((m) => ({ id: m.id, name: m.name }));
}

// ---------------------------------------------------------------------------
// admin.meeting_sessions — Calendário do Bloco A é mock (CalendarEvent com
// tipos prazo/evento/outro); não existe tabela para isso ainda. P-5.9 entrega
// o que o critério de aceite pede: "Calendário com meeting_sessions reais".
// ---------------------------------------------------------------------------

const MEETING_TYPE_LABEL: Record<string, string> = {
  mensal: "Mensal",
  ordinaria: "Ordinária",
  extraordinaria: "Extraordinária",
};

export interface MeetingSessionOption {
  id: string;
  label: string;
  date: Date;
}

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
      .orderBy(desc(meetingSessions.date)),
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

export async function getMeetingSessionsWithDecisions(): Promise<
  MeetingSessionWithDecisions[]
> {
  const actorId = await getActorId();

  // meeting_sessions/meeting_decisions: sem exceção (mesma razão de
  // getMeetingSessionOptions acima — `meeting_sessions_select_board`/
  // `meeting_decisions_select_board`+`_select_admin` já restringem a
  // super_admin/diretor/conselheiro, de propósito). O nome de
  // chair/responsible, porém, é a mesma exceção service-level de
  // getDirectoryMembers (fullName de terceiros).
  const { sessions, decisionRows, nameRows } = await withAuthenticatedContext(
    { actorId },
    async (tx) => {
      const [sessions, decisionRows] = await Promise.all([
        tx.select().from(meetingSessions).orderBy(desc(meetingSessions.date)),
        tx.select().from(meetingDecisions),
      ]);

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
// meetingSessionsToCalendarEvents — adapta admin.meeting_sessions para o
// formato CalendarEvent que CalendarWidget (P-5.2) já sabe renderizar. Usado
// pelo Dashboard e pela página de Calendário — os únicos dois lugares que
// precisam do CalendarWidget, por isso vive aqui em vez de um componente à
// parte.
// ---------------------------------------------------------------------------

export function meetingSessionsToCalendarEvents(
  sessions: MeetingSessionWithDecisions[],
): CalendarEvent[] {
  return sessions.map((session) => ({
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
  }));
}
