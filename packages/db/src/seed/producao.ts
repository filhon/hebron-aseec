import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { and, eq, isNull } from "drizzle-orm";

// dotenv precisa terminar antes de qualquer módulo que leia DATABASE_URL no
// escopo do módulo (../client) — mesmo racional documentado em
// ../seed.ts::ensureEnvLoaded.
async function ensureEnvLoaded(): Promise<void> {
  if (process.env.DATABASE_URL) return;
  const { config } = await import("dotenv");
  config({ path: "../../.env" });
  config({ path: "../../.env.local", override: true });
}

// ---------------------------------------------------------------------------
// seedChartOfAccounts — PACOTE 5 (AUDIT/04-BACKLOG-CORRECAO.md, P-9.5).
//
// "Doações" precisa existir como categoria de receita porque é KPI da
// Intranet (decisão F1-Q10) — o resto do plano de contas é um ponto de
// partida institucional razoável, não uma exigência fechada do BRAIN;
// super_admin pode criar/editar categorias depois pela tela existente
// (financeiro.categories não tem coluna própria marcando "seed inicial" além
// de is_system, que fica false aqui de propósito — para não travar edição).
// Idempotente por `code` (fin_categories_code_uniq).
// ---------------------------------------------------------------------------

interface ChartOfAccountsEntry {
  code: string;
  name: string;
  type: "receita" | "despesa";
}

const DEFAULT_CHART_OF_ACCOUNTS: ChartOfAccountsEntry[] = [
  { code: "REC-DOACOES", name: "Doações", type: "receita" },
  { code: "REC-OUTRAS", name: "Outras Receitas", type: "receita" },
  { code: "DESP-FOLHA", name: "Folha de Pagamento", type: "despesa" },
  {
    code: "DESP-ALUGUEL",
    name: "Aluguel e Condomínio",
    type: "despesa",
  },
  {
    code: "DESP-UTILIDADES",
    name: "Utilidades (água, luz, internet)",
    type: "despesa",
  },
  { code: "DESP-MANUTENCAO", name: "Manutenção", type: "despesa" },
  {
    code: "DESP-MATERIAIS",
    name: "Materiais e Suprimentos",
    type: "despesa",
  },
  {
    code: "DESP-SERVICOS-TERCEIROS",
    name: "Serviços de Terceiros",
    type: "despesa",
  },
  { code: "DESP-PROJETOS", name: "Projetos Aprovados", type: "despesa" },
  {
    code: "DESP-ADMINISTRATIVAS",
    name: "Despesas Administrativas",
    type: "despesa",
  },
];

export interface SeedChartOfAccountsResult {
  inserted: number;
}

export async function seedChartOfAccounts(): Promise<SeedChartOfAccountsResult> {
  await ensureEnvLoaded();
  const [{ db }, { financialCategories }] = await Promise.all([
    import("../client"),
    import("../schema/financeiro"),
  ]);

  const insertedRows = await db
    .insert(financialCategories)
    .values(DEFAULT_CHART_OF_ACCOUNTS)
    .onConflictDoNothing()
    .returning({ id: financialCategories.id });

  return { inserted: insertedRows.length };
}

// ---------------------------------------------------------------------------
// seedSuperAdmins — PACOTE 5 / AUDIT/patches/P-9.5.md ("2 super_admins").
//
// Identidades reais nunca são hardcoded em código-fonte (BRAIN: "sem
// suposições" — quem são os dois super_admins é uma decisão de Filipe, não
// deste seed). Lidas via env var, seguindo o mesmo padrão de
// SUPABASE_URL/SERVICE_ROLE_KEY: ausentes → skip com log, nunca cria dado
// inventado. Mesmo mecanismo de criação de ../system-actor.ts::getSystemActorId
// (Admin API, não INSERT direto em auth.users).
// ---------------------------------------------------------------------------

interface SuperAdminSpec {
  email: string;
  fullName: string;
}

function readSuperAdminSpecs(): SuperAdminSpec[] {
  const specs: SuperAdminSpec[] = [];
  for (const n of [1, 2]) {
    const email = process.env[`SEED_SUPER_ADMIN_${n}_EMAIL`];
    const fullName = process.env[`SEED_SUPER_ADMIN_${n}_NAME`];
    if (email && fullName) {
      specs.push({ email, fullName });
    }
  }
  return specs;
}

export interface SeedSuperAdminsResult {
  processed: Array<{ email: string; created: boolean; roleGranted: boolean }>;
  skippedReason?: string;
}

export async function seedSuperAdmins(): Promise<SeedSuperAdminsResult> {
  await ensureEnvLoaded();
  const specs = readSuperAdminSpecs();
  if (specs.length === 0) {
    return {
      processed: [],
      skippedReason:
        "SEED_SUPER_ADMIN_1_EMAIL/NAME e SEED_SUPER_ADMIN_2_EMAIL/NAME não configurados — nenhum super_admin foi criado. Preencha essas variáveis (ver .env.example) e rode o seed de novo.",
    };
  }

  const [{ db }, { users, roleAssignments }] = await Promise.all([
    import("../client"),
    import("../schema/public"),
  ]);

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY são necessários para provisionar super_admins via Admin API.",
    );
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const processed: SeedSuperAdminsResult["processed"] = [];

  for (const spec of specs) {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, spec.email))
      .limit(1);

    let userId: string;
    let created: boolean;

    if (existingUser) {
      userId = existingUser.id;
      created = false;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: spec.email,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: { full_name: spec.fullName },
      });
      if (error || !data.user) {
        throw new Error(
          `Falha ao criar super_admin ${spec.email}: ${error?.message ?? "sem usuário retornado"}`,
        );
      }
      userId = data.user.id;
      created = true;
    }

    const [existingRole] = await db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.role, "super_admin"),
          isNull(roleAssignments.revokedAt),
        ),
      )
      .limit(1);

    let roleGranted = false;
    if (!existingRole) {
      await db
        .insert(roleAssignments)
        .values({ userId, role: "super_admin", scope: "global" });
      roleGranted = true;
    }

    processed.push({ email: spec.email, created, roleGranted });
  }

  return { processed };
}

