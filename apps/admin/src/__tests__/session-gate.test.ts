/**
 * session-gate.test.ts
 *
 * Regressão para F2-A1: o app inteiro era legível por qualquer visitante
 * anônimo porque o `(dashboard)/layout.tsx` nunca checava sessão nem papel —
 * lia direto via `db` (conexão superuser), sem gate nenhum.
 *
 * Testa `requireAdminSession()` (o gate usado no layout) isoladamente:
 *   - sem sessão → redireciona para o login canônico
 *   - sessão sem papel super_admin → redireciona para o login canônico
 *   - sessão com super_admin → retorna a sessão normalmente, sem redirecionar
 *
 * Mocks: next/headers (sem contexto de request), next/navigation (redirect
 * lança, como no Next.js real), @hebron/auth/server (resolveSession).
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

describe("requireAdminSession", () => {
  it("sem sessão (anônimo) → redireciona para o login canônico", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockRejectedValue(new Error("Não autenticado"));

    const { requireAdminSession } = await import("../lib/session");

    await expect(requireAdminSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("sessão sem papel super_admin → bloqueado (redireciona)", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "user-1",
      roles: ["colaborador"],
      designations: [],
    });

    const { requireAdminSession } = await import("../lib/session");

    await expect(requireAdminSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("sessão com super_admin → retorna a sessão sem redirecionar", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "admin-1",
      roles: ["super_admin"],
      designations: [],
    });

    const { requireAdminSession } = await import("../lib/session");

    const session = await requireAdminSession();
    expect(session.actorId).toBe("admin-1");
    expect(redirect).not.toHaveBeenCalled();
  });
});
