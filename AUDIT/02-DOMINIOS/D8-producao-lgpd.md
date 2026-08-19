# D8 — Produção e LGPD (Nível A — exaustivo)

## Checklist

| Item                                                                                   | Status                  |
| -------------------------------------------------------------------------------------- | ----------------------- |
| Nenhuma URL hardcoded de dev/preview; nenhuma flag de debug ativa; seeds inalcançáveis | ✅ ver §1               |
| Rate limiting prometido no PRD implementado                                            | ⛔ `[NEG-006]`          |
| Security headers prometidos implementados                                              | ⛔ `[NEG-008]`          |
| Nenhuma PII em logs                                                                    | ⚠️ `[D8-002]` (latente) |
| Log de auditoria cobre **todas** as ações listadas no PRD                              | ⚠️ `[D8-003]`           |
| LGPD ponta a ponta: consentimento **e** exportação **e** exclusão funcionais           | ⛔ **`[D8-001]` — P0**  |

---

## 1. Higiene de produção

| Verificação                                        | Resultado                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| URL de dev/preview hardcoded                       | Só `CANONICAL_LOGIN_URL` (`packages/auth/src/middleware.ts:73-76`), com guarda `NODE_ENV === "production"` ✅        |
| Flags de debug (`DEBUG`, `__DEV__`, `debug: true`) | **0 ocorrências** ✅                                                                                                 |
| Seeds alcançáveis em produção                      | Não — `db:seed` e `db:seed:flats-tarefas` são scripts CLI (`packages/db/package.json:28-29`), não rotas ✅           |
| Segredo em bundle de cliente                       | **0 ocorrências** (ver `D7-padroes.md` §3) ✅                                                                        |
| Cookie de impersonação forjável                    | Não — HMAC-SHA256 com `timingSafeEqual`, e falha fechada em produção (`packages/auth/src/impersonation.ts:30-34`) ✅ |

---

### [D8-001] O direito de exclusão da LGPD é aceito e nunca pode ser executado — não existe caminho de produto para resolver o pedido

- **Severidade:** **P0** | **Domínio:** LGPD | **App:** todos (fundação)
- **Status:** CONFIRMADO
- **Evidência:** busca exaustiva por consumidores de `executeDataDeletion` / `rejectDataDeletion`
- **Trecho — a primitiva existe** (`packages/auth/src/data-deletion.ts:13-19`):
  ```
   *      (`public.data_deletion_requests`, status "pending"). Auto-serviço via
   *      RLS `data_deletion_requests_insert_own` — ninguém pede em nome de
   *      outro.
   *   2. `executeDataDeletion` / `rejectDataDeletion`: super_admin resolve. A
   *      EXECUÇÃO reusa a primitiva de P-0.13 (`anonymizeUser`) — exclusão
  ```
- **Encontrado:** O passo 1 funciona: as 9 telas `/meus-dados` chamam `requestDataDeletion` e gravam um ticket `pending` (verificado em `apps/admin/src/app/(dashboard)/meus-dados/page.tsx:104-114`). **O passo 2 não tem porta de entrada nenhuma.**

  `grep -rn "executeDataDeletion" . --include="*.ts" --include="*.tsx"` em todo o repositório retorna apenas: a definição (`data-deletion.ts:144`), o comentário do cabeçalho (`:18`), o teste (`__tests__/data-deletion.test.ts:37,237`), a documentação (`docs/lgpd-inventario-dados-pessoais.md:59`) e a nota de débito em `SESSIONS.md:12743`. **Nenhum arquivo de `apps/` a chama.**

  Não existe tela: as 13 páginas de `apps/admin/src/app/` são auditoria, configurações, convites (2), meus-dados, notificações, dashboard, reuniões (3), templates-email e usuários (2). Nenhuma lista pedidos de exclusão. Busca por diretório `*exclusao*`/`*lgpd*`/`*solicitac*` em `apps/*/src/app` → 0 resultados.

- **O próprio projeto registrou o débito e nunca o fechou** — `SESSIONS.md:12742-12744`:
  ```
  - **UI admin de processamento de tickets** de exclusão: `executeDataDeletion`/
    `rejectDataDeletion` existem e são testados, mas a tela de super_admin para
    acioná-los não está nos arquivos permitidos — corretivo futuro.
  ```
  O "corretivo futuro" nunca foi escrito nem em `PROMPTS.md` nem executado.