// ---------------------------------------------------------------------------
// seedDesignations — PACOTE 5 ("designations gestor/autorizador do
// financeiro; gestor de flats").
//
// public.designations não tem coluna de módulo — "gestor"/"autorizador" são
// flags globais do usuário (apps/financeiro/src/lib/safe-action.ts e
// apps/flats/src/lib/safe-action.ts leem o mesmo ctx.designations). Quem
// recebe cada designação é decisão de Filipe: lida via env var, por e-mail
// de um usuário que já precisa existir (não cria conta aqui — designação
// pressupõe alguém já convidado/com papel). Ausente ou usuário não
// encontrado → skip com log, nunca inventa.
// ---------------------------------------------------------------------------

interface DesignationSpec {
  envVar: string;
  type: "gestor" | "autorizador";
  label: string;
}

const DESIGNATION_SPECS: DesignationSpec[] = [
  {
    envVar: "SEED_FINANCEIRO_GESTOR_EMAIL",
    type: "gestor",
    label: "gestor do financeiro",
  },
  {
    envVar: "SEED_FINANCEIRO_AUTORIZADOR_EMAIL",
    type: "autorizador",
    label: "autorizador do financeiro",
  },
  {
    envVar: "SEED_FLATS_GESTOR_EMAIL",
    type: "gestor",
    label: "gestor de flats",
  },
];

export interface SeedDesignationsResult {
  processed: Array<{ label: string; email: string; granted: boolean }>;
  skipped: Array<{ label: string; reason: string }>;
}

export async function seedDesignations(): Promise<SeedDesignationsResult> {
  await ensureEnvLoaded();
  const [{ db }, { users, designations }] = await Promise.all([
    import("../client"),
    import("../schema/public"),
  ]);

  const processed: SeedDesignationsResult["processed"] = [];
  const skipped: SeedDesignationsResult["skipped"] = [];

  const gestorFinanceiroEmail = process.env.SEED_FINANCEIRO_GESTOR_EMAIL;
  const autorizadorFinanceiroEmail =
    process.env.SEED_FINANCEIRO_AUTORIZADOR_EMAIL;
  if (
    gestorFinanceiroEmail &&
    autorizadorFinanceiroEmail &&
    gestorFinanceiroEmail === autorizadorFinanceiroEmail
  ) {
    console.warn(
      JSON.stringify({
        event: "seed_designations_same_person_warning",
        message:
          "SEED_FINANCEIRO_GESTOR_EMAIL e SEED_FINANCEIRO_AUTORIZADOR_EMAIL são o mesmo e-mail — governança dual (BRAIN) exige pessoas diferentes para aprovar e autorizar.",
      }),
    );
  }

  for (const spec of DESIGNATION_SPECS) {
    const email = process.env[spec.envVar];
    if (!email) {
      skipped.push({
        label: spec.label,
        reason: `${spec.envVar} não configurado`,
      });
      continue;
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      skipped.push({
        label: spec.label,
        reason: `usuário ${email} não encontrado em public.users — crie a conta (convite) antes de designar`,
      });
      continue;
    }

    const [existing] = await db
      .select({ id: designations.id })
      .from(designations)
      .where(
        and(
          eq(designations.userId, user.id),
          eq(designations.type, spec.type),
          isNull(designations.revokedAt),
        ),
      )
      .limit(1);

    if (existing) {
      processed.push({ label: spec.label, email, granted: false });
      continue;
    }

    await db.insert(designations).values({ type: spec.type, userId: user.id });
    processed.push({ label: spec.label, email, granted: true });
  }

  return { processed, skipped };
}

async function main() {
  const chart = await seedChartOfAccounts();
  console.log(
    chart.inserted > 0
      ? `Plano de contas: ${chart.inserted} categoria(s) criada(s) (inclui "Doações").`
      : 'Plano de contas já semeado — nada a fazer (categoria "Doações" já existe).',
  );

  const admins = await seedSuperAdmins();
  if (admins.skippedReason) {
    console.warn(admins.skippedReason);
  } else {
    for (const p of admins.processed) {
      console.log(
        `super_admin ${p.email}: ${p.created ? "conta criada" : "conta já existia"}, papel ${p.roleGranted ? "concedido agora" : "já concedido"}.`,
      );
    }
  }

  const designationsResult = await seedDesignations();
  for (const p of designationsResult.processed) {
    console.log(
      `Designação ${p.label} → ${p.email}: ${p.granted ? "concedida agora" : "já concedida"}.`,
    );
  }
  for (const s of designationsResult.skipped) {
    console.warn(`Designação ${s.label} não processada: ${s.reason}`);
  }

  process.exit(0);
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main().catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
