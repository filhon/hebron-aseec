# PATCH-004 — Decisão B: RLS ativa (Server Actions conectam como `authenticated`)

**Data:** 2026-07-03 (decisão + implementação em P-0.10, S-57)
**Registrado retroativamente em:** 2026-07-06 (P-0.16)
**Motivo:** BRAIN.md §3 documentava uma decisão técnica pendente desde a Fase 0 do projeto: as Server Actions conectavam via `DATABASE_URL` (superusuário Postgres), o que faz com que a RLS (camada 3 do modelo de permissões) nunca seja avaliada nas actions — só no acesso direto via PostgREST/anon key. A auditoria (S1-02, F3-05, C-10) confirmou que isso reduzia "defense in depth" (BRAIN §3/§9) a 1-2 camadas em vez de 3 em praticamente toda mutação do sistema. Perguntado sobre as duas posturas possíveis (A: manter superuser e documentar o modelo de ameaça reduzido; B: propagar o JWT do usuário para que a RLS execute de verdade), o Filipe escolheu a opção **B** ("Pretendo seguir o BRAIN e as regras de segurança definidas", Fase 1 Q2). Implementada em **P-0.10** (grants por schema + correção de policies problemáticas + adoção do client de sessão do kit de P-0.8).

**Impacto:**

- Toda Server Action gated (admin, documentos, projetos, financeiro e módulos futuros) conecta como `authenticated`, propagando o JWT do usuário — nunca mais `DATABASE_URL` superuser.
- Migration de `GRANT USAGE`/grants por tabela alinhados às policies existentes; `anon` só nas tabelas estritamente públicas.
- Policies que se tornariam exposições reais na virada foram corrigidas antes de ativar (`invitations_select_by_token`, `WITH CHECK (true)` sem `TO`, etc.) — ver `AUDIT/03-tecnico.md` F3-04/F3-15/F3-18.
- G6 (`PROMPTS.md`) torna esta postura obrigatória para todo prompt de Bloco B daqui em diante.
- BRAIN.md §3: a caixa "decisão técnica pendente" vira uma nota de decisão resolvida.

**Antes** (`BRAIN.md` §3, antes desta sessão):

```
> ⚠️ **Decisão técnica pendente (RLS x conexão superuser):** hoje as Server Actions conectam via `DATABASE_URL` (superusuário Postgres), o que **bypassa RLS** — o RBAC fica só no gate da action (camadas 1 e 2). Ou seja, a camada 3 (RLS) protege apenas acesso direto/cliente (PostgREST/anon key), não as actions. Há duas posturas possíveis, a decidir com o Filipe (auditar em P-9.1):
>
> - **(A)** Manter conexão superuser nas actions (mais simples) e ser honesto no modelo de ameaça: RLS protege o canal direto, gates protegem as actions. Documentar e garantir que **nenhuma** action pule o gate de RBAC.
> - **(B)** Fazer as actions conectarem como `authenticated` propagando o JWT (claims de papel), de modo que a RLS seja de fato a última linha de defesa mesmo nas actions (defense-in-depth real). Mais trabalho; exige repassar o token do usuário ao client Postgres.
```

**Depois** (`BRAIN.md` §3, texto vigente):

```
> ✅ **Decisão tomada — opção B (PATCH-004):** as Server Actions conectam como `authenticated`, propagando o JWT do usuário (claims de papel) via o client de sessão do kit compartilhado (`@hebron/auth`, P-0.8) — nunca `DATABASE_URL` superuser. A RLS (camada 3) é, de fato, a última linha de defesa também nas actions (defense-in-depth real). Implementado em P-0.10 (grants por schema + correção de policies problemáticas) e obrigatório para todo prompt de Bloco B via G6 (`PROMPTS.md`).
```
