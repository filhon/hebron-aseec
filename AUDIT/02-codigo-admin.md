# AUDIT/02 — Verificação spec ↔ código — Admin (P-1.1 a P-1.12, P-1.12b + trabalho fora de fluxo)

**Fase:** 2 · **Data:** 2026-07-02 · **Auditor:** agente Fable 5

## Tabela de veredictos

| Prompt | Veredito | Evidência-chave |
| --- | --- | --- |
| P-1.1 Tipos Admin | **Implementado fiel** | `packages/types/src/admin/`, `packages/validators/src/admin/` existem; mock removido em P-1.9; typecheck verde |
| P-1.2 Componentes | **Implementado; hoje majoritariamente código morto** | `role-badge`, `status-badge`, `user-card`, `invitation-card`, `feature-flag-toggle`, `user-table` (TanStack), `audit-log-table`: **zero imports** em qualquer página (grep de imports nesta sessão). P-1.9 reescreveu as telas com markup inline e abandonou os componentes sem registro |
| P-1.3 Páginas | **Implementado fiel** (substituído em P-1.9) | 7 páginas existem em `(dashboard)/` |
| P-1.4 Formulários | **Implementado; hoje código morto** | `user-form`, `invitation-form`, `role-assignment-form`, `designation-form`, `meeting-form`: zero imports. Único vivo: `email-template-editor`. As telas reais usam `<form method="GET/POST">` + actions inline — **React Hook Form + Zod (stack obrigatória do CLAUDE.md) não é usado em nenhuma tela admin em produção** |
| P-1.5 Estados | **Parcialmente vivo** | `dashboard-skeleton`, `user-table-skeleton`, `audit-log-skeleton` do admin: zero imports (as páginas RSC de P-1.9 não têm `loading.tsx` nem Suspense com esses skeletons) |
| P-1.6 Schema admin | **Implementado fiel** | `0002_admin.sql` com particionamento de audit_log e 6 tabelas; partições futuras dependem de job inexistente (débito S-13 aberto — Inngest, ver S1-06) |
| P-1.7 RLS admin | **Implementado fiel** (ressalva) | `0003_admin_rls.sql:13–31` endurece audit_log e invitations conforme prompt; ressalva herdada: `audit_log_insert_service WITH CHECK (true)` (`0002:197–199`) sem `TO service_role` |
| P-1.8 Server Actions | **Implementado com desvio** | 6 arquivos existem, todos gated por `adminAction` (super_admin — `lib/safe-action.ts:43–53`) e com audit (`lib/audit.ts:31–59` inclui `_impersonatedId`). Desvios: ver F2-A2 (resetPassword no-op) e F2-A3 (aceitação de convite não cria usuário) |
| P-1.9 Integração | **Implementado com desvio grave não documentado** | Telas RSC com dados reais e mock removido (✓), **mas nenhuma proteção de leitura**: ver F2-A1 (CRÍTICO) |
| P-1.10 Notificações | **Parcialmente implementado** | 3 templates existem; `notifyUserSuspended`/`notifyRoleChanged` **nunca chamadas** por nenhuma action (grep: só definição + `notifyInvitationAccepted` é usada em `invitations.ts:216`). Critérios "usuário suspenso (in_app)" e "papel alterado (in_app)" marcados [x] sem correspondência no código. Débito registrado em S-17 e nunca liquidado |
| P-1.11 Impersonation | **Implementado fiel** | `actions/impersonation.ts:19–51` RBAC manual super_admin; banner no layout (`(dashboard)/layout.tsx:42–49`); audit com start/stop/duração (testes cobrem); filtros+export CSV vivos (`auditoria/page.tsx` importa ambos) |
| P-1.12 Testes | **Implementado com desvio** | 4 suítes reais contra banco (45+ testes; RLS por papel, conflito, impersonação, audit). **Desvio:** o teste "fluxo completo" de convite (`actions.test.ts:246–277`) valida apenas aceite+audit; o critério "convite → aceitação → **usuário ativo** end-to-end" não é testado porque o fluxo não existe (F2-A3) |
| P-1.12b Reconciliação DS | **Implementado fiel** (ressalva de grep) | `admin.css` esvaziado — só topbar/animações com tokens (`admin.css:1–49`); ressalva: o critério de grep foi satisfeito com padrões minúsculos; hex de marca em MAIÚSCULAS permanece em `email-template-preview.tsx:41–44` e nos defaults de e-mail de `templates-email/page.tsx:175–316` (defensável para HTML de e-mail, mas o critério literal não passa hoje) |
| AdminShell (`4db663a`, fora de fluxo) | **Implementado; sem spec** | `components/admin-shell.tsx` substituiu o layout de AppShell; usado pelo layout. Sem sessão/prompt; auditado como parte do módulo |

## Achados detalhados

