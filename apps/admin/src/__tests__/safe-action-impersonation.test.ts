/**
 * safe-action-impersonation.test.ts — PACOTE 6 (AUDIT/04-BACKLOG-CORRECAO.md).
 *
 * `adminAction` (lib/safe-action.ts) gates every admin Server Action on
 * `ctx.roles.includes("super_admin")`. Since resolveSession swaps
 * actorId/roles to the impersonated user while a session is active (by
 * design — that's what makes "view as" real in the other 8 apps), a naive
 * pass-through would reject every admin action the moment a super_admin
 * started impersonating anyone without that role — locking them out of the
 * very app impersonation is controlled from. This exercises the fix: ctx
 * always carries the REAL actor while impersonating.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]) }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("adminAction ctx — real actor survives impersonation", () => {
  it("with no impersonation, ctx carries the real session as-is", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "admin-1",
      roles: ["super_admin"],
      designations: [],
    });

    const { adminAction } = await import("../lib/safe-action");
    const action = adminAction
      .schema(z.object({}))
      .action(async ({ ctx }) => ctx);

    const result = await action({});
    expect(result?.data?.actorId).toBe("admin-1");
    expect(result?.data?.roles).toContain("super_admin");
    expect(new Set(result?.data?.roles)).toEqual(new Set(["super_admin"]));
  });

  it("while impersonating a non-super_admin target, ctx still carries the real super_admin actor", async () => {
    const { resolveSession } = await import("@hebron/auth/server");
    vi.mocked(resolveSession).mockResolvedValue({
      actorId: "target-user-1",
      roles: ["submissor"],
      designations: [],
      impersonatedBy: "admin-1",
    });

    const { adminAction } = await import("../lib/safe-action");
    const action = adminAction
      .schema(z.object({}))
      .action(async ({ ctx }) => ctx);

    const result = await action({});
    expect(result?.data?.actorId).toBe("admin-1");
    expect(result?.data?.roles).toContain("super_admin");
    expect(new Set(result?.data?.roles)).toEqual(new Set(["super_admin"]));
    expect(result?.serverError).toBeUndefined();
  });
});
