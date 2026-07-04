import { config } from "dotenv";
import { resolve } from "path";

// Carrega .env / .env.local da raiz do monorepo (mesma convenção de drizzle.config.ts e migrate.ts).
config({ path: resolve(__dirname, "../../../../.env") });
config({ path: resolve(__dirname, "../../../../.env.local"), override: true });
