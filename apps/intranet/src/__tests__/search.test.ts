/**
 * search.test.ts — P-5.12: exercita `globalSearch` (apps/intranet/src/
 * actions/search.ts) fim a fim, sem mockar supabase-js — `globalSearch`
 * chama `getSessionSupabaseClient()` (apps/intranet/src/lib/session-client.ts),
 * que exige cookies de sessão reais para `auth.uid()` resolver dentro da RPC
 * `public.intranet_global_search` (SECURITY INVOKER, 0039). Mockar apenas
 * `resolveSession` (padrão usado em rls.test.ts/kpis.test.ts) não helps aqui,
 * já que a action não passa por `ctx.actorId` para a busca. Mesmo padrão de
 * apps/documentos/src/__tests__/session-real.test.ts:
 * `createTestAuthUser` + `createTestSessionCookies` (login real via
 * signInWithPassword), único mock é `next/headers.cookies()`.
 *
 * Cobre os dois critérios de aceite de busca do P-5.12:
 *   1. resultados agregados de múltiplos módulos (projetos/documentos/
 *      tarefas) para o mesmo termo;
 *   2. contrato P-5.8 — usuário sem papel para ver documento "restricted"
 *      (documents_select_restricted: só super_admin/diretor/conselheiro)
 *      não o recebe via busca global, mesmo buscando pelo termo exato.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  roleAssignments,
  documents,
  projects,
  tasks,
  workspaces,
} from "@hebron/db/schema";
import type { TestSessionCookieStore } from "@hebron/auth/testing";

const state = vi.hoisted(() => ({
  activeCookieJar: null as TestSessionCookieStore | null,
}));

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (!state.activeCookieJar) throw new Error("cookieJar não inicializado");
    return state.activeCookieJar;
  },
}));

const TOKEN = `srchtok${Date.now()}`;
const DIRETOR_EMAIL = `search-diretor-${Date.now()}@test.hebron`;
const COLABORADOR_EMAIL = `search-colaborador-${Date.now()}@test.hebron`;
const PASSWORD = "T3st-Busca-Global!";

let diretorId: string;
let colaboradorId: string;
let diretorCookies: TestSessionCookieStore;
let colaboradorCookies: TestSessionCookieStore;

const FIXTURE_IDS = {
  docInternal: "c1000000-0000-0000-0000-000000000001",
  docRestricted: "c1000000-0000-0000-0000-000000000002",
  project: "c1000000-0000-0000-0000-000000000003",
  task: "c1000000-0000-0000-0000-000000000004",
};

beforeAll(async () => {
  const { createTestAuthUser, createTestSessionCookies } = await import(
    "@hebron/auth/testing"
  );

  diretorId = await createTestAuthUser(
    DIRETOR_EMAIL,
    PASSWORD,
    "Busca Global Diretor",
  );
  colaboradorId = await createTestAuthUser(
    COLABORADOR_EMAIL,
    PASSWORD,
    "Busca Global Colaborador",
  );

  await db.insert(roleAssignments).values([
    { userId: diretorId, role: "diretor", grantedBy: diretorId },
    { userId: colaboradorId, role: "colaborador", grantedBy: diretorId },
  ]);

  diretorCookies = await createTestSessionCookies(DIRETOR_EMAIL, PASSWORD);
  colaboradorCookies = await createTestSessionCookies(
    COLABORADOR_EMAIL,
    PASSWORD,
  );

  const [administrativo] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "administrativo"))
    .limit(1);
  if (!administrativo) throw new Error("Workspace 'administrativo' ausente");

  await db.insert(documents).values([
    {
      id: FIXTURE_IDS.docInternal,
      title: `${TOKEN} Documento Interno`,
      slug: `${TOKEN}-documento-interno`,
      visibility: "internal",
      authorId: diretorId,
    },
    {
      id: FIXTURE_IDS.docRestricted,
      title: `${TOKEN} Documento Restrito`,
      slug: `${TOKEN}-documento-restrito`,
      visibility: "restricted",
      authorId: diretorId,
    },
  ]);

  await db.insert(projects).values({
    id: FIXTURE_IDS.project,
    title: `${TOKEN} Projeto Teste`,
    tipo: "pontual",
    submitterId: diretorId,
  });

  await db.insert(tasks).values({
    id: FIXTURE_IDS.task,
    title: `${TOKEN} Tarefa Teste`,
    workspaceId: administrativo.id,
    createdBy: diretorId,
  });
});

afterAll(async () => {
  await db
    .delete(documents)
    .where(
      inArray(documents.id, [
        FIXTURE_IDS.docInternal,
        FIXTURE_IDS.docRestricted,
      ]),
    );
  await db.delete(projects).where(eq(projects.id, FIXTURE_IDS.project));
  await db.delete(tasks).where(eq(tasks.id, FIXTURE_IDS.task));

  const { deleteTestAuthUser } = await import("@hebron/auth/testing");
  await deleteTestAuthUser(diretorId);
  await deleteTestAuthUser(colaboradorId);
});

describe("globalSearch — resultados de múltiplos módulos", () => {
  it("agrega projetos, documentos e tarefas para o mesmo termo (diretor)", async () => {
    state.activeCookieJar = diretorCookies;
    const { globalSearch } = await import("../actions/search");

    const result = await globalSearch({ query: TOKEN });
    expect(result?.serverError).toBeUndefined();

    const byModule = new Map(
      (result?.data?.results ?? []).map((r) => [r.module, r]),
    );
    expect(byModule.has("Projetos")).toBe(true);
    expect(byModule.has("Documentos")).toBe(true);
    expect(byModule.has("Tarefas")).toBe(true);
  });
});

describe("globalSearch — contrato P-5.8: documento restricted respeita RLS de documentos", () => {
  it("diretor (com acesso a restricted) recebe o documento restrito na busca", async () => {
    state.activeCookieJar = diretorCookies;
    const { globalSearch } = await import("../actions/search");

    const result = await globalSearch({ query: TOKEN });
    const ids = (result?.data?.results ?? []).map((r) => r.id);
    expect(ids).toContain(FIXTURE_IDS.docRestricted);
  });

  it("colaborador (sem papel para restricted) não recebe o documento restrito na busca", async () => {
    state.activeCookieJar = colaboradorCookies;
    const { globalSearch } = await import("../actions/search");

    const result = await globalSearch({ query: TOKEN });
    expect(result?.serverError).toBeUndefined();
    const ids = (result?.data?.results ?? []).map((r) => r.id);
    expect(ids).not.toContain(FIXTURE_IDS.docRestricted);
  });
});
