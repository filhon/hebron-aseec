# AUDIT/02 — Verificação spec ↔ código — Fundação (P-0.1 a P-0.6 + corretivos)

**Fase:** 2 · **Data:** 2026-07-02 · **Auditor:** agente Fable 5 (read-only fora de `AUDIT/`)
**Método:** triangulação prompt (PROMPTS.md) × testemunho (SESSIONS.md) × código lido. Evidência sempre com arquivo:linha.
**Estado global verificado hoje:** `pnpm turbo lint typecheck` → **34/34 tasks verdes** (executado nesta sessão). Os critérios "lint passa / types passam" de todos os prompts valem para o estado atual do repo.

## Tabela de veredictos

| Prompt | Veredito | Evidência-chave |
| --- | --- | --- |
| P-0.1 Monorepo | **Implementado fiel** | Estrutura 9 apps + 8 packages + 2 tooling confirmada no filesystem; `turbo.json`, `pnpm-workspace.yaml`, tooling configs presentes; lint/typecheck 34/34 |
| P-0.2 Design System Base | **Implementado com desvio (documentado e corrigido)** | Tipografia errada corrigida via P-0.2b; **Drawer e Tooltip do escopo nunca criados** — débito S-3 jamais liquidado (não existem `drawer.tsx`/`tooltip.tsx` em `packages/ui/src/components/`) |
| P-0.2b Unificação DS | **Implementado fiel** | `packages/ui/src/tokens.css` com vocabulário `--hb-*` + bloco DEPRECATED (linhas 214–240); `patterns.css` com **zero hex** (grep vazio); único hex em componentes é o `impersonation-banner.tsx:71–162`, intencional e registrado (S-20) |
| P-0.3 Supabase Setup | **Implementado fiel** (1 ressalva de RLS) | `schema/public.ts:37–103` (users, role_assignments, designations, notifications); `0000_initial.sql:135–143` `has_role` SECURITY DEFINER; **ressalva:** `notifications_insert_service` com `WITH CHECK (true)` sem `TO service_role` (`0000_initial.sql:202–204`) — qualquer autenticado insere notificação para qualquer usuário no canal direto |
| P-0.3b Pipeline Migrations | **Implementado fiel na entrega; contrato quebrado depois** | `migrate.ts:24–30` baseline 0000–0003; `:62–64` aplica em ordem alfabética, idempotente. Porém o diretório atual viola o contrato: `0009_financeiro_rls.sql` ordena **antes** de `0010_financeiro.sql` que cria as tabelas que ela altera — banco novo não é reconstituível (fato já apontado em S1-04; confirmado no código do runner) |
| P-0.4 Auth e SSO | **Parcialmente implementado** | Login senha+magic link e SSO cookies OK (`apps/intranet/src/middleware.ts:38–76`, `login-form.tsx:84–121`); **"MFA TOTP obrigatório" não existe**: challenge só ocorre se o usuário já tem TOTP enrolado (`login-form.tsx:108`); sem enrollment UI, sem enforcement por papel (débito S-5 aberto; confirma S1-07). Critério "MFA obrigatório para super_admin/diretor" marcado [x] no PROMPTS não corresponde ao código |
| P-0.5 AppShell | **Implementado fiel** | 7 componentes existem; `empty-state.tsx:21–68` aceita prop `quote` com citação bíblica e default |
| P-0.6 Notificações | **Implementado fiel** (mesma ressalva de RLS) | `notifications.ts` schema expandido; `packages/email/src/lib/send.ts:96–150` `createNotification` com insert injetado + Resend; bell/center existem em `packages/ui` |

## Achados detalhados

### F2-F1 (MÉDIO) — `WITH CHECK (true)` sem restrição de role em tabelas de escrita "service"
`0000_initial.sql:202–204` (`notifications_insert_service`) e `0002_admin.sql:197–199` (`audit_log_insert_service`) criam policies de INSERT com `WITH CHECK (true)` **sem cláusula `TO service_role`** — aplicam-se a `authenticated`/`anon`. Pelo canal direto (PostgREST/supabase-js com anon key), qualquer usuário autenticado pode inserir notificações em nome do sistema para qualquer usuário (vetor de phishing interno) e inserir entradas no audit_log (poluição de trilha). O débito do audit_log foi registrado (S-14, "hardening pendente para bloco B") e nunca liquidado; o de notifications nunca foi registrado.

### F2-F2 (MÉDIO) — Runner de migrations não reconstitui o banco
Confirmado no código: `migrate.ts:62–64` ordena alfabeticamente e aplica tudo que não está em `_migrations`. Com `0009_financeiro_rls` < `0010_financeiro`, uma aplicação do zero falha. Adicionalmente `packages/db/src/client.ts:3` ainda importa apenas `./schema/public` — o débito S-7 ("client não tem acesso tipado ao schema completo") nunca foi liquidado; os apps contornam importando `@hebron/db/schema` diretamente.

### F2-F3 (BAIXO) — Débitos de fundação com dono inexistente
- Drawer/Tooltip (escopo P-0.2, débito S-3): nenhum prompt posterior os criou; `dialog.tsx` cobre o caso do drawer mobile.
- `packages/config` segue stub de 1 linha (S-1 prometia validação de env com t3-env) — nenhuma validação de env em runtime existe em lugar algum; cada app repete `if (!process.env.X) throw`.

### Verificações que passaram (registro de honestidade)
- SSO middleware da intranet usa `getUser()` (validação server-side do JWT), redirect com `return_to`, cookies com domain de produção — fiel ao prompt (`apps/intranet/src/middleware.ts:64–76`).
- `packages/auth` é framework-agnostic como declarado; `requireEnv` no lugar de `!` (conformidade com a regra do projeto).
- Tokens canônicos e `patterns.css` estão limpos; o design system unificado (P-0.2b) é o item mais bem executado da fundação.
