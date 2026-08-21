import { config } from "dotenv";
config({ path: "../../.env" });
config({ path: "../../.env.local", override: true });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const rows = await sql`
  SELECT pid, state, wait_event_type, wait_event, query_start, state_change, now() - query_start AS duration, left(query, 150) AS query
  FROM pg_stat_activity
  WHERE datname = current_database() AND pid <> pg_backend_pid()
  ORDER BY query_start ASC NULLS LAST
`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
