import { eq } from "drizzle-orm";
import { db as defaultDb } from "@hebron/db/client";
import { consents, users } from "@hebron/db/schema";
import type { ConsentPurpose } from "@hebron/db/schema";
import { logAudit } from "@hebron/db/audit";
import type { AuditDbHandle } from "@hebron/db/audit";

/**
 * packages/auth/src/data-export.ts — LGPD, superfícies de ACESSO a dados
 * pessoais (P-9.2). Reúne duas faces do mesmo direito:
 *
 *   1. Acesso do próprio titular: `getMyDataSnapshot` (visualização em
 *      "Meus Dados") e `exportMyData` (portabilidade — art. 18, V), que
 *      serializa em JSON e CSV e registra `data.exported` no audit log.
 *   2. Acesso de terceiro (admin) a PII: `logPiiAccess`, a primitiva que
 *      audita a leitura de CPF/documentos de outra pessoa (`pii.accessed`),
 *      cumprindo "toda leitura de dado pessoal por admin fica registrada".
 *
 * As leituras aceitam o handle da sessão (`tx` de `withAuthenticatedContext`)
 * para que a RLS (`users_select_own`, `consents_select_own`) seja a camada
 * ativa (G6.2). As escritas de auditoria usam o handle privilegiado padrão
 * (superuser) porque `admin.audit_log` só aceita INSERT de service_role
 * (F3-15/S-57) — mesmo padrão de `@hebron/db/consents#setConsent`.
 */

/**
 * Handle mínimo de leitura aceito pelos coletores — o singleton `db` ou um
 * `tx` de `db.transaction(...)`/`withAuthenticatedContext`.
 */
export interface DataReadHandle {
  select: (typeof defaultDb)["select"];
}

export interface MyDataProfile {
  id: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  documentCpf: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: Date;
  /** Preenchido quando o titular já exerceu o direito de exclusão (P-0.13). */
  anonymizedAt: Date | null;
}

export interface MyDataConsent {
  purpose: ConsentPurpose;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  source: string | null;
}

/**
 * Retrato portátil dos dados pessoais que a organização armazena sobre o
 * titular. Cobre o núcleo comum a todos os apps (perfil + consentimentos);
 * dados específicos de módulo (reservas, matrículas) permanecem acessíveis
 * nas telas do próprio módulo e podem ser somados aqui num prompt futuro.
 */
export interface MyDataSnapshot {
  profile: MyDataProfile;
  consents: MyDataConsent[];
  exportedAt: Date;
}

/**
 * Lê o perfil + consentimentos do próprio titular para exibição em "Meus
 * Dados". Passe o `tx` autenticado da sessão para que a RLS de leitura
 * própria seja aplicada de verdade. Não grava auditoria — visualização não é
 * um evento de exportação.
 */
export async function getMyDataSnapshot(
  userId: string,
  dbHandle: DataReadHandle = defaultDb,
): Promise<MyDataSnapshot> {
  const userRows = await dbHandle
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      documentCpf: users.documentCpf,
      avatarUrl: users.avatarUrl,
      status: users.status,
      createdAt: users.createdAt,
      anonymizedAt: users.anonymizedAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  const profile = userRows[0];
  if (!profile) throw new Error("Usuário não encontrado");

  const consentRows = await dbHandle
    .select({
      purpose: consents.purpose,
      granted: consents.granted,
      grantedAt: consents.grantedAt,
      revokedAt: consents.revokedAt,
      source: consents.source,
    })
    .from(consents)
    .where(eq(consents.userId, userId));

  return { profile, consents: consentRows, exportedAt: new Date() };
}

export type DataExportFormat = "json" | "csv";

export interface DataExportFile {
  filename: string;
  mimeType: string;
  content: string;
}

function isoOrEmpty(value: Date | null): string {
  return value ? value.toISOString() : "";
}

/** Serializa o retrato em JSON legível (datas em ISO 8601). */
export function serializeMyDataJson(snapshot: MyDataSnapshot): string {
  return JSON.stringify(
    {
      exportedAt: snapshot.exportedAt.toISOString(),
      profile: {
        ...snapshot.profile,
        createdAt: snapshot.profile.createdAt.toISOString(),
        anonymizedAt: isoOrEmpty(snapshot.profile.anonymizedAt),
      },
      consents: snapshot.consents.map((consent) => ({
        ...consent,
        grantedAt: isoOrEmpty(consent.grantedAt),
        revokedAt: isoOrEmpty(consent.revokedAt),
      })),
    },
    null,
    2,
  );
}

