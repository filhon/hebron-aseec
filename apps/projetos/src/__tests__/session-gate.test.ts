/**
 * session-gate.test.ts
 *
 * Regressão para F2-P4 (CRÍTICO): `(diretoria)/layout.tsx` checava apenas
 * `getAuthUser() !== null` — nenhuma checagem de papel — permitindo que um
 * submissor autenticado navegasse para `/pipeline/<id>` e visse score IA,
 * breakdown, versão compacta e contagem de votos de qualquer projeto.
 * `(submissor)/layout.tsx` tinha o mesmo problema (qualquer autenticado,
 * inclusive diretor/conselheiro, entrava na área do submissor).
 *
 * Testa `requireDiretorSession()`/`requireSubmissorSession()` isoladamente.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const CANONICAL_LOGIN_URL = "http://localhost:3009/login";

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

describe("requireDiretorSession", () => {
  it("sem sessão (anônimo) → redireciona para o login canônico", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockRejectedValue(new Error("Não autenticado"));

    const { requireDiretorSession } = await import("../lib/session");

    await expect(requireDiretorSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("submissor autenticado → bloqueado (redireciona) — F2-P4", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "user-1",
      roles: ["submissor"],
    });

    const { requireDiretorSession } = await import("../lib/session");

    await expect(requireDiretorSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("diretor → retorna a sessão sem redirecionar", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "dir-1",
      roles: ["diretor"],
    });

    const { requireDiretorSession } = await import("../lib/session");

    const session = await requireDiretorSession();
    expect(session.actorId).toBe("dir-1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("conselheiro → retorna a sessão sem redirecionar", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "cons-1",
      roles: ["conselheiro"],
    });

    const { requireDiretorSession } = await import("../lib/session");

    const session = await requireDiretorSession();
    expect(session.actorId).toBe("cons-1");
  });

  it("super_admin → retorna a sessão sem redirecionar", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "admin-1",
      roles: ["super_admin"],
    });

    const { requireDiretorSession } = await import("../lib/session");

    const session = await requireDiretorSession();
    expect(session.actorId).toBe("admin-1");
  });
});

describe("requireSubmissorSession", () => {
  it("sem sessão (anônimo) → redireciona para o login canônico", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockRejectedValue(new Error("Não autenticado"));

    const { requireSubmissorSession } = await import("../lib/session");

    await expect(requireSubmissorSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("diretor autenticado → bloqueado (redireciona)", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "dir-1",
      roles: ["diretor"],
    });

    const { requireSubmissorSession } = await import("../lib/session");

    await expect(requireSubmissorSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(CANONICAL_LOGIN_URL);
  });

  it("submissor → retorna a sessão sem redirecionar", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    const { redirect } = await import("next/navigation");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "sub-1",
      roles: ["submissor"],
    });

    const { requireSubmissorSession } = await import("../lib/session");

    const session = await requireSubmissorSession();
    expect(session.actorId).toBe("sub-1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("super_admin → retorna a sessão sem redirecionar", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "admin-1",
      roles: ["super_admin"],
    });

    const { requireSubmissorSession } = await import("../lib/session");

    const session = await requireSubmissorSession();
    expect(session.actorId).toBe("admin-1");
  });
});
