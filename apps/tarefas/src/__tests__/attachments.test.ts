/**
 * attachments.test.ts — anexos de tarefa
 *
 * Cobre o contrato de backend que a UI de Tarefas consome em três passos:
 *  1. createAttachment (P-4.9b, actions/tasks.ts) registra a linha do anexo e
 *     devolve uma signed upload URL (o cliente faz o PUT do arquivo direto ao
 *     Storage — mesmo padrão de apps/documentos).
 *  2. o fluxo "criar tarefa → anexar" compõe createTask + createAttachment,
 *     deixando o anexo amarrado à tarefa recém-criada.
 *  3. getAttachmentUrl (P-4.9c, CORRETIVO, actions/attachments.ts) resolve a
 *     signed URL de leitura a partir do attachmentId — a metade "download"
 *     que P-4.9b não implementou. parentType agora é restrito a "task"
 *     (createAttachmentSchema): nenhum formulário anexa a um comentário.
 *
 * O client de Storage (@hebron/auth/server::createSupabaseServerActionClient)
 * é mockado para não depender de uma conexão real ao Supabase Storage.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  workspaces,
  tasks,
  taskAttachments,
  taskEvents,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const ACTOR_ID = "ec200000-0000-0000-0000-000000000001";
const SECOND_COLAB_ID = "ec200000-0000-0000-0000-000000000002";
const SUBMISSOR_ID = "ec200000-0000-0000-0000-000000000003";
const MOCK_SIGNED_URL = "https://mock.storage/tarefas-anexos/upload";
const MOCK_READ_URL = "https://mock.storage/tarefas-anexos/leitura?token=abc";

const createSignedUrlMock = vi
  .fn()
  .mockResolvedValue({ data: { signedUrl: MOCK_READ_URL }, error: null });

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["colaborador"],
    designations: [],
  }),
  createSupabaseServerActionClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUploadUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: MOCK_SIGNED_URL },
          error: null,
        }),
        createSignedUrl: createSignedUrlMock,
      }),
    },
  }),
}));

/** Troca o ator/papel só para a próxima chamada de action (revertendo ao
 * padrão ACTOR_ID/colaborador em seguida — mesmo padrão de approvals.test.ts). */
async function actingAs(userId: string, roles: string[]): Promise<void> {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: roles as any,
    designations: [],
  });
}

let workspaceId: string;
let existingTaskId: string;
const createdTaskIds = new Set<string>();
const createdUserIds = new Set<string>([SECOND_COLAB_ID]);

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: ACTOR_ID,
        email: "attachments-test@test.hebron",
        fullName: "Attachments Tester",
      },
      {
        id: SECOND_COLAB_ID,
        email: "attachments-test-2@test.hebron",
        fullName: "Attachments Tester Dois",
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values([
      { userId: ACTOR_ID, role: "colaborador", grantedBy: ACTOR_ID },
      { userId: SECOND_COLAB_ID, role: "colaborador", grantedBy: ACTOR_ID },
    ])
    .onConflictDoNothing();

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "comunicacao"))
    .limit(1);
  if (!ws)
    throw new Error("Workspace comunicacao não encontrado (seed ausente)");
  workspaceId = ws.id;

  const [task] = await db
    .insert(tasks)
    .values({
      title: "Tarefa base para anexos",
      workspaceId,
      priority: "media",
      source: "manual",
      createdBy: ACTOR_ID,
    })
    .returning();
  if (!task) throw new Error("Falha ao criar tarefa base");
  existingTaskId = task.id;
  createdTaskIds.add(task.id);
});

afterAll(async () => {
  const ids = Array.from(createdTaskIds);
  if (ids.length > 0) {
    await db
      .delete(taskAttachments)
      .where(inArray(taskAttachments.parentId, ids));
    await db.delete(taskEvents).where(inArray(taskEvents.taskId, ids));
    await db.delete(tasks).where(inArray(tasks.id, ids));
  }
  const userIds = [ACTOR_ID, ...Array.from(createdUserIds)];
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, userIds));
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("createAttachment — registra a linha e devolve signed upload URL", () => {
  it("insere o anexo vinculado à tarefa e retorna a URL assinada", async () => {
    const { createAttachment } = await import("../actions/tasks");

    const result = await createAttachment({
      parentType: "task",
      parentId: existingTaskId,
      fileName: "relatorio.pdf",
      fileSizeBytes: 2048,
      mimeType: "application/pdf",
    });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.uploadUrl).toBe(MOCK_SIGNED_URL);
    expect(result?.data?.attachment?.id).toBeTruthy();

    const rows = await db
      .select()
      .from(taskAttachments)
      .where(
        and(
          eq(taskAttachments.parentType, "task"),
          eq(taskAttachments.parentId, existingTaskId),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.fileName).toBe("relatorio.pdf");
    expect(rows[0]?.uploadedBy).toBe(ACTOR_ID);
  });

  it("recusa anexo em tarefa inexistente", async () => {
    const { createAttachment } = await import("../actions/tasks");
    const result = await createAttachment({
      parentType: "task",
      parentId: "ec200000-0000-0000-0000-0000000000ff",
      fileName: "orfao.pdf",
      fileSizeBytes: 10,
      mimeType: "application/pdf",
    });
    expect(result?.serverError).toBeDefined();
  });
});

