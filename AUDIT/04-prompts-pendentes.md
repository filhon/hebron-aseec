# AUDIT/04 — Fase 4: Auditoria dos prompts pendentes (~70%) antes da retomada

**Fase:** 4 · **Data:** 2026-07-02 · **Auditor:** agente Fable 5 (read-only fora de `AUDIT/`)
**Entrada:** os 69 prompts pendentes (P-3.9–P-3.12, P-4.1–P-8.12, P-9.1–P-9.5) relidos integralmente em PROMPTS.md; achados S1-\*, F2-\*, F3-\* e padrões PD-\*/PT-\* das Fases 1–3; respostas do Filipe às perguntas das Fases 0–3 (tratadas como decisões registradas); BRAIN.md §6.3/6.4/6.5/6.6/6.8/6.9, §7 e §8 relidos nesta sessão.
**Saída complementar:** patches propostos em `AUDIT/patches/` (formato antes/depois; um arquivo por prompt substantivamente alterado; mudanças mecânicas idênticas agrupadas em `patches/migracoes-numeracao.md` e `patches/patches-leves.md`).

---

## 1. Sumário

| Veredito                                                    | Qtd              | Prompts                                                                                                                                                                                            |
| ----------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Executável como está**                                    | 16               | P-4.1, P-4.2, P-4.5, P-5.2, P-5.3, P-5.5, P-6.2, P-6.5, P-7.1, P-7.2, P-7.3, P-7.5, P-8.1, P-8.2, P-8.3, P-8.5                                                                                     |
| **Precisa de patch — substantivo**                          | 27               | P-3.9, P-3.10, P-3.11, P-4.3, P-4.6, P-4.7, P-4.8, P-4.9, P-4.11, P-5.6, P-5.8, P-5.9, P-5.10, P-5.11, P-6.3, P-6.7, P-6.8, P-6.9, P-6.10, P-7.4, P-7.6, P-7.8, P-7.9, P-7.11, P-8.8, P-8.9, P-9.5 |
| **Precisa de patch — leve**                                 | 22               | P-3.12, P-4.4, P-4.10, P-4.12, P-5.1, P-5.4, P-5.7, P-5.12, P-6.1, P-6.4, P-6.11, P-6.12, P-7.7, P-7.10, P-7.12, P-8.4, P-8.7, P-8.10, P-8.12, P-9.3, P-9.4 + P-8.6                                |
| **Precisa de reescrita (decisões já tomadas o esvaziaram)** | 2                | P-9.1, P-9.2                                                                                                                                                                                       |
| **Precisa de decisão do Filipe antes**                      | 2 pontos globais | D-2 (Google Calendar → P-5.13 novo), D-3 (semântica de audiência → P-8.6/P-8.11) — perguntas na §8                                                                                                 |

Leitura honesta: **os Blocos A das fases 4–8 estão, em geral, bem escritos e executáveis** — critérios verificáveis, listas "SEM" explícitas na Rádio, escopo enxuto. O problema se concentra nos **Blocos B**, e não é aleatório: os prompts pendentes foram escritos antes de o código existir e assumem (a) um mecanismo de sessão que não funciona, (b) conexão superuser que o Filipe decidiu abandonar, (c) numeração de migrations já ocupada, (d) infra Inngest que não existe, e (e) o mesmo formato de critério ("substituir mocks") que produziu módulos com leitura viva e operação morta 4 vezes seguidas. Sem os patches, as fases 4–8 reproduzem os achados da Fase 2 em 5 módulos novos.

Nenhuma dependência circular nova foi encontrada entre os prompts pendentes. A ordem interna P-X.1→P-X.12 permanece válida.

---

## 2. Colisões estruturais (o que motiva a maioria dos patches)

Cada colisão abaixo aponta o achado de origem e os prompts pendentes atingidos.

**CS-1 — Resolução de sessão quebrada será copiada (F3-03, F3-08, PT-2).** Os P-X.8 pendentes dizem apenas "Server Actions" — o implementador vai copiar `safe-action.ts` de projetos/financeiro (cópia já se propagou 3×), que nega acesso a todo mundo. Correção: corretivo P-0.8 (kit compartilhado em `@hebron/auth`) + nova instrução global G6 obrigando o uso. Atinge: P-4.8, P-5.8, P-6.8, P-7.8, P-8.8 e todos os P-X.9.

**CS-2 — Decisão B (authenticated+JWT) não tem chão nem reflexo nos prompts (S1-02, F3-05; decisão do Filipe, Fase 1 Q2).** Todos os P-X.8 pendentes listam `SUPABASE_SERVICE_ROLE_KEY` como env var e pressupõem superuser; nenhum prompt cria grants (F3-05); os P-X.9 herdam de G5 um layout que só autentica, não autoriza (F2-P4). Correção: corretivo P-0.10 + patch em G5 (gate de papel no layout) + patch nos P-X.8/P-X.9.

**CS-3 — Numeração de migrations colide e a convenção muda (S1-04, F3-06, F3-07; decisão Fase 3 Q7: voltar ao drizzle-kit).** P-4.6 cita `0010_tarefas.sql` — 0010 é do financeiro. Todos os números citados (0010–0022) estão errados ou vão colidir. Após P-0.11 (drizzle-kit reconciliado), migration não tem mais número manual. Correção mecânica em 13 prompts: `patches/migracoes-numeracao.md`.

**CS-4 — Enum `admin.audit_action` não recebe os valores dos módulos novos (F3-02).** Nenhum P-X.6 pendente inclui `ALTER TYPE ... ADD VALUE`. Com a semântica decidida na Fase 3 (falha de audit **aborta** a operação), esquecer o enum agora derruba o módulo inteiro em runtime — pior que o fail-silent atual. Correção: cláusula padrão nos P-4.6/5.6/6.6/7.6/8.6 (via G6 + patches).

**CS-5 — Inngest pressuposto, nunca criado (S1-06, F3-01, PT-3).** P-4.8 (recorrência), P-4.10 (prazos), P-5.10 (briefing), P-7.10 (check-in 3 dias antes), P-8.11 (snapshot de audiência) e os [~] das fases 1–3 dependem de infra que nenhum prompt monta. Correção: corretivo P-0.14 antes da Fase 4.

**CS-6 — Contrato cross-app viola a fronteira do monorepo (S1-09).** P-4.11 cria `createAutoTask` dentro de `apps/tarefas`; P-5.8, P-5.11, P-6.11, P-7.11 e P-8.11 mandam outros apps chamá-la. App não importa app. Correção: corretivo P-0.15 (`packages/integrations`) + patches nos 6 prompts.

