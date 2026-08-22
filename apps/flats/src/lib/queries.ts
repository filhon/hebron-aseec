import { cookies } from "next/headers";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import { createSupabaseServerActionClient } from "@hebron/auth/server";
import { createRoleGate } from "@hebron/auth/role-gate";
import { logPiiAccess } from "@hebron/auth/data-export";
import {
  units,
  reservations,
  preferredPeriods,
  flatsGuests,
  flatsVehicles,
  scoringResponses,
  aidRequests,
  documentFiles,
  users,
} from "@hebron/db/schema";
import type {
  FlatsGuest,
  FlatsVehicle,
  ScoringResponse as ScoringResponseRow,
  AidRequest as AidRequestRow,
  Reservation as ReservationRow,
  DocumentFile,
} from "@hebron/db/schema";
import type {
  AidRequest,
  Companion,
  Guest,
  LastRestOutsideCity,
  MinistryIntensity,
  MinistryLocation,
  PreferredPeriod,
  Reservation,
  ScoringCriteria,
  SupportType,
  Unit,
  UsageFrequency,
  Vehicle,
} from "@hebron/types/flats";
import type { ScoringCriterionValue } from "../actions/scoring";

// ---------------------------------------------------------------------------
// Auth — mesmo padrão de apps/plataforma/apps/projetos (lib/queries.ts):
// getAuthUser via client de sessão (auth.getUser()) + lookup em public.users
// por nome de exibição; gates de papel ficam aqui também (não há
// lib/session.ts na lista de arquivos permitidos de P-7.9, mesmo precedente
// de apps/plataforma/src/lib/queries.ts).
// ---------------------------------------------------------------------------

export async function getAuthUser(): Promise<{
  id: string;
  fullName: string | null;
  email: string | null;
} | null> {
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

  // Leitura própria (users_select_own, 0000_initial.sql) — sem exceção
  // service-level, o próprio auth.uid() já é user.id.
  const rows = await withAuthenticatedContext({ actorId: user.id }, (tx) =>
    tx
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
  );

  return {
    id: user.id,
    fullName: rows[0]?.fullName ?? null,
    email: user.email ?? null,
  };
}

/**
 * Gate para a área (hospede): papel hospede OU super_admin, com
 * diretor/conselheiro sempre bloqueados (BRAIN §6.8: conflito de
 * interesse — mesma regra replicada em actions/reservations.ts
 * #createReservation e na policy reservations_insert_own).
 */
export const requireHospedeSession = createRoleGate({
  allowedRoles: ["hospede", "super_admin"],
  blockedRoles: ["diretor", "conselheiro"],
});

/**
 * Gate para a área (admin): diretor com designação "gestor" OU
 * super_admin — mesma checagem de lib/safe-action.ts#gestorAction.
 */
export const requireGestorSession = createRoleGate({
  allowedRoles: ["diretor"],
  requireDesignation: "gestor",
  bypassRoles: ["super_admin"],
});

// ---------------------------------------------------------------------------
// Mapeamento DB → tipos de domínio (@hebron/types/flats). As leituras rodam
// sempre via withAuthenticatedContext (G6.2) — RLS de 0022_flats_rls.sql/
// 0048_flats_guests_select_own.sql é a camada ativa, não só um detalhe de
// implementação.
// ---------------------------------------------------------------------------

interface RawDateRange {
  start: string;
  end: string;
}

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function toPeriod(range: RawDateRange): PreferredPeriod {
  return { start: toDate(range.start), end: toDate(range.end) };
}

function assertNonNull<T>(value: T | null, message: string): T {
  if (value === null) throw new Error(message);
  return value;
}

function mapCompanion(row: FlatsGuest): Companion {
  return {
    id: row.id,
    name: row.name,
    cpf: row.cpf,
    birthDate: toDate(row.birthDate),
    isUnder3: row.isUnder3,
  };
}

