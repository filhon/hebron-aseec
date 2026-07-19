# LGPD — Inventário de Dados Pessoais (varredura final)

> **Origem:** P-9.2 (LGPD Audit). Varredura final exigida pelo prompt:
> inventário de todos os dados pessoais × base legal × acesso restrito ×
> retenção configurada. Complementa a fundação de P-0.13 (consentimento,
> anonimização, redação de PII em audit, retenção de dado comportamental) e
> as superfícies de titular criadas em P-9.2 ("Meus Dados").
>
> **Convenção:** base legal pela LGPD (Lei 13.709/2018). "Acesso" descreve a
> policy de RLS ativa (decisão B, P-0.10). "Exclusão" = anonimização de campo
> via `anonymizeUser` (BRAIN §9), nunca hard delete de linha.

## 1. Identificação do titular (`public`)

| Dado                                | Local                           | Base legal                                                                  | Acesso restrito                                           | Retenção                                                                                            |
| ----------------------------------- | ------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Nome, e-mail, telefone, CPF, avatar | `public.users`                  | Execução de contrato (gestão da conta) + consentimento do cadastro (opt-in) | `users_select_own` + super_admin/diretor                  | Enquanto a conta existir; anonimizado no pedido de exclusão (`anonymizeUser`)                       |
| Consentimentos por finalidade       | `public.consents`               | Art. 8 (registro do consentimento)                                          | `consents_select_own` + admin leitura                     | Permanente (histórico de quando o consentimento existiu; revogação é `granted=false`, nunca DELETE) |
| Pedido de exclusão                  | `public.data_deletion_requests` | Art. 18 (registro do exercício do direito)                                  | `data_deletion_requests_select_own` + super_admin resolve | Permanente (imutável, sem policy de DELETE)                                                         |

## 2. Flats — dados sensíveis (`flats`)

| Dado                                                                  | Local                                                                | Base legal                                                                                                                                          | Acesso restrito                                              | Retenção                                                  |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| Nome, CPF, e-mail, telefone, nascimento (responsável + acompanhantes) | `flats.guests`                                                       | Consentimento específico destacado **`dados_reserva`** (opt-in) + execução da reserva                                                               | `0022_flats_rls` (dono ou gestor/super_admin)                | Enquanto a reserva/histórico for necessário; anonimização |
| **Saúde autodeclarada** (sim/não)                                     | `flats.scoring_responses.health_self_declared`                       | Consentimento **específico e destacado `dado_saude`** (art. 11 — dado sensível). Sem consentimento, o campo é zerado no servidor, nunca só ocultado | RLS de `scoring_responses`                                   | Idem reserva; anonimização                                |
| Documentos de identidade                                              | `flats.document_files` + Storage `flats-documentos` (bucket privado) | Execução da reserva                                                                                                                                 | `flats_documentos_select_own_or_staff`; URLs assinadas de 1h | Idem reserva                                              |

> **Nota de coleta (verificado):** o wizard de reserva (`reservation-wizard-steps/step-consent.tsx`) apresenta os três consentimentos como toggles **opt-in** (default desmarcado); `dado_saude` é destacado e, sem ele, `createReservation` zera a resposta de saúde no servidor (`loadReservationConsents`).

## 3. Dado comportamental e de audiência

| Dado                                             | Local                       | Base legal                               | Acesso restrito                      | Retenção                                                                                                                                                        |
| ------------------------------------------------ | --------------------------- | ---------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visualizações de documento (usuário + timestamp) | `documentos.views`          | Legítimo interesse (métricas editoriais) | RLS de `views`                       | **Automática:** linhas individuais > 6 meses apagadas por `documentos.purge_old_views()` (pg_cron mensal); só o agregado mensal (`views_monthly_agg`) permanece |
| Assinaturas de categoria                         | `documentos.subscriptions`  | Consentimento / legítimo interesse       | `subscriptions` own                  | Enquanto a assinatura existir                                                                                                                                   |
| Heartbeats de ouvinte                            | `radio.listener_heartbeats` | Legítimo interesse (audiência agregada)  | `0054_radio_listener_heartbeats_rls` | Efêmero; consolidado em `radio.listener_stats`                                                                                                                  |
| Aceite de termo (material exclusivo)             | `radio.term_acceptances`    | Execução / consentimento                 | RLS de `term_acceptances`            | Permanente (prova de aceite)                                                                                                                                    |

