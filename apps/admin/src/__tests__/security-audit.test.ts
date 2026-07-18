/**
 * security-audit.test.ts — P-9.1 (Revisão de Segurança / RLS Audit)
 *
 * Verificação automatizada, por introspecção do catálogo + testes por papel, dos
 * invariantes de segurança do estado final do ecossistema. Este arquivo é a
 * codificação executável da auditoria: cada `it` corresponde a um critério de
 * aceite de P-9.1. S-02 foi fechado em várias partes (P-9.1b-1: public.users/
 * role_assignments em admin; P-9.1b-2: leitura do schema financeiro; P-9.1b-7:
 * residual de flats/plataforma/radio) e S-05 (TTL de signed URL em plataforma,
 * também P-9.1b-7) — ambos assertados abaixo.
 *
 * Requer: DATABASE_URL (superuser, para introspecção/seed) e esquema migrado com
 * a migration 0055_p91_security_grants_lockdown.sql aplicada.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { and, eq, sql as drizzleSql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  bankAccounts,
  payables,
  receivables,
  organizations,
  organizationMembers,
  projects,
  documents,
  announcements,
  meetingSessions,
  meetingDecisions,
  tasks,
} from "@hebron/db/schema";
import {
  serializeImpersonationState,
  parseImpersonationState,
  type ImpersonationState,
} from "@hebron/auth/impersonation";

// ── Conexão direta para introspecção / queries por papel ───────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL)
  throw new Error("DATABASE_URL is required for security audit");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

/** Schemas de aplicação sob nosso controle (exclui schemas do Supabase:
 * storage/auth/realtime/vault etc., que mantêm defaults da plataforma). */
const APP_SCHEMAS = [
  "public",
  "admin",
  "documentos",
  "projetos",
  "financeiro",
  "plataforma",
  "flats",
  "tarefas",
  "intranet",
  "radio",
] as const;

/** Tabela de bookkeeping do runner de migrations: sem RLS por design; travada no
 * nível de GRANT (nenhum privilégio para anon/authenticated). */
const MIGRATIONS_TABLE = { schema: "public", name: "_migrations" };

// ── Fixture: um "ouvinte" puro para provar isolamento cross-schema ─────────────
const OUVINTE_ID = "a9000000-0000-0000-0000-000000000091";

// ── Fixture: usuário-alvo com dados reais, para provar isolamento horizontal
// em public.users/public.role_assignments (P-9.1b-1) — não basta "0 linhas"
// numa tabela vazia, precisa haver uma linha de terceiro que o ouvinte tente
// ler/editar e falhe.
const TARGET_ID = "a9000000-0000-0000-0000-000000000092";
const TARGET_FULL_NAME = "Sec Audit Alvo";

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: OUVINTE_ID,
      email: "sec-audit-ouvinte@test.hebron",
      fullName: "Sec Audit Ouvinte",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: OUVINTE_ID, role: "ouvinte", grantedBy: OUVINTE_ID })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      id: TARGET_ID,
      email: "sec-audit-alvo@test.hebron",
      fullName: TARGET_FULL_NAME,
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: TARGET_ID, role: "colaborador", grantedBy: TARGET_ID })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, OUVINTE_ID));
  await db.delete(users).where(eq(users.id, OUVINTE_ID));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, TARGET_ID));
  await db.delete(users).where(eq(users.id, TARGET_ID));
  await sql.end();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. RLS DENY-by-default em toda tabela (introspecção)
// ═══════════════════════════════════════════════════════════════════════════════

