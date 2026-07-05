import { and, eq } from "drizzle-orm";
import { db as defaultDb } from "./client";
import { logAudit } from "./audit";
import { consents } from "./schema/public";
import type { Consent, ConsentPurpose } from "./schema/public";

/**
 * Minimal database handle accepted by the consent helpers — either the
 * app-wide singleton `db` or a `tx` yielded by `db.transaction(...)`.
 */
export interface ConsentDbHandle {
  select: (typeof defaultDb)["select"];
  insert: (typeof defaultDb)["insert"];
  update: (typeof defaultDb)["update"];
}

/** Todos os consentimentos de um usuário, um por finalidade. */
export async function getConsents(
  userId: string,
  dbHandle: ConsentDbHandle = defaultDb,
): Promise<Consent[]> {
  return dbHandle.select().from(consents).where(eq(consents.userId, userId));
}

/** O consentimento de uma finalidade específica, ou `null` se nunca foi registrado. */
export async function getConsent(
  userId: string,
  purpose: ConsentPurpose,
  dbHandle: ConsentDbHandle = defaultDb,
): Promise<Consent | null> {
  const rows = await dbHandle
    .select()
    .from(consents)
    .where(and(eq(consents.userId, userId), eq(consents.purpose, purpose)));
  return rows[0] ?? null;
}

export interface SetConsentParams {
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  /** Origem da coleta, ex.: "cadastro-flats", "meus-dados". */
  source?: string;
  /** Quem registrou a mudança — default é o próprio titular (auto-serviço). */
  actorId?: string;
}

/**
 * Registra o consentimento (ou a revogação) de uma finalidade para um
 * usuário. Idempotente por (userId, purpose) — upsert em `public.consents`.
 * Nunca remove a linha: revogação é `granted=false` + `revoked_at`, mantendo
 * o histórico de quando o consentimento existiu (P-0.13).
 *
 * Só grava audit log quando o estado de fato muda — o diff nunca contém PII
 * (a finalidade e o booleano `granted` não são dado sensível).
 */
export async function setConsent(
  params: SetConsentParams,
  dbHandle: ConsentDbHandle = defaultDb,
): Promise<Consent> {
  const now = new Date();
  const existing = await getConsent(params.userId, params.purpose, dbHandle);
  const previouslyGranted = existing?.granted ?? null;

  const rows = existing
    ? await dbHandle
        .update(consents)
        .set({
          granted: params.granted,
          grantedAt: params.granted ? now : existing.grantedAt,
          revokedAt: params.granted ? null : now,
          source: params.source ?? existing.source,
          updatedAt: now,
        })
        .where(eq(consents.id, existing.id))
        .returning()
    : await dbHandle
        .insert(consents)
        .values({
          userId: params.userId,
          purpose: params.purpose,
          granted: params.granted,
          grantedAt: params.granted ? now : null,
          revokedAt: params.granted ? null : now,
          source: params.source ?? null,
        })
        .returning();

  const saved = rows[0];
  if (!saved) throw new Error("Falha ao registrar consentimento");

  if (previouslyGranted !== params.granted) {
    await logAudit({
      actorId: params.actorId ?? params.userId,
      action: params.granted ? "consent.granted" : "consent.revoked",
      entity: "consent",
      entityId: saved.id,
      diff: { purpose: { before: null, after: params.purpose } },
    });
  }

  return saved;
}
