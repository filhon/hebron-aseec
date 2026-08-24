/**
 * renewal.test.ts — P-2.13 (Detecção de renovação de projetos)
 *
 * `findRenewalCandidate` roda pelo pipeline real de Server Action
 * (submissorAction) — precisa de sessão mockada, mesmo padrão de
 * flow.test.ts/state-machine.test.ts.
 *
 * Nota: apesar de `PROMPTS.md` P-2.13 listar
 * `apps/projetos/src/actions/__tests__/renewal.test.ts` entre os arquivos
 * permitidos, `vitest.config.ts` só descobre testes em `src/__tests__/**`
 * — colocado aqui (mesma pasta dos demais 14 arquivos de teste do app) para
 * que a suíte realmente rode. Divergência registrada em SESSIONS.md (S-264).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  organizationMembers,
  projects,
  projectVersions,
} from "@hebron/db/schema";

const resolveSessionMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@hebron/auth/server", () => ({
  resolveSession: (...args: unknown[]) => resolveSessionMock(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IDS = {
  users: {
    submissor: "cdaa0000-0000-0000-0000-000000000001",
    outsider: "cdaa0000-0000-0000-0000-000000000002",
    // Segundo membro da Org C — renova um projeto que NÃO foi ele quem
    // submeteu (P-2.6c).
    colega: "cdaa0000-0000-0000-0000-000000000003",
  },
  orgs: {
    a: "cdbb0000-0000-0000-0000-000000000001",
    b: "cdbb0000-0000-0000-0000-000000000002",
    empty: "cdbb0000-0000-0000-0000-000000000003",
    c: "cdbb0000-0000-0000-0000-000000000004",
  },
} as const;

const PROJECT_IDS = {
  // Org A: candidato mais antigo (concluido) — não deve ser escolhido.
  older: "cdcc0000-0000-0000-0000-000000000001",
  // Org A: candidato mais recente (aprovado) — o que a busca deve retornar.
  newer: "cdcc0000-0000-0000-0000-000000000002",
  // Org A: rascunho recente — não é estágio final, deve ser ignorado.
  draftStage: "cdcc0000-0000-0000-0000-000000000003",
  // Org A: pontual em estágio final e mais recente que tudo — não conta
  // (só projeto anual oferece renovação, BRAIN §6.2).
  pontual: "cdcc0000-0000-0000-0000-000000000004",
  // Org B: candidato válido, mas de outra organização — nunca deve
  // aparecer para a Org A.
  otherOrg: "cdcc0000-0000-0000-0000-000000000005",
  // Org C: candidato com `meses_pagamento` gravado na coluna (P-2.6c) e um
  // snapshot com meses DIFERENTES — para provar qual das duas fontes vence.
  colunaMeses: "cdcc0000-0000-0000-0000-000000000006",
} as const;

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.users.submissor,
        email: "renewal-submissor@test.hebron",
        fullName: "Renewal Submissor",
      },
      {
        id: IDS.users.outsider,
        email: "renewal-outsider@test.hebron",
        fullName: "Renewal Outsider",
      },
      {
        id: IDS.users.colega,
        email: "renewal-colega@test.hebron",
        fullName: "Renewal Colega",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.users.submissor,
        role: "submissor" as const,
        grantedBy: IDS.users.submissor,
      },
      {
        userId: IDS.users.outsider,
        role: "submissor" as const,
        grantedBy: IDS.users.outsider,
      },
      {
        userId: IDS.users.colega,
        role: "submissor" as const,
        grantedBy: IDS.users.colega,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values([
      {
        id: IDS.orgs.a,
        nome: "Org Renovação A",
        createdBy: IDS.users.submissor,
      },
      {
        id: IDS.orgs.b,
        nome: "Org Renovação B",
        createdBy: IDS.users.outsider,
      },
      {
        id: IDS.orgs.empty,
        nome: "Org Renovação Sem Histórico",
        createdBy: IDS.users.submissor,
      },
      {
        id: IDS.orgs.c,
        nome: "Org Renovação C",
        createdBy: IDS.users.submissor,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(organizationMembers)
    .values([
      { organizationId: IDS.orgs.a, userId: IDS.users.submissor },
      { organizationId: IDS.orgs.empty, userId: IDS.users.submissor },
      { organizationId: IDS.orgs.b, userId: IDS.users.outsider },
      { organizationId: IDS.orgs.c, userId: IDS.users.submissor },
      { organizationId: IDS.orgs.c, userId: IDS.users.colega },
    ])
    .onConflictDoNothing();

  const base = {
    organizationId: IDS.orgs.a,
    submitterId: IDS.users.submissor,
    tipo: "anual" as const,
  };

  await db
    .insert(projects)
    .values([
      {
        id: PROJECT_IDS.older,
        ...base,
        title: "Missão Antiga 2024",
        stage: "concluido" as const,
        evaluationYear: 2024,
        budgetTotal: "10000.00",
        parcelas: 4,
        meses: 4,
        objectives: "Objetivos antigos",
        justification: "Justificativa antiga",
        expectedResults: "Resultados antigos",
        ministryRegion: "Norte",
        ministryArea: "Brasil",
        createdAt: new Date("2024-01-10T00:00:00Z"),
      },
      {
        id: PROJECT_IDS.newer,
        ...base,
        title: "Missão Recente 2025",
        stage: "aprovado" as const,
        evaluationYear: 2025,
        budgetTotal: "24000.00",
        parcelas: 6,
        meses: 6,
        objectives: "Objetivos recentes",
        justification: "Justificativa recente",
        expectedResults: "Resultados recentes",
        ministryRegion: "Sul",
        ministryArea: "Brasil",
        createdAt: new Date("2025-06-10T00:00:00Z"),
      },
      {
        id: PROJECT_IDS.draftStage,
        ...base,
        title: "Rascunho Não Deveria Aparecer",
        stage: "rascunho" as const,
        evaluationYear: 2026,
        budgetTotal: "5000.00",
        parcelas: 1,
        meses: 1,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        id: PROJECT_IDS.pontual,
        ...base,
        tipo: "pontual" as const,
        title: "Pontual Não Deveria Aparecer",
        stage: "concluido" as const,
        evaluationYear: 2026,
        budgetTotal: "3000.00",
        parcelas: 1,
        meses: 1,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
      {
        id: PROJECT_IDS.otherOrg,
        organizationId: IDS.orgs.b,
        submitterId: IDS.users.outsider,
        tipo: "anual" as const,
        title: "Projeto da Org B",
        stage: "concluido" as const,
        evaluationYear: 2025,
        budgetTotal: "8000.00",
        parcelas: 2,
        meses: 2,
        createdAt: new Date("2025-01-01T00:00:00Z"),
      },
      {
        id: PROJECT_IDS.colunaMeses,
        organizationId: IDS.orgs.c,
        submitterId: IDS.users.submissor,
        tipo: "anual" as const,
        title: "Projeto com Meses na Coluna",
        stage: "concluido" as const,
        evaluationYear: 2025,
        budgetTotal: "16000.00",
        parcelas: 4,
        meses: 4,
        mesesPagamento: [2, 5, 8, 11],
        createdAt: new Date("2025-03-01T00:00:00Z"),
      },
    ])
    .onConflictDoNothing();

  // Snapshot da versão 1 do candidato "newer" — campos sem coluna própria
  // (metodologia, contexto ministerial, tempo de ministério, beneficiários,
  // cofinanciamento, meses de pagamento) só existem aqui.
  await db
    .insert(projectVersions)
    .values({
      projectId: PROJECT_IDS.newer,
      versionNumber: 1,
      stage: "rascunho",
      data: {
        _source: "test:createAnnualDraft",
        metodologia: "Metodologia do candidato",
        contextoMinisterial: "Contexto do candidato",
        tempoMinisterioAnos: 8,
        beneficiariosQuantidade: 300,
        beneficiariosDescricao: "Famílias ribeirinhas",
        cofinancimento: "Parceria local",
        mesesPagamento: [2, 4, 6, 8, 10, 12],
      },
      createdBy: IDS.users.submissor,
    })
    .onConflictDoNothing();

  // Snapshot do candidato da Org C com meses DELIBERADAMENTE diferentes da
  // coluna ([1,2,3,4] vs. [2,5,8,11]): se o pré-preenchimento voltar a ler do
  // snapshot, o teste abaixo acusa. Criado pelo submissor original — a RLS de
  // project_versions só libera para ele, então para o colega esta linha é
  // invisível e só a coluna resta.
  await db
    .insert(projectVersions)
    .values({
      projectId: PROJECT_IDS.colunaMeses,
      versionNumber: 1,
      stage: "rascunho",
      data: {
        _source: "test:createAnnualDraft",
        metodologia: "Metodologia da Org C",
        mesesPagamento: [1, 2, 3, 4],
      },
      createdBy: IDS.users.submissor,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(projectVersions)
    .where(
      inArray(projectVersions.projectId, [
        PROJECT_IDS.newer,
        PROJECT_IDS.colunaMeses,
      ]),
    );
  await db
    .delete(projects)
    .where(inArray(projects.id, Object.values(PROJECT_IDS)));
  await db
    .delete(organizationMembers)
    .where(
      inArray(organizationMembers.organizationId, Object.values(IDS.orgs)),
    );
  await db
    .delete(organizations)
    .where(inArray(organizations.id, Object.values(IDS.orgs)));
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, Object.values(IDS.users)));
  await db.delete(users).where(inArray(users.id, Object.values(IDS.users)));
});

describe("findRenewalCandidate — P-2.13", () => {
  it("retorna o projeto anual mais recente em estágio final da organização", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.submissor,
      roles: ["submissor"],
    });

    const { findRenewalCandidate } = await import("../actions/projects");
    const result = await findRenewalCandidate({ organizationId: IDS.orgs.a });

    expect(result?.serverError).toBeUndefined();
    const candidate = result?.data?.candidate;
    expect(candidate?.id).toBe(PROJECT_IDS.newer);
    expect(candidate?.titulo).toBe("Missão Recente 2025");
    expect(candidate?.ano).toBe(2025);
  });

  it("pré-preenchimento combina colunas do projeto com o snapshot da versão 1", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.submissor,
      roles: ["submissor"],
    });

    const { findRenewalCandidate } = await import("../actions/projects");
    const result = await findRenewalCandidate({ organizationId: IDS.orgs.a });
    const prefill = result?.data?.candidate?.prefill;

    expect(prefill?.objetivos).toBe("Objetivos recentes");
    expect(prefill?.valorTotal).toBe("24000.00");
    expect(prefill?.numeroParcelas).toBe("6");
    expect(prefill?.metodologia).toBe("Metodologia do candidato");
    expect(prefill?.beneficiariosQuantidade).toBe("300");
    // Candidato anterior à migration 0091: `meses_pagamento` é null e os meses
    // vêm do snapshot (fallback documentado em P-2.6c).
    expect(prefill?.mesesSelecionados).toEqual([2, 4, 6, 8, 10, 12]);
  });

  // ── P-2.6c — meses de pagamento vêm da coluna, não do snapshot ─────────────

  it("meses de pagamento vêm da coluna quando ela existe, não do snapshot", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.submissor,
      roles: ["submissor"],
    });

    const { findRenewalCandidate } = await import("../actions/projects");
    const result = await findRenewalCandidate({ organizationId: IDS.orgs.c });
    const prefill = result?.data?.candidate?.prefill;

    // Coluna [2,5,8,11] vs. snapshot [1,2,3,4] — a coluna vence
    expect(prefill?.mesesSelecionados).toEqual([2, 5, 8, 11]);
  });

  it("outro membro da organização renova e ainda recebe os meses, apesar da RLS de project_versions", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.colega,
      roles: ["submissor"],
    });

    const { findRenewalCandidate } = await import("../actions/projects");
    const result = await findRenewalCandidate({ organizationId: IDS.orgs.c });
    const candidate = result?.data?.candidate;

    expect(candidate?.id).toBe(PROJECT_IDS.colunaMeses);
    // "project_versions_select" só libera o próprio submissor: para o colega o
    // snapshot volta vazio — era exatamente por isso que ler os meses de lá era
    // frágil. A coluna vem de `projects` ("projects_select_own_or_org") e chega.
    expect(candidate?.prefill.metodologia).toBe("");
    expect(candidate?.prefill.mesesSelecionados).toEqual([2, 5, 8, 11]);
  });

  it("projeto de outra organização nunca aparece (RLS + filtro por organizationId)", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.submissor,
      roles: ["submissor"],
    });

    const { findRenewalCandidate } = await import("../actions/projects");
    const result = await findRenewalCandidate({ organizationId: IDS.orgs.b });

    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.candidate).toBeNull();
  });

  it("organização sem projetos anteriores em estágio final → sem candidato", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.submissor,
      roles: ["submissor"],
    });

    const { findRenewalCandidate } = await import("../actions/projects");
    const result = await findRenewalCandidate({
      organizationId: IDS.orgs.empty,
    });

    expect(result?.data?.candidate).toBeNull();
  });

  it("projeto pontual nunca é oferecido como renovação, mesmo mais recente e em estágio final", async () => {
    resolveSessionMock.mockResolvedValueOnce({
      actorId: IDS.users.submissor,
      roles: ["submissor"],
    });

    const { findRenewalCandidate } = await import("../actions/projects");
    const result = await findRenewalCandidate({ organizationId: IDS.orgs.a });

    // "newer" (anual) é escolhido mesmo com "pontual" tendo createdAt maior.
    expect(result?.data?.candidate?.id).toBe(PROJECT_IDS.newer);
  });
});