**CS-7 — Os critérios dos P-X.9 pendentes repetem o padrão que matou a operação (PD-1).** "Substituir mocks por dados reais" foi cumprido 4× como leitura sem mutação (3/17 actions com UI em Projetos). Os P-4.9–P-8.9 têm exatamente o mesmo formato. Correção: cada P-X.9 ganha critérios de operabilidade nomeados fluxo a fluxo ("ação X executável a partir da tela Y").

**CS-8 — Bloco A vai morrer de novo no Bloco B (PD-2; decisão Fase 2 Q6: reconectar).** Os P-X.9 pendentes não listam os componentes/formulários do Bloco A entre os arquivos permitidos — foi essa restrição que induziu as reescritas inline e os ~26 componentes órfãos. Correção: P-X.9 passa a listar os componentes do Bloco A e ganha critério "nenhum componente/formulário do Bloco A órfão".

**CS-9 — PII e dado de saúde coletados antes de existir base de consentimento (S1-03, F3-09).** P-7.4 coleta documento de identidade, CPF de acompanhantes e saúde autodeclarada (BRAIN §6.8 critério d — dado sensível, LGPD art. 5º II); P-6.10 dispara e-mail em massa sem opt-in. Correção: corretivo P-0.13 (fundação LGPD) antes das fases 6–7 + patches P-7.4/P-6.10.

**CS-10 — Telas no escopo sem arquivo permitido (padrão S1-14 se repetindo).** P-4.3 menciona "Configuração do workspace" sem arquivo; P-6.3 lista "Editor de curso / de aula / de quiz" nas páginas do instrutor e só permite `(instrutor)/layout.tsx` e `page.tsx`. É o mesmo defeito que deixou 4 telas do Financeiro sem dono. Correção: patches P-4.3 (remove — ver D-5) e P-6.3 (adiciona arquivos).

**CS-11 — Uploads sem Storage especificado (S1-21iii).** P-6.4 (capa de curso), P-7.4 (documento de identidade), P-3.10/P-3.8b (extratos e recibos — retenção 5 anos, decisão Fase 3 Q6) dependem de buckets/policies que nenhum prompt cria. Correção: corretivo P-0.12.

**CS-12 — Semânticas de negócio indefinidas viram buraco (S1-24, F2-P6 como precedente).** "Doações do mês" foi definida pelo Filipe (Fase 1 Q10 — despesas de categoria específica do plano de contas) → patch P-5.1/P-5.8. "Audiência da Rádio" segue sem definição → D-3 (pergunta §8). Busca global sem contrato de visibilidade → patch P-5.8 (com a decisão B, a busca roda como `authenticated` e a RLS filtra — contrato natural).

---

## 3. Vereditos por prompt

Colunas: veredito · motivo dominante (colisões CS-\* e achados) · patch.

### Fase 3 — Financeiro (retomada imediata)

| Prompt | Veredito                | Motivo                                                                                                                                                                                                                                          | Patch                      |
| ------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| P-3.9  | **Patch (substantivo)** | S1-10 + S1-14 + F2-F3 + decisão F1-Q9: faltam `contas-pagar` (governança!), contas a receber, fluxo de caixa, centros de custo, relatórios; falta G5 (layout/shell/auth) **com gate de papel**; padrão RSC não declarado; CS-7/CS-8             | `patches/P-3.9.md`         |
| P-3.10 | **Patch (substantivo)** | F2-F2 (destinatário = diretor gestor via designation, CC autorizador — BRAIN §6.5); decisão F1-Q7: export manual PDF+XLSX+ZIP com recibos entra; agendamento (lote semanal, relatório mensal) depende de P-0.14; lib de PDF/XLSX nunca decidida | `patches/P-3.10.md`        |
| P-3.11 | **Patch (substantivo)** | S1-01 (consome `organization_budgets` criada em P-3.8b); S1-11 (mecanismo de bloqueio por inadimplência + override auditado); CS-6 (funções em `packages/integrations`)                                                                         | `patches/P-3.11.md`        |
| P-3.12 | **Patch (leve)**        | Adicionar: script `test` no package.json (F3-10), testes de designation, de abort de audit, de re-parse do import, de `organization_budgets` e de bloqueio por inadimplência                                                                    | `patches/patches-leves.md` |

### Fase 4 — Tarefas

| Prompt | Veredito                     | Motivo                                                                                                                                                                                                                                                                                                                                      | Patch                      |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| P-4.1  | **Executável**               | Tipos coerentes com BRAIN §6.9; nota: manter os 4 status fixos como enum                                                                                                                                                                                                                                                                    | —                          |
| P-4.2  | **Executável**               | Nota de consistência: usar o mesmo padrão de DnD nativo do kanban de Projetos                                                                                                                                                                                                                                                               | —                          |
| P-4.3  | **Patch (leve/substantivo)** | CS-10 + D-5: remover "Configuração do workspace (colunas customizáveis)" — sem base no BRAIN (§6.9 define status fixos), sem arquivo permitido                                                                                                                                                                                              | `patches/P-4.3.md`         |
| P-4.4  | **Patch (leve)**             | D-1 (editor rich text único em `packages/ui` — pergunta §8, com recomendação); resto executável                                                                                                                                                                                                                                             | `patches/patches-leves.md` |
| P-4.5  | **Executável**               | Nota P-9.4: "Bom descanso!" — evitar exclamação genérica já na escrita                                                                                                                                                                                                                                                                      | —                          |
| P-4.6  | **Patch (substantivo)**      | CS-3 (número 0010 ocupado → drizzle-kit); D-5: remover "+ custom" dos workspaces (BRAIN §6.9: fixos); CS-4 (valores de audit no enum, se usar audit central além de `task_events`); definir modelo de acesso: **todos os papéis internos (colaborador+) enxergam os 6 workspaces** — não existe tabela de membership e nenhum prompt a cria | `patches/P-4.6.md`         |
| P-4.7  | **Patch (substantivo)**      | Frase "workspaces que tem acesso" pressupõe membership inexistente (resíduo do custom); reescrever semântica: colaborador CRUD no que criou/é assignee, SELECT no workspace; diretor SELECT global + UPDATE em approval_requests; comentários seguem visibilidade da tarefa                                                                 | `patches/P-4.7.md`         |
| P-4.8  | **Patch (substantivo)**      | CS-1/CS-2 (kit `@hebron/auth`, sem SERVICE_ROLE); CS-5 (job de recorrência exige P-0.14 — critério hoje inexecutável); audit com semântica de abort                                                                                                                                                                                         | `patches/P-4.8.md`         |
| P-4.9  | **Patch (substantivo)**      | CS-7 (critérios de operabilidade por fluxo), CS-8 (componentes do Bloco A nos permitidos + zero órfãos), G5 (layout/shell/auth com gate de papel interno)                                                                                                                                                                                   | `patches/P-4.9.md`         |
| P-4.10 | **Patch (leve)**             | Lembretes de prazo são cron (P-0.14); registrar o job                                                                                                                                                                                                                                                                                       | `patches/patches-leves.md` |
| P-4.11 | **Patch (substantivo)**      | CS-6: `createAutoTask` nasce em `packages/integrations`, não em `apps/tarefas`                                                                                                                                                                                                                                                              | `patches/P-4.11.md`        |
| P-4.12 | **Patch (leve)**             | Teste do fluxo de aprovação completo; semântica de RLS atualizada pelo patch de P-4.7                                                                                                                                                                                                                                                       | `patches/patches-leves.md` |