### F2-A1 (CRÍTICO) — App Admin inteiro sem proteção de leitura
Não existe `apps/admin/src/middleware.ts` (verificado). `(dashboard)/layout.tsx:13–53` não chama nenhum `getUser`/verificação de papel — apenas lê cookie de impersonação e consulta contadores. Nenhuma página (`usuarios/page.tsx`, `auditoria/page.tsx`, `configuracoes/page.tsx`, `reunioes/page.tsx`, `convites/page.tsx`) faz verificação de sessão para **leitura** (grep por `getUser|getAuthUser|redirect` nas páginas: só redirects de feedback de formulário; única checagem de auth do app fora das actions é a save-action inline de `templates-email/page.tsx:391+`). Todas as queries usam `db` = conexão `DATABASE_URL` superuser (`@hebron/db/client`), que bypassa RLS.

**Cenário concreto:** qualquer pessoa (nem login é preciso) que acesse `admin.hebronaseec.com.br/usuarios` recebe nome, e-mail, papéis e status de todos os ~150 usuários; `/usuarios/[id]` expõe telefone e CPF; `/auditoria` expõe o audit log completo; `/convites` expõe convites pendentes. Das três camadas do BRAIN §3, **zero** operam na leitura deste app (mutações têm a camada 2). Combina com S1-02/S1-08 da Fase 1, mas é pior do que o especulado lá: não há sequer exigência de sessão.

### F2-A2 (ALTO) — `resetPassword` é um no-op para o usuário
`actions/users.ts:254–259`: chama `supabase.auth.admin.generateLink({ type: "recovery" })` e **descarta o retorno**. `generateLink` só gera o link — não envia e-mail (quem envia é `resetPasswordForEmail`). O template `PasswordResetEmail` (P-1.10) nunca é importado por nenhuma action (grep: só definição e preview). Resultado: o botão "reset de senha" registra audit e retorna sucesso, mas o usuário não recebe nada. Critério P-1.8 "reset de senha" marcado [x].

### F2-A3 (CRÍTICO, compartilhado com S1-05) — Fluxo de convite não produz usuário
`actions/invitations.ts:59` monta `inviteUrl = {app}/convite?token=...`; **não existe rota `/convite`** em nenhum app (grep global; a intranet só tem `/login`). `acceptInvitation` (`invitations.ts:142–227`) marca o convite aceito, envia boas-vindas e notifica o admin — **não cria conta no Auth, não insere em `public.users`, não atribui os papéis do convite**. O e-mail de convite aponta para um 404 e, mesmo que a action fosse chamada, o convidado terminaria sem conta e sem papéis. O teste "fluxo completo" (P-1.12) não detecta porque só asserta aceite+audit. Isso fecha o circuito com o órfão O-1: **não existe nenhum caminho funcional para uma pessoa nova entrar no sistema** (nem auto-signup, nem convite).

### F2-A4 (ALTO) — Bloco A abandonado silenciosamente (padrão)
P-1.2/P-1.4/P-1.5 produziram 15 componentes; 12 estão mortos (lista na tabela). O P-1.9 (S-16) registrou a decisão de usar actions inline e estado por URL, mas **não registrou** que isso órfãos os componentes do Bloco A — inclusive os que materializavam requisitos de stack (TanStack Table para tabelas, RHF+Zod para formulários). Consequências práticas: a UI validada pelo Filipe no Bloco A (com UserTable, forms com validação client-side) **não é** a UI que está em produção; paginação/ordenação prometidas no P-1.2 vivem só no componente morto.

### F2-A5 (MÉDIO) — Botões mortos remanescentes em reuniões
`reunioes/page.tsx:120–250`: "Nova reunião", "Ver pauta", "Convocar", "Editar pauta" são `type="button"` sem handler (débito S-16 aberto). `meeting-form.tsx` (P-1.4) que faria isso está morto. As actions `createMeeting`/`updateMeeting`/`autoCreateMonthlyMeetings` existem (`actions/meetings.ts:132+`) e **nenhuma é alcançável pela UI**; `autoCreateMonthlyMeetings` também não tem cron (S1-06).

### F2-A6 (MÉDIO) — `approveUser` existe, botão não
`actions/users.ts:274–300` implementa aprovação via `email_confirm: true`; S-16 omitiu o botão porque `pending_approval` não é derivável do schema. Estado inalterado desde então — coerente com a lacuna O-1.

### Verificações que passaram
- Conflito de interesse bidirecional correto (`actions/roles.ts:17–47`), com teste.
- Audit em toda mutação com `_impersonatedId` quando impersonando (`lib/audit.ts:33–48`) — implementação acima do especificado.
- Impersonação: cookie legível cross-app, banner sempre visível, stop action, tudo testado (`impersonation.test.ts`).
- Governança do gate: todas as actions de mutação passam por `adminAction` (super_admin) — camada 2 sólida nas mutações.
