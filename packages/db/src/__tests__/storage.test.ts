/**
 * storage.test.ts — Policies de storage.objects por bucket (P-0.12).
 *
 * Mesma técnica de apps/*\/src/__tests__/rls.test.ts (SET LOCAL ROLE +
 * request.jwt.claims), mas com uma diferença deliberada: todo seed de linha
 * em storage.objects acontece **dentro da mesma transação** que depois é
 * sempre revertida (nunca há um INSERT/DELETE de nível superior fora de uma
 * transação). O projeto Supabase hospedado tem um trigger em
 * storage.objects que rejeita DELETE direto ("Direct deletion from storage
 * tables is not allowed. Use the Storage API instead."); um teste anterior
 * desta sessão persistiu linhas de teste via INSERT solto e não conseguiu
 * limpá-las (tiveram que ser removidas manualmente pela Storage API). Fazer
 * seed+asserts+rollback numa única transação evita o problema por completo:
 * SET LOCAL ROLE pode ser reemitido várias vezes na mesma transação para
 * trocar de usuário simulado, e o ROLLBACK final desfaz o INSERT de seed
 * junto com tudo o mais — sem nunca precisar de um DELETE.
 *
 * Requer: DATABASE_URL (superuser, para seed via db/schema fixtures) e
 * 0020_storage_buckets já aplicada.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  documents,
  documentVersions,
} from "@hebron/db/schema";

const IDS = {
  superAdmin: "e2000000-0000-0000-0000-000000000001",
  diretor: "e2000000-0000-0000-0000-000000000002",
  colaborador: "e2000000-0000-0000-0000-000000000003",
  submissorA: "e2000000-0000-0000-0000-000000000004",
  submissorB: "e2000000-0000-0000-0000-000000000005",
  hospede: "e2000000-0000-0000-0000-000000000006",
  aluno: "e2000000-0000-0000-0000-000000000007",
} as const;

const RESTRICTED_DOC_ID = "e2000000-0000-0000-0000-000000000010";
const INTERNAL_DOC_ID = "e2000000-0000-0000-0000-000000000011";
const PUBLIC_VERSION_DOC_ID = "e2000000-0000-0000-0000-000000000012";

const RESTRICTED_PATH = "documents/restricted/storage-test.pdf";
const INTERNAL_PATH = "documents/internal/storage-test.pdf";
const PUBLIC_VERSION_PATH = "documents/public-version/storage-test.pdf";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL)
  throw new Error("DATABASE_URL is required for storage RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

/**
 * Roda `fn` dentro de uma transação sempre revertida ao final — nada que
 * `fn` fizer (seed, INSERT, DELETE) sobrevive, mesmo em caso de sucesso.
 */
