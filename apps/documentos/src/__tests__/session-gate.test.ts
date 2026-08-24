/**
 * session-gate.test.ts
 *
 * Regressão para F2-D2: a área editorial era legível por qualquer visitante
 * anônimo porque o `editorial/layout.tsx` nunca checava sessão nem papel —
 * só exibia um texto decorativo ("Acesso restrito: super_admin / editor")
 * sem nenhuma verificação real, e as páginas liam direto via `db` (conexão
 * superuser), sem gate nenhum.
 *
 * Testa `requireEditorSession()` (o gate usado no layout) isoladamente:
 *   - sem sessão → redireciona para o login canônico
 *   - sessão sem papel editorial (ex.: hospede) → redireciona
 *   - sessão com papel editorial (colaborador) → retorna a sessão, sem redirecionar
 *
 * Mocks: next/headers (sem contexto de request), next/navigation (redirect
 * lança, como no Next.js real), @hebron/auth/server (resolveSession),
 * @hebron/auth/middleware (CANONICAL_LOGIN_URL — o gate agora vive em
 * @hebron/auth/role-gate, que importa a constante direto de lá, não do
 * barrel "@hebron/auth") — mesmo padrão de
 * apps/admin/src/__tests__/session-gate.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const CANONICAL_LOGIN_URL = "http://localhost:3005/login";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@hebron/auth/middleware", () => ({
  CANONICAL_LOGIN_URL,
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireEditorSession", () => {
  it("sem sessão (anônimo) → redireciona para o login canônico", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockRejectedValue(new Error("Não autenticado"));

    const { requireEditorSession } = await import("../lib/session");

    await expect(requireEditorSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("sessão sem papel editorial (hospede) → bloqueado (redireciona)", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "user-1",
      roles: ["hospede"],
      designations: [],
    });

    const { requireEditorSession } = await import("../lib/session");

    await expect(requireEditorSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("sessão com colaborador → retorna a sessão sem redirecionar", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "editor-1",
      roles: ["colaborador"],
      designations: [],
    });

    const { requireEditorSession } = await import("../lib/session");

    const session = await requireEditorSession();
    expect(session.actorId).toBe("editor-1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sessão com super_admin → retorna a sessão sem redirecionar", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "admin-1",
      roles: ["super_admin"],
      designations: [],
    });

    const { requireEditorSession } = await import("../lib/session");

    const session = await requireEditorSession();
    expect(session.actorId).toBe("admin-1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sessão com conselheiro → navega a área editorial (somente-leitura)", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "conselheiro-1",
      roles: ["conselheiro"],
      designations: [],
    });

    const { requireEditorSession } = await import("../lib/session");

    const session = await requireEditorSession();
    expect(session.actorId).toBe("conselheiro-1");
    expect(redirect).not.toHaveBeenCalled();
  });
});

/**
 * Regressão P-1.19c: `/editorial/novo` e `/editorial/[id]/editar` usavam
 * `requireEditorSession`, que aceita `conselheiro` — quem digitasse a URL
 * direto via o formulário inteiro e só falhava no submit, com o "Acesso
 * negado" do `editorAction`. As duas telas passaram a usar
 * `requireDocumentWriterSession`, construído sobre o mesmo
 * `DOCUMENT_WRITE_ROLES` que já governa `editorAction` e a UI.
 */
describe("requireDocumentWriterSession", () => {
  it("sem sessão (anônimo) → redireciona para o login canônico", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockRejectedValue(new Error("Não autenticado"));

    const { requireDocumentWriterSession } = await import("../lib/session");

    await expect(requireDocumentWriterSession()).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("conselheiro → redireciona (é somente-leitura, não vê o formulário)", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "conselheiro-1",
      roles: ["conselheiro"],
      designations: [],
    });

    const { requireDocumentWriterSession } = await import("../lib/session");

    await expect(requireDocumentWriterSession()).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("hospede → redireciona", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "hospede-1",
      roles: ["hospede"],
      designations: [],
    });

    const { requireDocumentWriterSession } = await import("../lib/session");

    await expect(requireDocumentWriterSession()).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it.each([["colaborador"], ["diretor"], ["super_admin"]] as const)(
    "%s → retorna a sessão sem redirecionar (acesso inalterado)",
    async (role) => {
      const { resolveSession } = await import("@hebron/auth/server");
      const { redirect } = await import("next/navigation");
      vi.mocked(resolveSession).mockResolvedValue({
        actorId: `${role}-1`,
        roles: [role],
        designations: [],
      });

      const { requireDocumentWriterSession } = await import("../lib/session");

      const session = await requireDocumentWriterSession();
      expect(session.actorId).toBe(`${role}-1`);
      expect(redirect).not.toHaveBeenCalled();
    },
  );

  it("conselheiro que também é colaborador passa (um papel basta)", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "duplo-1",
      roles: ["conselheiro", "colaborador"],
      designations: [],
    });

    const { requireDocumentWriterSession } = await import("../lib/session");

    const session = await requireDocumentWriterSession();
    expect(session.actorId).toBe("duplo-1");
    expect(redirect).not.toHaveBeenCalled();
  });
});

/**
 * O conjunto de papéis com escrita vive em um único lugar
 * (`DOCUMENT_WRITE_ROLES`): a UI (`hasDocumentWriteRole`), o gate de tela
 * (`requireDocumentWriterSession`) e o `editorAction` leem todos dele.
 */
describe("hasDocumentWriteRole", () => {
  it("conselheiro não escreve; colaborador, diretor e super_admin escrevem", async () => {
    const { hasDocumentWriteRole, DOCUMENT_WRITE_ROLES } =
      await import("../lib/session");

    expect(hasDocumentWriteRole(["conselheiro"])).toBe(false);
    expect(hasDocumentWriteRole(["hospede"])).toBe(false);
    expect(hasDocumentWriteRole([])).toBe(false);
    expect(hasDocumentWriteRole(["colaborador"])).toBe(true);
    expect(hasDocumentWriteRole(["diretor"])).toBe(true);
    expect(hasDocumentWriteRole(["super_admin"])).toBe(true);
    expect(hasDocumentWriteRole(["conselheiro", "colaborador"])).toBe(true);

    expect(DOCUMENT_WRITE_ROLES).not.toContain("conselheiro");
  });
});