### Fase 5 — Intranet

| Prompt        | Veredito                | Motivo                                                                                                                                                                 | Patch                                                                  |
| ------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| P-5.1         | **Patch (leve)**        | KPI "doações do mês" agora tem definição (decisão F1-Q10): despesas da categoria "Doações" do plano de contas, somadas no mês — refletir no tipo/mock                  | `patches/patches-leves.md`                                             |
| P-5.2         | **Executável**          | —                                                                                                                                                                      | —                                                                      |
| P-5.3         | **Executável**          | Calendário do Bloco A é mock; integração Google fica no novo P-5.13                                                                                                    | —                                                                      |
| P-5.4         | **Patch (leve)**        | D-1 (editor compartilhado)                                                                                                                                             | `patches/patches-leves.md`                                             |
| P-5.5         | **Executável**          | —                                                                                                                                                                      | —                                                                      |
| P-5.6         | **Patch (substantivo)** | CS-3 (número); `kpi_snapshots` sem escritor definido — declarar que quem grava é job de P-0.14 e a leitura do dashboard usa snapshot com fallback live                 | `patches/P-5.6.md` (dentro de `patches/migracoes-numeracao.md` + nota) |
| P-5.7         | **Patch (leve)**        | CS-3 (número)                                                                                                                                                          | `patches/migracoes-numeracao.md`                                       |
| P-5.8         | **Patch (substantivo)** | CS-12: busca global ganha contrato (roda como `authenticated`, RLS filtra; conjunto indexável explícito); KPI doações com query definida; briefing → P-0.14; CS-1/CS-2 | `patches/P-5.8.md`                                                     |
| P-5.9         | **Patch (substantivo)** | CS-7/CS-8/G5; diretório: expor só dados de contato institucionais (LGPD — F3-09)                                                                                       | `patches/P-5.9.md`                                                     |
| P-5.10        | **Patch (substantivo)** | Escopo duplica o relatório financeiro mensal que é do P-3.10 — remover daqui e referenciar; briefing job via P-0.14                                                    | `patches/P-5.10.md`                                                    |
| P-5.11        | **Patch (substantivo)** | CS-6: decisão→tarefa via `packages/integrations`; feed-aggregator lê schemas alheios — definir que usa funções do package                                              | `patches/P-5.11.md`                                                    |
| P-5.12        | **Patch (leve)**        | Cobrir contrato da busca (RLS filtra por papel)                                                                                                                        | `patches/patches-leves.md`                                             |
| P-5.13 (novo) | **Decisão D-2**         | Google Calendar é v1 (decisão F1-Q6), mas o modelo de integração precisa do Filipe (§8)                                                                                | rascunho na §5                                                         |

### Fase 6 — Plataforma

| Prompt | Veredito                | Motivo                                                                                                                                                                                        | Patch                            |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| P-6.1  | **Patch (leve)**        | D-5 (quizzes mantidos — ver §6): definir semântica: aula-quiz conclui com attempt ≥ passing_score, tentativas ilimitadas, certificado segue sendo 100% da trilha (BRAIN §6.3)                 | `patches/patches-leves.md`       |
| P-6.2  | **Executável**          | hls.js já especificado; NoteWidget mantido (§6)                                                                                                                                               | —                                |
| P-6.3  | **Patch (substantivo)** | CS-10: editores de curso/aula/quiz citados no escopo sem arquivo permitido                                                                                                                    | `patches/P-6.3.md`               |
| P-6.4  | **Patch (leve)**        | Capa de curso → bucket de P-0.12; D-1 (editor)                                                                                                                                                | `patches/patches-leves.md`       |
| P-6.5  | **Executável**          | —                                                                                                                                                                                             | —                                |
| P-6.6  | **Patch (leve)**        | CS-3 (número); CS-4 (enum de audit)                                                                                                                                                           | `patches/migracoes-numeracao.md` |
| P-6.7  | **Patch (substantivo)** | "Aula locked não visível se anterior não concluída" via RLS exige função helper (subquery recursiva é armadilha para executor literal) — especificar `SECURITY DEFINER` helper como as demais | `patches/P-6.7.md`               |
| P-6.8  | **Patch (substantivo)** | CS-1/CS-2; semântica de quiz (P-6.1); certificado PDF — lib decidida (ver D-6 §6); CS-4                                                                                                       | `patches/P-6.8.md`               |
| P-6.9  | **Patch (substantivo)** | CS-7/CS-8/G5 (gate aluno vs instrutor por papel)                                                                                                                                              | `patches/P-6.9.md`               |
| P-6.10 | **Patch (substantivo)** | Contradição interna: escopo diz "email para matriculados", critério diz "todos os usuários ativos"; CS-9: e-mail em massa exige opt-in (consents de P-0.13)                                   | `patches/P-6.10.md`              |
| P-6.11 | **Patch (leve)**        | CS-6 (KPI via package)                                                                                                                                                                        | `patches/patches-leves.md`       |
| P-6.12 | **Patch (leve)**        | Testes de semântica de quiz e certificado conforme patch P-6.1/P-6.8                                                                                                                          | `patches/patches-leves.md`       |

### Fase 7 — Flats

