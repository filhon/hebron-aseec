# Hebron Aseec

Monorepo pnpm + Turborepo com o ecossistema de apps Next.js da Hebron Aseec. Ver [CLAUDE.md](CLAUDE.md) para stack, estrutura e convenções; [BRAIN.md](BRAIN.md) para regras de negócio.

## CI

`.github/workflows/ci.yml` roda em todo PR e push para `main`, com dois jobs:

- **lint-typecheck** — `pnpm turbo lint typecheck` em todos os apps/packages.
- **test** — sobe um stack Supabase local efêmero (Postgres + Auth + Storage, via `supabase start`), aplica todas as migrations do zero com o runner do projeto (`pnpm --filter @hebron/db db:migrate`) e então roda `pnpm turbo test`. Uma migration com ordenação ou drift quebrados (classe de bug F3-06) derruba o job, já que o banco nasce vazio a cada execução.

### Reproduzir localmente

```bash
pnpm install
supabase start          # requer Docker; credenciais impressas no final
supabase status -o env  # copiar API_URL/DB_URL/ANON_KEY/SERVICE_ROLE_KEY para .env.local
pnpm --filter @hebron/db db:migrate
pnpm turbo test
```

`supabase stop` encerra o stack local. `supabase/config.toml` desabilita os serviços não usados pelo projeto (Edge Functions, Analytics) e o mecanismo de migrations/seed nativo do CLI (o projeto usa `packages/db/src/migrate.ts`, não `supabase/migrations`).