/**
 * `Guest` de domínio representa o responsável + acompanhantes agrupados —
 * `flats.guests` tem uma linha por pessoa. Retorna null se a reserva não
 * tiver responsável (não deveria acontecer — createReservation sempre
 * insere um; defensivo).
 */
function mapGuest(
  rows: FlatsGuest[],
  documentUrlByGuestId: Map<string, string>,
): Guest | null {
  const responsible = rows.find((row) => row.isResponsible);
  if (!responsible) return null;

  const others = rows.filter((row) => !row.isResponsible);

  return {
    id: responsible.id,
    userId: responsible.userId,
    responsibleName: responsible.name,
    responsibleCpf: responsible.cpf,
    responsibleEmail: assertNonNull(
      responsible.email,
      "Guest responsável sem email",
    ),
    responsiblePhone: assertNonNull(
      responsible.phone,
      "Guest responsável sem telefone",
    ),
    responsibleBirthDate: toDate(responsible.birthDate),
    responsibleDocumentUrl: documentUrlByGuestId.get(responsible.id) ?? null,
    ministryType: assertNonNull(
      responsible.ministryType,
      "Guest responsável sem ministryType",
    ),
    ministryStartDate: toDate(
      assertNonNull(
        responsible.ministryStartDate,
        "Guest responsável sem ministryStartDate",
      ),
    ),
    companions: others.filter((row) => !row.isUnder3).map(mapCompanion),
    youngChildren: others.filter((row) => row.isUnder3).map(mapCompanion),
    createdAt: responsible.createdAt,
    updatedAt: responsible.updatedAt,
  };
}

function mapVehicle(row: FlatsVehicle): Vehicle {
  return {
    id: row.id,
    reservationId: row.reservationId,
    plate: row.plate,
    color: row.color,
    model: row.model,
    brand: row.brand,
  };
}