| Prompt | Veredito                | Motivo                                                                                                                                                                                                                   | Patch                      |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| P-7.1  | **Executável**          | Fiel ao BRAIN §6.8 + edital                                                                                                                                                                                              | —                          |
| P-7.2  | **Executável**          | —                                                                                                                                                                                                                        | —                          |
| P-7.3  | **Executável**          | —                                                                                                                                                                                                                        | —                          |
| P-7.4  | **Patch (substantivo)** | CS-9: step de consentimento LGPD no wizard (inclui dado de saúde autodeclarado — sensível); upload de documento → bucket P-0.12; D-5: remover "checklist de inventário" do check-in (BRAIN §6.8: presencial na recepção) | `patches/P-7.4.md`         |
| P-7.5  | **Executável**          | —                                                                                                                                                                                                                        | —                          |
| P-7.6  | **Patch (substantivo)** | CS-3; explicitar double-booking como `EXCLUDE USING gist` com `daterange` + `btree_gist` (executor literal não vai inferir); colunas de PII/saúde com anotação de acesso restrito                                        | `patches/P-7.6.md`         |
| P-7.7  | **Patch (leve)**        | CS-3; reutilizar `has_designation` de P-3.7 com escopo `flats`/`gestor` — nomear explicitamente                                                                                                                          | `patches/patches-leves.md` |
| P-7.8  | **Patch (substantivo)** | CS-1/CS-2; critério j via `packages/integrations` (CS-6); D-4: despesas de auxílio entram na governança dual normal (nascem não aprovadas → lote semanal) — recomendação a confirmar §8; CS-4                            | `patches/P-7.8.md`         |
| P-7.9  | **Patch (substantivo)** | CS-7/CS-8/G5 (gate hóspede vs admin/gestor)                                                                                                                                                                              | `patches/P-7.9.md`         |
| P-7.10 | **Patch (leve)**        | E-mails de check-in/check-out são cron (P-0.14)                                                                                                                                                                          | `patches/patches-leves.md` |
| P-7.11 | **Patch (substantivo)** | CS-6 (integrations package); tarefas de limpeza dependem de template seed (IDs) — especificar seed dos 2 templates                                                                                                       | `patches/P-7.11.md`        |
| P-7.12 | **Patch (leve)**        | Testes de consentimento e de governança do auxílio                                                                                                                                                                       | `patches/patches-leves.md` |

### Fase 8 — Rádio

| Prompt | Veredito                      | Motivo                                                                                                                                      | Patch                                  |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| P-8.1  | **Executável**                | Escopo reduzido fielmente refletido                                                                                                         | —                                      |
| P-8.2  | **Executável**                | —                                                                                                                                           | —                                      |
| P-8.3  | **Executável**                | Gate do admin fica para o Bloco B                                                                                                           | —                                      |
| P-8.4  | **Patch (leve)**              | Extração de duração de .mp3: indicar lib (`music-metadata`) — executor literal                                                              | `patches/patches-leves.md`             |
| P-8.5  | **Executável**                | —                                                                                                                                           | —                                      |
| P-8.6  | **Patch (leve + D-3)**        | CS-3; `listener_stats` sem semântica de "ouvinte" — aguarda D-3 (§8)                                                                        | `patches/migracoes-numeracao.md` + D-3 |
| P-8.7  | **Patch (leve)**              | CS-3; com decisão B, o SELECT anônimo exige GRANTs para `anon` só nas tabelas públicas da rádio — citar P-0.10                              | `patches/patches-leves.md`             |
| P-8.8  | **Patch (substantivo)**       | PWA background play exige service worker — nenhum arquivo permitido o cobre (só `manifest.ts`); R2: indicar client S3-compatible; CS-1/CS-2 | `patches/P-8.8.md`                     |
| P-8.9  | **Patch (substantivo)**       | CS-7/CS-8; player persistente = shell client no root layout (padrão G5 adaptado a app público); gate super_admin no (admin)                 | `patches/P-8.9.md`                     |
| P-8.10 | **Patch (leve)**              | CS-9: termo de responsabilidade ≠ opt-in de e-mail — checar consentimento de comunicação (P-0.13)                                           | `patches/patches-leves.md`             |
| P-8.11 | **Patch (substantivo + D-3)** | CS-5 (snapshot via P-0.14), CS-6 (via package), semântica de audiência indefinida (D-3)                                                     | `patches/P-8.11.md`                    |
| P-8.12 | **Patch (leve)**              | Teste da semântica de audiência definida em D-3                                                                                             | `patches/patches-leves.md`             |

### Fase 9 — Polimento

| Prompt       | Veredito                | Motivo                                                                                                                                                                                                                             | Patch                            |
| ------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| P-9.1        | **Reescrita**           | O prompt pede para "decidir a postura de conexão" — decisão já tomada (B, Fase 1 Q2) e implementada por P-0.10. Vira verificação: grants ↔ policies, leaks sob conexão authenticated, conflitos de interesse, signed URLs          | `patches/P-9.1.md`               |
| P-9.2        | **Reescrita**           | Fundação LGPD sobe para P-0.13 (decisão Fase 3 Q5); P-9.2 vira: telas "Meus Dados", export, fluxo de exclusão/anonimização fim-a-fim, revisão final. Exclusão real onde a lei exige (decisão F1-Q4 — BRAIN será emendado)          | `patches/P-9.2.md`               |
| P-9.3        | **Patch (leve)**        | CS-3 (número da migration de indexes)                                                                                                                                                                                              | `patches/migracoes-numeracao.md` |
| P-9.4        | **Patch (leve)**        | S1-26: adicionar lista grep-ável de padrões proibidos aos critérios                                                                                                                                                                | `patches/patches-leves.md`       |
| P-9.5        | **Patch (substantivo)** | CI sai (já criado em P-0.9 — F3-10); seed expandido: categoria "Doações" no plano de contas (F1-Q10), designations gestor/autorizador, templates de limpeza dos flats, partições/pg_cron verificados; Inngest em produção (P-0.14) | `patches/P-9.5.md`               |
| P-9.0 (novo) | —                       | Migração de usuários do legado (O-2, confirmado lacuna em F0-Q7) — rascunho na §5                                                                                                                                                  | —                                |

---

## 4. Prompts corretivos propostos (ordem de execução)

Formato compacto (problema → escopo → critérios verificáveis), no padrão dos corretivos existentes. **A ordem abaixo é a ordem sugerida de execução.** Nenhum prompt de feature (P-3.9+) deve rodar antes da Onda 0.

### Onda 0 — estancar (antes de qualquer outra sessão)

**P-0.7 — Resgate do banco (URGENTE — prazo real 2026-08-01)**
_Problema:_ partições de `admin.audit_log` acabam em 2026-08-01 (F3-01); enum `audit_action` sem valores de projetos/financeiro → auditoria dos dois módulos nunca grava (F3-02); banco novo não se reconstrói (F3-06: 0000 duplicada sem FK, 0009*financeiro_rls ordena antes de 0010).
\_Escopo:* migration criando partições mensais até 2027-12 + partição DEFAULT; `pg_cron` mensal para partições futuras (decisão F3-Q1a); `ALTER TYPE admin.audit_action ADD VALUE IF NOT EXISTS` com a lista canônica TS (`admin.ts:44-59` + 20 do financeiro — decisão F3-Q2); eliminar `0000_easy_alex_power.sql` mantendo `0000_initial.sql` (FK users→auth.users), com ajuste de `BASELINE_IDS`/journal e `UPDATE public._migrations`; renomear `0009_financeiro_rls.sql` → `0011_financeiro_rls.sql` (+ UPDATE em `_migrations`).
_Critérios:_ [x] banco efêmero reconstruído do zero pelo runner sem erro; [x] INSERT em audit_log com `created_at` 2026-08-15 e 2027-06-01 funciona; [x] `logProjetosAudit`/`logFinanceiroAudit` gravam de verdade (teste); [x] `pg_cron` job agendado e documentado; [x] lint/typecheck verdes.

