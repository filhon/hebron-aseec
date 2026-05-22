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
  schema: "./src/schema/public.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
