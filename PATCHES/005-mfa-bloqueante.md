# PATCH-005 — MFA TOTP bloqueante para super_admin/diretor (com enrollment)

**Data:** 2026-07-04 (decisão + implementação em P-1.26, S-60)
**Registrado retroativamente em:** 2026-07-06 (P-0.16)
**Motivo:** BRAIN.md já descrevia MFA TOTP como "obrigatório" para `super_admin`/`diretor`, mas a auditoria (S1-07, F2-M1) encontrou que nada no código impedia login sem TOTP: não havia tela de enrollment, e o middleware só verificava desafio MFA para quem já tinha TOTP configurado — ou seja, "obrigatório" não bloqueava ninguém. Perguntado sobre a postura (bloquear com tela de enrollment vs. manter como está), o Filipe confirmou a leitura mais estrita (Fase 1 Q5): bloqueante, com enrollment forçado no primeiro login desses papéis. Implementado em **P-1.26**.

**Impacto:**

- Primeiro login de `super_admin`/`diretor` sem TOTP configurado força uma tela de enrollment antes de liberar qualquer app.
- Middleware/verificação de sessão passa a checar `aal` (authenticator assurance level) da sessão, não apenas a existência de um fator TOTP cadastrado.
- BRAIN.md §2 e §8 ganham a qualificação "bloqueante" que faltava.

**Antes** (`BRAIN.md` §2, Autenticação):

```
- **MFA:** TOTP obrigatório para `super_admin` e `diretor`; opcional para demais
```

E (`BRAIN.md` §8, Mantido na v1):

```
- MFA TOTP para super_admin e diretores
```

**Depois** (`BRAIN.md` §2):

```
- **MFA:** TOTP obrigatório (bloqueante — enrollment forçado no primeiro login, P-1.26 / PATCH-005) para `super_admin` e `diretor`; opcional para demais
```

E (`BRAIN.md` §8, Mantido na v1):

```
- MFA TOTP obrigatório (bloqueante, com tela de enrollment no primeiro login) para super_admin e diretores (P-1.26, PATCH-005)
```
