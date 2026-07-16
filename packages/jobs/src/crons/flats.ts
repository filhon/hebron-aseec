import * as React from "react";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { reservations, units, users } from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { CheckinInstructionsEmail } from "@hebron/email/templates/checkin-instructions";
import type { CheckinInstructionsType } from "@hebron/email/templates/checkin-instructions";
import { inngest } from "../client";

const FLATS_BASE_URL =
  process.env.NEXT_PUBLIC_FLATS_URL ?? "https://flats.hebronaseec.com.br";

const makeInsert = makeNotificationInserter;

function dateOnlyISO(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  const iso = d.toISOString().split("T")[0];
  if (!iso) throw new Error("Data inválida");
  return iso;
}

interface ReminderRow {
  id: string;
  requestedBy: string;
  unitId: string | null;
  selectedPeriod: { start: string; end: string } | null;
}

/**
 * Não filtra por data no SQL (daterange não é indexável por igualdade de
 * ponta com o customType do Drizzle, ver comentário em
 * packages/db/src/schema/flats.ts) — escala da ONG (2 unidades, ~150
 * usuários) torna aceitável buscar todas as reservas no status e filtrar em
 * memória, mesmo padrão de simplicidade usado nos demais crons do pacote.
 */
async function findReservationsByStatus(
  status: "confirmada" | "em_curso",
): Promise<ReminderRow[]> {
  return db
    .select({
      id: reservations.id,
      requestedBy: reservations.requestedBy,
      unitId: reservations.unitId,
      selectedPeriod: reservations.selectedPeriod,
    })
    .from(reservations)
    .where(eq(reservations.status, status));
}

async function sendReminder(
  row: ReminderRow,
  type: CheckinInstructionsType,
): Promise<void> {
  if (!row.selectedPeriod || !row.unitId) return;

  const [recipient] = await db
    .select({ email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, row.requestedBy))
    .limit(1);
  if (!recipient) return;

  const [unit] = await db
    .select({ name: units.name, description: units.description })
    .from(units)
    .where(eq(units.id, row.unitId))
    .limit(1);
  if (!unit) return;

  const resendApiKey = process.env.RESEND_API_KEY;
  const displayName = recipient.fullName ?? recipient.email;
  const period = {
    start: new Date(`${row.selectedPeriod.start}T00:00:00Z`),
    end: new Date(`${row.selectedPeriod.end}T00:00:00Z`),
  };
  const title =
    type === "checkin"
      ? `Instruções de check-in: ${unit.name}`
      : `Lembrete de check-out: ${unit.name}`;

  await createNotification({
    insert: makeInsert(),
    resendApiKey,
    data: {
      userId: row.requestedBy,
      channel: "email",
      type:
        type === "checkin"
          ? "flats.reservation.checkin_instructions"
          : "flats.reservation.checkout_reminder",
      title,
      payload: { reservationId: row.id, href: "/minhas-reservas" },
    },
    email: {
      to: recipient.email,
      subject: title,
      template: React.createElement(CheckinInstructionsEmail, {
        recipientName: displayName,
        type,
        unitName: unit.name,
        instructions: unit.description,
        period,
        reservationUrl: `${FLATS_BASE_URL}/minhas-reservas`,
      }),
    },
  });
}

// ---------------------------------------------------------------------------
// runFlatsCheckinReminders — instruções de check-in 3 dias antes da chegada
// (BRAIN §6.8, escopo P-7.10). Idempotência: sem coluna de "já lembrado",
// mas a janela de comparação é a data exata (não um intervalo), então o cron
// só envia no dia D-3 — mesmo risco de reenvio em execuções múltiplas no
// mesmo dia já aceito em runEditalClosingReminders (crons/documentos.ts).
// ---------------------------------------------------------------------------

export async function runFlatsCheckinReminders(): Promise<{ sent: number }> {
  const targetDate = dateOnlyISO(3);
  const rows = await findReservationsByStatus("confirmada");
  const due = rows.filter((r) => r.selectedPeriod?.start === targetDate);

  for (const row of due) await sendReminder(row, "checkin");

  return { sent: due.length };
}

// ---------------------------------------------------------------------------
// runFlatsCheckoutReminders — lembrete de check-out no dia da saída (BRAIN
// §6.8, escopo P-7.10).
// ---------------------------------------------------------------------------

export async function runFlatsCheckoutReminders(): Promise<{ sent: number }> {
  const targetDate = dateOnlyISO(0);
  const rows = await findReservationsByStatus("em_curso");
  const due = rows.filter((r) => r.selectedPeriod?.end === targetDate);

  for (const row of due) await sendReminder(row, "checkout");

  return { sent: due.length };
}

export const flatsCheckinReminderCron = inngest.createFunction(
  {
    id: "flats-checkin-reminder",
    name: "Flats: instruções de check-in (3 dias antes)",
  },
  { cron: "0 8 * * *" },
  async ({ step }) =>
    step.run("run-flats-checkin-reminders", runFlatsCheckinReminders),
);

export const flatsCheckoutReminderCron = inngest.createFunction(
  {
    id: "flats-checkout-reminder",
    name: "Flats: lembrete de check-out (no dia)",
  },
  { cron: "0 6 * * *" },
  async ({ step }) =>
    step.run("run-flats-checkout-reminders", runFlatsCheckoutReminders),
);
