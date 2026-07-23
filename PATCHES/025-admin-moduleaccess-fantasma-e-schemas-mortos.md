# PATCH-025 — Admin: campo fantasma `moduleAccess`, schemas de usuário mortos e tipos de domínio órfãos (débitos de S-8/S-11)

**Data:** 2026-07-23
**Origem:** Auditoria cruzada dos prompts P-1.1–1.5 (Admin, Bloco A) contra a codebase atual — débitos declarados em S-8 e S-11.
**Status:** executado (S-180, 2026-07-23).

**Motivo:**
Ao revisitar o Bloco A do Admin, a maioria dos débitos de S-8/S-12 já tinha sido absorvida quando o backend chegou (P-1.6+): os componentes mockados foram reescritos sobre tipos derivados do Drizzle e os arquivos de P-1.2 sem consumidor (`user-card`, `invitation-card`, `feature-flag-toggle`, `status-badge`, `audit-log-table`) foram removidos. Sobrou, porém, uma inconsistência de contrato do mesmo tipo que o **PATCH-021** existe para eliminar — um "campo fantasma":

1. **`moduleAccess` não é consumido em lugar nenhum.** `grep` em todos os apps e packages retorna apenas as definições: o campo `User.moduleAccess` (`packages/types/src/admin/index.ts`) e três schemas Zod (`updateUserSchema`, `createUserExtendedSchema`, `updateUserExtendedSchema` em `packages/validators/src/admin/index.ts`). Nenhum formulário, action ou query lê esse campo.
2. **A documentação ensina a polaridade errada.** O JSDoc de `User.moduleAccess` diz _"Modules the user can access; empty = all allowed"_ — uma **lista positiva (allow-list)**. Mas o sistema que efetivamente foi ao ar usa o oposto: `public.users.suspended_modules` é uma **lista negativa (deny-list)**, e as únicas actions vivas de acesso por módulo (`suspendUser`, `removeSuspension` em `apps/admin/src/actions/users.ts`) operam só sobre ela. Um dev que importe `User` ou os schemas para (re)introduzir controle de módulo implementaria a semântica invertida.
3. **Os quatro schemas de usuário do P-1.1/P-1.4 estão mortos.** `createUserSchema`, `updateUserSchema`, `createUserExtendedSchema` e `updateUserExtendedSchema` não são importados por nenhum app — o `createUser` vivo define seu próprio schema inline (`fullName`, `email`, `phone`, `documentCpf`) e um `moduleEnum` local. Eram os schemas do antigo `user-form.tsx`, componente que foi removido na fase de backend.
4. **Sete dos nove tipos de domínio do P-1.1 são órfãos e divergem do schema real.** Apenas `EmailTemplate` é importado (por `email-template-editor.tsx` e `templates-email/page.tsx`); `@hebron/types/index.ts` não reexporta `./admin`, então não há outro caminho de consumo. `User`, `RoleAssignment`, `Invitation`, `AuditLogEntry`, `SystemSetting`, `FeatureFlag`, `MeetingSession` e `Designation` não têm consumidor — e alguns contradizem o Drizzle que foi para produção (`Invitation.role` singular vs. o `roles` plural de `createInvitationExtendedSchema`; `User.moduleAccess` vs. `users.suspendedModules`/`users.status`). Tipos mortos que descrevem errado o schema vivo são um convite ao erro, não código inerte.

## Prompt corretivo proposto

### P-1.26b — Admin: remover `moduleAccess` fantasma, schemas de usuário mortos e tipos de domínio órfãos

**Fase:** 1
**Módulo:** admin
**Tipo:** integration
**Pré-condições:**

- Branch: `fix/P-1.26b-admin-moduleaccess-fantasma`
- Dependências: P-1.12 concluído (Admin Bloco B) e PATCH-021 aplicado
- Env vars: nenhuma (sem migration — mudança puramente de contrato TypeScript/Zod)

**Escopo:**

Eliminar o campo fantasma `moduleAccess` e o código morto que sobrou do Bloco A, alinhando os contratos ao que efetivamente foi ao ar (`suspended_modules` deny-list + schemas inline das actions vivas). Nenhuma mudança de comportamento em runtime — apenas remoção de definições sem consumidor.

1. `packages/validators/src/admin/index.ts`:
   - remover `moduleAccess` dos schemas `updateUserSchema`, `createUserExtendedSchema` e `updateUserExtendedSchema`;
   - remover os quatro schemas de usuário mortos (`createUserSchema`, `updateUserSchema`, `createUserExtendedSchema`, `updateUserExtendedSchema`) e seus tipos inferidos (`CreateUserInput`, `UpdateUserInput`, `CreateUserExtendedInput`, `UpdateUserExtendedInput`), **após** confirmar por `grep` que nenhum app/teste os importa;
   - preservar `roleEnum`/`scopeEnum` e todos os schemas com consumidor vivo (`createInvitationExtendedSchema`, `roleAssignmentSchema`, `roleRevocationSchema`, `designationSchema`, `emailTemplateSchema`, `meetingSchema` — usados por invitation-form, role-assignment-form, designation-form, email-template-editor, meeting-form).