**P-0.8 — Kit de backend compartilhado (sessão, audit, notificações)**
_Problema:_ resolução de sessão manual não funciona e existe em 3 cópias (F3-03/F3-08); 4 semânticas de audit; 3 libs de notificação; supabase-js em 2 versões (F3-12); pool por render (F3-14).
_Escopo:_ mover para `@hebron/auth` o `resolveSession`/action-client (padrão documentos, `createSupabaseServerActionClient`); criar `logAudit` único em package (parâmetro de criticidade: módulos de governança **abortam** em falha — decisão F3-Q4); extrair miolo comum de notificações; adotar nos 4 apps apagando as cópias; alinhar `@supabase/supabase-js` em `^2.106.x` via catalog/overrides (+ drizzle e zod por higiene); `convites/page.tsx` usa o singleton `db`; apagar `financeiro-stubs.ts` (F3-17).
_Critérios:_ [x] grep `createClient(url, anonKey, { global: { headers: { cookie` → zero em apps; [x] 1 teste de sessão **sem mock** por app (login real → action gated retorna sucesso); [x] falha simulada de audit aborta mutação no financeiro e em votação; [x] `pnpm ls @supabase/supabase-js` resolve 1 versão; [x] lint/typecheck verdes.

**P-0.9 — CI mínimo**
_Problema:_ `.github/` não existe (F3-10); CLAUDE.md promete CI que não há; os 3 críticos de runtime sobreviveram porque nada roda sistematicamente.
_Escopo:_ `.github/workflows/ci.yml`: `pnpm turbo lint typecheck test` + job que sobe Postgres efêmero e roda o runner de migrations do zero (trava o F3-06 para sempre).
_Critérios:_ [ ] workflow verde em PR; [ ] migration quebrada faz o CI falhar (testado com sabotagem local); [x] documentado no README.

**P-0.10 — Decisão B: RLS ativa (grants + fixes + adoção)**
_Problema:_ decisão do Filipe (Fase 1 Q2) de migrar para `authenticated`+JWT não tem grants (F3-05); policies problemáticas viram exposição real na virada (F3-04 token de convite, F3-15 `WITH CHECK (true)` sem `TO`, F3-18); páginas leem via superuser sem gate (F2-A1/D1/D2/P4).
_Escopo:_ migration de `GRANT USAGE` + grants por tabela alinhados às policies (schemas admin/documentos/projetos/financeiro; `anon` apenas no estritamente público); DROP `invitations_select_by_token`; `TO service_role` em `notifications_insert_service` e `audit_log_insert_service`; corrigir/documentar `users_insert_service`; leituras de páginas passam a usar o client authenticated do kit (P-0.8) — a RLS existente passa a executar de verdade.
_Critérios:_ [x] role `authenticated` consegue exatamente o que as policies permitem (suite de testes RLS existente rodando pelo papel, sem superuser); [x] `anon` não lê nada de admin/projetos/financeiro; [x] convite não é enumerável por token via RLS; [x] as 4 exposições da Fase 2 (A1, D1, D2, P4) têm teste de regressão; [x] lint/typecheck verdes.

**P-0.11 — drizzle-kit reconciliado**
_Problema:_ journal/snapshot só conhecem a 0000; 14 migrations à mão sem verificação de drift (F3-07) — o F3-02 é o acidente que isso produz. Decisão F3-Q7: voltar ao kit.
_Escopo:_ regenerar snapshot a partir do estado real; documentar fluxo (`generate` → revisar SQL → runner aplica); teste de paridade schema TS ↔ banco efêmero migrado; convenção: prompts não citam mais número de migration — citam `drizzle-kit generate`.
_Critérios:_ [x] `drizzle-kit check` limpo; [x] migration nova de teste gerada e aplicada; [x] teste de paridade no CI; [x] README do db atualizado.

### Onda 1 — tornar verdadeiros os módulos "concluídos"

**P-1.25 — Admin: leitura protegida e fiação completa**
_Problema:_ F2-A1 (app inteiro legível por anônimo), F2-A2 (resetPassword no-op), F2-A5 (reuniões com 4 botões mortos), F2-A4 (componentes/forms do Bloco A órfãos — decisão F2-Q6: reconectar).
_Escopo:_ gate super*admin server-side no `(dashboard)/layout.tsx` (+ redirect canônico); `resetPassword` envia e-mail de verdade (`resetPasswordForEmail` ou `generateLink`+Resend com o template existente); reunioes: reconectar `meeting-form` e ligar `createMeeting`/`updateMeeting`; reconectar `user-table` (TanStack) e forms RHF nas telas de usuários/convites; chamar `notifyUserSuspended`/`notifyRoleChanged` nas actions (F2 P-1.10).
\_Critérios:* [x] anônimo em qualquer rota → redirect login (teste); [x] usuário sem papel super_admin → bloqueado (teste); [x] reset de senha recebe e-mail em ambiente de teste; [x] zero componentes de P-1.2/1.4 sem import (grep no critério); [x] botões de reuniões operam; [x] lint/typecheck/testes verdes.

**P-1.26 — Onboarding: convite, auto-signup com aprovação e MFA**
_Problema:_ nenhuma pessoa nova consegue entrar (F2-A3 + O-1); e-mail de convite aponta para rota inexistente; `acceptInvitation` não cria conta nem papéis; MFA "obrigatório" não bloqueia nem tem enrollment (S1-07 — decisão F1-Q5: bloquear com tela de enrollment). Decisão F2-Q2: convite primeiro, sem criação manual.
_Escopo:_ rota `/convite` (intranet): valida token server-side, cria conta Supabase, insere `public.users`, atribui papéis do convite, marca aceito; auto-signup: página de cadastro → seleciona/cria instituição → estado `pending_approval` (modelagem: coluna/status em `public.users` — decidir aqui, não deixar ao executor) → fila de aprovação no Admin (botão `approveUser` volta); MFA: tela de enrollment TOTP no primeiro login de super*admin/diretor + enforcement no middleware (sessão aal1 desses papéis não passa).
\_Critérios:* [x] fluxo convite→conta→papéis→login funciona end-to-end (teste de integração sem mock de sessão); [x] signup→aprovação→login funciona; [x] super_admin sem TOTP é forçado a enrolar antes de qualquer app; [x] consentimento LGPD básico no cadastro (se P-0.13 já rodou, granular); [x] audit em todas as mutações.

