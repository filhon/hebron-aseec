import * as React from "react";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  designations,
  flatsGuests as guests,
  preferredPeriods,
  reservations,
  roleAssignments,
  units,
  users,
} from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { ReservationSubmittedEmail } from "@hebron/email/templates/reservation-submitted";
import {
  ReservationApprovedEmail,
  type ReservationDecision,
} from "@hebron/email/templates/reservation-approved";

// ---------------------------------------------------------------------------
// Notificações do módulo Flats (P-7.10). Sem caller nesta sessão — a lista
// de arquivos permitidos deste prompt não inclui actions/reservations.ts nem
// actions/approval.ts; a fiação ("pontos de chamada") é escopo explícito de
// P-7.11 ("apps/flats/src/actions/* (apenas pontos de chamada)"). Mesmo
// padrão já documentado em notifyProjectDecision/notifyReportReminder
// (packages/jobs/src/notify/projetos.ts, P-0.14).
// ---------------------------------------------------------------------------

const FLATS_BASE_URL =
  process.env.NEXT_PUBLIC_FLATS_URL ?? "https://flats.hebronaseec.com.br";

const makeInsert = makeNotificationInserter;

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

type Recipient = { userId: string; email: string; fullName: string | null };

function dedupeById(rows: Recipient[]): Recipient[] {
  const byId = new Map<string, Recipient>();
  for (const row of rows) byId.set(row.userId, row);
  return [...byId.values()];
}

/**
 * Diretor(es) gestor(es) de flats: papel `diretor` ATIVO + designation
 * `gestor` ATIVA (mesma dupla condição de `gestorAction`,
 * apps/flats/src/lib/safe-action.ts). Sem designation `gestor` configurada,
 * cai de volta para todos os diretores ativos — rede de segurança para não
 * deixar a solicitação sem notificados (mesmo padrão de
 * runWeeklyBatchCreation, packages/jobs/src/crons/financeiro.ts).
 */