- **Esperado:** `BRAIN.md:632-642` trata o direito de exclusão como **decisão jurídica explícita** (_"decisão F1-Q4: cumprir a lei"_), e o `.docs/Claude.md` §5.4 exige _"Tela 'Meus dados' em cada app permite visualizar, exportar (JSON + CSV) e **solicitar exclusão**"_. `PROMPTS.md:10434` (P-9.2) especifica: _"Solicitação de exclusão: gera ticket para super_admin; **a execução usa o fluxo de anonimização de P-0.13**"_.
- **Divergência ALEGADO × REAL:** `PROMPTS.md:10447` marca `[x] Exclusão executada anonimiza PII de verdade (teste fim-a-fim com usuário fixture)`. O critério é literalmente verdadeiro — o **teste** faz isso (`data-deletion.test.ts:235-237`) — e mesmo assim o produto não. A auditoria por fase não pegaria: o teste passa.
- **Impacto:** O sistema **coleta o pedido de exclusão do titular e não tem como atendê-lo**. Isso é pior do que não oferecer o botão: gera prova documental, com data e justificativa, de solicitações que a organização não cumpre. A LGPD (art. 18, VI e §3º) dá prazo de resposta; o `public.data_deletion_requests` vira o registro do próprio descumprimento, e é a primeira coisa que uma fiscalização da ANPD leria.

  Para uma associação cristã com 40+ anos de reputação e dados de pastores e missionários, o dano reputacional supera o jurídico.

- **Correção sugerida:** Uma tela no Admin listando `data_deletion_requests` com status `pending`, com dois botões chamando `executeDataDeletion`/`rejectDataDeletion` sob `adminAction`. As duas funções já estão prontas e testadas — é UI + duas server actions, escopo de uma sessão. **Este é o item que sozinho impede o go-live.**

---

### [D8-002] `logPiiAccess` existe, é testado e nunca foi ligado a nenhuma tela

- **Severidade:** P1 | **Domínio:** LGPD | **App:** flats, admin
- **Status:** CONFIRMADO
- **Evidência:** `packages/auth/src/data-export.ts:279` (definição) e busca exaustiva por chamadores
- **Trecho (o cabeçalho do módulo declara a finalidade)** — `packages/auth/src/data-export.ts:15-16`:
  ```
   *   2. Acesso de terceiro (admin) a PII: `logPiiAccess`, a primitiva que
  ```
- **Encontrado:** `grep -rn "logPiiAccess" apps/*/src packages/*/src --include="*.ts" --include="*.tsx"` (excluindo testes) retorna **exatamente 2 linhas**: o comentário `:15` e a definição `:279`. **Zero chamadores em código de aplicação.**
- **Esperado:** `PROMPTS.md:10434` (P-9.2): _"**Log de acesso a dados pessoais** (leituras de CPF/documentos por admin ficam auditadas)"_, e `.docs/Claude.md` §5.4: _"Logs de acesso a dados pessoais auditados."_
- **Débito registrado e não fechado** — `SESSIONS.md:12737-12741`:
  ```
  - **Wiring do `logPiiAccess`** nas telas reais de leitura de PII de terceiros
    (gestor de flats vendo CPF/documentos em `apps/flats/src/lib/queries.ts`;
    detalhe de usuário no `admin`) — fora dos arquivos permitidos deste prompt.
    Primitiva + teste entregues; instrumentar os pontos de leitura é corretivo
    dedicado (inventário §6.1).
  ```
- **Divergência ALEGADO × REAL:** `PROMPTS.md:10449` marca `[x] Acesso a CPF/documentos audita leitura (teste)`. A palavra "(teste)" no critério é o que o salva tecnicamente — mas o requisito de produto é auditar a leitura real.
- **Impacto:** As duas telas nomeadas no próprio débito são as que mais importam: o gestor de flats lê CPF, data de nascimento e documento de identidade de pastores e missionários (`flats.guests` + bucket `flats-documentos`), e o super_admin lê o cadastro completo em `/usuarios/[id]`. Hoje **nenhuma dessas leituras deixa rastro**. Se houver vazamento de PII, não há como determinar quem consultou o quê — exatamente a pergunta que o art. 37 da LGPD (registro das operações de tratamento) obriga a responder.
- **Correção sugerida:** Instrumentar os dois pontos nomeados no débito. A primitiva está pronta; é uma chamada por caminho de leitura.

---

### [D8-003] A lista de campos redigidos no audit não cobre a PII do Flats

- **Severidade:** P3 (latente — nenhum diff hoje carrega esses campos) | **Domínio:** LGPD | **App:** flats
- **Status:** CONFIRMADO
- **Evidência:** `packages/db/src/audit.ts:74-82`
- **Trecho:**
  ```ts
  export const SENSITIVE_AUDIT_FIELDS = new Set([
    "email",
    "fullName",
    "phone",
    "documentCpf",
    "responsavelLegal",
    "telefone",
    "endereco",
  ]);
  ```
  A redação é **por nome de chave**, aplicada recursivamente pelo `redactSensitiveFields` (`:96-101`).