function mapAidRequest(
  row: AidRequestRow,
  reviewedByName: string | null,
): AidRequest {
  return {
    id: row.id,
    reservationId: row.reservationId,
    requestsDailyAllowance: row.requestsDailyAllowance,
    dailyAllowanceAmount:
      row.dailyAllowanceAmount !== null
        ? Number(row.dailyAllowanceAmount)
        : null,
    transportMode: row.transportMode,
    transportPassengerCount: row.transportPassengerCount,
    transportAmount:
      row.transportAmount !== null ? Number(row.transportAmount) : null,
    status: row.status,
    reviewedBy: row.reviewedBy,
    reviewedByName,
    reviewedAt: row.reviewedAt,
    financeiroExpenseId: row.financeiroExpenseId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Monta o `ScoringCriteria` de domínio a partir das 10 linhas de
 * flats.scoring_responses (uma por critério a-j). Sugestão de IA e
 * confirmação do gestor (aiSuggestedPoints/confirmedBy) ficam null — essas
 * colunas só existem a partir de P-7.13 (PATCH-012), fora do escopo deste
 * prompt (mesma nota já registrada em actions/scoring.ts).
 */
function buildScoring(
  reservationId: string,
  rows: ScoringResponseRow[],
  scoreTotalFallback: number | null,
): ScoringCriteria | null {
  if (rows.length === 0) return null;

  const byCriterion = new Map(rows.map((row) => [row.criterion, row] as const));
  const pointsOf = (criterion: ScoringCriterionValue) =>
    byCriterion.get(criterion)?.points ?? 0;
  const valueOf = (criterion: ScoringCriterionValue) =>
    byCriterion.get(criterion)?.value ?? null;

  const ministryYearsValue = valueOf("a_tempo_ministerio");
  const totalFromRows = rows.reduce((sum, row) => sum + row.points, 0);
  const latestUpdatedAt = rows.reduce(
    (latest, row) =>
      row.updatedAt.getTime() > latest.getTime() ? row.updatedAt : latest,
    new Date(0),
  );

  return {
    id: reservationId,
    reservationId,
    ministryYears: ministryYearsValue ? Number(ministryYearsValue) : 0,
    ministryYearsPoints: pointsOf("a_tempo_ministerio"),
    usageFrequency: (valueOf("b_frequencia_uso") ?? "nunca") as UsageFrequency,
    usageFrequencyPoints: pointsOf("b_frequencia_uso"),
    ministryLocation: (valueOf("c_localizacao") ??
      "centro") as MinistryLocation,
    ministryLocationPoints: pointsOf("c_localizacao"),
    healthDeclared: byCriterion.get("d_saude")?.healthSelfDeclared ?? false,
    healthDeclaredPoints: pointsOf("d_saude"),
    aiSuggestedHealthDeclaredPoints: null,
    specialFamilySituation: valueOf("e_situacao_familiar"),
    specialFamilySituationPoints: pointsOf("e_situacao_familiar"),
    lastRestOutsideCity: (valueOf("f_ultimo_descanso") ??
      "menos_de_1_ano") as LastRestOutsideCity,
    lastRestOutsideCityPoints: pointsOf("f_ultimo_descanso"),
    ministryIntensity: (valueOf("g_intensidade_ministerial") ??
      "baixa") as MinistryIntensity,
    ministryIntensityPoints: pointsOf("g_intensidade_ministerial"),
    aiSuggestedMinistryIntensityPoints: null,
    hasRecommendationLetter: valueOf("h_carta_recomendacao") === "sim",
    recommendationLetterPoints: pointsOf("h_carta_recomendacao"),
    supportType: (valueOf("i_tipo_sustento") ??
      "autossustentado") as SupportType,
    supportTypePoints: pointsOf("i_tipo_sustento"),
    participatedInHebronProjects: valueOf("j_participacao_projetos") === "sim",
    participatedInHebronProjectsPoints: pointsOf("j_participacao_projetos"),
    totalPoints: scoreTotalFallback ?? totalFromRows,
    confirmedBy: null,
    confirmedByName: null,
    confirmedAt: null,
    createdAt: latestUpdatedAt,
    updatedAt: latestUpdatedAt,
  };
}

// Leitura pontual por carregamento de página — não precisa durar além do
// tempo de vida da resposta do servidor (diferente do padrão de 10 anos de
// apps/plataforma/src/actions/uploads.ts, feito para <img>/<a> de conteúdo
// público reaproveitado entre requests).
const DOCUMENT_URL_EXPIRES_IN_SECONDS = 60 * 60;

/**
 * Assina os paths de `flats.document_files` via Supabase Storage
 * (`flats-documentos`, bucket privado). Usa o client de sessão com os
 * cookies da requisição — a policy `flats_documentos_select_own_or_staff`
 * (0020_storage_buckets.sql) já cobre tanto o dono do arquivo quanto
 * super_admin/diretor, mesma dupla camada de RLS de flats.document_files
 * (0022_flats_rls.sql).
 */
async function buildDocumentUrlByGuestId(
  documentRows: DocumentFile[],
): Promise<Map<string, string>> {
  const rowsWithGuest = documentRows.filter(
    (row): row is DocumentFile & { guestId: string } => row.guestId !== null,
  );
  if (rowsWithGuest.length === 0) return new Map();

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

  // createSignedUrls em lote (D4-005, PACOTE 11, AUDIT/04-BACKLOG-CORRECAO.md)
  // em vez de um createSignedUrl por documento — mesmo padrão de
  // resolveAvatarReadUrls (apps/intranet/src/lib/queries.ts).
  const uniqueKeys = [...new Set(rowsWithGuest.map((row) => row.storageKey))];
  const { data } = await supabase.storage
    .from("flats-documentos")
    .createSignedUrls(uniqueKeys, DOCUMENT_URL_EXPIRES_IN_SECONDS);

  const urlByStorageKey = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl)
      urlByStorageKey.set(item.path, item.signedUrl);
  }

  const result = new Map<string, string>();
  for (const row of rowsWithGuest) {
    const url = urlByStorageKey.get(row.storageKey);
    if (url) result.set(row.guestId, url);
  }
  return result;
}

