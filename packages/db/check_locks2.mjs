import { config } from "dotenv";
config({ path: "../../.env" });
config({ path: "../../.env.local", override: true });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const locks = await sql`
  SELECT locktype, relation::regclass AS rel, mode, granted, pid
  FROM pg_locks
  WHERE NOT granted OR relation::regclass::text ILIKE '%project%'
`;
console.log("locks:", JSON.stringify(locks, null, 2));

const t0 = Date.now();
await sql`SELECT 1`;
console.log("simple select ms:", Date.now() - t0);

const t1 = Date.now();
await sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`;
console.log("vector ext check ms:", Date.now() - t1);
await sql.end();