- **Esperado:** `BRAIN.md:655-657` — _"Todo prompt que adicionar um campo de PII a qualquer schema deve incluir o nome do campo nessa lista."_
- **Encontrado:** `flats.guests` (`0021_flats.sql:54-69`) tem `name`, `cpf` e `birth_date` — que em camelCase viram `name`, `cpf`, `birthDate`. **Nenhum dos três está na lista.** A lista tem `fullName` (não `name`) e `documentCpf` (não `cpf`), que são os nomes usados em `public.users` — os campos do Flats nasceram com outra nomenclatura e a lista não acompanhou.
- **Por que é P3 e não P1:** verifiquei os diffs que o Flats realmente grava, e eles são construídos à mão com agregados, sem PII — `apps/flats/src/actions/reservations.ts:265-271`:
  ```ts
                diff: {
                  scoreTotal: totalPoints,
                  preferredPeriodsCount: input.preferredPeriods.length,
                  hasAidRequest: input.aidRequest !== null,
                  hasResponsibleDocument:
                    input.guest.responsibleDocument !== null,
                },
  ```
  ✅ Nenhum CPF ou nome chega ao `admin.audit_log` hoje. O risco é **latente**: qualquer prompt futuro que audite uma alteração de hóspede usando o `computeDiff` genérico grava CPF em claro numa tabela **imutável e particionada até 2027** — de onde só a anonimização (`[D1-005]`) o removeria, e ela mesma tem uma fragilidade.
- **Correção sugerida:** Acrescentar `"name"`, `"cpf"`, `"birthDate"`, `"plate"` (placa de veículo também identifica pessoa) à lista. Custo: uma linha. Melhor ainda: um teste que compare a lista contra as colunas de PII conhecidas do schema, para que a regra do BRAIN §9 pare de depender de disciplina humana.

---

## 2. Cobertura do log de auditoria

O `admin.audit_log` é sólido no essencial: particionado por mês até 2027 (`0013_audit_log_partitions.sql`), imutável (INSERT-only, policy `TO service_role`), com enum de ações estendido por módulo em 12 migrations diferentes (`0006`, `0012`, `0016`, `0018`, `0020`, `0022`, `0024`, `0027`–`0029`, `0032`, `0038`, `0041`, `0047`, `0051`, `0057`, `0067`, `0072`–`0074`).

Mutações críticas verificadas com audit correspondente: aprovação/autorização de lote (`financeiro.batch.created`, e as transições), voto (`castVote`, atômico com o audit), impersonação (`user.impersonated`, com `event: start`/`stop` e duração), transição de estágio de projeto, estorno, anonimização (`user.anonymized`), concessão/revogação de papel. ✅

**A lacuna é a leitura, não a escrita** — `[D8-002]`. O PRD/`.docs/Claude.md` §5.4 pede "logs de acesso a dados pessoais auditados", e nenhuma leitura de PII é registrada.

## 3. Consentimento e exportação — funcionais

Diferente da exclusão, os outros dois pilares da LGPD estão **completos e fiados**:

- **Consentimento:** `public.consents` com enum de finalidades (`comunicacao`, `newsletter`, `dados_reserva`, `dado_saude`), revogação como `granted = false` (nunca DELETE). A tela chama `setConsent` de `@hebron/db/consents` (`meus-dados/page.tsx:16`). ✅
- **Exportação:** `exportMyData(id, format, tx)` em JSON e CSV, chamada sob `withAuthenticatedContext` (`meus-dados/page.tsx:95-101`). ✅
- **Inventário de dados pessoais:** `docs/lgpd-inventario-dados-pessoais.md` existe e mapeia dado × base legal × retenção, como P-9.2 exigia. ✅
- **Retenção de dado comportamental:** `documentos.purge_old_views()` via pg_cron mensal (`0023_documentos_views_retention.sql`), e os heartbeats da rádio são agregados e apagados diariamente (`packages/jobs/src/crons/radio-stats.ts:75`). ✅

É por isso que `[D8-001]` é tão desproporcional: dois terços do trilho LGPD estão prontos, e o terço que falta é o único com prazo legal e sanção.

## 4. Rate limiting e security headers

Ambos ausentes — desenvolvidos em `[NEG-006]` e `[NEG-008]`. Repito aqui só a consequência mais concreta, que pertence a este domínio:

`POST /api/heartbeat` (`apps/radio/src/app/api/heartbeat/route.ts:27`) é **público, sem autenticação, sem captcha e sem limite**, e insere uma linha em `radio.listener_heartbeats` por chamada, usando a conexão superuser. Um script trivial infla a audiência da rádio — que alimenta o KPI da Intranet (P-5.8b) apresentado à diretoria — e faz a tabela crescer sem teto até a agregação diária. Não é uma vulnerabilidade de dados; é uma superfície de abuso trivial num endpoint que nenhuma camada protege (o app não tem middleware — `[D1-001]`).
