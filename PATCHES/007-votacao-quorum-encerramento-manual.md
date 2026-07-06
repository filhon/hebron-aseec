# PATCH-007 — Votação de projetos: quórum por pessoa distinta e encerramento manual

**Data:** 2026-07-04 (decisão + implementação em P-2.9c, S-62)
**Registrado retroativamente em:** 2026-07-06 (P-0.16)
**Motivo:** Dois achados da auditoria sobre a mesma área (votação de projetos anuais):

1. **F2-P5** — o código contava quórum por atribuição de voto, não por pessoa distinta; uma pessoa com múltiplos registros de voto (ex.: papel duplo) poderia inflar o quórum.
2. **F2-P6** — o caso comum (há quórum, mas a votação nunca é encerrada porque ninguém aciona o "botão de pânico", que só serve para falta de quórum) não tinha nenhum mecanismo de encerramento. SESSIONS (S-38/39) chegou a registrar como se o fechamento existisse; não existia.

Perguntado sobre a solução para o caso comum, o Filipe confirmou (Fase 2 Q5): encerramento manual pelo `super_admin`, aplicando o resultado apurado até então, como mecanismo geral e distinto do botão de pânico. Ambos os pontos foram corrigidos em **P-2.9c**.

**Impacto:**

- Contagem de quórum em `projetos.votes` (ou equivalente) agrupa por `user_id` distinto, não por linha de voto.
- Nova action `closeVoting` (somente `super_admin`), com audit obrigatório, aplica o resultado apurado e transiciona o estágio do projeto.
- BRAIN.md §6.2 (Votação) ganha os dois esclarecimentos que faltavam.

**Antes** (`BRAIN.md` §6.2, Votação — antes desta sessão):

```
- Quórum: ≥50% dos diretores + conselheiros
- Aprovação: maioria simples
- Sem quórum: votação estendida; super_admin pode acionar "botão de pânico" (maioria + 1 dos votos existentes)
```

**Depois** (`BRAIN.md` §6.2, texto vigente):

```
- Quórum: ≥50% dos diretores + conselheiros (contagem por **pessoa distinta**, não por atribuição — PATCH-007)
- Aprovação: maioria simples
- Sem quórum: votação estendida; super_admin pode acionar "botão de pânico" (maioria + 1 dos votos existentes)
- Encerramento manual: super_admin pode encerrar a votação a qualquer momento, aplicando o resultado apurado até então — mecanismo geral, distinto do "botão de pânico" acima, que só se aplica à falta de quórum (PATCH-007)
```
