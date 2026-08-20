import { and, desc, eq } from "drizzle-orm";
import { db as defaultDb } from "@hebron/db/client";
import { dataDeletionRequests } from "@hebron/db/schema";
import type { DataDeletionRequest } from "@hebron/db/schema";
import { logAudit } from "@hebron/db/audit";
import type { AuditDbHandle } from "@hebron/db/audit";
import { anonymizeUser } from "@hebron/db/anonymization";
import type { AnonymizeUserResult } from "@hebron/db/anonymization";
import { BusinessError } from "./safe-action-error";

/**
 * packages/auth/src/data-deletion.ts — LGPD, direito de exclusão do titular
 * (art. 18, VI). Duas metades:
 *
 *   1. `requestDataDeletion`: o titular abre um "ticket" em "Meus Dados"
 *      (`public.data_deletion_requests`, status "pending"). Auto-serviço via
 *      RLS `data_deletion_requests_insert_own` — ninguém pede em nome de
 *      terceiro.
 *   2. `executeDataDeletion` / `rejectDataDeletion`: super_admin resolve. A
 *      EXECUÇÃO reusa a primitiva de P-0.13 (`anonymizeUser`) — exclusão
 *      real é anonimização de campo, não hard delete de linha (BRAIN §9):
 *      a PII vira pseudônimo determinístico e os registros institucionais
 *      (transações contábeis, votos, pareceres) permanecem íntegros e
 *      auditáveis sob esse pseudônimo.
 *
 * Desativar o login (`auth.users`) é um efeito externo (Supabase Admin API,
 * service_role) que não pertence a esta camada de dados nem ao teste de
 * banco — entra pelo callback opcional `disableLogin`, chamado após o commit
 * da anonimização (BRAIN §9: "desativar o login faz parte do fluxo de
 * exclusão fim-a-fim de P-9.2, não da primitiva").
 */

/** Handle de leitura/escrita para a fila de pedidos. */
export interface DeletionRequestDbHandle {
  select: (typeof defaultDb)["select"];
  insert: (typeof defaultDb)["insert"];
  update: (typeof defaultDb)["update"];
}