**P-1.27 — Documentos: visibilidade e área editorial verdadeiras**
_Problema:_ F2-D1 (anônimo lê `internal` e `restricted` por slug + signed URL), F2-D2 (editorial sem auth), F2-D3 (4 rotas 404), F2-D4 (subscriptions sem UI; notificações sem chamador), F2-D5 (FAQ hardcoded).
_Escopo:_ páginas públicas consultam com o client da sessão (anon vê `public`; autenticado `internal`; `restricted` por papel — a RLS de P-1.19 finalmente executa); `[slug]` filtra visibility; gate editor/super*admin no layout editorial; remover ou criar as 4 rotas da sidebar; UI de assinatura de categorias (reconectar `subscription-form`); `publishDocument` chama `notifyNewDocument`; lembrete de edital → job registrado em P-0.14; FAQ: persistir (campo no edital) ou remover a seção — decidir pela persistência simples (jsonb no edital).
\_Critérios:* [x] anon não vê `internal`/`restricted` nem por slug (teste de regressão); [x] editorial bloqueado sem papel; [x] assinar categoria → publicar doc → e-mail chega (teste); [x] zero rotas 404 na sidebar; [x] zero componentes do Bloco A órfãos.

**P-2.9c — Projetos: operável de ponta a ponta** (nome já acordado — decisão F2-Q3)
_Problema:_ F2-P1 (3/17 actions com UI), F2-P2 (kanban cosmético), F2-P3 (prefill aberto), F2-P4 (score exposto a submissor), F2-P5 (quórum por atribuição), F2-P6 (votação sem encerramento).
_Escopo:_ fiação completa: submeter projeto (botão no rascunho), transições de stage (kanban persiste via `transitionProjectStage` + botões no detalhe), contestação, pânico (UI super*admin), designar avaliador + parecer, CRUD organizações (submissor cria instituição), relatórios (criar/submeter/revisar — reconectar `report-form`); gate de papel na `(diretoria)` (diretor/conselheiro/super_admin); `ScoreIndicator` recebe papel real e as queries mascaram score para submissor; quórum conta **pessoas distintas**; nova action `closeVoting` (super_admin, fechamento manual — decisão F2-Q5) com audit; wizard lê `edital_id`/`tipo`/`categoria` de searchParams e chama `getEditalPrefill` (S1-25); reconectar wizard/forms do Bloco A (decisão F2-Q6).
\_Critérios:* um por fluxo, nomeado ("submissor submete rascunho pela tela X e o stage muda", "drag do kanban persiste e sobrevive a reload", "submissor autenticado em `/pipeline/<id>` não vê score — teste", "votação com quórum é encerrável por super_admin e o resultado aplica transição", etc.); [x] zero componentes do Bloco A órfãos; [x] testes novos cobrem quórum por pessoa e fechamento manual.

**P-3.8b — Financeiro: governança e conciliação verdadeiras**
_Problema:_ F2-F1 (designation não enforçada em nenhuma camada executável — SESSIONS afirmava o contrário), F2-F2 (lote para todos os diretores), F3-11 (linhas adulteráveis pelo cliente; extrato descartado — retenção legal 5 anos, decisão F3-Q6), S1-01 (`organization_budgets` — modelo confirmado F1-Q1).
_Escopo:_ `approveBatch` exige designation gestor; `authorizeBatch` exige designation autorizador + pessoa ≠ aprovador (modelo BRAIN §6.5 — decisão F2-Q4); e-mail de lote → gestor com CC autorizador; `confirmImport` re-parseia server-side (cliente envia arquivo/hash, não linhas) + upload do arquivo original para bucket (P-0.12) com `file_url` real; parser CSV robusto (`;` e vírgula entre aspas — F3-19); criar `financeiro.organization_budgets (organization_id, year, amount)` + UI de gestão no Financeiro + `checkBudget` de Projetos passa a consultá-la (remover workaround `system_settings`).
_Critérios:_ [x] diretor sem designation não aprova (teste); [x] mesma pessoa não aprova e autoriza (teste); [x] linhas adulteradas entre preview e confirm não persistem (teste); [x] extrato armazenado e referenciado; [x] submissão de projeto bloqueia por `organization_budgets` (teste de integração cross-schema); [x] PATCH registrado da mudança de modelo de orçamento (ver SESSIONS S-63 — sem PATCH formal em `PATCHES/`, reconstrução autorizada só em P-0.16).

### Onda 2 — fundações para as fases 4–8

**P-0.12 — Storage: buckets e policies**
_Problema:_ S1-21iii — uploads dependem de buckets manuais/inexistentes; documentos de identidade e extratos são PII/registro contábil sem política.
_Escopo:_ migration/config declarando buckets (`hebron-docs` formalizado, `project-attachments` formalizado, `financeiro-extratos`, `financeiro-recibos`, `flats-documentos`, `plataforma-capas`) com policies de acesso por papel, convenção de signed URL (expiração padrão) e retenção (extratos/recibos: 5 anos).
_Critérios:_ [ ] cada bucket com policy testada (quem pode ler/escrever); [ ] documentado no BRAIN §4.

**P-0.13 — LGPD: fundação**
_Problema:_ S1-03/F3-09 — PII e dado sensível sem consentimento modelado; audit imutável guarda PII em diff; imutabilidade × direito de exclusão sem resolução (decisão F1-Q4: cumprir a lei; decisão F3-Q5: fundação antes dos módulos que coletam mais PII).
_Escopo:_ tabela `public.consents` (finalidade granular: comunicação, newsletter, dados de reserva, dado de saúde); política de PII em audit diffs (campos sensíveis fora do diff ou referenciados); fluxo de anonimização de usuário (apaga PII, preserva registros contábeis/deliberativos com pseudônimo); retenção de `documentos.views` (F3-21); emenda ao BRAIN §9 (exclusão real onde a lei exige).
_Critérios:_ [ ] consentimento consultável por finalidade; [ ] anonimizar usuário de teste remove PII de users/orgs/audit diffs e mantém FKs; [ ] BRAIN emendado; [ ] testes.

**P-0.14 — Jobs: Inngest de verdade**
_Problema:_ S1-06 — 8+ features dependem de jobs sem infra; critérios [~] acumulados nunca fecharão.
_Escopo:_ `packages/jobs` (client Inngest) + rota de serve num app host (intranet); registrar os crons pendentes das fases 1–3: reunião mensal (S-15), lembrete de edital 7 dias (S-30), homologação 7 dias sem contestação (P-2.8), lembretes de relatório (P-2.10 [~]), lote semanal + relatório mensal do financeiro (P-3.10); deixar registro documentado para os jobs das fases 4–8 (recorrência de tarefas, briefing, prazos, check-in, snapshot de audiência).
_Critérios:_ [ ] cada cron listado dispara em ambiente de dev (teste manual documentado); [ ] os critérios [~] de P-2.10 fecham; [ ] env vars documentadas.