async function inRolledBackTx<T>(
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  try {
    await sql.begin(async (tx) => {
      result = await fn(tx);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (!(err instanceof Error) || err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }
  return result as T;
}

async function setRole(
  tx: postgres.TransactionSql,
  userId: string | null,
): Promise<void> {
  if (userId) {
    const claims = JSON.stringify({ sub: userId, role: "authenticated" });
    await tx`SET LOCAL ROLE authenticated`;
    await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
  } else {
    await tx`SET LOCAL ROLE anon`;
  }
}

async function seedObject(
  tx: postgres.TransactionSql,
  bucketId: string,
  name: string,
): Promise<void> {
  // Roda antes de qualquer SET LOCAL ROLE nesta transação — usa o papel
  // superuser da própria conexão (mesmo papel de `db`), que ignora RLS.
  await tx`INSERT INTO storage.objects (bucket_id, name) VALUES (${bucketId}, ${name})`;
}

async function canSelectAs(
  userId: string | null,
  bucketId: string,
  name: string,
): Promise<boolean> {
  return inRolledBackTx(async (tx) => {
    await seedObject(tx, bucketId, name);
    await setRole(tx, userId);
    const rows = await tx.unsafe(
      `SELECT name FROM storage.objects WHERE bucket_id = '${bucketId}' AND name = '${name}'`,
    );
    return rows.length === 1;
  });
}

async function canInsertAs(
  userId: string | null,
  bucketId: string,
  name: string,
): Promise<boolean> {
  return inRolledBackTx(async (tx) => {
    await setRole(tx, userId);
    try {
      await tx.unsafe(
        `INSERT INTO storage.objects (bucket_id, name) VALUES ('${bucketId}', '${name}')`,
      );
      return true;
    } catch {
      return false;
    }
  });
}

beforeAll(async () => {
  const userFixtures = Object.entries(IDS).map(([key, id]) => ({
    id,
    email: `storage-${key}@test.hebron`,
    fullName: `Storage Test ${key}`,
  }));
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  const roleSeed: {
    userId: string;
    role: (typeof roleAssignments.$inferInsert)["role"];
    grantedBy: string;
  }[] = [
    { userId: IDS.superAdmin, role: "super_admin", grantedBy: IDS.superAdmin },
    { userId: IDS.diretor, role: "diretor", grantedBy: IDS.superAdmin },
    { userId: IDS.colaborador, role: "colaborador", grantedBy: IDS.superAdmin },
    { userId: IDS.submissorA, role: "submissor", grantedBy: IDS.superAdmin },
    { userId: IDS.submissorB, role: "submissor", grantedBy: IDS.superAdmin },
    { userId: IDS.hospede, role: "hospede", grantedBy: IDS.superAdmin },
    { userId: IDS.aluno, role: "aluno", grantedBy: IDS.superAdmin },
  ];
  for (const r of roleSeed) {
    await db.insert(roleAssignments).values(r).onConflictDoNothing();
  }

  await db
    .insert(documents)
    .values([
      {
        id: RESTRICTED_DOC_ID,
        title: "Storage Test Restricted",
        slug: "storage-test-restricted",
        fileUrl: RESTRICTED_PATH,
        visibility: "restricted",
        authorId: IDS.superAdmin,
      },
      {
        id: INTERNAL_DOC_ID,
        title: "Storage Test Internal",
        slug: "storage-test-internal",
        fileUrl: INTERNAL_PATH,
        visibility: "internal",
        authorId: IDS.superAdmin,
      },
      {
        id: PUBLIC_VERSION_DOC_ID,
        title: "Storage Test Public Version",
        slug: "storage-test-public-version",
        fileUrl: null,
        visibility: "public",
        authorId: IDS.superAdmin,
      },
    ])
    .onConflictDoNothing();

  // Documento público cuja versão (não o documento em si) referencia o
  // arquivo — prova que a policy também cobre document_versions.
  await db
    .insert(documentVersions)
    .values({
      documentId: PUBLIC_VERSION_DOC_ID,
      versionNumber: 1,
      fileUrl: PUBLIC_VERSION_PATH,
      createdBy: IDS.superAdmin,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(documentVersions)
    .where(eq(documentVersions.documentId, PUBLIC_VERSION_DOC_ID));
  await db.delete(documents).where(eq(documents.id, RESTRICTED_DOC_ID));
  await db.delete(documents).where(eq(documents.id, INTERNAL_DOC_ID));
  await db.delete(documents).where(eq(documents.id, PUBLIC_VERSION_DOC_ID));
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
  await sql.end();
});

describe("storage.objects — hebron-docs: visibilidade herdada de documentos.documents", () => {
  it("anon lê arquivo de documento público (via document_versions)", async () => {
    expect(await canSelectAs(null, "hebron-docs", PUBLIC_VERSION_PATH)).toBe(
      true,
    );
  });

  it("anon NÃO lê arquivo de documento internal", async () => {
    expect(await canSelectAs(null, "hebron-docs", INTERNAL_PATH)).toBe(false);
  });

  it("submissor autenticado lê arquivo internal", async () => {
    expect(
      await canSelectAs(IDS.submissorA, "hebron-docs", INTERNAL_PATH),
    ).toBe(true);
  });

  it("submissor autenticado NÃO lê arquivo restricted", async () => {
    expect(
      await canSelectAs(IDS.submissorA, "hebron-docs", RESTRICTED_PATH),
    ).toBe(false);
  });

  it("diretor lê arquivo restricted", async () => {
    expect(await canSelectAs(IDS.diretor, "hebron-docs", RESTRICTED_PATH)).toBe(
      true,
    );
  });

  it("colaborador insere em hebron-docs", async () => {
    expect(
      await canInsertAs(
        IDS.colaborador,
        "hebron-docs",
        "documents/new/storage-insert-test.pdf",
      ),
    ).toBe(true);
  });

  it("submissor NÃO insere em hebron-docs (não é papel editor)", async () => {
    expect(
      await canInsertAs(
        IDS.submissorA,
        "hebron-docs",
        "documents/new/storage-insert-denied.pdf",
      ),
    ).toBe(false);
  });
});

describe("storage.objects — project-attachments: dono lê/insere a própria pasta", () => {
  it("submissorA insere na própria pasta", async () => {
    expect(
      await canInsertAs(
        IDS.submissorA,
        "project-attachments",
        `${IDS.submissorA}/own-file.pdf`,
      ),
    ).toBe(true);
  });

  it("submissorB NÃO insere na pasta de submissorA", async () => {
    expect(
      await canInsertAs(
        IDS.submissorB,
        "project-attachments",
        `${IDS.submissorA}/hijacked.pdf`,
      ),
    ).toBe(false);
  });

  it("diretor lê a pasta de submissorA, mas submissorB não", async () => {
    const path = `${IDS.submissorA}/own-file.pdf`;
    const asDiretor = await canSelectAs(
      IDS.diretor,
      "project-attachments",
      path,
    );
    // Reaproveita a mesma linha semeada dentro de uma nova transação — cada
    // chamada de canSelectAs faz seu próprio seed+rollback isolado.
    const asOtherSubmissor = await canSelectAs(
      IDS.submissorB,
      "project-attachments",
      path,
    );

    expect(asDiretor).toBe(true);
    expect(asOtherSubmissor).toBe(false);
  });

  it("anon NÃO lê project-attachments", async () => {
    expect(
      await canSelectAs(null, "project-attachments", "anyone/file.pdf"),
    ).toBe(false);
  });
});

describe("storage.objects — financeiro-recibos: equipe financeira apenas", () => {
  it("colaborador insere recibo", async () => {
    expect(
      await canInsertAs(
        IDS.colaborador,
        "financeiro-recibos",
        "ref/recibo.pdf",
      ),
    ).toBe(true);
  });

  it("hóspede NÃO insere recibo (sem papel financeiro)", async () => {
    expect(
      await canInsertAs(
        IDS.hospede,
        "financeiro-recibos",
        "ref/recibo-negado.pdf",
      ),
    ).toBe(false);
  });

  it("submissor NÃO lê recibos", async () => {
    expect(
      await canSelectAs(
        IDS.submissorA,
        "financeiro-recibos",
        "ref/recibo-select.pdf",
      ),
    ).toBe(false);
  });

  it("anon NÃO lê financeiro-recibos", async () => {
    expect(
      await canSelectAs(null, "financeiro-recibos", "anyone/recibo.pdf"),
    ).toBe(false);
  });
});

describe("storage.objects — flats-documentos: dono lê/insere a própria pasta", () => {
  it("hóspede insere na própria pasta", async () => {
    expect(
      await canInsertAs(
        IDS.hospede,
        "flats-documentos",
        `${IDS.hospede}/documento-identidade.pdf`,
      ),
    ).toBe(true);
  });

  it("submissor NÃO insere na pasta do hóspede", async () => {
    expect(
      await canInsertAs(
        IDS.submissorA,
        "flats-documentos",
        `${IDS.hospede}/hijacked.pdf`,
      ),
    ).toBe(false);
  });

  it("diretor lê a pasta do hóspede", async () => {
    expect(
      await canSelectAs(
        IDS.diretor,
        "flats-documentos",
        `${IDS.hospede}/documento-identidade.pdf`,
      ),
    ).toBe(true);
  });
});

describe("storage.objects — plataforma-capas: leitura aberta a autenticados, escrita só super_admin", () => {
  it("aluno lê capas", async () => {
    expect(
      await canSelectAs(IDS.aluno, "plataforma-capas", "curso-x/capa.jpg"),
    ).toBe(true);
  });

  it("super_admin insere capa", async () => {
    expect(
      await canInsertAs(IDS.superAdmin, "plataforma-capas", "curso-y/capa.jpg"),
    ).toBe(true);
  });

  it("aluno NÃO insere capa", async () => {
    expect(
      await canInsertAs(
        IDS.aluno,
        "plataforma-capas",
        "curso-z/capa-negada.jpg",
      ),
    ).toBe(false);
  });
});