describe("fluxo criar tarefa → anexar (os dois passos da UI)", () => {
  it("createTask seguido de createAttachment deixa o anexo amarrado à tarefa nova", async () => {
    const { createTask, createAttachment } = await import("../actions/tasks");

    const createResult = await createTask({
      title: "Tarefa com anexo pela UI",
      description: null,
      workspace: "comunicacao",
      priority: "media",
      dueDate: null,
      assigneeIds: [],
      tagIds: [],
      recurrenceRule: null,
    });
    expect(createResult?.serverError).toBeUndefined();
    const taskId = createResult?.data?.task.id as unknown as string;
    expect(taskId).toBeTruthy();
    createdTaskIds.add(taskId);

    const attachResult = await createAttachment({
      parentType: "task",
      parentId: taskId,
      fileName: "anexo-ui.png",
      fileSizeBytes: 512,
      mimeType: "image/png",
    });
    expect(attachResult?.serverError).toBeUndefined();
    expect(attachResult?.data?.uploadUrl).toBe(MOCK_SIGNED_URL);

    const rows = await db
      .select()
      .from(taskAttachments)
      .where(eq(taskAttachments.parentId, taskId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.fileName).toBe("anexo-ui.png");
  });
});

describe("getAttachmentUrl — resolve a URL assinada de leitura (P-4.9c)", () => {
  let attachmentId: string;
  let storageKey: string;

  beforeAll(async () => {
    storageKey = `${ACTOR_ID}/leitura-teste.pdf`;
    const [row] = await db
      .insert(taskAttachments)
      .values({
        parentType: "task",
        parentId: existingTaskId,
        storageKey,
        fileName: "leitura-teste.pdf",
        fileSizeBytes: 4096,
        mimeType: "application/pdf",
        uploadedBy: ACTOR_ID,
      })
      .returning();
    if (!row) throw new Error("Falha ao inserir anexo para leitura");
    attachmentId = row.id;
  });

  it("gera a URL assinada para quem criou o anexo", async () => {
    const { getAttachmentUrl } = await import("../actions/attachments");
    createSignedUrlMock.mockClear();

    const result = await getAttachmentUrl({ attachmentId });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.url).toBe(MOCK_READ_URL);
    expect(result?.data?.fileName).toBe("leitura-teste.pdf");
    // storage_key nunca sai na resposta que a UI recebe
    expect(Object.keys(result?.data ?? {}).sort()).toEqual(["fileName", "url"]);
    // expiração curta — a URL não é gerada para validade indefinida
    expect(createSignedUrlMock).toHaveBeenCalledWith(storageKey, 300);
  });

  it("um segundo colaborador (não criador, não responsável) abre o mesmo anexo — transparência interna", async () => {
    await actingAs(SECOND_COLAB_ID, ["colaborador"]);
    const { getAttachmentUrl } = await import("../actions/attachments");

    const result = await getAttachmentUrl({ attachmentId });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.url).toBe(MOCK_READ_URL);
  });

  it("um papel externo (submissor) não obtém URL para anexo nenhum", async () => {
    await actingAs(SUBMISSOR_ID, ["submissor"]);
    const { getAttachmentUrl } = await import("../actions/attachments");

    const result = await getAttachmentUrl({ attachmentId });

    expect(result?.serverError).toBeDefined();
    expect(result?.data).toBeUndefined();
  });

  it("recusa um attachmentId inexistente", async () => {
    const { getAttachmentUrl } = await import("../actions/attachments");

    const result = await getAttachmentUrl({
      attachmentId: "ec200000-0000-0000-0000-0000000000ff",
    });

    expect(result?.serverError).toBeDefined();
    expect(result?.data).toBeUndefined();
  });
});
