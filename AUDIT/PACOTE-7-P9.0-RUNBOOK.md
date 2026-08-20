# Runbook — P-9.0 (Migração de usuários do legado)

> Complementa `AUDIT/04-BACKLOG-CORRECAO.md` § PACOTE 7 e `PROMPTS.md` § P-9.0.
> Esta sessão implementou o script, o template de e-mail e o dry-run — tudo que
> é código. O que resta depende das credenciais reais do projeto Supabase
> legado (da terceirizada), que não estavam disponíveis no momento desta
> sessão. Filipe executa os passos abaixo quando as tiver em mãos.

## O que já está pronto no código

- **Script de migração** — `packages/db/src/scripts/migrate-legacy-users.ts`
  (`pnpm --filter @hebron/db migrate:legacy-users`). Lista todos os usuários
  do projeto legado via Admin API (paginado), pula quem já existe em
  `public.users` (idempotente, por e-mail) e — só com `--execute` — cria a
  conta no projeto de destino (`auth.admin.createUser`, sem senha) e envia um
  magic link por e-mail (`LegacyAccessEmail`, `packages/email`) levando a
  `/post-login`, tela de pós-login que já existe.
- **Dry-run por padrão** — rodar sem `--execute` só lista o que aconteceria e
  grava o relatório; nenhuma conta é criada, nenhum e-mail é enviado.
- **Relatório CSV** — cada execução grava
  `migration-reports/legacy-users-<data>.csv` (`legacy_id, email, full_name,
status, new_user_id, detail`). A pasta está no `.gitignore` — nunca
  commitar (contém e-mail/nome de pessoas reais).
- **`typecheck`/`lint`** verificados nesta sessão (`pnpm --filter @hebron/db
typecheck lint`), verdes.

## O que fica de fora deste script, de propósito

- **Papéis** (`role_assignments`): o legado é só identidade (Auth), sem
  garantia de que os papéis de lá batam com os 8 papéis daqui. Toda conta
  migrada nasce **sem nenhum papel**. Depois de rodar `--execute`, alguém com
  `super_admin` precisa abrir o Admin (`Usuários`) e atribuir o papel de cada
  pessoa manualmente — não há atalho em massa, decisão deliberada para não
  adivinhar RBAC a partir de um dado que o legado pode não ter.
- **Senha**: ninguém migrado tem senha — o primeiro acesso é sempre via magic
  link. Se quiserem senha depois, não há tela de "definir senha" no
  ecossistema ainda (gap pré-existente, fora do escopo deste prompt).

## Passo a passo

### 1. Obter as credenciais do projeto legado

No Supabase Dashboard **do projeto legado** (da terceirizada, não o nosso):
`Settings → API` → copiar `Project URL` e `service_role` key (não a `anon`).

### 2. Configurar as env vars

No `.env` local (nunca commitado):

```bash
LEGACY_SUPABASE_URL=https://<projeto-legado>.supabase.co
LEGACY_SUPABASE_SERVICE_ROLE_KEY=<service-role-do-legado>
# já devem existir:
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
NEXT_PUBLIC_APP_URL=https://app.hebronaseec.com.br
```

### 3. Dry-run (sempre primeiro)

```bash
pnpm --filter @hebron/db migrate:legacy-users
```

Confere no relatório CSV gerado: quantos usuários o legado tem, quantos
seriam criados, quantos já existem aqui (pulados). Se o número total não
bater com o esperado (~150), pare e investigue antes de prosseguir — pode
ser paginação incompleta do lado legado ou e-mails duplicados.

### 4. Execução real

```bash
pnpm --filter @hebron/db migrate:legacy-users -- --execute
```

Cria as contas de verdade e envia os magic links. Roda com folga entre
chamadas (300ms) para não estourar rate limit da Admin API do Supabase —
para ~150 usuários, leva alguns minutos.

### 5. Verificar falhas

Se `Falhas: N` no resumo final (N > 0), abrir o CSV e olhar a coluna
`detail` de cada linha `falhou`. Rodar o script de novo com `--execute` é
seguro (idempotente) — só tenta de novo quem ainda não existe no destino.

### 6. Atribuir papéis

Para cada usuário migrado (linha `status = migrado` no relatório), abrir
Admin → Usuários → localizar por e-mail → atribuir papel(is). Não há bulk
ainda (fora do escopo deste prompt — ver PACOTE 11, "Operações em lote de
usuários" está em "Removido da v1").

### 7. Confirmar acesso

Pedir a 2-3 pessoas migradas (de papéis diferentes) que cliquem o link
recebido e confirmem que caem logadas em `/post-login` e conseguem navegar.

### 8. Desbloquear P-9.5

Só depois dos passos acima (contas criadas, papéis atribuídos, acesso
confirmado) o pré-requisito de P-9.5 ("P-9.0 concluído") está satisfeito de
verdade — `PROMPTS.md:10531`.

## Como verificar o que já está pronto (sem depender do legado)

```bash
pnpm --filter @hebron/db typecheck lint

# Dry-run falha cedo e com mensagem clara se faltar env var — confirma que
# o script está montado corretamente sem precisar de credenciais reais:
pnpm --filter @hebron/db migrate:legacy-users
# esperado: "Variável de ambiente obrigatória ausente: LEGACY_SUPABASE_URL"
```
