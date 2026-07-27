import * as React from "react";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  categories,
  documents,
  editals,
  roleAssignments,
  subscriptions,
  users,
} from "@hebron/db/schema";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { NewDocumentEmail } from "@hebron/email/templates/new-document";
import { NewVersionEmail } from "@hebron/email/templates/new-version";
import { EditalOpenEmail } from "@hebron/email/templates/edital-open";

// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL = "https://docs.hebronaseec.com.br";
const makeInsert = makeNotificationInserter;

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
        eq(subscriptions.onNewVersion, true),
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
          payload: {
            module: "documentos",
            documentId: doc.id,
            categoryId: doc.categoryId,
          },
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
// notifyVersionUpdate — dispara emails para subscribers da categoria quando
// uma nova versão é publicada em um documento já publicado (P-1.22b). Opt-in
// por edição: só é chamada quando o editor marca "avisar os inscritos" no
// formulário — publishDocument/notifyNewDocument já cobre a primeira versão.
// ──────────────────────────────────────────────────────────────────────────────

export async function notifyVersionUpdate(
  documentId: string,
  versionNumber: number,
  notes?: string | null,
): Promise<void> {
  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      categoryId: documents.categoryId,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1);

  if (!doc?.categoryId) return;

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
        eq(subscriptions.onNewVersion, true),
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
          type: "document.version_updated",
          title: `Nova versão: ${doc.title}`,
          body: `Versão ${versionNumber} publicada em ${category.name}`,
          payload: {
            module: "documentos",
            documentId: doc.id,
            categoryId: doc.categoryId,
            versionNumber,
          },
        },
        email: {
          to: sub.email,
          subject: `Nova versão em ${category.name}: ${doc.title}`,
          template: React.createElement(NewVersionEmail, {
            recipientName: sub.fullName ?? sub.email,
            documentTitle: doc.title,
            categoryName: category.name,
            documentUrl,
            versionNumber,
            summary: notes,
          }),
        },
      }),
    ),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// notifyEditalOpen — dispara emails para todos os submissores ativos e para
// os inscritos na categoria do edital com onEditalOpen = true (deduplicado
// por userId, já que um submissor pode também estar inscrito na categoria)
// ──────────────────────────────────────────────────────────────────────────────

export async function notifyEditalOpen(editalId: string): Promise<void> {
  const [row] = await db
    .select({
      title: documents.title,
      slug: documents.slug,
      categoryId: documents.categoryId,
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
  const categorySubscribers = row.categoryId
    ? await resolveEditalCategorySubscribers(row.categoryId)
    : [];
  const recipients = dedupeByUserId([...submissors, ...categorySubscribers]);
  if (!recipients.length) return;

  const editalUrl = `${BASE_URL}/editais/${row.slug}`;
  const resendApiKey = process.env.RESEND_API_KEY;
  const opensAt = row.opensAt ?? new Date();

  await Promise.all(
    recipients.map((sub) =>
      createNotification({
        insert: makeInsert(),
        resendApiKey,
        data: {
          userId: sub.userId,
          channel: "email",
          type: "edital.opened",
          title: `Edital aberto: ${row.title}`,
          body: "Novo edital disponível para submissão",
          payload: { module: "documentos", editalId },
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

// notifyEditalClosing movida para packages/jobs/src/notify/documentos.ts
// (P-0.14) — único caller (runEditalClosingReminders) foi junto para o cron
// diário em packages/jobs/src/crons/documentos.ts; nenhuma outra chamada
// nesta app dependia dela.

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

// ──────────────────────────────────────────────────────────────────────────────
// resolveEditalCategorySubscribers — inscritos na categoria do edital que
// pediram alerta de abertura (mesma tabela/critério de notifyNewDocument,
// filtrando por onEditalOpen em vez de onNewVersion)
// ──────────────────────────────────────────────────────────────────────────────

async function resolveEditalCategorySubscribers(
  categoryId: string,
): Promise<{ userId: string; email: string; fullName: string | null }[]> {
  return db
    .select({
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .where(
      and(
        eq(subscriptions.categoryId, categoryId),
        eq(subscriptions.onEditalOpen, true),
        isNull(users.suspendedAt),
      ),
    );
}

function dedupeByUserId<T extends { userId: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    out.push(row);
  }
  return out;
}
