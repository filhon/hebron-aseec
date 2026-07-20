import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load env vars from the monorepo root — .env.local takes precedence over .env
config({ path: "../../.env" });
config({ path: "../../.env.local", override: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set.\n" +
      "Add it to .env.local at the monorepo root.\n" +
      "Find it in Supabase → Settings → Database → Connection String (URI mode, port 5432).\n" +
      "Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres",
  );
}

export default defineConfig({
  // Barrel used for Drizzle ORM type inference and Studio only.
  // Migrations are SQL files applied by `pnpm --filter @hebron/db db:migrate`.
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
