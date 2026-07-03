/**
 * session-real.test.ts
 *
 * Regressão para CS-1/F3-03/F3-08: o padrão antigo (criar um client
 * supabase-js "puro" e forçar um header de Cookie nele) nunca lia a sessão
 * do Supabase corretamente e negava acesso a todo mundo.
 *
 * Este teste NÃO mocka @supabase/supabase-js nem @hebron/auth — faz um
 * login real (signInWithPassword) contra o projeto Supabase de
 * desenvolvimento e verifica que a Server Action gated (`adminAction`,
 * de "../lib/safe-action", o kit compartilhado) resolve a sessão de
 * verdade a partir do cookie e retorna sucesso.
 *
 * Único mock: next/headers (não há request HTTP real fora do Next.js).
 *
 * Requer: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (ver .env.local).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { z } from "zod";
import { db } from "@hebron/db/client";
import { roleAssignments } from "@hebron/db/schema";
import type { TestSessionCookieStore } from "@hebron/auth/testing";

const EMAIL = `session-real-admin-${Date.now()}@test.hebron`;
const PASSWORD = "T3st-Sessao-Real!";

const state = vi.hoisted(() => ({
  cookieJar: null as TestSessionCookieStore | null,
}));

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (!state.cookieJar) throw new Error("cookieJar não inicializado");
    return state.cookieJar;
  },
}));

let authUserId: string;

beforeAll(async () => {
  const { createTestAuthUser, createTestSessionCookies } =
    await import("@hebron/auth/testing");

  authUserId = await createTestAuthUser(EMAIL, PASSWORD, "Sessão Real Admin");

  // A trigger (on_auth_user_created) já espelhou este usuário em
  // public.users — só falta o papel.
  await db.insert(roleAssignments).values({
    userId: authUserId,
    role: "super_admin",
    grantedBy: authUserId,
  });

  state.cookieJar = await createTestSessionCookies(EMAIL, PASSWORD);
});

afterAll(async () => {
  const { deleteTestAuthUser } = await import("@hebron/auth/testing");
  // Deletar o auth user faz cascade em public.users → role_assignments.
  await deleteTestAuthUser(authUserId);
});

describe("sessão real (sem mock de supabase-js)", () => {
  it("login real → adminAction (kit compartilhado) resolve a sessão e retorna sucesso", async () => {
    const { adminAction } = await import("../lib/safe-action");

    const probe = adminAction
      .schema(z.object({}))
      .action(async ({ ctx }) => ({ actorId: ctx.actorId }));

    const result = await probe({});

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.actorId).toBe(authUserId);
  });
});
