# Patch — Instruções Globais (G5 emendada + G6 nova)

**Motivo:** F2-P4 (layout que só autentica não autoriza — G5 atual induz o erro), F3-03/F3-08 (kit de sessão/audit precisa ser obrigatório para não ser recopiado), PD-1/PD-2 (critérios de operabilidade e reuso do Bloco A), CS-3 (migrations via drizzle-kit), CS-4 (enum de audit).
Aplicar em `PROMPTS.md`, seção "Instruções Globais".

---

## 1. G5 — item novo (autorização, não só autenticação)

### ANTES (trecho)

```
(grupo)/layout.tsx   → Server Component: chama getAuthUser(), redireciona se null, renderiza <Shell user={user}>
```

### DEPOIS

```
(grupo)/layout.tsx   → Server Component: chama getAuthUser(), redireciona se null,
                       VERIFICA O PAPEL exigido pelo grupo (ex.: (diretoria) exige
                       diretor|conselheiro|super_admin; (admin) exige super_admin;
                       área editorial exige editor|super_admin) e redireciona/403 se
                       o papel não bate. Autenticar ≠ autorizar — o gate de papel no
                       layout é a camada 1 do BRAIN §3.
```

E acrescentar ao final de G5:

```
> Além dos arquivos de layout, TODO P-X.9 deve listar entre os arquivos permitidos os
> componentes e formulários do Bloco A do módulo (P-X.2 e P-X.4). A integração usa e
> conecta esses componentes — NÃO reescreve as telas inline. Critério padrão de todo
> P-X.9: "nenhum componente/formulário do Bloco A permanece sem import (verificar por
> grep)". Origem: padrão PD-2 da auditoria (26+ componentes órfãos nas fases 1–3).
```

---

## 2. G6 — NOVA instrução: kit de backend obrigatório

Inserir após G5:

```markdown
## G6. Kit de backend: use os packages, nunca copie

Vale para todo prompt de Bloco B (P-X.6 a P-X.12). Origem: achados F3-02/F3-03/F3-08
da auditoria — cópias locais de sessão/audit produziram 3 apps com actions que negam
qualquer usuário e 2 módulos com auditoria permanentemente vazia.

1. **Sessão/gates:** toda Server Action usa o action-client de `@hebron/auth`
   (`createSupabaseServerActionClient` / factory de safe-action do package — P-0.8).
   PROIBIDO criar `safe-action.ts` local com `createClient(url, anonKey, ...cookie...)`.
2. **Conexão de dados:** leituras e escritas rodam como `authenticated` (decisão B,
   P-0.10) — o client da sessão, não `DATABASE_URL` superuser. RLS é camada ativa.
3. **Auditoria:** usar o `logAudit` de package (P-0.8). Em módulos de governança
   (financeiro, votação, aprovações), falha de audit ABORTA a operação. Todo P-X.6
   que crie ações auditáveis DEVE incluir `ALTER TYPE admin.audit_action ADD VALUE
   IF NOT EXISTS` para os valores novos do módulo — sem isso a auditoria falha em
   runtime (achado F3-02).
4. **Migrations:** geradas com `drizzle-kit generate` (P-0.11). NÃO citar/criar número
   de migration manualmente; o nome é o que o kit gerar. O runner aplica em ordem.
5. **Cross-app:** lógica consumida por outro app vive em `packages/integrations`
   (P-0.15). App NUNCA importa de outro app.
6. **Jobs:** cron/agendamento via `packages/jobs` (Inngest, P-0.14). Registrar o job
   no catálogo do package; nunca "fica para depois" sem registro.
7. **Critérios de integração (P-X.9):** cada fluxo de mutação do módulo deve ter
   critério próprio "ação X executável a partir da tela Y" — "substituir mocks" não
   é critério suficiente (padrão PD-1).
```

---

## 3. G4 — nota de rodapé (sem mudança de conteúdo)

Nenhuma mudança nos tokens. Registrar apenas que a tabela de G4 duplica BRAIN §5
(observação da Fase 1) — em caso de divergência futura, BRAIN vence.
