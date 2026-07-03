/**
 * session-real.test.ts
 *
 * Regressão para CS-1/F3-03/F3-08 (ver apps/admin para o histórico completo
 * do bug: um client supabase-js "puro" com um header de Cookie forçado
 * nunca lia a sessão do Supabase e negava acesso a todo mundo). Financeiro
 * é um módulo de governança — este teste garante que a migração para o kit
 * compartilhado @hebron/auth/server resolve a sessão de verdade.
 *
 * Login real (signInWithPassword) contra o Supabase de desenvolvimento;
 * único mock é next/headers (sem request HTTP real fora do Next.js).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { z } from "zod";
import { db } from "@hebron/db/client";
import { roleAssignments } from "@hebron/db/schema";
import type { TestSessionCookieStore } from "@hebron/auth/testing";

const EMAIL = `session-real-financeiro-${Date.now()}@test.hebron`;
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

  authUserId = await createTestAuthUser(
    EMAIL,
    PASSWORD,
    "Sessão Real Financeiro",
  );

  // A trigger (on_auth_user_created) já espelhou este usuário em
  // public.users — só falta o papel.
  await db.insert(roleAssignments).values({
    userId: authUserId,
    role: "colaborador",
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
  it("login real → colaboradorAction (kit compartilhado) resolve a sessão e retorna sucesso", async () => {
    const { colaboradorAction } = await import("../lib/safe-action");

    const probe = colaboradorAction
      .schema(z.object({}))
      .action(async ({ ctx }) => ({ actorId: ctx.actorId }));

    const result = await probe({});

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.actorId).toBe(authUserId);
  });
});
