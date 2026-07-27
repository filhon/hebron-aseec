/**
 * actions.test.ts — Server Actions do módulo documentos.
 *
 * Testa CRUD de documentos, versionamento, categorias hierárquicas
 * e o fluxo de notificação ao publicar.
 *
 * Mocks:
 *   - next/headers      → cookies sem contexto de request
 *   - @supabase/supabase-js → ACTOR_ID como usuário autenticado
 *   - @hebron/email     → createNotification como spy (sem envio real)
 *
 * ../lib/audit NÃO é mockado (P-1.24b — antes mockado com a justificativa de
 * que o enum admin.audit_action não tinha os valores de documento; a
 * migration 0006_documentos_audit_actions.sql resolveu isso no dia seguinte
 * e o mock ficou, escondendo que nenhum teste provava que publicar,
 * despublicar, mover categoria ou remover documento grava audit de verdade).
 * `logDocumentAudit` grava em admin.audit_log de verdade; os testes de cada
 * mutação usam `expectAuditLogged` para consultar a linha gravada.
 *
 * Requer: DATABASE_URL migrado. Ver __tests__/setup-env.ts para a fronteira
 * de rede (Supabase) que estes testes dependem.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  categories,
  documents,
  documentTags,
  documentVersions,
  editals,
  subscriptions,
  views,
  auditLog,
} from "@hebron/db/schema";
import type { DocumentAuditAction } from "../lib/audit";

// ── IDs fixos (prefixo e2) ────────────────────────────────────────────────────

const ACTOR_ID = "e2000000-0000-0000-0000-000000000001";
const SUBSCRIBER_ID = "e2000000-0000-0000-0000-000000000002";
const ACTOR_EMAIL = "acts-docs-actor@test.hebron";
const SUBSCRIBER_EMAIL = "acts-docs-subscriber@test.hebron";

// ── State rastreado para cleanup ──────────────────────────────────────────────

const createdCatIds: string[] = [];
let notifCatId: string | null = null;
let _notifDocId: string | null = null;
let notifSubId: string | null = null;
let flagSubId: string | null = null;
let versionSubId: string | null = null;

// ── Mocks globais ─────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
  }),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["colaborador"],
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUploadUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://mock.storage/upload" },
          error: null,
        }),
      }),
    },
  }),
}));

vi.mock("@hebron/email", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "mock-notification-id" }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireDefined<T>(value: T | undefined | null, label = "value"): T {
  if (value == null) throw new Error(`Expected ${label} to be defined`);
  return value;
}

// Consulta admin.audit_log de verdade (logDocumentAudit não é mockado neste
// arquivo — P-1.24b) e verifica ator, ação, entidade, entity_id e diff
// presente. Devolve as linhas (mais recente primeiro) para o chamador
// inspecionar o diff quando precisar.
async function expectAuditLogged(params: {
  entityId: string;
  action: DocumentAuditAction;
  entity: string;
  actorId?: string;
}) {
  const rows = await db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.entityId, params.entityId),
        eq(auditLog.action, params.action),
      ),
    )
    .orderBy(desc(auditLog.createdAt));

  expect(rows.length).toBeGreaterThanOrEqual(1);
  const row = requireDefined(rows[0], "audit row");
  expect(row.actorId).toBe(params.actorId ?? ACTOR_ID);
  expect(row.entity).toBe(params.entity);
  expect(row.entityId).toBe(params.entityId);
  expect(row.diff).toBeTruthy();

  return rows;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: ACTOR_EMAIL,
      fullName: "Actions Docs Actor",
    })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({
      id: SUBSCRIBER_ID,
      email: SUBSCRIBER_EMAIL,
      fullName: "Actions Docs Subscriber",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({
      userId: ACTOR_ID,
      role: "colaborador" as const,
      grantedBy: ACTOR_ID,
    })
    .onConflictDoNothing();
  // Papel extra real (não só mockado em resolveSession) para os testes de
  // editais: editals_write_admin (0005_documentos_rls.sql) exige
  // has_role('super_admin','diretor') consultando role_assignments de
  // verdade — o mock de resolveSession só satisfaz o portão de
  // adminDocAction (camada de app), não a RLS (camada de banco).
  await db
    .insert(roleAssignments)
    .values({
      userId: ACTOR_ID,
      role: "super_admin" as const,
      grantedBy: ACTOR_ID,
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({
      userId: SUBSCRIBER_ID,
      role: "hospede" as const,
      grantedBy: ACTOR_ID,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  // Linhas reais de admin.audit_log gravadas por este arquivo (sem mock,
  // P-1.24b) — precisa apagar antes de apagar ACTOR_ID, que audit_log.actor_id
  // referencia via FK.
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));

  // Subscriptions criadas no teste de notificação
  if (notifSubId) {
    await db.delete(subscriptions).where(eq(subscriptions.id, notifSubId));
  }
  if (flagSubId) {
    await db.delete(subscriptions).where(eq(subscriptions.id, flagSubId));
  }
  if (versionSubId) {
    await db.delete(subscriptions).where(eq(subscriptions.id, versionSubId));
  }

  // Documentos criados pelo ACTOR_ID
  const docs = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.authorId, ACTOR_ID));
  const docIds = docs.map((d) => d.id);
  if (docIds.length > 0) {
    await db
      .delete(documentVersions)
      .where(inArray(documentVersions.documentId, docIds));
    await db
      .delete(documentTags)
      .where(inArray(documentTags.documentId, docIds));
    await db.delete(documents).where(inArray(documents.id, docIds));
  }

  // Categorias criadas nos testes (zera parentId antes para evitar ciclo FK)
  const allCatIds = [...createdCatIds, ...(notifCatId ? [notifCatId] : [])];
  if (allCatIds.length > 0) {
    await db
      .update(categories)
      .set({ parentId: null })
      .where(inArray(categories.id, allCatIds));
    await db.delete(categories).where(inArray(categories.id, allCatIds));
  }

  // Apaga todas as role assignments destes usuários de uma vez,
  // incluindo as que têm grantedBy = ACTOR_ID (FK da coluna granted_by).
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, [ACTOR_ID, SUBSCRIBER_ID]));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.grantedBy, ACTOR_ID));
  await db.delete(users).where(eq(users.id, SUBSCRIBER_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

// ── createDocument ─────────────────────────────────────────────────────────────

describe("createDocument", () => {
  it("cria documento e versão inicial (version 1)", async () => {
    const { createDocument } = await import("../actions/documents");

    const result = await createDocument({
      title: "Documento de Teste Criação",
      contentMd: "# Conteúdo inicial",
      visibility: "internal",
    });

    expect(result?.data?.document).toBeDefined();
    const doc = requireDefined(result?.data?.document, "document");
    expect(doc.title).toBe("Documento de Teste Criação");
    expect(doc.authorId).toBe(ACTOR_ID);

    // Verifica versão 1 no banco
    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, doc.id));
    expect(versions).toHaveLength(1);
    expect(versions[0]?.versionNumber).toBe(1);

    await expectAuditLogged({
      entityId: doc.id,
      action: "document.created",
      entity: "document",
    });
  });
});

// ── type / fileSizeBytes / mimeType (P-1.18b) ─────────────────────────────────

describe("createDocument / updateDocument — type e metadados de arquivo", () => {
  it("persiste o type escolhido e devolve o mesmo valor ao reabrir", async () => {
    const { createDocument } = await import("../actions/documents");

    const result = await createDocument({
      title: "Documento com Tipo Escolhido",
      contentMd: "# Conteúdo",
      visibility: "internal",
      type: "policy",
    });

    const doc = requireDefined(result?.data?.document, "document");
    expect(doc.type).toBe("policy");

    const [row] = await db
      .select({ type: documents.type })
      .from(documents)
      .where(eq(documents.id, doc.id));
    expect(row?.type).toBe("policy");
  });

  it("default de type é 'other' quando não informado", async () => {
    const { createDocument } = await import("../actions/documents");

    const result = await createDocument({
      title: "Documento sem Tipo Informado",
      visibility: "internal",
    });

    const doc = requireDefined(result?.data?.document, "document");
    expect(doc.type).toBe("other");
  });

  it("persiste fileSizeBytes e mimeType na versão criada", async () => {
    const { createDocument } = await import("../actions/documents");

    const result = await createDocument({
      title: "Documento com Metadados de Arquivo",
      storagePath: "documents/actor/arquivo.pdf",
      fileSizeBytes: 123456,
      mimeType: "application/pdf",
      visibility: "internal",
    });
    const doc = requireDefined(result?.data?.document, "document");

    const [version] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, doc.id));
    expect(version?.fileSizeBytes).toBe(123456);
    expect(version?.mimeType).toBe("application/pdf");
  });

  it("updateDocument altera o type e registra antes/depois no diff do audit", async () => {
    const { createDocument, updateDocument } =
      await import("../actions/documents");

    const created = await createDocument({
      title: "Documento para Trocar Tipo",
      visibility: "internal",
      type: "other",
    });
    const docId = requireDefined(created?.data?.document.id, "docId");

    const updated = await updateDocument({ id: docId, type: "legal" });

    expect(updated?.data?.document.type).toBe("legal");

    const rows = await expectAuditLogged({
      entityId: docId,
      action: "document.updated",
      entity: "document",
    });
    const diff = rows[0]?.diff as {
      before?: { type?: string };
      after?: { type?: string };
    };
    expect(diff?.before?.type).toBe("other");
    expect(diff?.after?.type).toBe("legal");
  });

  it("nova versão herda fileSizeBytes/mimeType da anterior quando a edição não troca o arquivo", async () => {
    const { createDocument, updateDocument } =
      await import("../actions/documents");

    const created = await createDocument({
      title: "Documento Herdar Metadados",
      storagePath: "documents/actor/original.pdf",
      fileSizeBytes: 500,
      mimeType: "application/pdf",
      visibility: "internal",
    });
    const docId = requireDefined(created?.data?.document.id, "docId");

    await updateDocument({ id: docId, title: "Título atualizado" });

    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, docId))
      .orderBy(desc(documentVersions.versionNumber));
    expect(versions[0]?.fileSizeBytes).toBe(500);
    expect(versions[0]?.mimeType).toBe("application/pdf");
  });
});

// ── updateDocument — versionamento ────────────────────────────────────────────

describe("updateDocument — versionamento", () => {
  let docId: string;

  beforeAll(async () => {
    const { createDocument } = await import("../actions/documents");
    const r = await createDocument({
      title: "Documento para Versionar",
      contentMd: "v1",
      visibility: "internal",
    });
    docId = requireDefined(r?.data?.document.id, "docId");
  });

  it("primeira edição incrementa para versão 2", async () => {
    const { updateDocument } = await import("../actions/documents");

    const result = await updateDocument({ id: docId, contentMd: "v2 editado" });

    expect(result?.data?.version).toBe(2);

    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, docId))
      .orderBy(desc(documentVersions.versionNumber));
    expect(versions[0]?.versionNumber).toBe(2);
    expect(versions[0]?.contentMd).toBe("v2 editado");
  });

  it("segunda edição incrementa para versão 3 e preserva histórico", async () => {
    const { updateDocument } = await import("../actions/documents");

    const result = await updateDocument({
      id: docId,
      contentMd: "v3 editado novamente",
    });

    expect(result?.data?.version).toBe(3);

    const versions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, docId))
      .orderBy(desc(documentVersions.versionNumber));
    expect(versions).toHaveLength(3);
    expect(versions[0]?.versionNumber).toBe(3);
    expect(versions[2]?.versionNumber).toBe(1);
  });
});

// ── listDocumentVersions ──────────────────────────────────────────────────────

describe("listDocumentVersions", () => {
  it("retorna versões em ordem decrescente", async () => {
    const { createDocument, updateDocument, listDocumentVersions } =
      await import("../actions/documents");

    const created = await createDocument({
      title: "Doc para listar versões",
      contentMd: "v1",
      visibility: "internal",
    });
    const docId = requireDefined(created?.data?.document.id, "docId");

    await updateDocument({ id: docId, contentMd: "v2" });

    const result = await listDocumentVersions({ documentId: docId });

    const versions = requireDefined(result?.data?.versions, "versions");
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(versions[0]?.versionNumber).toBeGreaterThan(
      requireDefined(versions[1], "v1").versionNumber,
    );
  });
});

// ── publishDocument / unpublishDocument ────────────────────────────────────────

describe("publishDocument / unpublishDocument", () => {
  let docId: string;

  beforeAll(async () => {
    const { createDocument } = await import("../actions/documents");
    const r = await createDocument({
      title: "Doc para publicar",
      visibility: "internal",
    });
    docId = requireDefined(r?.data?.document.id, "docId");
  });

  it("publishDocument define publishedAt", async () => {
    const { publishDocument } = await import("../actions/documents");

    const result = await publishDocument({ id: docId });

    expect(result?.data?.document.publishedAt).toBeDefined();

    await expectAuditLogged({
      entityId: docId,
      action: "document.published",
      entity: "document",
    });
  });

  it("publicar documento já publicado retorna serverError", async () => {
    const { publishDocument } = await import("../actions/documents");

    const result = await publishDocument({ id: docId });

    expect(result?.serverError).toBeDefined();
  });

  it("unpublishDocument limpa publishedAt", async () => {
    const { unpublishDocument } = await import("../actions/documents");

    const result = await unpublishDocument({ id: docId });

    expect(result?.data?.document.publishedAt).toBeNull();

    await expectAuditLogged({
      entityId: docId,
      action: "document.unpublished",
      entity: "document",
    });
  });
});

// ── deleteDocument — soft delete ──────────────────────────────────────────────

describe("deleteDocument — soft delete", () => {
  it("define deletedAt sem remover o registro", async () => {
    const { createDocument, deleteDocument } =
      await import("../actions/documents");

    const created = await createDocument({
      title: "Doc para deletar",
      visibility: "internal",
    });
    const docId = requireDefined(created?.data?.document.id, "docId");

    const result = await deleteDocument({ id: docId });

    expect(result?.data?.document.deletedAt).toBeDefined();

    // O registro ainda existe no banco
    const [row] = await db
      .select({ id: documents.id, deletedAt: documents.deletedAt })
      .from(documents)
      .where(eq(documents.id, docId));
    expect(row?.deletedAt).toBeDefined();

    await expectAuditLogged({
      entityId: docId,
      action: "document.deleted",
      entity: "document",
    });
  });

  it("atualizar documento deletado retorna serverError", async () => {
    const { createDocument, deleteDocument, updateDocument } =
      await import("../actions/documents");

    const created = await createDocument({
      title: "Doc deletar e tentar editar",
      visibility: "internal",
    });
    const docId = requireDefined(created?.data?.document.id, "docId");
    await deleteDocument({ id: docId });

    const result = await updateDocument({ id: docId, title: "Título novo" });

    expect(result?.serverError).toBeDefined();
  });
});

// ── restoreDocument — lixeira (P-1.19b) ───────────────────────────────────────
// P-1.19b adicionou a policy de rascunho/lixeira e a action restoreDocument
// para tirar deleteDocument do withSystemRole; nenhum teste próprio cobria a
// restauração em si (rls.test.ts só cobre o par soft-delete/restore por
// papel via SQL direto — ver "RLS — documentos.documents (soft-delete /
// restore)"). Aqui o caminho é a action, como a aba "Removidos" usa.

describe("restoreDocument — lixeira e restauração", () => {
  it("restaura documento removido, limpa deletedAt e grava audit de document.updated", async () => {
    const { createDocument, deleteDocument, restoreDocument, updateDocument } =
      await import("../actions/documents");

    const created = await createDocument({
      title: "Documento para Restaurar",
      visibility: "internal",
    });
    const docId = requireDefined(created?.data?.document.id, "docId");

    await deleteDocument({ id: docId });
    const restored = await restoreDocument({ id: docId });

    expect(restored?.data?.document.deletedAt).toBeNull();

    const [row] = await db
      .select({ deletedAt: documents.deletedAt })
      .from(documents)
      .where(eq(documents.id, docId));
    expect(row?.deletedAt).toBeNull();

    const rows = await expectAuditLogged({
      entityId: docId,
      action: "document.updated",
      entity: "document",
    });
    const diff = rows[0]?.diff as {
      deletedAt?: { before?: string | null; after?: string | null };
    };
    expect(diff?.deletedAt?.after).toBeNull();

    // Restaurado, o documento volta a aceitar edição (deixou de retornar
    // serverError como no teste de "atualizar documento deletado" acima).
    const updated = await updateDocument({
      id: docId,
      title: "Título após restaurar",
    });
    expect(updated?.data?.document.title).toBe("Título após restaurar");
  });

  it("restaurar documento que não está na lixeira retorna serverError", async () => {
    const { createDocument, restoreDocument } =
      await import("../actions/documents");

    const created = await createDocument({
      title: "Documento nunca removido",
      visibility: "internal",
    });
    const docId = requireDefined(created?.data?.document.id, "docId");

    const result = await restoreDocument({ id: docId });

    expect(result?.serverError).toBeDefined();
  });
});

// ── Categorias — hierarquia pai→filho→neto ────────────────────────────────────

describe("categorias — hierarquia", () => {
  let rootId: string;
  let childId: string;
  let grandchildId: string;

  it("createCategory sem parentId cria categoria raiz", async () => {
    const { createCategory } = await import("../actions/categories");

    const result = await createCategory({ name: "Raiz de Teste" });

    const cat = requireDefined(result?.data?.category, "category");
    expect(cat.parentId).toBeNull();
    rootId = cat.id;
    createdCatIds.push(rootId);

    await expectAuditLogged({
      entityId: rootId,
      action: "category.created",
      entity: "category",
    });
  });

  it("createCategory com parentId cria filho", async () => {
    const { createCategory } = await import("../actions/categories");

    const result = await createCategory({
      name: "Filho de Teste",
      parentId: rootId,
    });

    const cat = requireDefined(result?.data?.category, "category");
    expect(cat.parentId).toBe(rootId);
    childId = cat.id;
    createdCatIds.push(childId);
  });

  it("createCategory com parentId do filho cria neto", async () => {
    const { createCategory } = await import("../actions/categories");

    const result = await createCategory({
      name: "Neto de Teste",
      parentId: childId,
    });

    const cat = requireDefined(result?.data?.category, "category");
    expect(cat.parentId).toBe(childId);
    grandchildId = cat.id;
    createdCatIds.push(grandchildId);
  });

  it("listCategories com parentId retorna apenas filhos diretos", async () => {
    const { listCategories } = await import("../actions/categories");

    const result = await listCategories({ parentId: rootId });

    const cats = requireDefined(result?.data?.categories, "categories");
    const ids = cats.map((c) => c.id);
    expect(ids).toContain(childId);
    expect(ids).not.toContain(grandchildId);
    expect(ids).not.toContain(rootId);
  });

  it("moveCategoryInTree para descendente retorna serverError (ciclo)", async () => {
    const { moveCategoryInTree } = await import("../actions/categories");

    // Tentar mover raiz para baixo do neto é um ciclo
    const result = await moveCategoryInTree({
      id: rootId,
      newParentId: grandchildId,
    });

    expect(result?.serverError).toBeDefined();
  });

  it("updateCategory altera o nome e grava audit de category.updated", async () => {
    const { createCategory, updateCategory } =
      await import("../actions/categories");

    const created = await createCategory({ name: "Categoria para Renomear" });
    const cat = requireDefined(created?.data?.category, "category");
    createdCatIds.push(cat.id);

    const updated = await updateCategory({
      id: cat.id,
      name: "Categoria Renomeada",
    });
    expect(updated?.data?.category.name).toBe("Categoria Renomeada");

    const rows = await expectAuditLogged({
      entityId: cat.id,
      action: "category.updated",
      entity: "category",
    });
    const diff = rows[0]?.diff as {
      before?: { name?: string };
      after?: { name?: string };
    };
    expect(diff?.before?.name).toBe("Categoria para Renomear");
    expect(diff?.after?.name).toBe("Categoria Renomeada");
  });

  it("deleteCategory remove categoria vazia e grava audit de category.deleted", async () => {
    const { createCategory, deleteCategory } =
      await import("../actions/categories");

    const created = await createCategory({ name: "Categoria para Remover" });
    const cat = requireDefined(created?.data?.category, "category");

    const result = await deleteCategory({ id: cat.id });
    expect(result?.data?.deleted).toBe(true);

    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, cat.id));
    expect(row).toBeUndefined();

    await expectAuditLogged({
      entityId: cat.id,
      action: "category.deleted",
      entity: "category",
    });
  });
});

// ── editais — createEdital / updateEdital ─────────────────────────────────────
// Nenhum teste de actions/editals.ts existia neste arquivo. adminDocAction
// exige super_admin/diretor (ACTOR_ID só tem colaborador) — eleva o papel
// só para esta chamada, mantendo o mesmo actorId (ACTOR_ID) para que o
// cleanup por authorId/actorId do afterAll global cubra o edital criado.

describe("editais — createEdital / updateEdital", () => {
  it("createEdital grava edital.created; updateEdital grava edital.updated", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { createEdital, updateEdital } = await import("../actions/editals");

    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: ACTOR_ID,
      roles: ["super_admin"],
      designations: [],
    });
    const created = await createEdital({
      title: "Edital de Teste de Auditoria",
      visibility: "public",
      cycleType: "pontual",
    });
    const doc = requireDefined(created?.data?.document, "document");

    await expectAuditLogged({
      entityId: doc.id,
      action: "edital.created",
      entity: "edital",
    });

    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: ACTOR_ID,
      roles: ["super_admin"],
      designations: [],
    });
    // Inclui um campo próprio de editals (projectType), não só de documents:
    // com editalUpdate vazio, `tx.update(editals).set({})` lança "No values
    // to set" e a action inteira falha (bug pré-existente fora do escopo
    // deste prompt — actions/editals.ts não está nos arquivos permitidos de
    // P-1.24b; registrado como débito em SESSIONS.md).
    const updated = await updateEdital({
      id: doc.id,
      title: "Edital Atualizado",
      projectType: "capacitacao",
    });
    expect(updated?.data?.document?.title).toBe("Edital Atualizado");

    await expectAuditLogged({
      entityId: doc.id,
      action: "edital.updated",
      entity: "edital",
    });
  });
});

// ── Fluxo: criar → publicar → notificar subscriber ───────────────────────────

describe("notifyNewDocument — fluxo de notificação", () => {
  it("dispara createNotification para cada subscriber da categoria", async () => {
    const { createNotification } = await import("@hebron/email");
    const { resolveSession } = await import("@hebron/auth/server");
    const { createDocument, publishDocument } =
      await import("../actions/documents");
    const { createCategory } = await import("../actions/categories");
    const { saveSubscriptions } = await import("../actions/subscriptions");
    const { notifyNewDocument } = await import("../lib/notifications");

    // Cria categoria
    const catResult = await createCategory({ name: "Notif Test Category" });
    const cat = requireDefined(catResult?.data?.category, "cat");
    notifCatId = cat.id;

    // Subscriber "assina" a categoria via a action real (não db.insert direto)
    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: SUBSCRIBER_ID,
      roles: ["hospede"],
      designations: [],
    });
    const subResult = await saveSubscriptions({
      items: [{ categoryId: cat.id, onNewVersion: true, onEditalOpen: true }],
    });
    const sub = requireDefined(subResult?.data?.subscriptions?.[0], "sub");
    notifSubId = sub.id;

    // Cria e publica documento na categoria
    const docResult = await createDocument({
      title: "Documento Publicado para Notificação",
      visibility: "public",
      categoryId: cat.id,
    });
    const doc = requireDefined(docResult?.data?.document, "doc");
    _notifDocId = doc.id;

    await publishDocument({ id: doc.id });

    // publishDocument já dispara a notificação sozinho (sem chamada manual)
    expect(vi.mocked(createNotification)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: SUBSCRIBER_ID,
          type: "document.published",
        }),
      }),
    );

    // Limpa spy antes de chamar notifyNewDocument manualmente de novo
    vi.mocked(createNotification).mockClear();

    // Dispara a função de notificação diretamente também
    await notifyNewDocument(doc.id);

    // Verifica que createNotification foi chamado para o subscriber
    expect(vi.mocked(createNotification)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: SUBSCRIBER_ID,
          type: "document.published",
        }),
      }),
    );
  });
});

// ── Preferências por tipo de alerta (P-1.16b) ─────────────────────────────────

describe("saveSubscriptions — preferências por tipo de alerta", () => {
  it("assinante com on_new_version=false não é notificado ao publicar documento, mas é notificado ao abrir edital na mesma categoria", async () => {
    const { createNotification } = await import("@hebron/email");
    const { resolveSession } = await import("@hebron/auth/server");
    const { createDocument, publishDocument } =
      await import("../actions/documents");
    const { createCategory } = await import("../actions/categories");
    const { saveSubscriptions } = await import("../actions/subscriptions");
    const { notifyEditalOpen } = await import("../lib/notifications");

    const catResult = await createCategory({ name: "Notif Flags Category" });
    const cat = requireDefined(catResult?.data?.category, "cat");
    createdCatIds.push(cat.id);

    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: SUBSCRIBER_ID,
      roles: ["hospede"],
      designations: [],
    });
    const subResult = await saveSubscriptions({
      items: [{ categoryId: cat.id, onNewVersion: false, onEditalOpen: true }],
    });
    const sub = requireDefined(subResult?.data?.subscriptions?.[0], "sub");
    flagSubId = sub.id;
    expect(sub.onNewVersion).toBe(false);
    expect(sub.onEditalOpen).toBe(true);

    // Publica documento comum na categoria: on_new_version=false não deve notificar
    const docResult = await createDocument({
      title: "Documento Flag Test",
      visibility: "public",
      categoryId: cat.id,
    });
    const doc = requireDefined(docResult?.data?.document, "doc");

    vi.mocked(createNotification).mockClear();
    await publishDocument({ id: doc.id });

    expect(vi.mocked(createNotification)).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: SUBSCRIBER_ID,
          type: "document.published",
        }),
      }),
    );

    // Edital na mesma categoria: on_edital_open=true deve notificar. Insere
    // direto (createEdital exige super_admin/diretor) — aqui o alvo é
    // notifyEditalOpen, não o gate de criação.
    const [editalDoc] = await db
      .insert(documents)
      .values({
        title: "Edital Flag Test",
        slug: `edital-flag-test-${Date.now()}`,
        visibility: "public",
        categoryId: cat.id,
        authorId: ACTOR_ID,
        publishedAt: new Date(),
      })
      .returning();
    const editalDocRow = requireDefined(editalDoc, "editalDoc");
    await db.insert(editals).values({ id: editalDocRow.id });

    vi.mocked(createNotification).mockClear();
    await notifyEditalOpen(editalDocRow.id);

    expect(vi.mocked(createNotification)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: SUBSCRIBER_ID,
          type: "edital.opened",
        }),
      }),
    );

    // Desligar os dois toggles remove a inscrição (nenhuma linha órfã)
    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: SUBSCRIBER_ID,
      roles: ["hospede"],
      designations: [],
    });
    await saveSubscriptions({
      items: [{ categoryId: cat.id, onNewVersion: false, onEditalOpen: false }],
    });
    const remaining = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.id, flagSubId));
    expect(remaining).toHaveLength(0);
    flagSubId = null;
  });
});

// ── Alerta de nova versão (P-1.22b) ───────────────────────────────────────────

describe("updateDocument — alerta de nova versão", () => {
  it("opt-in ligado notifica os inscritos com on_new_version=true ao editar documento já publicado", async () => {
    const { createNotification } = await import("@hebron/email");
    const { resolveSession } = await import("@hebron/auth/server");
    const { createDocument, publishDocument, updateDocument } =
      await import("../actions/documents");
    const { createCategory } = await import("../actions/categories");
    const { saveSubscriptions } = await import("../actions/subscriptions");

    const catResult = await createCategory({ name: "Nova Versão Category" });
    const cat = requireDefined(catResult?.data?.category, "cat");
    createdCatIds.push(cat.id);

    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: SUBSCRIBER_ID,
      roles: ["hospede"],
      designations: [],
    });
    const subResult = await saveSubscriptions({
      items: [{ categoryId: cat.id, onNewVersion: true, onEditalOpen: false }],
    });
    const sub = requireDefined(subResult?.data?.subscriptions?.[0], "sub");
    versionSubId = sub.id;

    const created = await createDocument({
      title: "Documento para Nova Versão",
      contentMd: "v1",
      visibility: "public",
      categoryId: cat.id,
    });
    const docId = requireDefined(created?.data?.document.id, "docId");

    await publishDocument({ id: docId });
    vi.mocked(createNotification).mockClear();

    const updated = await updateDocument({
      id: docId,
      contentMd: "v2 revisado",
      notes: "Atualização da seção 2.",
      notifySubscribers: true,
    });
    expect(updated?.data?.version).toBe(2);

    expect(vi.mocked(createNotification)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: SUBSCRIBER_ID,
          type: "document.version_updated",
        }),
      }),
    );
  });

  it("opt-in desligado não notifica ninguém, mesmo com documento já publicado", async () => {
    const { createNotification } = await import("@hebron/email");
    const { createDocument, publishDocument, updateDocument } =
      await import("../actions/documents");

    const created = await createDocument({
      title: "Documento Sem Opt-in",
      contentMd: "v1",
      visibility: "internal",
    });
    const docId = requireDefined(created?.data?.document.id, "docId");
    await publishDocument({ id: docId });

    vi.mocked(createNotification).mockClear();
    await updateDocument({ id: docId, contentMd: "v2 sem aviso" });

    expect(vi.mocked(createNotification)).not.toHaveBeenCalled();
  });

  it("despublicar e republicar não dispara segunda notificação de novo documento", async () => {
    const { createNotification } = await import("@hebron/email");
    const { createDocument, publishDocument, unpublishDocument } =
      await import("../actions/documents");

    const created = await createDocument({
      title: "Documento para Republicar",
      visibility: "public",
    });
    const docId = requireDefined(created?.data?.document.id, "docId");

    await publishDocument({ id: docId });
    await unpublishDocument({ id: docId });

    vi.mocked(createNotification).mockClear();
    const result = await publishDocument({ id: docId });

    expect(result?.data?.document.publishedAt).toBeDefined();
    expect(vi.mocked(createNotification)).not.toHaveBeenCalled();
  });
});

// ── registerView — registro de leitura (P-1.20c) ──────────────────────────────
// Documento criado no describe é deletado (soft delete) no afterAll global via
// authorId = ACTOR_ID; as linhas de `views` somem junto por FK ON DELETE CASCADE
// em document_id, sem cleanup manual aqui.

describe("registerView", () => {
  let docId: string;

  beforeAll(async () => {
    const { createDocument, publishDocument } =
      await import("../actions/documents");
    const created = await createDocument({
      title: "Documento para registrar leitura",
      contentMd: "conteúdo",
      visibility: "public",
    });
    docId = requireDefined(created?.data?.document.id, "docId");
    await publishDocument({ id: docId });
  });

  it("abrir documento autenticado grava linha em documentos.views", async () => {
    const { registerView } = await import("../actions/documents");

    const result = await registerView({ documentId: docId });

    expect(result?.data?.recorded).toBe(true);

    const rows = await db
      .select()
      .from(views)
      .where(and(eq(views.documentId, docId), eq(views.userId, ACTOR_ID)));
    expect(rows).toHaveLength(1);
  });

  it("recarregar dentro da janela de dedupe não duplica a linha", async () => {
    const { registerView } = await import("../actions/documents");

    await registerView({ documentId: docId });
    await registerView({ documentId: docId });

    const rows = await db
      .select()
      .from(views)
      .where(and(eq(views.documentId, docId), eq(views.userId, ACTOR_ID)));
    expect(rows).toHaveLength(1);
  });

  it("usuário diferente grava a própria linha, independente da dedupe do primeiro", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { registerView } = await import("../actions/documents");

    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: SUBSCRIBER_ID,
      roles: ["hospede"],
      designations: [],
    });
    const result = await registerView({ documentId: docId });

    expect(result?.data?.recorded).toBe(true);

    const rows = await db
      .select()
      .from(views)
      .where(and(eq(views.documentId, docId), eq(views.userId, SUBSCRIBER_ID)));
    expect(rows).toHaveLength(1);
  });

  it("leitura anônima (sem sessão) não grava linha", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { registerView } = await import("../actions/documents");

    vi.mocked(resolveSession).mockRejectedValueOnce(
      new Error("Não autenticado"),
    );
    const beforeCount = await db
      .select()
      .from(views)
      .where(eq(views.documentId, docId));

    const result = await registerView({ documentId: docId });

    expect(result?.serverError).toBeDefined();
    expect(result?.data?.recorded).toBeUndefined();

    const afterCount = await db
      .select()
      .from(views)
      .where(eq(views.documentId, docId));
    expect(afterCount).toHaveLength(beforeCount.length);
  });
});