**P-0.15 — `packages/integrations` + contrato de settings**
_Problema:_ S1-09 (contrato cross-app indefinido; `createAutoTask` num app seria importado por outros apps), S1-18 (consumo de settings/flags sem contrato), S1-22 (erro fire-and-forget como convenção).
_Escopo:_ criar `packages/integrations` com as funções cross-app tipadas (mover `getEditalPrefill`, `getProjectParticipationScore` — renomeando o arquivo enganoso —, stubs existentes; `createAutoTask` nascerá aqui na Fase 4); helper de consumo de `system_settings`/feature flags em `packages/db` (com cache curto); padrão de erro registrado no BRAIN: mutação crítica nunca fire-and-forget; integração de leitura pode degradar com log estruturado.
_Critérios:_ [ ] zero imports app→app (verificação no CI); [ ] Projetos/Documentos consomem o package; [ ] BRAIN §7 atualizado com o mecanismo real.

**P-0.16 — Registro retroativo (PATCHES, SESSIONS, BRAIN, PROMPTS)**
_Problema:_ S1-15 (6 anomalias no SESSIONS), S1-16 (PATCHES/ vazio — reconstrução autorizada F0-Q4), S1-26 (higiene), decisões desta auditoria sem registro formal.
_Escopo:_ PATCHes retroativos (tipografia, escopo Rádio, remoções v1) + PATCHes novos (decisão B; MFA bloqueante; exclusão LGPD; fechamento manual de votação; doações=despesa categorizada; modelo organization*budgets; quizzes/certificado-hash/notas mantidos; workspaces custom/colunas custom/checklist inventário descartados; embeddings promovido a v1); entrada retificadora única no SESSIONS (índice S-21, P-1.12b sem número, S-45, P-1.21, P-1.19/P-2.12, P-2.11); PROMPTS.md: cabeçalho "3 correções"→lista real; PRODUCT.md: 2 linhas (produto público; regra NT/Salmos inexistente).
\_Critérios:* [ ] 1 arquivo por PATCH em `PATCHES/`; [ ] SESSIONS com entrada retificadora; [ ] BRAIN sem as contradições apontadas em S1-12/S1-13.

**Pode rodar em paralelo a qualquer momento após a Onda 0.**

---

## 5. Novos prompts de feature (decorrentes de decisões das Fases 1–3)

| ID                                                             | Conteúdo                                                                                                                                                                   | Quando                                     | Depende de  |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------- |
| **P-2.13 — IA: detecção de renovação**                         | Ao iniciar wizard, detectar projetos anteriores da mesma organização e oferecer auto-preenchimento (BRAIN §6.2/§8; decisão F1-Q3)                                          | Após P-2.9c, antes ou em paralelo à Fase 4 | P-2.9c      |
| **P-2.14 — IA: detecção de duplicidade (embeddings/pgvector)** | Embedding da versão compacta, alerta de similaridade na triagem; extensão pgvector; emenda §8 (promovido a v1 — decisão F1-Q3)                                             | Flexível; sugerido junto a P-2.13          | P-2.9c      |
| **P-5.13 — Calendário Google**                                 | Integração do calendário compartilhado (BRAIN §6.6; decisão F1-Q6: v1). **Aguarda D-2** (modelo de integração)                                                             | Fase 5, após P-5.9                         | D-2, P-0.14 |
| **P-7.13 — IA: assistência de scoring de flats**               | Sugestão de pontuação para critérios subjetivos (e, g) com confirmação do gestor — nunca decide sozinha (BRAIN §8; decisão F1-Q3)                                          | Fase 7, após P-7.8                         | P-7.8       |
| **P-9.0 — Migração de usuários do legado**                     | Import dos ~150 usuários (contas, papéis, instituições), com convite/ativação em massa respeitando o fluxo de onboarding; plano de rollback (O-2; lacuna confirmada F0-Q7) | Antes de P-9.5 (go-live depende disto)     | P-1.26      |

Não proposto (aguarda resposta — §8, D-7): sugestão de avaliador por afinidade (O-6) e templates de e-mail com IA (O-13).

---

## 6. Decisões tomadas por delegação (F1-Q8 — "o que você julga necessário manter ou descartar?")

Registradas aqui como **D-5** (conjunto); entram no BRAIN via P-0.16. Racional aplicado: manter o que agrega valor real com modelagem isolada; descartar o que contradiz regra do BRAIN ou cria superfície de complexidade sem pedido.

| Item (origem)                                                  | Decisão proposta                                                                                                                                                                                          | Racional                                                                                                                                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quizzes (P-6.1–6.8; N-2)                                       | **Manter** — com semântica definida: quiz é tipo de aula; conclui com attempt ≥ passing_score; tentativas ilimitadas; certificado continua = 100% da trilha (BRAIN §6.3 intacto na regra de certificação) | Valor pedagógico real num LMS; já permeia 8 prompts (remover custa mais); a semântica definida elimina a ambiguidade que era o risco                                                                |
| Certificado com hash público (N-3)                             | **Manter**                                                                                                                                                                                                | Anti-fraude barato: 1 coluna + 1 rota de verificação                                                                                                                                                |
| NoteWidget/notas em timestamp (N-1)                            | **Manter**                                                                                                                                                                                                | Tabela isolada (`notes`), sem acoplamento; valor direto ao aluno                                                                                                                                    |
| Workspaces "6 fixos **+ custom**" (N-4, P-4.6)                 | **Descartar o custom**                                                                                                                                                                                    | BRAIN §6.9 é explícito ("workspaces fixos"); custom exigiria modelo de membership/acesso que nenhum prompt cria — é exatamente a lacuna que gerou a frase órfã "workspaces que tem acesso" em P-4.7 |
| Colunas customizáveis por workspace (N-5, P-4.3)               | **Descartar**                                                                                                                                                                                             | Conflita com o enum fixo de 4 status de P-4.1; tela citada sem arquivo permitido (CS-10); kanban fixo é mais simples para o público-alvo                                                            |
| Checklist de inventário no check-in (N-6, P-7.4/7.8)           | **Descartar (v2)**                                                                                                                                                                                        | BRAIN §6.8: check-in presencial na recepção; o sistema registra a transição de status + timestamp (necessário para usage_history e limpeza), sem checklist                                          |
| Fluxo de caixa projetado 30/60/90 (N-7, P-3.2/3.3)             | **Manter**                                                                                                                                                                                                | Já implementado no Bloco A do Financeiro (componente vivo); telas entram no P-3.9 por decisão F1-Q9                                                                                                 |
| SEO/OG no portal de documentos (N-8)                           | **Manter**                                                                                                                                                                                                | Portal público; já feito; sem custo                                                                                                                                                                 |
| Bibliotecas de PDF/XLSX (**D-6**, decisão técnica tomada aqui) | `@react-pdf/renderer` (PDF: certificados, relatório mensal) + `exceljs` (XLSX) — registrar em SESSIONS na primeira utilização                                                                             | Precisa ser uma decisão única; ambas maduras e compatíveis com o stack                                                                                                                              |