/** O pedido de exclusão mais recente do titular (para o estado da tela). */
export async function getLatestDeletionRequest(
  userId: string,
  dbHandle: Pick<DeletionRequestDbHandle, "select"> = defaultDb,
): Promise<DataDeletionRequest | null> {
  const rows = await dbHandle
    .select()
    .from(dataDeletionRequests)
    .where(eq(dataDeletionRequests.userId, userId))
    .orderBy(desc(dataDeletionRequests.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export interface RequestDataDeletionParams {
  userId: string;
  /** Motivo opcional informado pelo titular. Não é PII. */
  reason?: string;
}

export interface RequestDataDeletionResult {
  request: DataDeletionRequest;
  /** `false` quando já havia um pedido pendente — a chamada foi idempotente. */
  created: boolean;
}

/**
 * Abre (ou reaproveita) um pedido de exclusão pendente do titular. Idempotente
 * por titular: se já existe um "pending", devolve-o sem duplicar nem
 * re-auditar. Grava `data.deletion_requested` apenas quando um novo ticket é
 * de fato criado.
 *
 * `requestHandle` é o `tx` autenticado da sessão (RLS `insert_own`); a
 * auditoria usa o handle privilegiado (mesmo padrão de `setConsent`).
 */
export async function requestDataDeletion(
  params: RequestDataDeletionParams,
  requestHandle: DeletionRequestDbHandle = defaultDb,
  auditHandle: AuditDbHandle = defaultDb,
): Promise<RequestDataDeletionResult> {
  const existing = await requestHandle
    .select()
    .from(dataDeletionRequests)
    .where(
      and(
        eq(dataDeletionRequests.userId, params.userId),
        eq(dataDeletionRequests.status, "pending"),
      ),
    )
    .limit(1);

  const pending = existing[0];
  if (pending) return { request: pending, created: false };

  const inserted = await requestHandle
    .insert(dataDeletionRequests)
    .values({
      userId: params.userId,
      status: "pending",
      reason: params.reason ?? null,
    })
    .returning();

  const request = inserted[0];
  if (!request)
    throw new BusinessError("Falha ao registrar pedido de exclusão");

  await logAudit(
    {
      actorId: params.userId,
      action: "data.deletion_requested",
      entity: "data_deletion_request",
      entityId: request.id,
      diff: { status: { before: null, after: "pending" } },
    },
    auditHandle,
  );

  return { request, created: true };
}

export interface ExecuteDataDeletionParams {
  requestId: string;
  /** super_admin que executa (ator da anonimização e do audit). */
  adminId: string;
  /**
   * Desativa o login do titular em `auth.users` (Supabase Admin API). Injetado
   * pelo chamador com o client service_role; chamado após o commit da
   * anonimização. Ausente em teste de banco (sem efeito colateral externo).
   */
  disableLogin?: (userId: string) => Promise<void>;
}

export interface ExecuteDataDeletionResult {
  requestId: string;
  userId: string;
  anonymization: AnonymizeUserResult;
}

/**
 * Executa a exclusão de um pedido pendente (super_admin): anonimiza a PII via
 * `anonymizeUser` (P-0.13), marca o ticket como "completed" e grava
 * `data.deletion_executed`. Roda com o handle privilegiado — `anonymizeUser`
 * escreve em vários schemas + `admin.audit_log` (service_role). É seguro
 * reexecutar: `anonymizeUser` é idempotente e a conclusão do ticket converge.
 */
export async function executeDataDeletion(
  params: ExecuteDataDeletionParams,
  dbHandle: typeof defaultDb = defaultDb,
): Promise<ExecuteDataDeletionResult> {
  const rows = await dbHandle
    .select()
    .from(dataDeletionRequests)
    .where(eq(dataDeletionRequests.id, params.requestId))
    .limit(1);

  const request = rows[0];
  if (!request) throw new BusinessError("Pedido de exclusão não encontrado");
  if (request.status === "rejected") {
    throw new BusinessError("Pedido de exclusão já foi recusado");
  }

  const anonymization = await anonymizeUser(
    request.userId,
    params.adminId,
    dbHandle,
  );

  await dbHandle
    .update(dataDeletionRequests)
    .set({
      status: "completed",
      resolvedBy: params.adminId,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(dataDeletionRequests.id, request.id));

  await logAudit(
    {
      actorId: params.adminId,
      action: "data.deletion_executed",
      entity: "data_deletion_request",
      entityId: request.id,
      diff: { status: { before: request.status, after: "completed" } },
    },
    dbHandle,
  );

  // Efeito externo, após as escritas de banco: desativa o login. Uma falha
  // aqui deixa a PII já anonimizada e o login ativo — estado degradado seguro,
  // recuperável reexecutando (anonymizeUser vira no-op idempotente).
  if (params.disableLogin) {
    await params.disableLogin(request.userId);
  }

  return { requestId: request.id, userId: request.userId, anonymization };
}

export interface RejectDataDeletionParams {
  requestId: string;
  adminId: string;
  /** Base legal para reter (ex.: obrigação contábil em curso). */
  notes: string;
}

/**
 * Recusa um pedido de exclusão quando há base legal para reter os dados
 * (LGPD art. 16). Marca "rejected" com a justificativa e grava
 * `data.deletion_rejected`.
 */
export async function rejectDataDeletion(
  params: RejectDataDeletionParams,
  dbHandle: DeletionRequestDbHandle = defaultDb,
  auditHandle: AuditDbHandle = defaultDb,
): Promise<DataDeletionRequest> {
  const updated = await dbHandle
    .update(dataDeletionRequests)
    .set({
      status: "rejected",
      resolvedBy: params.adminId,
      resolvedAt: new Date(),
      resolutionNotes: params.notes,
      updatedAt: new Date(),
    })
    .where(eq(dataDeletionRequests.id, params.requestId))
    .returning();

  const request = updated[0];
  if (!request) throw new BusinessError("Pedido de exclusão não encontrado");

  await logAudit(
    {
      actorId: params.adminId,
      action: "data.deletion_rejected",
      entity: "data_deletion_request",
      entityId: request.id,
      diff: { status: { before: "pending", after: "rejected" } },
    },
    auditHandle,
  );

  return request;
}
