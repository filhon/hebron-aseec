import * as React from "react";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { documents, editals, roleAssignments, users } from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { EditalClosingEmail } from "@hebron/email/templates/edital-closing";

const BASE_URL = "https://docs.hebronaseec.com.br";
const makeInsert = makeNotificationInserter;

/**
 * Movida de `apps/documentos/src/lib/notifications.ts` (P-0.14) — único
 * caller era `runEditalClosingReminders`, também movida (ver
 * `../crons/documentos.ts`). `resolveSubmissors` é duplicada aqui (não
 * importada do app: package nunca importa de app) — mesmo padrão de
 * pequenas duplicações já presente entre apps (getDbTemplate/applyVars).
 */
async function resolveSubmissors(): Promise<
  { userId: string; email: string; fullName: string | null }[]
> {
  const ids = await db
    .selectDistinct({ userId: roleAssignments.userId })
    .from(roleAssignments)
    .where(eq(roleAssignments.role, "submissor"));

  if (!ids.length) return [];

  return db
    .select({
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(
      and(
        inArray(
          users.id,
          ids.map((r) => r.userId),
        ),
        isNull(users.suspendedAt),
      ),
    );
}

export async function notifyEditalClosing(
  editalId: string,
  daysUntilClose = 7,
): Promise<void> {
  const [row] = await db
    .select({
      title: documents.title,
      slug: documents.slug,
      closesAt: editals.closesAt,
    })
    .from(editals)
    .innerJoin(documents, eq(editals.id, documents.id))
    .where(and(eq(editals.id, editalId), isNull(documents.deletedAt)))
    .limit(1);

  const closesAt = row?.closesAt;
  if (!closesAt) return;

  const submissors = await resolveSubmissors();
  if (!submissors.length) return;

  const editalUrl = `${BASE_URL}/editais/${row.slug}`;
  const resendApiKey = process.env.RESEND_API_KEY;
  const dayLabel = daysUntilClose === 1 ? "1 dia" : `${daysUntilClose} dias`;

  await Promise.all(
    submissors.map((sub) =>
      createNotification({
        insert: makeInsert(),
        resendApiKey,
        data: {
          userId: sub.userId,
          channel: "email",
          type: "edital.closing",
          title: `Prazo em ${dayLabel}: ${row.title}`,
          body: `O edital encerra em ${dayLabel}`,
          payload: { editalId, daysUntilClose },
        },
        email: {
          to: sub.email,
          subject: `Lembrete: edital encerra em ${dayLabel}`,
          template: React.createElement(EditalClosingEmail, {
            recipientName: sub.fullName ?? sub.email,
            editalTitle: row.title,
            editalUrl,
            closesAt,
            daysUntilClose,
          }),
        },
      }),
    ),
  );
}
