/**
 * setup-env.ts — carrega `.env.local` antes da suíte deste app.
 *
 * Fronteira de ambiente (P-1.24b): toda a suíte de `apps/documentos`
 * (actions.test.ts, rls.test.ts, search.test.ts, session-*.test.ts) precisa
 * de `DATABASE_URL` alcançável — os testes conectam no Postgres/Supabase de
 * dev de verdade, não há mock de banco. Em sandboxes sem saída de rede para
 * o Supabase, a suíte falha com `ENOTFOUND`/timeout de conexão; isso é uma
 * limitação do ambiente, não uma regressão do código. Rodar localmente ou em
 * CI com rede liberada para o host de `DATABASE_URL` antes de interpretar
 * falha aqui como bug.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env.local"), override: false });