describe("RLS habilitado em toda tabela dos schemas de app (DENY-by-default)", () => {
  it("nenhuma base table (exceto public._migrations) roda sem RLS", async () => {
    const rows = await sql<{ schema: string; tbl: string; rls: boolean }[]>`
      SELECT n.nspname AS schema, c.relname AS tbl, c.relrowsecurity AS rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p')
        AND n.nspname = ANY(${APP_SCHEMAS as unknown as string[]})
      ORDER BY 1, 2`;

    const withoutRls = rows
      .filter((r) => !r.rls)
      .filter(
        (r) =>
          !(
            r.schema === MIGRATIONS_TABLE.schema &&
            r.tbl === MIGRATIONS_TABLE.name
          ),
      )
      .map((r) => `${r.schema}.${r.tbl}`);

    expect(withoutRls).toEqual([]);
  });

  it("as partições de adm.audit_log também têm RLS habilitado (S-03)", async () => {
    const parts = await sql<{ tbl: string; rls: boolean }[]>`
      SELECT c.relname AS tbl, c.relrowsecurity AS rls
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      WHERE i.inhparent = 'admin.audit_log'::regclass`;
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.filter((p) => !p.rls)).toEqual([]);
  });

  it("nenhuma tabela com RLS habilitado fica sem policy (deny-all silencioso)", async () => {
    const rows = await sql<{ schema: string; tbl: string }[]>`
      SELECT n.nspname AS schema, c.relname AS tbl
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND c.relrowsecurity = true
        AND n.nspname = ANY(${APP_SCHEMAS as unknown as string[]})
        AND NOT EXISTS (
          SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
        )
        -- partições herdam a policy da tabela-pai; não precisam de policy própria
        AND NOT EXISTS (
          SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid
        )`;
    expect(rows.map((r) => `${r.schema}.${r.tbl}`)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GRANTs ↔ policies: nenhum GRANT mais largo que a policy correspondente
// ═══════════════════════════════════════════════════════════════════════════════

describe("Reconciliação GRANTs ↔ policies", () => {
  it("anon/authenticated NÃO têm TRUNCATE/TRIGGER/REFERENCES em nenhum schema de app (S-01)", async () => {
    const rows = await sql<
      { schema: string; tbl: string; grantee: string; priv: string }[]
    >`
      SELECT table_schema AS schema, table_name AS tbl, grantee, privilege_type AS priv
      FROM information_schema.role_table_grants
      WHERE grantee = ANY(ARRAY['anon','authenticated'])
        AND table_schema = ANY(${APP_SCHEMAS as unknown as string[]})
        AND privilege_type = ANY(ARRAY['TRUNCATE','TRIGGER','REFERENCES'])`;
    expect(
      rows.map((r) => `${r.schema}.${r.tbl} ${r.grantee} ${r.priv}`),
    ).toEqual([]);
  });

  it("anon NÃO tem INSERT/UPDATE/DELETE em tabelas sensíveis de public (S-01)", async () => {
    const sensitive = [
      "users",
      "role_assignments",
      "designations",
      "consents",
      "notifications",
    ];
    const rows = await sql<{ tbl: string; priv: string }[]>`
      SELECT table_name AS tbl, privilege_type AS priv
      FROM information_schema.role_table_grants
      WHERE grantee = 'anon'
        AND table_schema = 'public'
        AND table_name = ANY(${sensitive})
        AND privilege_type = ANY(ARRAY['INSERT','UPDATE','DELETE'])`;
    expect(rows.map((r) => `${r.tbl} ${r.priv}`)).toEqual([]);
  });

  it("public._migrations não tem privilégio algum para anon/authenticated (S-01)", async () => {
    const rows = await sql<{ grantee: string; priv: string }[]>`
      SELECT grantee, privilege_type AS priv
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = '_migrations'
        AND grantee = ANY(ARRAY['anon','authenticated'])`;
    expect(rows).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Sem cross-schema leak — um "ouvinte" não lê dados de outros schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-schema leak — ouvinte não acessa financeiro/flats/projetos/admin", () => {
  const foreignTables = [
    "financeiro.accounts",
    "financeiro.transactions",
    "flats.reservations",
    "projetos.projects",
    "admin.audit_log",
  ];

  for (const table of foreignTables) {
    it(`ouvinte lê 0 linhas de ${table} (RLS ativa via client autenticado)`, async () => {
      const rows = await withAuthenticatedContext(
        { actorId: OUVINTE_ID },
        async (tx) => {
          const r = await tx.execute(
            sqlUnsafe(`SELECT 1 FROM ${table} LIMIT 5`),
          );
          return Array.from(r);
        },
      );
      expect(rows).toHaveLength(0);
    });
  }

  it("anon (sem sessão) não enxerga schemas privados — permission denied em admin.*", async () => {
    await expect(
      withAuthenticatedContext(null, async (tx) =>
        tx.execute(sqlUnsafe("SELECT 1 FROM admin.audit_log LIMIT 1")),
      ),
    ).rejects.toThrow(/permission denied for schema admin/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3b. Isolamento horizontal em public.users/public.role_assignments (S-02,
// P-9.1b-1) — um usuário sem super_admin não lê nem edita o registro de
// TERCEIROS via o client autenticado (`withAuthenticatedContext`), agora que
// admin/src/actions/users.ts e roles.ts passaram a rodar sob esse client em
// vez do `db` singleton (superuser). Usa dados semeados (TARGET_ID com nome
// e papel reais) para provar mais do que "0 linhas numa tabela vazia".
// ═══════════════════════════════════════════════════════════════════════════════

describe("Isolamento horizontal — ouvinte não lê/edita o registro de terceiros", () => {
  it("ouvinte NÃO lê o perfil de outro usuário em public.users", async () => {
    const rows = await withAuthenticatedContext({ actorId: OUVINTE_ID }, (tx) =>
      tx
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, TARGET_ID)),
    );
    expect(rows).toHaveLength(0);
  });

  it("ouvinte NÃO lê a atribuição de papel de outro usuário em public.role_assignments", async () => {
    const rows = await withAuthenticatedContext({ actorId: OUVINTE_ID }, (tx) =>
      tx
        .select({ id: roleAssignments.id })
        .from(roleAssignments)
        .where(eq(roleAssignments.userId, TARGET_ID)),
    );
    expect(rows).toHaveLength(0);
  });

  it("ouvinte NÃO consegue alterar o nome de outro usuário (UPDATE afeta 0 linhas; dado original permanece)", async () => {
    const updatedRows = await withAuthenticatedContext(
      { actorId: OUVINTE_ID },
      (tx) =>
        tx
          .update(users)
          .set({ fullName: "Nome Forjado Pelo Ouvinte" })
          .where(eq(users.id, TARGET_ID))
          .returning({ id: users.id }),
    );
    expect(updatedRows).toHaveLength(0);

    // Confirma, via conexão superuser, que o nome do alvo não mudou —
    // não basta a policy ter filtrado a linha do retorno, o UPDATE não pode
    // ter afetado o dado real.
    const [target] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, TARGET_ID));
    expect(target?.fullName).toBe(TARGET_FULL_NAME);
  });

  it("ouvinte NÃO consegue se auto-conceder o papel super_admin (INSERT rejeitado pela policy)", async () => {
    await expect(
      withAuthenticatedContext({ actorId: OUVINTE_ID }, (tx) =>
        tx.insert(roleAssignments).values({
          userId: OUVINTE_ID,
          role: "super_admin",
          grantedBy: OUVINTE_ID,
        }),
      ),
    ).rejects.toThrow(/row-level security/i);

    const escalated = await db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, OUVINTE_ID),
          eq(roleAssignments.role, "super_admin"),
        ),
      );
    expect(escalated).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3c. RLS do schema financeiro volta a valer na leitura (S-02, P-9.1b-2) —
// apps/financeiro/src/lib/queries.ts e as actions do módulo liam com `db`
// (conexão superuser de DATABASE_URL, que ignora RLS por completo) em vez de
// withAuthenticatedContext — o gate "colaborador+" da UI nunca era de fato
// aplicado no banco. Usa dados semeados (não "0 linhas numa tabela vazia")
// para provar tanto o lado negativo (ouvinte não lê) quanto o positivo
// (colaborador lê) — a policy tem que filtrar por papel, não zerar geral.
// ═══════════════════════════════════════════════════════════════════════════════

describe("RLS financeiro na leitura — colaborador lê, ouvinte não lê (S-02)", () => {
  const FIN_ACCOUNT_ID = "a9000000-0000-0000-0000-000000000093";
  const FIN_PAYABLE_ID = "a9000000-0000-0000-0000-000000000094";
  const FIN_RECEIVABLE_ID = "a9000000-0000-0000-0000-000000000095";

  beforeAll(async () => {
    await db.insert(bankAccounts).values({
      id: FIN_ACCOUNT_ID,
      bankName: "Banco Sec Audit",
      createdBy: TARGET_ID,
    });
    await db.insert(payables).values({
      id: FIN_PAYABLE_ID,
      description: "Sec audit payable",
      amount: "10.00",
      dueDate: "2026-12-31",
      createdBy: TARGET_ID,
    });
    await db.insert(receivables).values({
      id: FIN_RECEIVABLE_ID,
      description: "Sec audit receivable",
      amount: "10.00",
      createdBy: TARGET_ID,
    });
  });

  afterAll(async () => {
    await db.delete(payables).where(eq(payables.id, FIN_PAYABLE_ID));
    await db.delete(receivables).where(eq(receivables.id, FIN_RECEIVABLE_ID));
    await db.delete(bankAccounts).where(eq(bankAccounts.id, FIN_ACCOUNT_ID));
  });

  // financeiro.transactions fica fora deste seed: é ledger imutável (trigger
  // financeiro.forbid_transaction_mutation bloqueia DELETE incondicionalmente,
  // até para a conexão superuser de `db` — não há como desfazer uma linha de
  // teste). O caso "ouvinte lê 0 linhas de financeiro.transactions" já é
  // coberto, sem seed, na seção 3 acima; getTransactions() usa o mesmo
  // withAuthenticatedContext validado pelos casos abaixo.
  const cases = [
    { label: "financeiro.accounts", table: bankAccounts, id: FIN_ACCOUNT_ID },
    { label: "financeiro.payables", table: payables, id: FIN_PAYABLE_ID },
    {
      label: "financeiro.receivables",
      table: receivables,
      id: FIN_RECEIVABLE_ID,
    },
  ] as const;

  for (const { label, table, id } of cases) {
    it(`colaborador lê a linha semeada de ${label}; ouvinte lê 0 linhas`, async () => {
      const asColaborador = await withAuthenticatedContext(
        { actorId: TARGET_ID },
        (tx) => tx.select({ id: table.id }).from(table).where(eq(table.id, id)),
      );
      expect(asColaborador).toHaveLength(1);

      const asOuvinte = await withAuthenticatedContext(
        { actorId: OUVINTE_ID },
        (tx) => tx.select({ id: table.id }).from(table).where(eq(table.id, id)),
      );
      expect(asOuvinte).toHaveLength(0);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3d. Isolamento horizontal em projetos.projects por organização (S-02,
// P-9.1b-3) — apps/projetos/src/actions/*.ts liam/escreviam com `db`
// (conexão superuser) em vez de withAuthenticatedContext; a policy
// "projects_select_own_or_org" (0007_projetos_rls.sql) nunca era de fato
// avaliada. Usa dados semeados: um projeto de uma organização real, um
// membro dela (lê) e um submissor de outra organização (não lê/edita).
// ═══════════════════════════════════════════════════════════════════════════════

describe("Isolamento horizontal — submissor não lê/edita projeto de organização à qual não pertence", () => {
  const ORG_ID = "a9000000-0000-0000-0000-000000000096";
  const PROJECT_ID = "a9000000-0000-0000-0000-000000000097";
  const INTRUSO_ID = "a9000000-0000-0000-0000-000000000098";
  const PROJECT_TITLE = "Sec Audit Projeto Org A";

  beforeAll(async () => {
    await db
      .insert(users)
      .values({
        id: INTRUSO_ID,
        email: "sec-audit-intruso@test.hebron",
        fullName: "Sec Audit Intruso",
      })
      .onConflictDoNothing();
    await db
      .insert(roleAssignments)
      .values({
        userId: INTRUSO_ID,
        role: "submissor",
        grantedBy: INTRUSO_ID,
      })
      .onConflictDoNothing();

    await db.insert(organizations).values({
      id: ORG_ID,
      nome: "Sec Audit Org A",
      createdBy: TARGET_ID,
    });
    await db.insert(organizationMembers).values({
      organizationId: ORG_ID,
      userId: TARGET_ID,
    });
    await db.insert(projects).values({
      id: PROJECT_ID,
      title: PROJECT_TITLE,
      tipo: "pontual",
      stage: "rascunho",
      organizationId: ORG_ID,
      submitterId: TARGET_ID,
      justification: "Sec audit",
      budgetTotal: "100.00",
    });
  });

  afterAll(async () => {
    await db.delete(projects).where(eq(projects.id, PROJECT_ID));
    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.organizationId, ORG_ID));
    await db.delete(organizations).where(eq(organizations.id, ORG_ID));
    await db
      .delete(roleAssignments)
      .where(eq(roleAssignments.userId, INTRUSO_ID));
    await db.delete(users).where(eq(users.id, INTRUSO_ID));
  });

  it("membro da organização lê o projeto semeado", async () => {
    const rows = await withAuthenticatedContext({ actorId: TARGET_ID }, (tx) =>
      tx
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, PROJECT_ID)),
    );
    expect(rows).toHaveLength(1);
  });

  it("submissor de outra organização NÃO lê o projeto (0 linhas)", async () => {
    const rows = await withAuthenticatedContext({ actorId: INTRUSO_ID }, (tx) =>
      tx
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, PROJECT_ID)),
    );
    expect(rows).toHaveLength(0);
  });

  it("submissor de outra organização NÃO consegue editar o projeto (UPDATE afeta 0 linhas; dado original permanece)", async () => {
    const updatedRows = await withAuthenticatedContext(
      { actorId: INTRUSO_ID },
      (tx) =>
        tx
          .update(projects)
          .set({ title: "Forjado Pelo Intruso" })
          .where(eq(projects.id, PROJECT_ID))
          .returning({ id: projects.id }),
    );
    expect(updatedRows).toHaveLength(0);

    const [row] = await db
      .select({ title: projects.title })
      .from(projects)
      .where(eq(projects.id, PROJECT_ID));
    expect(row?.title).toBe(PROJECT_TITLE);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3e. Isolamento horizontal em documentos.documents por papel/escopo (S-02,
// P-9.1b-4) — apps/documentos/src/actions/*.ts liam/escreviam com `db`
// (conexão superuser) em vez de withAuthenticatedContext; as policies
// "documents_select_restricted"/"documents_update_own"/"documents_update_admin"
// (0005_documentos_rls.sql) nunca eram de fato avaliadas nessas actions. Usa
// dado semeado: um documento `restricted` cujo escopo é super_admin/diretor/
// conselheiro — um usuário sem nenhum desses papéis (ouvinte) não lê nem
// edita; concedendo o papel conselheiro ao mesmo usuário que fez upload
// (TARGET_ID) prova que a policy filtra por papel, não zera geral.
// ═══════════════════════════════════════════════════════════════════════════════

describe("Isolamento horizontal — usuário sem papel editorial não lê/edita documento fora do seu escopo", () => {
  const DOC_ID = "a9000000-0000-0000-0000-000000000099";
  const DOC_TITLE = "Sec Audit Documento Restrito";

  beforeAll(async () => {
    await db.insert(documents).values({
      id: DOC_ID,
      title: DOC_TITLE,
      slug: "sec-audit-documento-restrito",
      visibility: "restricted",
      authorId: TARGET_ID,
      publishedAt: new Date(),
    });
  });

  afterAll(async () => {
    await db.delete(documents).where(eq(documents.id, DOC_ID));
    await db
      .delete(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, TARGET_ID),
          eq(roleAssignments.role, "conselheiro"),
        ),
      );
  });

  it("ouvinte (sem papel editorial) NÃO lê o documento restricted (0 linhas)", async () => {
    const rows = await withAuthenticatedContext({ actorId: OUVINTE_ID }, (tx) =>
      tx
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.id, DOC_ID)),
    );
    expect(rows).toHaveLength(0);
  });

  it("ouvinte NÃO consegue editar o documento (UPDATE afeta 0 linhas; título original permanece)", async () => {
    const updatedRows = await withAuthenticatedContext(
      { actorId: OUVINTE_ID },
      (tx) =>
        tx
          .update(documents)
          .set({ title: "Forjado Pelo Ouvinte" })
          .where(eq(documents.id, DOC_ID))
          .returning({ id: documents.id }),
    );
    expect(updatedRows).toHaveLength(0);

    const [row] = await db
      .select({ title: documents.title })
      .from(documents)
      .where(eq(documents.id, DOC_ID));
    expect(row?.title).toBe(DOC_TITLE);
  });

  it("usuário com papel conselheiro lê o documento restricted (a policy filtra por papel, não zera geral)", async () => {
    await db
      .insert(roleAssignments)
      .values({
        userId: TARGET_ID,
        role: "conselheiro",
        grantedBy: TARGET_ID,
      })
      .onConflictDoNothing();

    const rows = await withAuthenticatedContext({ actorId: TARGET_ID }, (tx) =>
      tx
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.id, DOC_ID)),
    );
    expect(rows).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3f. RLS do schema intranet volta a valer na leitura (S-02, P-9.1b-5) —
// apps/intranet/src/lib/queries.ts e as actions do módulo liam com `db`
// (conexão superuser) em vez de withAuthenticatedContext; as policies
// "announcements_select_staff" (todo o staff) e
// "meeting_decisions_select_board"/"meeting_sessions_select_board" (só
// diretor/conselheiro/super_admin — colaborador fica de fora de propósito)
// nunca eram de fato avaliadas. Usa dados semeados: colaborador lê o
// anúncio (positivo) mas NÃO lê a decisão de reunião fora do seu escopo
// (negativo); concedendo o papel diretor ao mesmo usuário prova que a
// policy de meeting_decisions filtra por papel, não zera geral.
// ═══════════════════════════════════════════════════════════════════════════════

describe("RLS intranet na leitura — colaborador lê anúncio, mas não lê decisão de reunião fora do seu escopo", () => {
  const ANNOUNCEMENT_ID = "a9000000-0000-0000-0000-000000000100";
  const MEETING_SESSION_ID = "a9000000-0000-0000-0000-000000000101";
  const MEETING_DECISION_ID = "a9000000-0000-0000-0000-000000000102";

  beforeAll(async () => {
    await db.insert(announcements).values({
      id: ANNOUNCEMENT_ID,
      title: "Sec audit announcement",
      body: "Corpo do anúncio de teste",
      priority: "normal",
      authorId: TARGET_ID,
      publishedAt: new Date(),
    });
    await db.insert(meetingSessions).values({
      id: MEETING_SESSION_ID,
      date: new Date(),
      type: "mensal",
      chairUserId: TARGET_ID,
    });
    await db.insert(meetingDecisions).values({
      id: MEETING_DECISION_ID,
      meetingSessionId: MEETING_SESSION_ID,
      description: "Sec audit decision",
      responsibleId: TARGET_ID,
    });
  });

  afterAll(async () => {
    await db
      .delete(meetingDecisions)
      .where(eq(meetingDecisions.id, MEETING_DECISION_ID));
    await db
      .delete(meetingSessions)
      .where(eq(meetingSessions.id, MEETING_SESSION_ID));
    await db.delete(announcements).where(eq(announcements.id, ANNOUNCEMENT_ID));
    await db
      .delete(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, TARGET_ID),
          eq(roleAssignments.role, "diretor"),
        ),
      );
  });

  it("colaborador lê o anúncio semeado; ouvinte lê 0 linhas (announcements_select_staff)", async () => {
    const asColaborador = await withAuthenticatedContext(
      { actorId: TARGET_ID },
      (tx) =>
        tx
          .select({ id: announcements.id })
          .from(announcements)
          .where(eq(announcements.id, ANNOUNCEMENT_ID)),
    );
    expect(asColaborador).toHaveLength(1);

    const asOuvinte = await withAuthenticatedContext(
      { actorId: OUVINTE_ID },
      (tx) =>
        tx
          .select({ id: announcements.id })
          .from(announcements)
          .where(eq(announcements.id, ANNOUNCEMENT_ID)),
    );
    expect(asOuvinte).toHaveLength(0);
  });

  it("colaborador NÃO lê a decisão de reunião semeada (fora do seu escopo — meeting_decisions_select_board exige diretor/conselheiro)", async () => {
    const rows = await withAuthenticatedContext({ actorId: TARGET_ID }, (tx) =>
      tx
        .select({ id: meetingDecisions.id })
        .from(meetingDecisions)
        .where(eq(meetingDecisions.id, MEETING_DECISION_ID)),
    );
    expect(rows).toHaveLength(0);
  });

  it("o mesmo usuário com papel diretor lê a decisão (a policy filtra por papel, não zera geral)", async () => {
    await db
      .insert(roleAssignments)
      .values({ userId: TARGET_ID, role: "diretor", grantedBy: TARGET_ID })
      .onConflictDoNothing();

    const rows = await withAuthenticatedContext({ actorId: TARGET_ID }, (tx) =>
      tx
        .select({ id: meetingDecisions.id })
        .from(meetingDecisions)
        .where(eq(meetingDecisions.id, MEETING_DECISION_ID)),
    );
    expect(rows).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3g. RLS do schema tarefas volta a valer na leitura (S-02, P-9.1b-6) —
// apps/tarefas/src/lib/queries.ts (21 call-sites) e as 6 actions do módulo
// liam com `db` (conexão superuser) em vez de withAuthenticatedContext;
// "tasks_select_staff" nunca era de fato avaliada. tarefas não tem
// membership por workspace (0033_tarefas_rls.sql: colaborador/diretor/
// conselheiro veem TODA tarefa dos 6 workspaces — transparência interna,
// BRAIN §6.9), então o isolamento real é por PAPEL: quem não tem papel de
// equipe (ouvinte) não lê tarefa de workspace nenhum, mesmo semeada num
// workspace ao qual "pertenceria" se tivesse o papel. Dados semeados: tarefa
// no workspace financeiro.
// ═══════════════════════════════════════════════════════════════════════════════

describe("RLS tarefas na leitura — colaborador lê tarefa de qualquer workspace, ouvinte não lê nenhuma (S-02)", () => {
  const TASK_ID = "a9000000-0000-0000-0000-000000000110";
  const FINANCEIRO_WORKSPACE_ID = "00000000-0000-0000-0007-000000000002";

  beforeAll(async () => {
    await db.insert(tasks).values({
      id: TASK_ID,
      title: "Sec audit task",
      workspaceId: FINANCEIRO_WORKSPACE_ID,
      createdBy: TARGET_ID,
    });
  });

  afterAll(async () => {
    await db.delete(tasks).where(eq(tasks.id, TASK_ID));
    await db
      .delete(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, OUVINTE_ID),
          eq(roleAssignments.role, "colaborador"),
        ),
      );
  });

  it("colaborador (TARGET_ID) lê a tarefa semeada no workspace financeiro, sem nenhuma relação de membership com o workspace (transparência interna)", async () => {
    const rows = await withAuthenticatedContext({ actorId: TARGET_ID }, (tx) =>
      tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, TASK_ID)),
    );
    expect(rows).toHaveLength(1);
  });

  it("ouvinte (sem papel de equipe) NÃO lê a tarefa — tasks_select_staff exige colaborador/diretor/conselheiro", async () => {
    const rows = await withAuthenticatedContext({ actorId: OUVINTE_ID }, (tx) =>
      tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, TASK_ID)),
    );
    expect(rows).toHaveLength(0);
  });

  it("o mesmo ouvinte, ao receber o papel colaborador, passa a ler a tarefa (a policy filtra por papel, não zera geral)", async () => {
    await db
      .insert(roleAssignments)
      .values({
        userId: OUVINTE_ID,
        role: "colaborador",
        grantedBy: OUVINTE_ID,
      })
      .onConflictDoNothing();

    const rows = await withAuthenticatedContext({ actorId: OUVINTE_ID }, (tx) =>
      tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, TASK_ID)),
    );
    expect(rows).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Conflito de interesse enforced em RLS (diretor/conselheiro não criam reserva)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Conflito de interesse — RLS bloqueia diretor/conselheiro em flats.reservations", () => {
  it("a policy de INSERT de reservas exclui diretor/conselheiro no WITH CHECK", async () => {
    const rows = await sql<{ check_expr: string | null }[]>`
      SELECT pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
      FROM pg_policy p
      WHERE p.polrelid = 'flats.reservations'::regclass
        AND p.polcmd = 'a'`; /* 'a' = INSERT */
    const checks = rows.map((r) => r.check_expr ?? "").join(" | ");
    expect(checks).toMatch(/requested_by/);
    expect(checks).toMatch(/has_role/);
    expect(checks).toMatch(/diretor/);
    expect(checks).toMatch(/conselheiro/);
    expect(checks).toMatch(/\bNOT\b/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Cookie de impersonação assinado/infalsificável (F3-13)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Impersonação — cookie HMAC-assinado (F3-13)", () => {
  const state: ImpersonationState = {
    actorId: "11111111-1111-1111-1111-111111111111",
    actorName: "Super Admin",
    impersonatedId: "22222222-2222-2222-2222-222222222222",
    impersonatedName: "Alvo",
    startedAt: new Date().toISOString(),
  };

  beforeAll(() => {
    process.env["IMPERSONATION_COOKIE_SECRET"] = "test-secret-p91-audit";
  });

  it("roundtrip válido: serialize → parse recupera o estado", () => {
    const parsed = parseImpersonationState(serializeImpersonationState(state));
    expect(parsed).toEqual(state);
  });

  it("cookie no formato legado (base64url sem assinatura) é REJEITADO", () => {
    const legacy = Buffer.from(JSON.stringify(state), "utf-8").toString(
      "base64url",
    );
    expect(parseImpersonationState(legacy)).toBeNull();
  });

  it("payload adulterado (assinatura não confere) é REJEITADO", () => {
    const cookie = serializeImpersonationState(state);
    const [, sig] = cookie.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...state, impersonatedId: "victim" }),
      "utf-8",
    ).toString("base64url");
    expect(parseImpersonationState(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it("cookie assinado com outro segredo é REJEITADO", () => {
    const cookie = serializeImpersonationState(state);
    process.env["IMPERSONATION_COOKIE_SECRET"] = "attacker-secret";
    const forged = serializeImpersonationState(state);
    process.env["IMPERSONATION_COOKIE_SECRET"] = "test-secret-p91-audit";
    // O cookie forjado (assinado com "attacker-secret") não valida sob o segredo real.
    expect(parseImpersonationState(forged)).toBeNull();
    // O cookie legítimo continua válido.
    expect(parseImpersonationState(cookie)).toEqual(state);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Signed URLs — TTL adequado (guarda de regressão sobre os TTLs corretos)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Signed URLs — expiração adequada nos módulos já corretos", () => {
  const REPO = resolve(__dirname, "../../../..");
  const oneHour = 60 * 60;

  const readNumber = (relPath: string, constName: string): number => {
    const src = readFileSync(resolve(REPO, relPath), "utf-8");
    const m = src.match(new RegExp(`${constName}\\s*=\\s*([0-9*\\s]+?)\\s*;`));
    const expr = m?.[1];
    if (!expr) throw new Error(`${constName} não encontrado em ${relPath}`);
    // Avalia a expressão aritmética simples (ex.: "60 * 60").
    return expr
      .split("*")
      .map((n) => Number(n.trim()))
      .reduce((a, b) => a * b, 1);
  };

  it("flats: URL de documento expira em ≤ 1h", () => {
    const ttl = readNumber(
      "apps/flats/src/lib/queries.ts",
      "DOCUMENT_URL_EXPIRES_IN_SECONDS",
    );
    expect(ttl).toBeLessThanOrEqual(oneHour);
  });

  it("radio: URL de download expira em ≤ 1h e upload em ≤ 15min", () => {
    const download = readNumber(
      "apps/radio/src/actions/materials.ts",
      "DOWNLOAD_URL_EXPIRES_IN_SECONDS",
    );
    const upload = readNumber(
      "apps/radio/src/lib/r2.ts",
      "UPLOAD_URL_EXPIRES_IN_SECONDS",
    );
    expect(download).toBeLessThanOrEqual(oneHour);
    expect(upload).toBeLessThanOrEqual(15 * 60);
  });

  it("plataforma: URL de leitura (capa/anexo) expira em ≤ 1h", () => {
    const ttl = readNumber(
      "apps/plataforma/src/actions/uploads.ts",
      "READ_URL_EXPIRES_IN_SECONDS",
    );
    expect(ttl).toBeLessThanOrEqual(oneHour);
  });
});

// ── helper: SQL cru para introspecção via drizzle tx.execute ───────────────────
// Só é usado com literais hardcoded neste arquivo (nunca input de usuário).
function sqlUnsafe(query: string) {
  return drizzleSql.raw(query);
}
