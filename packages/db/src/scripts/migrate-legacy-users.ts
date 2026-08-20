import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// migrate-legacy-users — P-9.0 (AUDIT/04-BACKLOG-CORRECAO.md, PACOTE 7).
//
// Extrai as contas do projeto Supabase legado (construído por terceirizada,
// só Auth — nenhum dado de papel/perfil confirmado) via Admin API e cria a
// conta equivalente neste projeto. Não há senha: cada usuário recebe um
// magic link (Supabase `generateLink({ type: "magiclink" })`) que os leva
// direto a `/post-login` (fluxo já existente, nenhuma tela nova).
//
// Deliberadamente NÃO atribui papéis (`role_assignments`) — o legado é só
// identidade (e-mail/nome), não há garantia de que os papéis de lá batam
// com o RBAC daqui (8 papéis, múltiplos por usuário). Atribuir papel é
// passo manual pós-migração, via Admin > Usuários (tela já existente) — ver
// AUDIT/PACOTE-7-P9.0-RUNBOOK.md.
//
// Dry-run por padrão. Só grava com --execute. Idempotente por e-mail
// (pula quem já existe em public.users, comparação case-insensitive).
// ---------------------------------------------------------------------------

async function ensureEnvLoaded(): Promise<void> {
  if (process.env.DATABASE_URL) return;
  const { config } = await import("dotenv");
  config({ path: "../../.env" });
  config({ path: "../../.env.local", override: true });
}

interface LegacyUser {
  id: string;
  email: string;
  fullName: string | null;
}

interface MigrationRow {
  legacyId: string;
  email: string;
  fullName: string;
  status: "migrado" | "simulado" | "pulado" | "falhou";
  newUserId: string;
  detail: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

async function listAllLegacyUsers(
  legacyAdmin: SupabaseClient,
): Promise<LegacyUser[]> {
  const result: LegacyUser[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await legacyAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw new Error(
        `Falha ao listar usuários do legado (página ${page}): ${error.message}`,
      );
    }
    for (const u of data.users) {
      if (!u.email) continue;
      const fullName =
        (u.user_metadata?.["full_name"] as string | undefined) ??
        (u.user_metadata?.["name"] as string | undefined) ??
        null;
      result.push({ id: u.id, email: u.email, fullName });
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function writeReport(rows: MigrationRow[], path: string): void {
  const header = [
    "legacy_id",
    "email",
    "full_name",
    "status",
    "new_user_id",
    "detail",
  ];
  const body = rows.map((r) => [
    r.legacyId,
    r.email,
    r.fullName,
    r.status,
    r.newUserId,
    r.detail,
  ]);
  const csv = [header, ...body]
    .map((cols) =>
      cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, csv, "utf-8");
}

export interface MigrateLegacyUsersOptions {
  execute: boolean;
  reportPath: string;
}

export interface MigrateLegacyUsersResult {
  found: number;
  migrated: number;
  skipped: number;
  failed: number;
  reportPath: string;
}

export async function migrateLegacyUsers(
  options: MigrateLegacyUsersOptions,
): Promise<MigrateLegacyUsersResult> {
  const { execute, reportPath } = options;

  const legacyAdmin = createClient(
    requireEnv("LEGACY_SUPABASE_URL"),
    requireEnv("LEGACY_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const destAdmin = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [{ db }, { users }, { notifications }] = await Promise.all([
    import("../client"),
    import("../schema/public"),
    import("../schema"),
  ]);
  const { createNotification } = await import("@hebron/email");
  const { LegacyAccessEmail } =
    await import("@hebron/email/templates/legacy-access");
  const React = await import("react");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hebronaseec.com.br";
  const resendApiKey = process.env.RESEND_API_KEY;
  if (execute && !resendApiKey) {
    throw new Error(
      "RESEND_API_KEY ausente — obrigatório em --execute (o e-mail de acesso não sai sem ele).",
    );
  }

  const legacyUsers = await listAllLegacyUsers(legacyAdmin);
  const rows: MigrationRow[] = [];
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const legacyUser of legacyUsers) {
    const fullName = legacyUser.fullName ?? "";

    try {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, legacyUser.email.toLowerCase()))
        .limit(1);

      if (existing) {
        rows.push({
          legacyId: legacyUser.id,
          email: legacyUser.email,
          fullName,
          status: "pulado",
          newUserId: existing.id,
          detail: "e-mail já existe neste projeto",
        });
        skipped += 1;
        continue;
      }

      if (!execute) {
        rows.push({
          legacyId: legacyUser.id,
          email: legacyUser.email,
          fullName,
          status: "simulado",
          newUserId: "",
          detail: "seria criado + magic link enviado (dry-run)",
        });
        migrated += 1;
        continue;
      }

      const { data: created, error: createError } =
        await destAdmin.auth.admin.createUser({
          email: legacyUser.email,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || undefined,
            migrated_from_legacy: true,
            legacy_user_id: legacyUser.id,
          },
        });
      if (createError || !created.user) {
        throw new Error(
          createError?.message ?? "createUser não retornou usuário",
        );
      }

      const { data: linkData, error: linkError } =
        await destAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: legacyUser.email,
          options: { redirectTo: `${appUrl}/post-login` },
        });
      if (linkError || !linkData) {
        throw new Error(
          `Conta criada, mas falhou o link de acesso: ${linkError?.message ?? "sem link"}`,
        );
      }

      await createNotification({
        insert: async (data) => {
          const inserted = await db
            .insert(notifications)
            .values({
              userId: data.userId,
              channel: data.channel,
              type: data.type,
              title: data.title,
              body: data.body,
              sentAt: data.sentAt ? new Date(data.sentAt) : undefined,
            })
            .returning();
          const row = inserted[0];
          if (!row)
            throw new Error("Falha ao inserir notificação de boas-vindas");
          return { id: row.id };
        },
        data: {
          userId: created.user.id,
          channel: "email",
          type: "legacy_migration.access_granted",
          title: "Sua conta foi migrada para o novo sistema",
          body: "Clique no link enviado por e-mail para acessar.",
        },
        email: {
          to: legacyUser.email,
          subject: "Sua conta foi migrada — Hebron Aseec",
          template: React.createElement(LegacyAccessEmail, {
            accessUrl: linkData.properties.action_link,
            name: fullName || undefined,
          }),
        },
        resendApiKey,
      });

      rows.push({
        legacyId: legacyUser.id,
        email: legacyUser.email,
        fullName,
        status: "migrado",
        newUserId: created.user.id,
        detail: "conta criada, magic link enviado",
      });
      migrated += 1;

      // Não martelar a Admin API do Supabase (createUser + generateLink +
      // Resend em sequência, ~150 usuários — folga deliberada).
      await sleep(300);
    } catch (err) {
      rows.push({
        legacyId: legacyUser.id,
        email: legacyUser.email,
        fullName,
        status: "falhou",
        newUserId: "",
        detail: err instanceof Error ? err.message : String(err),
      });
      failed += 1;
    }
  }

  writeReport(rows, reportPath);

  return { found: legacyUsers.length, migrated, skipped, failed, reportPath };
}

