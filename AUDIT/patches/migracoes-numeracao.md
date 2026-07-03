# Patch agrupado — numeração de migrations nos prompts pendentes

**Motivo:** CS-3 (S1-04, F3-06, F3-07). Os números citados já colidem com o diretório real
(0010 = financeiro; 0009–0011 reorganizados pelo P-0.7) e a decisão da Fase 3 (Q7) devolve a
geração ao drizzle-kit — migration deixa de ter número manual.
**Formato:** mudança idêntica em 13 prompts; agrupada aqui por ser mecânica (1 linha por prompt).
A regra geral passa a viver em G6 item 4.

## Regra de substituição

### ANTES (padrão)

```
- `packages/db/src/migrations/00NN_<modulo>.sql`
```

### DEPOIS (padrão)

```
- migration gerada via `drizzle-kit generate` a partir de `packages/db/src/schema/<modulo>.ts`
  (nome automático do kit; NÃO criar arquivo SQL numerado à mão — ver G6.4)
```

## Ocorrências

| Prompt | Linha citada hoje | Observação |
| --- | --- | --- |
| P-4.6 | `0010_tarefas.sql` | 0010 já é do financeiro |
| P-4.7 | `0011_tarefas_rls.sql` | 0011 será `financeiro_rls` renomeada (P-0.7) |
| P-5.6 | `0012_intranet.sql` | |
| P-5.7 | `0013_intranet_rls.sql` | |
| P-6.6 | `0014_plataforma.sql` | |
| P-6.7 | `0015_plataforma_rls.sql` | |
| P-7.6 | `0016_flats.sql` | |
| P-7.7 | `0017_flats_rls.sql` | |
| P-8.6 | `0018_radio.sql` | |
| P-8.7 | `0019_radio_rls.sql` | |
| P-9.1 | `0020_rls_fixes.sql (se necessário)` | manter "se necessário", sem número |
| P-9.2 | `0021_lgpd.sql` | grosso do schema LGPD migra para P-0.13 |
| P-9.3 | `0022_indexes.sql (se necessário)` | manter "se necessário", sem número |

Nota: migrations de **RLS** (P-X.7) são SQL que o kit não gera — para essas, o texto vira:
"arquivo SQL de policies criado após a migration de schema do módulo, com nome sequencial
imediatamente posterior ao que o kit gerou (runner aplica em ordem alfabética)".
