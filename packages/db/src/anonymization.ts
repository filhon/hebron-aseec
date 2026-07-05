import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db as defaultDb } from "./client";
import { logAudit, redactSensitiveFields } from "./audit";
import { auditLog } from "./schema/admin";
import { users } from "./schema/public";
import { organizations } from "./schema/projetos";

const ANONYMIZED_FULL_NAME = "Usuário anonimizado";
const ANONYMIZED_ORG_REPRESENTATIVE = "Representante anonimizado";

function anonymizedEmailFor(userId: string): string {
  return `anon+${userId}@anonimizado.hebronaseec.org`;
}

export interface AnonymizeUserResult {
  userId: string;
  /** `true` se a chamada foi um no-op — o usuário já estava anonimizado. */
  alreadyAnonymized: boolean;
  redactedOrganizations: number;
  redactedAuditEntries: number;
}

/**
 * Pseudonimiza os dados pessoais de um usuário — a resposta desta base de
 * código ao direito de exclusão da LGPD (art. 18, VI; decisão F1-Q4:
 * cumprir a lei). Nunca é hard delete: a linha de `public.users` e todas as
 * FKs (papéis, designações, organizações, projetos, votos, transações,
 * pareceres) continuam intactas — só os campos de identificação pessoal são
 * substituídos por um pseudônimo determinístico, preservando a
 * auditabilidade dos atos institucionais sob esse pseudônimo. Isso resolve
 * o conflito entre o princípio de imutabilidade do BRAIN ("nunca hard
 * delete") e o direito de exclusão: exclusão real é anonimização de campo,
 * não remoção de linha (ver BRAIN §9).
 *
 * Escopo desta primitiva (usada pelo fluxo de exclusão fim-a-fim "Meus
 * Dados" de P-9.2, que decide quando chamá-la e cuida da UI/solicitação):
 *   1. `public.users`: email/nome/telefone/CPF/avatar → pseudônimo ou null.
 *   2. `projetos.organizations` criadas pelo usuário: `responsavel_legal`
 *      (nome de pessoa física) → pseudônimo. Endereço/telefone/CNPJ da
 *      organização não são tocados — descrevem a instituição (uma pessoa
 *      jurídica com identidade própria), não o usuário anonimizado.
 *   3. `admin.audit_log`: diffs que ainda contêm o valor bruto de um campo
 *      sensível (entradas anteriores a esta fundação, antes de
 *      `computeDiff`/`logAudit` redigirem automaticamente) são redigidos
 *      para as entidades "user"/"organization" ligadas a este usuário.
 *
 * Não toca em `auth.users` (login) nem revoga papéis/designações — isso é
 * responsabilidade do fluxo de exclusão fim-a-fim (P-9.2), não desta
 * primitiva de reescrita de dados.
 */
export async function anonymizeUser(
  userId: string,
  actorId: string,
  dbHandle: typeof defaultDb = defaultDb,
): Promise<AnonymizeUserResult> {
  const userRows = await dbHandle
    .select()
    .from(users)
    .where(eq(users.id, userId));
  const user = userRows[0];
  if (!user) throw new Error("Usuário não encontrado");

  if (user.anonymizedAt) {
    return {
      userId,
      alreadyAnonymized: true,
      redactedOrganizations: 0,
      redactedAuditEntries: 0,
    };
  }

  await dbHandle
    .update(users)
    .set({
      email: anonymizedEmailFor(userId),
      fullName: ANONYMIZED_FULL_NAME,
      phone: null,
      documentCpf: null,
      avatarUrl: null,
      anonymizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const ownedOrgs = await dbHandle
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        eq(organizations.createdBy, userId),
        isNotNull(organizations.responsavelLegal),
      ),
    );

  if (ownedOrgs.length > 0) {
    await dbHandle
      .update(organizations)
      .set({
        responsavelLegal: ANONYMIZED_ORG_REPRESENTATIVE,
        updatedAt: new Date(),
      })
      .where(
        inArray(
          organizations.id,
          ownedOrgs.map((org) => org.id),
        ),
      );
  }

  const entityIds = [userId, ...ownedOrgs.map((org) => org.id)];
  const auditRows = await dbHandle
    .select({
      id: auditLog.id,
      createdAt: auditLog.createdAt,
      diff: auditLog.diff,
    })
    .from(auditLog)
    .where(
      and(
        inArray(auditLog.entity, ["user", "organization"]),
        inArray(auditLog.entityId, entityIds),
        isNotNull(auditLog.diff),
      ),
    );

  let redactedAuditEntries = 0;
  for (const row of auditRows) {
    const rawDiff = row.diff as Record<string, unknown> | null;
    if (!rawDiff) continue;
    const redacted = redactSensitiveFields(rawDiff);
    if (JSON.stringify(redacted) === JSON.stringify(rawDiff)) continue;
    // `id` (gen_random_uuid()) já é praticamente único sozinho — não
    // precisamos do resto da PK composta (id, created_at). Comparar
    // created_at aqui seria arriscado: o Date deserializado pelo driver
    // pode perder precisão de sub-milissegundo ao ser reserializado como
    // parâmetro, fazendo o WHERE não casar com a linha e o UPDATE virar
    // no-op silencioso.
    await dbHandle
      .update(auditLog)
      .set({ diff: redacted })
      .where(eq(auditLog.id, row.id));
    redactedAuditEntries++;
  }

  await logAudit(
    {
      actorId,
      action: "user.anonymized",
      entity: "user",
      entityId: userId,
      diff: { anonymized: { before: false, after: true } },
    },
    dbHandle,
  );

  return {
    userId,
    alreadyAnonymized: false,
    redactedOrganizations: ownedOrgs.length,
    redactedAuditEntries,
  };
}