export interface ReservationWithGuest {
  reservation: Reservation;
  guest: Guest;
}

/**
 * Carrega reserva(s) completas — períodos, responsável/acompanhantes,
 * veículo, scoring e auxílio — em lotes (`inArray`), evitando N+1 por
 * reserva. Reservas sem responsável ou sem os 3 períodos de preferência
 * são descartadas defensivamente (não deveria acontecer — createReservation
 * sempre grava os dois juntos, na mesma transação).
 */
/**
 * Presente apenas quando a leitura é feita por um terceiro (gestor/
 * super_admin vendo o cadastro de outra pessoa) — dispara `logPiiAccess`
 * (D8-002/LGPD art. 37). `getMyReservations` (o próprio hóspede lendo seu
 * cadastro) nunca passa este parâmetro.
 */
interface GuestPiiAccessLog {
  actorId: string;
  context: string;
}

async function loadReservationsWithGuests(
  tx: AuthenticatedTx,
  reservationRows: ReservationRow[],
  accessLog?: GuestPiiAccessLog,
): Promise<ReservationWithGuest[]> {
  const ids = reservationRows.map((row) => row.id);
  if (ids.length === 0) return [];

  const [
    periodRows,
    guestRows,
    vehicleRows,
    scoringRows,
    aidRows,
    documentRows,
  ] = await Promise.all([
    tx
      .select()
      .from(preferredPeriods)
      .where(inArray(preferredPeriods.reservationId, ids)),
    tx
      .select()
      .from(flatsGuests)
      .where(inArray(flatsGuests.reservationId, ids)),
    tx
      .select()
      .from(flatsVehicles)
      .where(inArray(flatsVehicles.reservationId, ids)),
    tx
      .select()
      .from(scoringResponses)
      .where(inArray(scoringResponses.reservationId, ids)),
    tx
      .select()
      .from(aidRequests)
      .where(inArray(aidRequests.reservationId, ids)),
    tx
      .select()
      .from(documentFiles)
      .where(inArray(documentFiles.reservationId, ids)),
  ]);

  const documentUrlByGuestId = await buildDocumentUrlByGuestId(documentRows);

  const reviewerIds = [
    ...new Set(
      [
        ...reservationRows.map((row) => row.reviewedBy),
        ...aidRows.map((row) => row.reviewedBy),
      ].filter((id): id is string => id !== null),
    ),
  ];

  const reviewerRows =
    reviewerIds.length > 0
      ? await tx
          .select({ id: users.id, fullName: users.fullName })
          .from(users)
          .where(inArray(users.id, reviewerIds))
      : [];
  const reviewerNameById = new Map(
    reviewerRows.map((row) => [row.id, row.fullName]),
  );

  const result: ReservationWithGuest[] = [];

  for (const row of reservationRows) {
    const guest = mapGuest(
      guestRows.filter((guestRow) => guestRow.reservationId === row.id),
      documentUrlByGuestId,
    );
    if (!guest) continue;

    const periods = periodRows
      .filter((period) => period.reservationId === row.id)
      .sort((a, b) => a.rank - b.rank)
      .map((period) => toPeriod(period.period));
    if (periods.length !== 3) continue;

    const [first, second, third] = periods;
    if (!first || !second || !third) continue;

    const vehicleRow =
      vehicleRows.find((vehicle) => vehicle.reservationId === row.id) ?? null;
    const reservationScoringRows = scoringRows.filter(
      (scoring) => scoring.reservationId === row.id,
    );
    const aidRow = aidRows.find((aid) => aid.reservationId === row.id) ?? null;

    result.push({
      guest,
      reservation: {
        id: row.id,
        guestId: guest.id,
        unitId: row.unitId,
        preferredPeriods: [first, second, third],
        confirmedPeriod: row.selectedPeriod
          ? toPeriod(row.selectedPeriod)
          : null,
        status: row.status,
        purpose: row.purpose,
        arrivesByCar: row.arrivesByCar,
        vehicle: vehicleRow ? mapVehicle(vehicleRow) : null,
        scoring: buildScoring(row.id, reservationScoringRows, row.scoreTotal),
        aidRequest: aidRow
          ? mapAidRequest(
              aidRow,
              aidRow.reviewedBy
                ? (reviewerNameById.get(aidRow.reviewedBy) ?? null)
                : null,
            )
          : null,
        managerNotes: row.managerNotes,
        reviewedBy: row.reviewedBy,
        reviewedByName: row.reviewedBy
          ? (reviewerNameById.get(row.reviewedBy) ?? null)
          : null,
        reviewedAt: row.reviewedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  }

  if (accessLog) {
    for (const { guest } of result) {
      // Auto-serviço (hóspede lendo o próprio cadastro) não é leitura de
      // terceiro — nunca deveria acontecer aqui (accessLog só é passado
      // pelas leituras do gestor), mas a checagem é defensiva e barata.
      if (guest.userId === accessLog.actorId) continue;

      const fields = ["responsibleCpf"];
      if (guest.responsibleDocumentUrl) fields.push("responsibleDocumentUrl");
      if (guest.companions.length > 0 || guest.youngChildren.length > 0) {
        fields.push("companions.cpf", "companions.birthDate");
      }

      await logPiiAccess({
        actorId: accessLog.actorId,
        subjectUserId: guest.userId ?? guest.id,
        entity: "flats.guest",
        fields,
        context: accessLog.context,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Leituras públicas — uma por tela.
// ---------------------------------------------------------------------------

/** Catálogo (hóspede) e picklist de unidade na aprovação (gestor). */
export async function getActiveUnits(actorId: string): Promise<Unit[]> {
  return withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select()
      .from(units)
      .where(eq(units.isActive, true))
      .orderBy(asc(units.name)),
  );
}

/** "Minhas reservas" — reservas do próprio hóspede (reservations_select_own). */
export async function getMyReservations(
  actorId: string,
): Promise<ReservationWithGuest[]> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const rows = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.requestedBy, actorId))
      .orderBy(desc(reservations.createdAt));

    return loadReservationsWithGuests(tx, rows);
  });
}

/** Fila de aprovação (gestor) — reservas com status "solicitada". */
export async function getApprovalQueue(
  actorId: string,
): Promise<ReservationWithGuest[]> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const rows = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.status, "solicitada"))
      .orderBy(desc(reservations.createdAt));

    return loadReservationsWithGuests(tx, rows, {
      actorId,
      context: "fila-aprovacao",
    });
  });
}

/** Detalhe de uma reserva (gestor) — check-in/check-out + revisão. */
export async function getReservationDetail(
  actorId: string,
  reservationId: string,
): Promise<ReservationWithGuest | null> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const rows = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);

    const loaded = await loadReservationsWithGuests(tx, rows, {
      actorId,
      context: "detalhe-reserva",
    });
    return loaded[0] ?? null;
  });
}

export interface CalendarItem {
  reservation: Reservation;
  responsibleName: string;
}

const CALENDAR_STATUSES: ReservationRow["status"][] = [
  "confirmada",
  "em_curso",
  "concluida",
];

/** Calendário consolidado (gestor) — estadias confirmadas/em curso/concluídas. */
export async function getCalendarItems(
  actorId: string,
): Promise<CalendarItem[]> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const rows = await tx
      .select()
      .from(reservations)
      .where(inArray(reservations.status, CALENDAR_STATUSES))
      .orderBy(asc(reservations.updatedAt));

    const loaded = await loadReservationsWithGuests(tx, rows);
    return loaded
      .filter((item) => item.reservation.confirmedPeriod !== null)
      .map((item) => ({
        reservation: item.reservation,
        responsibleName: item.guest.responsibleName,
      }));
  });
}
