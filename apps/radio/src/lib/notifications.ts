import * as React from "react";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  consents,
  exclusiveMaterials,
  termAcceptances,
  users,
} from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { NewMaterialEmail } from "@hebron/email/templates/new-material";

// ──────────────────────────────────────────────────────────────────────────────

const makeInsert = makeNotificationInserter;

const RADIO_BASE_URL =
  process.env.NEXT_PUBLIC_RADIO_URL ?? "https://radio.hebronaseec.com.br";

function materialsUrl(): string {
  return `${RADIO_BASE_URL}/materiais`;
}

// ──────────────────────────────────────────────────────────────────────────────
// notifyNewMaterialAvailable — email só a usuários que já aceitaram o termo
// de materiais exclusivos (radio.term_acceptances) E têm consentimento de
// comunicação de novidades (public.consents, purpose="newsletter", granted,
// P-0.13). O aceite do termo de responsabilidade autoriza download — não é
// opt-in de email; os dois critérios são exigidos juntos (BRAIN §6.4).
// ──────────────────────────────────────────────────────────────────────────────

export async function notifyNewMaterialAvailable(
  materialId: string,
): Promise<void> {
  const [material] = await db
    .select({
      id: exclusiveMaterials.id,
      title: exclusiveMaterials.title,
      description: exclusiveMaterials.description,
    })
    .from(exclusiveMaterials)
    .where(eq(exclusiveMaterials.id, materialId))
    .limit(1);
  if (!material) return;

  const recipients = await db
    .select({
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .innerJoin(termAcceptances, eq(termAcceptances.userId, users.id))
    .innerJoin(consents, eq(consents.userId, users.id))
    .where(
      and(
        eq(consents.purpose, "newsletter"),
        eq(consents.granted, true),
        eq(users.status, "active"),
        isNull(users.suspendedAt),
      ),
    );
  if (recipients.length === 0) return;

  const url = materialsUrl();
  const resendApiKey = process.env.RESEND_API_KEY;
  const title = `Novo material exclusivo: ${material.title}`;

  await Promise.all(
    recipients.map((recipient) =>
      createNotification({
        insert: makeInsert(),
        resendApiKey,
        data: {
          userId: recipient.userId,
          channel: "email",
          type: "material.published",
          title,
          body: material.description ?? undefined,
          payload: {
            module: "radio",
            materialId: material.id,
            href: "/materiais",
          },
        },
        email: {
          to: recipient.email,
          subject: title,
          template: React.createElement(NewMaterialEmail, {
            recipientName: recipient.fullName ?? recipient.email,
            materialTitle: material.title,
            materialDescription: material.description,
            materialUrl: url,
          }),
        },
      }),
    ),
  );
}
