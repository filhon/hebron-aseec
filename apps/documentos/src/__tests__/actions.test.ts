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
 *   - ../lib/audit      → logDocumentAudit como spy (sem chamada ao DB de enum)
 *
 * Requer: DATABASE_URL migrado.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  categories,
  documents,
  documentTags,
  documentVersions,
  subscriptions,
} from "@hebron/db/schema";

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

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: ACTOR_ID, email: ACTOR_EMAIL } },
        error: null,
      }),
    },
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

// Mock de audit para evitar dependência do enum admin.audit_action
vi.mock("../lib/audit", () => ({
  logDocumentAudit: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireDefined<T>(value: T | undefined | null, label = "value"): T {
  if (value == null) throw new Error(`Expected ${label} to be defined`);
  return value;
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
  // Subscriptions criadas no teste de notificação
  if (notifSubId) {
    await db.delete(subscriptions).where(eq(subscriptions.id, notifSubId));
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

  for (const id of [ACTOR_ID, SUBSCRIBER_ID]) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
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
});

// ── Fluxo: criar → publicar → notificar subscriber ───────────────────────────

describe("notifyNewDocument — fluxo de notificação", () => {
  it("dispara createNotification para cada subscriber da categoria", async () => {
    const { createNotification } = await import("@hebron/email");
    const { createDocument, publishDocument } =
      await import("../actions/documents");
    const { createCategory } = await import("../actions/categories");
    const { notifyNewDocument } = await import("../lib/notifications");

    // Cria categoria e inscreve subscriber
    const catResult = await createCategory({ name: "Notif Test Category" });
    const cat = requireDefined(catResult?.data?.category, "cat");
    notifCatId = cat.id;

    const [sub] = await db
      .insert(subscriptions)
      .values({ userId: SUBSCRIBER_ID, categoryId: cat.id })
      .returning();
    notifSubId = requireDefined(sub, "sub").id;

    // Cria e publica documento na categoria
    const docResult = await createDocument({
      title: "Documento Publicado para Notificação",
      visibility: "public",
      categoryId: cat.id,
    });
    const doc = requireDefined(docResult?.data?.document, "doc");
    _notifDocId = doc.id;

    await publishDocument({ id: doc.id });

    // Limpa spy antes de chamar notifyNewDocument
    vi.mocked(createNotification).mockClear();

    // Dispara a função de notificação
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
