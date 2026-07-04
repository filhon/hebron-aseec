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
 * lança, como no Next.js real), @hebron/auth/server (resolveSession) — mesmo
 * padrão de apps/admin/src/__tests__/session-gate.test.ts.
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

vi.mock("@hebron/auth", () => ({
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
    });

    const { requireEditorSession } = await import("../lib/session");

    const session = await requireEditorSession();
    expect(session.actorId).toBe("admin-1");
    expect(redirect).not.toHaveBeenCalled();
  });
});
