import * as React from "react";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  categories,
  documents,
  editals,
  notifications,
  roleAssignments,
  subscriptions,
  users,
} from "@hebron/db/schema";
import { createNotification } from "@hebron/email";
import type { InsertNotificationFn } from "@hebron/email";
import { NewDocumentEmail } from "@hebron/email/templates/new-document";
import { EditalOpenEmail } from "@hebron/email/templates/edital-open";
import { EditalClosingEmail } from "@hebron/email/templates/edital-closing";

// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL = "https://docs.hebronaseec.com.br";

function makeInsert(): InsertNotificationFn {
  return async (data) => {
    const [record] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        channel: data.channel,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        payload: (data.payload ?? null) as Record<string, unknown> | null,
        sentAt: data.sentAt ? new Date(data.sentAt) : null,
      })
      .returning({ id: notifications.id });
    if (!record) throw new Error("Falha ao registrar notificação");
    return record;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// notifyNewDocument — dispara emails para subscribers da categoria do documento
// ──────────────────────────────────────────────────────────────────────────────

export async function notifyNewDocument(documentId: string): Promise<void> {
  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      publishedAt: documents.publishedAt,
      categoryId: documents.categoryId,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1);

  if (!doc?.categoryId || !doc.publishedAt) return;

  const publishedAt = doc.publishedAt;

  const [category] = await db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.id, doc.categoryId))
    .limit(1);

  if (!category) return;

  const subscribers = await db
    .select({
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .where(
      and(
        eq(subscriptions.categoryId, doc.categoryId),
        isNull(users.suspendedAt),
      ),
    );

  if (!subscribers.length) return;

  const documentUrl = `${BASE_URL}/${doc.slug}`;
  const resendApiKey = process.env.RESEND_API_KEY;

  await Promise.all(
    subscribers.map((sub) =>
      createNotification({
        insert: makeInsert(),
        resendApiKey,
        data: {
          userId: sub.userId,
          channel: "email",
          type: "document.published",
          title: `Novo documento: ${doc.title}`,
          body: `Publicado em ${category.name}`,
          payload: { documentId: doc.id, categoryId: doc.categoryId },
        },
        email: {
          to: sub.email,
          subject: `Novo em ${category.name}: ${doc.title}`,
          template: React.createElement(NewDocumentEmail, {
            recipientName: sub.fullName ?? sub.email,
            documentTitle: doc.title,
            categoryName: category.name,
            documentUrl,
            publishedAt,
          }),
        },
      }),
    ),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// notifyEditalOpen — dispara emails para todos os submissores ativos
// ──────────────────────────────────────────────────────────────────────────────

export async function notifyEditalOpen(editalId: string): Promise<void> {
  const [row] = await db
    .select({
      title: documents.title,
      slug: documents.slug,
      opensAt: editals.opensAt,
      closesAt: editals.closesAt,
      projectType: editals.projectType,
    })
    .from(editals)
    .innerJoin(documents, eq(editals.id, documents.id))
    .where(and(eq(editals.id, editalId), isNull(documents.deletedAt)))
    .limit(1);

  if (!row) return;

  const submissors = await resolveSubmissors();
  if (!submissors.length) return;

  const editalUrl = `${BASE_URL}/editais/${row.slug}`;
  const resendApiKey = process.env.RESEND_API_KEY;
  const opensAt = row.opensAt ?? new Date();

  await Promise.all(
    submissors.map((sub) =>
      createNotification({
        insert: makeInsert(),
        resendApiKey,
        data: {
          userId: sub.userId,
          channel: "email",
          type: "edital.opened",
          title: `Edital aberto: ${row.title}`,
          body: "Novo edital disponível para submissão",
          payload: { editalId },
        },
        email: {
          to: sub.email,
          subject: `Edital aberto: ${row.title}`,
          template: React.createElement(EditalOpenEmail, {
            recipientName: sub.fullName ?? sub.email,
            editalTitle: row.title,
            editalUrl,
            opensAt,
            closesAt: row.closesAt,
            projectType: row.projectType,
          }),
        },
      }),
    ),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// notifyEditalClosing — lembrete 7 dias antes do fechamento do edital
// ──────────────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────────────
// resolveSubmissors — busca todos os usuários ativos com papel submissor
// ──────────────────────────────────────────────────────────────────────────────

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
