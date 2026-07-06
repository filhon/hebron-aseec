# PATCH-006 — Exclusão LGPD é anonimização, não hard delete (resolução do conflito com imutabilidade)

**Data:** 2026-07-05 (decisão + fundação implementada em P-0.13, S-65)
**Registrado retroativamente em:** 2026-07-06 (P-0.16)
**Motivo:** O princípio "invioláveis" do BRAIN sempre disse "soft-delete e estornos, nunca hard delete" sem prever o direito de exclusão da LGPD (art. 18, VI). A auditoria (S1-03, F3-09, C-11) apontou o conflito direto: um titular que exerce o direito de exclusão não pode ser satisfeito por soft-delete puro (o dado pessoal continua acessível), mas hard delete quebraria a auditabilidade de transações, votos, pareceres e relatórios vinculados a esse usuário. Perguntado sobre qual princípio vence, o Filipe decidiu cumprir a lei (Fase 1 Q4). A resolução tecnica — anonimização determinística de PII preservando a linha e os registros institucionais — foi desenhada e implementada como fundação em **P-0.13**, antes das Fases 6–7 (que coletam mais PII/dado sensível).

**Impacto:**

- Novo princípio formal em `BRAIN.md` §9: exclusão real = anonimização de campo, nunca remoção de linha.
- `packages/db/src/anonymization.ts` (`anonymizeUser`) é a primitiva usada pelo fluxo "Meus Dados" (P-9.2, ainda pendente — a fundação já existe).
- `public.consents` (P-0.13): consentimento granular por finalidade, revogável (nunca removido, só `granted = false`).
- `SENSITIVE_AUDIT_FIELDS` em `packages/db/src/audit.ts`: PII redigida nos diffs do audit log, que segue imutável.

**Antes** (princípio original, sem exceção — refletido em `.docs/Claude.md` §5.4 e na primeira versão do checklist do BRAIN):

```
- **Imutabilidade:** soft-delete e estornos, nunca hard delete; audit trails em tudo.
```

(sem menção ao direito de exclusão da LGPD; nenhuma tabela de consentimento, nenhuma primitiva de anonimização.)

**Depois** (`BRAIN.md` §9, Princípios invioláveis — texto vigente desde P-0.13):

```
- **Imutabilidade:** soft-delete e estornos, nunca hard delete; audit trails em tudo. **Exceção legal:** exclusão LGPD é anonimização de PII (ver "LGPD — fundação" acima), nunca hard delete de linha
```

E a seção completa "LGPD — fundação (P-0.13)" em `BRAIN.md` §9 (consentimento granular, PII em audit diffs, `anonymizeUser`, retenção de `documentos.views`).