## 4. Vínculos institucionais e contábeis (preservados pseudonimizados)

Registros que **permanecem íntegros e auditáveis mesmo após a exclusão do
titular** — a FK ao usuário é mantida, e a identidade vira pseudônimo
(`anonymizeUser`). Cumpre a obrigação legal de retenção contábil/deliberativa
sem manter o titular identificável (BRAIN §9, decisão F1-Q4).

| Registro                                   | Local                                                             | Base legal                                   | Retenção                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Lançamentos, contas, orçamentos            | `financeiro.transactions` / `accounts` / `budgets` (`created_by`) | Obrigação legal (contábil/fiscal)            | Preservado; `transactions` é imutável por trigger; dono pseudonimizado na exclusão |
| Votos, pareceres, contestações, relatórios | `projetos.votes` / `evaluations` / `contestations` / `reports`    | Legítimo interesse (governança deliberativa) | Preservado; autor pseudonimizado na exclusão                                       |
| Responsável legal de organização criada    | `projetos.organizations.responsavel_legal`                        | Legítimo interesse                           | Pseudonimizado por `anonymizeUser`; dados da PJ (CNPJ, endereço) não são tocados   |

## 5. Auditoria e mecanismos transversais

| Mecanismo                                        | Local                                                                                 | Função LGPD                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Redação de PII em diffs                          | `admin.audit_log` via `computeDiff`/`logAudit` (`SENSITIVE_AUDIT_FIELDS`)             | O log imutável (particionado até 2027) registra que o campo mudou, nunca o valor antes/depois                       |
| **Log de acesso a PII (novo, P-9.2)**            | `admin.audit_log` ação `pii.accessed` via `logPiiAccess` (`@hebron/auth/data-export`) | Registra leitura de CPF/documentos de terceiros por admin (ator, sujeito, campos, contexto) sem gravar o valor lido |
| Anonimização (direito de exclusão)               | `anonymizeUser` (`@hebron/db/anonymization`), acionado por `executeDataDeletion`      | Substitui PII por pseudônimo determinístico; grava `user.anonymized`                                                |
| Superfície de titular "Meus Dados" (novo, P-9.2) | `@hebron/ui#MyDataPage` montada em cada app                                           | Visualização, revogação de consentimento, portabilidade (JSON/CSV), pedido de exclusão                              |

## 6. Achados e débitos da varredura

1. **Wiring do `logPiiAccess` (débito registrado):** a primitiva e o teste
   foram entregues em P-9.2, mas a chamada nas telas de leitura de PII de
   terceiros (gestor de flats vendo CPF/documentos do hóspede em
   `apps/flats/src/lib/queries.ts`; detalhe de usuário no `admin`) está fora
   dos arquivos permitidos deste prompt. Instrumentar esses pontos de leitura
   é um corretivo dedicado (ver SESSIONS.md).
2. **Retenção de PII de flats:** hoje a remoção de nome/CPF/documentos do
   hóspede depende do pedido de exclusão do titular (on-request). Uma política
   de retenção automática por prazo (análoga a `purge_old_views`) pode ser
   avaliada num prompt futuro.
3. **"Meus Dados" por papel:** montada no grupo autenticado primário de cada
   app; em apps multi-papel (projetos, flats, plataforma) a superfície fica no
   grupo do usuário-titular principal. Uma área de conta única cross-papel é
   refinamento futuro.