async function resolveGestorRecipients(): Promise<Recipient[]> {
  const gestorRows = await db
    .select({
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(designations)
    .innerJoin(users, eq(users.id, designations.userId))
    .innerJoin(
      roleAssignments,
      and(
        eq(roleAssignments.userId, designations.userId),
        eq(roleAssignments.role, "diretor"),
        isNull(roleAssignments.revokedAt),
      ),
    )
    .where(
      and(eq(designations.type, "gestor"), isNull(designations.revokedAt)),
    );

  if (gestorRows.length > 0) return dedupeById(gestorRows);

  const diretorRows = await db
    .select({
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(users.id, roleAssignments.userId))
    .where(
      and(
        eq(roleAssignments.role, "diretor"),
        isNull(roleAssignments.revokedAt),
      ),
    );

  return dedupeById(diretorRows);
}

// ---------------------------------------------------------------------------
// notifyReservationSubmitted — in_app + email ao(s) diretor(es) gestor
// quando uma reserva é submetida (BRAIN §6.8, escopo P-7.10).
// ---------------------------------------------------------------------------

export async function notifyReservationSubmitted(
  reservationId: string,
): Promise<void> {
  const [reservation] = await db
    .select({
      purpose: reservations.purpose,
      scoreTotal: reservations.scoreTotal,
    })
    .from(reservations)
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (!reservation) return;

  const [responsible] = await db
    .select({ name: guests.name })
    .from(guests)
    .where(
      and(
        eq(guests.reservationId, reservationId),
        eq(guests.isResponsible, true),
      ),
    )
    .limit(1);

  const periodRows = await db
    .select({ rank: preferredPeriods.rank, period: preferredPeriods.period })
    .from(preferredPeriods)
    .where(eq(preferredPeriods.reservationId, reservationId))
    .orderBy(asc(preferredPeriods.rank));

  const recipients = await resolveGestorRecipients();
  if (!recipients.length) return;

  const guestName = responsible?.name ?? "Um hóspede";
  const scoreTotal = reservation.scoreTotal ?? 0;
  const periods = periodRows.map((p) => ({
    rank: p.rank,
    start: toDate(p.period.start),
    end: toDate(p.period.end),
  }));
  const reservationUrl = `${FLATS_BASE_URL}/admin/reserva/${reservationId}`;
  const resendApiKey = process.env.RESEND_API_KEY;
  const title = `Nova solicitação de flat: ${guestName}`;

  await Promise.allSettled(
    recipients.flatMap((recipient) => [
      createNotification({
        insert: makeInsert(),
        data: {
          userId: recipient.userId,
          channel: "in_app",
          type: "flats.reservation.submitted",
          title,
          body: `${guestName} solicitou hospedagem — pontuação ${scoreTotal}/75.`,
          payload: {
            module: "flats",
            reservationId,
            href: `/admin/reserva/${reservationId}`,
          },
        },
      }),
      createNotification({
        insert: makeInsert(),
        resendApiKey,
        data: {
          userId: recipient.userId,
          channel: "email",
          type: "flats.reservation.submitted",
          title,
          body: `${guestName} solicitou hospedagem — pontuação ${scoreTotal}/75.`,
          payload: {
            module: "flats",
            reservationId,
            href: `/admin/reserva/${reservationId}`,
          },
        },
        email: {
          to: recipient.email,
          subject: title,
          template: React.createElement(ReservationSubmittedEmail, {
            recipientName: recipient.fullName ?? recipient.email,
            guestName,
            purpose: reservation.purpose,
            scoreTotal,
            periods,
            reservationUrl,
          }),
        },
      }),
    ]),
  );
}

// ---------------------------------------------------------------------------
// notifyReservationDecision — email ao hóspede que solicitou a reserva,
// quando o gestor aprova (com unidade + período final) ou rejeita (com
// motivo). Espelha notifyProjectDecision (packages/jobs/src/notify/projetos.ts).
// ---------------------------------------------------------------------------

export async function notifyReservationDecision(
  reservationId: string,
  decision: ReservationDecision,
): Promise<void> {
  const [row] = await db
    .select({
      requestedBy: reservations.requestedBy,
      unitId: reservations.unitId,
      selectedPeriod: reservations.selectedPeriod,
      managerNotes: reservations.managerNotes,
      requesterEmail: users.email,
      requesterName: users.fullName,
    })
    .from(reservations)
    .innerJoin(users, eq(users.id, reservations.requestedBy))
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (!row) return;

  let unitName: string | null = null;
  if (row.unitId) {
    const [unit] = await db
      .select({ name: units.name })
      .from(units)
      .where(eq(units.id, row.unitId))
      .limit(1);
    unitName = unit?.name ?? null;
  }

  const period = row.selectedPeriod
    ? {
        start: toDate(row.selectedPeriod.start),
        end: toDate(row.selectedPeriod.end),
      }
    : null;

  const displayName = row.requesterName ?? row.requesterEmail;
  const reservationUrl = `${FLATS_BASE_URL}/minhas-reservas`;
  const resendApiKey = process.env.RESEND_API_KEY;
  const title =
    decision === "aprovada"
      ? "Sua reserva de flat foi aprovada"
      : "Atualização sobre sua solicitação de flat";

  await createNotification({
    insert: makeInsert(),
    resendApiKey,
    data: {
      userId: row.requestedBy,
      channel: "email",
      type:
        decision === "aprovada"
          ? "flats.reservation.approved"
          : "flats.reservation.rejected",
      title,
      body:
        decision === "aprovada"
          ? `Reserva confirmada em ${unitName ?? "unidade a definir"}.`
          : (row.managerNotes ?? "Solicitação não aprovada."),
      payload: {
        module: "flats",
        reservationId,
        href: "/minhas-reservas",
      },
    },
    email: {
      to: row.requesterEmail,
      subject: title,
      template: React.createElement(ReservationApprovedEmail, {
        recipientName: displayName,
        decision,
        unitName,
        period,
        managerNotes: row.managerNotes,
        reservationUrl,
      }),
    },
  });
}
