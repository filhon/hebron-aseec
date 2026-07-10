# PATCH-018 - Intranet: KPIs usam snapshot com fallback live e tendencia real

**Data:** 2026-07-10
**Origem:** Debitos de S-92 e S-93.
**Motivo:** P-5.6 criou `intranet.kpi_snapshots` e P-5.8 criou o cron horario, mas `getKpis` ainda calcula tudo ao vivo e define `trend: "stable"` sempre. O dashboard funciona, mas ignora a cache projetada e nao entrega a tendencia prometida pelo tipo `KPI`.

## Prompt corretivo proposto

### P-5.9c - Intranet: snapshot de KPIs e tendencias

**Fase:** 5
**Modulo:** intranet
**Tipo:** integration
**Pre-condicoes:**

- Branch: `fix/P-5.9c-intranet-kpi-snapshots`
- Dependencias: P-5.6, P-5.8, P-5.9 e P-0.14 concluidos
- Env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Escopo:**

Fazer `getKpis` consumir `intranet.kpi_snapshots` como fonte primaria, com fallback ao calculo live apenas quando o snapshot esta ausente ou obsoleto.

1. Definir contrato de frescor:
   - snapshot fresco: `captured_at >= now() - interval '2 hours'`;
   - se todos os KPIs persistiveis tiverem snapshot fresco, retornar snapshot;
   - se algum KPI persistivel estiver faltando/velho, recalcular live e retornar live para o conjunto inteiro, evitando misturar periodos.
2. KPIs persistiveis:
   - projetos ativos;
   - doacoes do mes;
   - tarefas abertas.
3. KPI nao persistivel nesta fase:
   - alunos na Plataforma continua stub ate Fase 6.
4. Tendencia:
   - comparar snapshot atual com o snapshot anterior do mesmo `metric_name`;
   - `up` se valor atual > anterior;
   - `down` se valor atual < anterior;
   - `stable` se igual ou se nao houver historico anterior.
5. Ajustar cron em `packages/jobs/src/crons/intranet.ts`, se necessario, para manter historico suficiente em vez de sobrescrever sempre a mesma linha sem preservar ponto anterior.

**Arquivos permitidos para criacao/edicao:**

- `apps/intranet/src/actions/kpis.ts`
- `packages/jobs/src/crons/intranet.ts`
- `packages/db/src/schema/intranet.ts`
- `packages/db/src/migrations/<gerada>_intranet_kpi_snapshots_history.sql` (somente se a tabela atual impedir historico)
- `apps/intranet/src/__tests__/kpis.test.ts`
- `packages/jobs/src/__tests__/intranet-kpis.test.ts`

**Criterios de aceite:**

- [x] `getKpis` le snapshots frescos quando disponiveis.
- [x] `getKpis` faz fallback live quando snapshots estao ausentes ou com mais de 2h.
- [x] Tendencia `up/down/stable` e calculada a partir do ponto anterior real.
- [x] O KPI "Alunos na Plataforma" continua stub claro ate Fase 6.
- [x] Cron horario grava historico suficiente para tendencia.
- [x] Testes cobrem snapshot fresco, snapshot velho, ausencia de snapshot e tendencia.
- [x] Lint e types passam.

## Nota de modelagem

Se a unique atual `(metric_name, period)` impedir historico, trocar para uma chave que preserve serie temporal, por exemplo `(metric_name, period, captured_at)` ou uma coluna `bucket_hour`. Nao manter tendencia real em memoria da app.