/** Escapa um campo CSV conforme RFC 4180 (aspas se contiver ,"\r\n). */
function csvCell(value: string | number | boolean | null): string {
  const text = value === null ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(cells: (string | number | boolean | null)[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * Serializa em CSV com duas seções (perfil e consentimentos), separadas por
 * uma linha em branco — formato planilha-amigável para o titular.
 */
export function serializeMyDataCsv(snapshot: MyDataSnapshot): string {
  const { profile, consents: consentRows } = snapshot;

  const profileSection = [
    csvRow(["campo", "valor"]),
    csvRow(["id", profile.id]),
    csvRow(["nome", profile.fullName]),
    csvRow(["email", profile.email]),
    csvRow(["telefone", profile.phone]),
    csvRow(["cpf", profile.documentCpf]),
    csvRow(["avatar_url", profile.avatarUrl]),
    csvRow(["status", profile.status]),
    csvRow(["criado_em", profile.createdAt.toISOString()]),
    csvRow(["anonimizado_em", isoOrEmpty(profile.anonymizedAt)]),
  ];

  const consentSection = [
    csvRow([
      "finalidade",
      "concedido",
      "concedido_em",
      "revogado_em",
      "origem",
    ]),
    ...consentRows.map((consent) =>
      csvRow([
        consent.purpose,
        consent.granted,
        isoOrEmpty(consent.grantedAt),
        isoOrEmpty(consent.revokedAt),
        consent.source,
      ]),
    ),
  ];

  return [...profileSection, "", ...consentSection].join("\r\n");
}

/**
 * Monta o arquivo de exportação (nome + mime + conteúdo) no formato pedido.
 * A UI ("Meus Dados") transforma isso num Blob e dispara o download.
 */
export function buildDataExportFile(
  snapshot: MyDataSnapshot,
  format: DataExportFormat,
): DataExportFile {
  const stamp = snapshot.exportedAt.toISOString().slice(0, 10);
  if (format === "csv") {
    return {
      filename: `meus-dados-${stamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: serializeMyDataCsv(snapshot),
    };
  }
  return {
    filename: `meus-dados-${stamp}.json`,
    mimeType: "application/json;charset=utf-8",
    content: serializeMyDataJson(snapshot),
  };
}

/**
 * Exporta os dados do próprio titular (art. 18, V — portabilidade): lê com o
 * handle autenticado da sessão e registra `data.exported` no audit log com o
 * handle privilegiado. O diff guarda só o formato — nunca o conteúdo
 * exportado.
 */
export async function exportMyData(
  userId: string,
  format: DataExportFormat,
  readHandle: DataReadHandle = defaultDb,
  auditHandle: AuditDbHandle = defaultDb,
): Promise<DataExportFile> {
  const snapshot = await getMyDataSnapshot(userId, readHandle);
  const file = buildDataExportFile(snapshot, format);

  await logAudit(
    {
      actorId: userId,
      action: "data.exported",
      entity: "user",
      entityId: userId,
      diff: { format: { before: null, after: format } },
    },
    auditHandle,
  );

  return file;
}

export interface LogPiiAccessParams {
  /** Quem leu o dado pessoal (o admin/staff autenticado). */
  actorId: string;
  /** De quem é o dado pessoal lido. */
  subjectUserId: string;
  /** Entidade onde o dado vive, ex.: "flats.guest", "user", "documento". */
  entity: string;
  /** Campos de PII efetivamente lidos, ex.: ["documentCpf", "documentUrl"]. */
  fields: string[];
  /** Contexto opcional da leitura, ex.: "aprovacao-reserva". */
  context?: string;
  /**
   * "critical" (default): falha de auditoria propaga. Passe "best_effort"
   * em leituras de alto volume onde a disponibilidade importa mais que o
   * rastro (mesma semântica de `logAudit`).
   */
  criticality?: "critical" | "best_effort";
}

/**
 * Registra, em `admin.audit_log`, o acesso de um terceiro (admin/staff) a
 * dados pessoais de outra pessoa — CPF, documentos de identidade, etc.
 * (P-9.2: "leituras de CPF/documentos por admin ficam auditadas"). O diff
 * guarda apenas os NOMES dos campos e o contexto (nunca os valores), então
 * é seguro contra a lista `SENSITIVE_AUDIT_FIELDS` (que redige por valor).
 *
 * Uso nas telas que expõem PID de terceiros (ex.: gestor de flats vendo o
 * CPF do hóspede): chamar após resolver que a leitura é de fato de outro
 * titular (`actorId !== subjectUserId`).
 */
export async function logPiiAccess(
  params: LogPiiAccessParams,
  dbHandle: AuditDbHandle = defaultDb,
): Promise<void> {
  await logAudit(
    {
      actorId: params.actorId,
      action: "pii.accessed",
      entity: params.entity,
      entityId: params.subjectUserId,
      diff: {
        accessed: {
          fields: params.fields,
          context: params.context ?? null,
        },
      },
      criticality: params.criticality ?? "critical",
    },
    dbHandle,
  );
}
