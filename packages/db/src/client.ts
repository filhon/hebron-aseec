import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required. Use the direct connection string from Supabase (not the pooler) for migrations.",
  );
}

// Singleton pattern: prevents creating multiple pools on Next.js hot reloads
// (webpack re-evaluates modules; without globalThis the pool multiplies each time)
const globalForDb = globalThis as { __dbClient?: ReturnType<typeof postgres> };

if (!globalForDb.__dbClient) {
  // `prepare: false` is required for Supabase transaction pooler mode
  // `max: 5` caps per-process connections; with the pooler this is more than enough
  globalForDb.__dbClient = postgres(connectionString, {
    prepare: false,
    max: 5,
  });
}

export const db = drizzle(globalForDb.__dbClient, { schema });

export type Database = typeof db;