function parseArgs(argv: string[]): MigrateLegacyUsersOptions {
  const execute = argv.includes("--execute");
  const reportFlagIndex = argv.indexOf("--report");
  const reportPath =
    reportFlagIndex !== -1 && argv[reportFlagIndex + 1]
      ? resolve(argv[reportFlagIndex + 1] as string)
      : resolve(
          `../../migration-reports/legacy-users-${new Date().toISOString().slice(0, 10)}.csv`,
        );
  return { execute, reportPath };
}

async function main() {
  await ensureEnvLoaded();
  const options = parseArgs(process.argv.slice(2));

  console.log(
    options.execute
      ? "MODO EXECUÇÃO — contas reais serão criadas e e-mails serão enviados."
      : "MODO DRY-RUN (padrão) — nada será criado. Rode de novo com --execute para gravar.",
  );

  const result = await migrateLegacyUsers(options);

  console.log(`\n${result.found} usuário(s) encontrado(s) no projeto legado.`);
  console.log(
    `Migrados: ${result.migrated} · Pulados (já existiam): ${result.skipped} · Falhas: ${result.failed}`,
  );
  console.log(`Relatório: ${result.reportPath}`);
  if (result.failed > 0) {
    console.warn(
      "\nHá falhas — revise o relatório antes de considerar a migração concluída.",
    );
  }
  if (!options.execute) {
    console.log(
      "\nNada foi gravado (dry-run). Revise o relatório e rode de novo com --execute.",
    );
  }

  process.exit(result.failed > 0 ? 1 : 0);
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main().catch((err: unknown) => {
    console.error("Migração falhou:", err);
    process.exit(1);
  });
}
