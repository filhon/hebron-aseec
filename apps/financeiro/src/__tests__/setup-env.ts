/**
 * setup-env.ts
 *
 * Carrega variáveis de ambiente de .env.local antes dos testes de integração.
 * Chamado via vitest.config.ts setupFiles.
 */
import { config } from "dotenv";
import { resolve } from "path";

// Carrega .env.local do diretório do app (apps/financeiro)
config({ path: resolve(__dirname, "../../.env.local"), override: false });