---

## 7. Critérios de aceite — verificação (item 4 da fase)

- **Regra geral:** os prompts pendentes têm critérios verificáveis (checkbox + lint/typecheck). A exceção sistemática é a classe P-X.9: "substituir mocks" é verificável mas **não captura a intenção** (operabilidade) — a Fase 2 provou que esse critério passa com produto inoperante (PD-1). Os patches dos P-X.9 substituem por critérios fluxo-a-fluxo.
- **Critérios inexecutáveis hoje:** P-4.8 ("job Inngest") e P-8.11 ("via Inngest") dependem de P-0.14; P-3.10 (agendamentos) idem. Com a Onda 2 executada, ficam executáveis.
- **Critérios sem definição de medida:** P-8.11 "KPI de audiência disponível" (aguarda D-3); P-9.4 subjetivo (patch adiciona greps); P-6.7 "aula locked não visível" (patch especifica o mecanismo).
- **Critérios ausentes:** P-4.3 config de workspace (resolvido por remoção); P-6.3 editores do instrutor (patch adiciona arquivos + critérios).
- **Todos os corretivos propostos (§4) e novos prompts (§5) incluem critérios verificáveis**, com preferência por teste automatizado onde a Fase 2 encontrou divergência declaração×código (gates, mascaramento, governança).

---

## 8. Perguntas para o Filipe (Fase 4)

1. **(D-1 — editor rich text)** Tarefas (descrição), Intranet (anúncio/decisão) e Plataforma (aula/curso) pedem "rich text" e nenhuma spec define o editor. Proposta: **um** componente compartilhado em `packages/ui`. Opções: **(a) TipTap com toolbar mínima** (negrito, itálico, lista, link — WYSIWYG, mais amigável para público em transição tecnológica — **recomendo**) ou (b) markdown com preview (mais simples de manter, pior para leigos). Qual?

R. Vou seguir a sua recomendação. Pode seguir com o (a) TipTap com toolbar mínima.

2. **(D-2 — Google Calendar, P-5.13)** Qual modelo de integração? **(a) Feed ICS publicado pelo sistema** (reuniões/eventos viram um calendário que qualquer um assina no Google — zero OAuth, unidirecional, **recomendo para v1**); (b) conta de serviço do Google Workspace escrevendo num calendário compartilhado (bidirecional, exige Workspace e chave de serviço); (c) OAuth por usuário (mais rico e mais caro — não recomendo na v1). A ONG usa Google Workspace?

R. Vou seguir a sua recomendação com (a) Feed ICS publicado pelo sistema. A minha associação usa o Google Workspace.

3. **(D-3 — audiência da Rádio, P-8.6/P-8.11)** O que conta como "ouvinte"? Proposta **(a) — recomendo:** o player manda heartbeat a cada 60s enquanto toca; audiência = sessões únicas/dia + horas ouvidas (métrica honesta e barata). Alternativas: (b) plays iniciados (infla), (c) page views (não mede escuta).

R. Sigo a sua recomendação com (a) o player manda heartbeat a cada 60s enquanto toca.

4. **(D-4 — governança do auxílio dos Flats)** As despesas criadas pela ajuda de custo aprovada (BRAIN §6.8) entram na **governança dual normal** (nascem não aprovadas → lote semanal → gestor aprova → autorizador autoriza), como os pagamentos de projetos? **Recomendo que sim** — a aprovação do auxílio pelo gestor de flats é decisão de mérito, não autorização financeira. Confirma?

R. Você está correto. Segue a governança dual normal.

5. **(D-5 — itens delegados)** A §6 registra minhas decisões de manter/descartar (quizzes com semântica definida, hash, notas ✓; workspaces custom, colunas custom, checklist de inventário ✗). Algum veto antes de eu propor as emendas do BRAIN em P-0.16?

R. Não, nenhum veto.

6. **(D-7 — dois órfãos ainda sem dono)** (i) Sugestão de avaliador por afinidade (O-6, BRAIN §6.2): **recomendo v1.x** (pós-go-live — a designação manual funciona e o volume é baixo); criar prompt agora ou registrar como v1.x no §8? (ii) Templates de e-mail editáveis **com IA** (O-13, §8): manter no §8 e criar prompt pequeno, ou remover do §8?

R. Sigo a sua recomendação aqui.

7. **(Sequência)** A ordem da §4/§9 coloca 5 corretivos de fundação (Onda 0) antes de qualquer feature, com P-0.7 **urgente por prazo real (partições acabam em 2026-08-01)**. Confirma que a retomada segue essa ordem, com P-3.9 patcheado rodando só depois das Ondas 0–1?

R. Confirmo!

---

## 9. Ordem de retomada consolidada

```
ONDA 0 (bloqueante, sequencial):
  P-0.7 (URGENTE, prazo 2026-08-01) → P-0.8 → P-0.9 → P-0.10 → P-0.11

ONDA 1 (módulos concluídos ficam verdadeiros):
  P-0.12 (Storage) → P-1.25 → P-1.26 → P-1.27 → P-2.9c → P-3.8b

ONDA 2 (fundações; P-0.16 pode ser paralelo desde o fim da Onda 0):
  P-0.13 (LGPD) → P-0.14 (Jobs) → P-0.15 (integrations) → P-0.16 (registro)

RETOMADA DO PLANO (com patches aplicados):
  P-3.9 → P-3.10 → P-3.11 → P-3.12
  [P-2.13, P-2.14 — flexível, antes ou em paralelo à Fase 4]
  Fase 4 (P-4.1–4.12) → Fase 5 (P-5.1–5.12 + P-5.13*) → Fase 6 → Fase 7 (+P-7.13) → Fase 8
  P-9.0 → P-9.1 → P-9.2 → P-9.3 → P-9.4 → P-9.5

  * P-5.13 aguarda D-2; D-1 precisa estar decidida antes de P-4.4; D-3 antes de P-8.6.
```

Justificativa da ordem: P-0.7 tem prazo físico; P-0.8/P-0.10 são pré-requisito de **qualquer** action/página nova funcionar (sem eles, P-3.9 integraria UI a actions que negam todo mundo); P-0.9 trava regressões antes do volume de correções; a Onda 1 vem antes da retomada porque P-3.9–P-3.12 e as fases 4–8 consomem onboarding (usuários reais), integrações e governança que hoje não operam; P-0.13 precede as fases que coletam mais PII (6–7); P-0.14 precede P-3.10 e P-4.8, os primeiros prompts com cron/job em critério de aceite.

---

_Fase 4 concluída. Próxima: **FASE 5 — Relatório consolidado** (`AUDIT/RELATORIO.md`), em sessão nova, consolidando S1-\*, F2-\*, F3-\*, os vereditos e a ordem desta fase, mais o veredito de prontidão._
