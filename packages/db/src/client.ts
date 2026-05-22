import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/public";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required. Use the direct connection string from Supabase (not the pooler) for migrations.",
  );
}

// `prepare: false` is required for Supabase transaction pooler mode
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export type Database = typeof db;
