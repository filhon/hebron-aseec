/**
 * seed-producao.test.ts — PACOTE 5 (AUDIT/04-BACKLOG-CORRECAO.md, P-9.5).
 *
 * seedSuperAdmins/seedDesignations nunca inventam identidade: sem as env
 * vars (SEED_SUPER_ADMIN_*, SEED_*_EMAIL), o comportamento correto é "pular
 * com aviso", nunca tocar o banco. Só este caminho é testado aqui sem rede
 * real — o caminho "cria de verdade" chama a Supabase Admin API e exige
 * credenciais reais, verificado manualmente (ver runbook do PACOTE 5), não
 * em CI.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { seedSuperAdmins, seedDesignations } from "../seed/producao";

const SUPER_ADMIN_VARS = [
  "SEED_SUPER_ADMIN_1_EMAIL",
  "SEED_SUPER_ADMIN_1_NAME",
  "SEED_SUPER_ADMIN_2_EMAIL",
  "SEED_SUPER_ADMIN_2_NAME",
];

const DESIGNATION_VARS = [
  "SEED_FINANCEIRO_GESTOR_EMAIL",
  "SEED_FINANCEIRO_AUTORIZADOR_EMAIL",
  "SEED_FLATS_GESTOR_EMAIL",
];

function clearVars(vars: string[]): void {
  for (const v of vars) Reflect.deleteProperty(process.env, v);
}

describe("seedSuperAdmins — sem env vars configuradas", () => {
  beforeEach(() => clearVars(SUPER_ADMIN_VARS));
  afterEach(() => clearVars(SUPER_ADMIN_VARS));

  it("não cria ninguém e devolve o motivo do skip", async () => {
    const result = await seedSuperAdmins();
    expect(result.processed).toEqual([]);
    expect(result.skippedReason).toContain("SEED_SUPER_ADMIN_1_EMAIL");
  });

  it("também pula quando só o e-mail está setado, sem o nome", async () => {
    process.env.SEED_SUPER_ADMIN_1_EMAIL = "someone@example.org";
    const result = await seedSuperAdmins();
    expect(result.processed).toEqual([]);
    expect(result.skippedReason).toBeDefined();
  });
});

describe("seedDesignations — sem env vars configuradas", () => {
  beforeEach(() => clearVars(DESIGNATION_VARS));
  afterEach(() => clearVars(DESIGNATION_VARS));

  it("pula as 3 designações com motivo específico por variável ausente", async () => {
    const result = await seedDesignations();
    expect(result.processed).toEqual([]);
    expect(result.skipped).toHaveLength(3);
    expect(result.skipped.map((s) => s.reason).join(" ")).toContain(
      "SEED_FINANCEIRO_GESTOR_EMAIL não configurado",
    );
  });
});
