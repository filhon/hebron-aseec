import postgres from "postgres";
const sql = postgres(
  "postgresql://postgres.ehobbmkssljdnzdvtmta:Filip%26140393HS%2B.%2B@aws-1-us-west-2.pooler.supabase.com:6543/postgres",
  { prepare: false, max: 1, connect_timeout: 15 },
);
sql`SELECT 1 as ok`
  .then((r) => {
    console.log("CONECTADO:", JSON.stringify(r));
    process.exit(0);
  })
  .catch((e) => {
    console.error("ERRO:", e.code, e.message);
    process.exit(1);
  });