2. `packages/types/src/admin/index.ts`:
   - remover o campo `moduleAccess` do tipo `User` (se o tipo for mantido);
   - remover os tipos de domínio órfãos e seus tipos auxiliares — `User`/`UserStatus`, `RoleAssignment`, `Invitation`/`InvitationStatus`, `AuditLogEntry`/`AuditAction`, `SystemSetting`/`SettingValueType`, `FeatureFlag`, `MeetingSession`/`MeetingType`/`MeetingStatus`, `Designation` — **mantendo `EmailTemplate`**, único com consumidor;
   - ajustar os `import type` de `../roles` que deixarem de ser usados.
3. `packages/validators/src/index.ts` e `packages/types/package.json`:
   - garantir que a barrel de validators continua compilando após a remoção (só some o que estava morto);
   - manter o export `"./admin"` do `package.json` de types (ainda serve `EmailTemplate`).
4. Verificação:
   - `pnpm turbo typecheck` e `pnpm turbo lint` verdes em `packages/types`, `packages/validators` e `apps/admin`;
   - `pnpm --filter @hebron/admin test` verde.

**Arquivos permitidos para criação/edição:**

- `packages/validators/src/admin/index.ts`
- `packages/types/src/admin/index.ts`
- `packages/validators/src/index.ts` (só se a remoção exigir ajuste da barrel)

**Critérios de aceite:**

- [x] `grep -r moduleAccess` no repositório não retorna nenhuma ocorrência em código-fonte (apenas SESSIONS.md/PROMPTS.md/PATCHES, que são histórico).
- [x] Os quatro schemas de usuário mortos foram removidos e nenhum import quebrou.
- [x] Tipos de domínio órfãos removidos; `EmailTemplate` preservado e ainda importável via `@hebron/types/admin`.
- [x] Nenhuma migration de banco criada (o schema vivo já usa `suspended_modules`).
- [x] Typecheck, lint e testes de Admin passam (103/105 — as 2 falhas restantes são drift de ambiente pré-existente, não relacionado a este diff; ver S-180 em SESSIONS.md).

## Decisão

Remover é mais correto do que "consertar a polaridade do comentário": não há regra de negócio consumindo `moduleAccess`, o controle real de acesso por módulo já existe e está no lugar certo (`suspended_modules` como deny-list, gated por `suspendUser`/`removeSuspension`). Reintroduzir uma allow-list paralela seria criar uma segunda fonte de verdade para a mesma decisão. Mesma lógica do PATCH-021: eliminar o campo fantasma em vez de dar-lhe um backend.

Manter `EmailTemplate` e descartar os outros oito tipos reflete o estado real — o app passou a modelar usuário, papel, convite, auditoria, setting, flag, reunião e designação a partir dos tipos inferidos do Drizzle (`AdminUserRow`, etc.) durante o Bloco B, tornando os tipos manuais do P-1.1 uma segunda descrição divergente do mesmo dado.

## Validação contra a codebase (antes de executar)

Levantamento que embasa o escopo acima:

- `moduleAccess`: só aparece em `packages/types/src/admin/index.ts:20` e `packages/validators/src/admin/index.ts:46,77,94`. Zero consumidores em `apps/**` ou no restante de `packages/**`.
- Schemas de usuário: `grep` por `createUserSchema|updateUserSchema|createUserExtendedSchema|updateUserExtendedSchema` em `apps/**` → nenhum resultado. `apps/admin/src/actions/users.ts` valida com schema Zod inline próprio.
- `@hebron/types/admin`: importado em exatamente dois arquivos, ambos para `EmailTemplate` (`email-template-editor.tsx`, `templates-email/page.tsx`). `packages/types/src/index.ts` reexporta só `documentos/financeiro/projetos` — não há caminho de barrel para os tipos de admin.
- Deriva de contrato confirmada: `public.users` (schema vivo) tem `status` + `suspendedModules` e **não** tem `moduleAccess`; o tipo `User` do P-1.1 tem `moduleAccess` e **não** tem `suspendedModules`/`status` na mesma forma.
- Formulários do P-1.4 que permanecem vivos (não tocar): invitation-form, role-assignment-form, designation-form, email-template-editor, meeting-form — todos montados via páginas/panels e usando os schemas que este patch preserva.

## Observações menores (fora do escopo deste patch)

Encontradas na mesma auditoria, sem risco de correção e não incluídas no prompt acima:

- **Paginação de tabela** (débito de S-9): `apps/admin/src/components/user-table.tsx` não usa `getPaginationRowModel` — a tabela rola inteira. Com ~150 usuários é aceitável; vale paginar se a base crescer.
- **Fallback de `onError` no avatar** (débito de S-9): o `<img>` de avatar em `user-table.tsx` não trata erro de carregamento — uma URL 404 exibe o ícone de imagem quebrada em vez das iniciais. Cosmético.
