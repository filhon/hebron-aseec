import { config } from "dotenv";
import { resolve } from "path";

// Carrega .env / .env.local da raiz do monorepo (mesma convenção de
// packages/db/src/__tests__/setup-env.ts).
config({ path: resolve(__dirname, "../../../../.env") });
config({ path: resolve(__dirname, "../../../../.env.local"), override: true });
