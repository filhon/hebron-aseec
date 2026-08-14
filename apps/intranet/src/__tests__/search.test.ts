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
 * Cobre os critérios de aceite de busca do P-5.12 e do P-5.8c (CORRETIVO):
 *   1. resultados agregados de múltiplos módulos (projetos/documentos/
 *      tarefas) para o mesmo termo;
 *   2. contrato P-5.8 — usuário sem papel para ver documento "restricted"
 *      (documents_select_restricted: só super_admin/diretor/conselheiro)
 *      não o recebe via busca global, mesmo buscando pelo termo exato;
 *   3. `%` e `_` do termo buscado são texto literal, não coringa de LIKE
 *      (0079_intranet_global_search_precisao.sql);
 *   4. reunião aparece com o rótulo acentuado da aplicação ("Reunião
 *      Ordinária — DD/MM/AAAA"), não o enum cru montado em SQL.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  roleAssignments,
  documents,
  projects,
  tasks,
  workspaces,
  meetingSessions,
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
  percentMatch: "c1000000-0000-0000-0000-000000000005",
  percentNoMatch: "c1000000-0000-0000-0000-000000000006",
  underscoreMatch: "c1000000-0000-0000-0000-000000000007",
  underscoreNoMatch: "c1000000-0000-0000-0000-000000000008",
  meeting: "c1000000-0000-0000-0000-000000000009",
};

// UTC fixo (sem depender do timezone do runner) — verifica o rótulo
// acentuado "Reunião Ordinária — 15/01/2031" no P-5.8c CORRETIVO.
const MEETING_FIXTURE_DATE = new Date(Date.UTC(2031, 0, 15));

// 21 linhas (teto de 20 + 1 sentinela) para provar que o módulo "Projetos"
// sinaliza corte — critério de aceite "módulo com mais correspondências do
// que o teto informa o corte" (P-5.8c CORRETIVO).
const TRUNCATION_PROJECT_COUNT = 21;
const truncationProjectIds: string[] = Array.from(
  { length: TRUNCATION_PROJECT_COUNT },
  () => randomUUID(),
);

beforeAll(async () => {
  const { createTestAuthUser, createTestSessionCookies } =
    await import("@hebron/auth/testing");

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

  // Fixtures do P-5.8c CORRETIVO — % e _ do usuário precisam virar texto
  // literal, não coringa de LIKE.
  await db.insert(projects).values([
    {
      id: FIXTURE_IDS.percentMatch,
      title: `${TOKEN}100%Match`,
      tipo: "pontual",
      submitterId: diretorId,
    },
    {
      id: FIXTURE_IDS.percentNoMatch,
      title: `${TOKEN}100XMatch`,
      tipo: "pontual",
      submitterId: diretorId,
    },
    {
      id: FIXTURE_IDS.underscoreMatch,
      title: `${TOKEN}ata_2026Match`,
      tipo: "pontual",
      submitterId: diretorId,
    },
    {
      // Espaço no lugar do "_" — o próprio exemplo do critério de aceite
      // ("buscar ata_2026 não casa 'ata 2026'").
      id: FIXTURE_IDS.underscoreNoMatch,
      title: `${TOKEN}ata 2026Match`,
      tipo: "pontual",
      submitterId: diretorId,
    },
  ]);

  await db.insert(meetingSessions).values({
    id: FIXTURE_IDS.meeting,
    date: MEETING_FIXTURE_DATE,
    type: "ordinaria",
  });

  await db.insert(projects).values(
    truncationProjectIds.map((id, index) => ({
      id,
      title: `${TOKEN}TruncTest${index}`,
      tipo: "pontual" as const,
      submitterId: diretorId,
    })),
  );
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
  await db
    .delete(projects)
    .where(
      inArray(projects.id, [
        FIXTURE_IDS.project,
        FIXTURE_IDS.percentMatch,
        FIXTURE_IDS.percentNoMatch,
        FIXTURE_IDS.underscoreMatch,
        FIXTURE_IDS.underscoreNoMatch,
        ...truncationProjectIds,
      ]),
    );
  await db.delete(tasks).where(eq(tasks.id, FIXTURE_IDS.task));
  await db
    .delete(meetingSessions)
    .where(eq(meetingSessions.id, FIXTURE_IDS.meeting));

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

describe("globalSearch — P-5.8c CORRETIVO: % e _ não são coringa", () => {
  it('buscar "100%" não devolve título que só contém "100"', async () => {
    state.activeCookieJar = diretorCookies;
    const { globalSearch } = await import("../actions/search");

    const result = await globalSearch({ query: `${TOKEN}100%` });
    const ids = (result?.data?.results ?? []).map((r) => r.id);
    expect(ids).toContain(FIXTURE_IDS.percentMatch);
    expect(ids).not.toContain(FIXTURE_IDS.percentNoMatch);
  });

  it('buscar "ata_2026" não casa "ata 2026" (_ não é "qualquer caractere")', async () => {
    state.activeCookieJar = diretorCookies;
    const { globalSearch } = await import("../actions/search");

    const result = await globalSearch({ query: `${TOKEN}ata_2026` });
    const ids = (result?.data?.results ?? []).map((r) => r.id);
    expect(ids).toContain(FIXTURE_IDS.underscoreMatch);
    expect(ids).not.toContain(FIXTURE_IDS.underscoreNoMatch);
  });
});

describe("globalSearch — P-5.8c CORRETIVO: módulo truncado avisa o corte", () => {
  it("21 projetos correspondentes: só 20 voltam e 'Projetos' entra em truncatedModules", async () => {
    state.activeCookieJar = diretorCookies;
    const { globalSearch } = await import("../actions/search");

    const result = await globalSearch({ query: `${TOKEN}TruncTest` });
    expect(result?.serverError).toBeUndefined();

    const projectResults = (result?.data?.results ?? []).filter(
      (r) => r.module === "Projetos",
    );
    expect(projectResults).toHaveLength(20);
    expect(result?.data?.truncatedModules).toContain("Projetos");
  });
});

describe("globalSearch — P-5.8c CORRETIVO: rótulo de reunião acentuado", () => {
  it('reunião "ordinaria" aparece como "Reunião Ordinária — DD/MM/AAAA"', async () => {
    state.activeCookieJar = diretorCookies;
    const { globalSearch } = await import("../actions/search");

    const result = await globalSearch({ query: "ordinaria" });
    const meeting = (result?.data?.results ?? []).find(
      (r) => r.id === FIXTURE_IDS.meeting,
    );
    expect(meeting).toBeDefined();
    expect(meeting?.title).toBe("Reunião Ordinária — 15/01/2031");
  });
});
