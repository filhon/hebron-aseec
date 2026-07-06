# PATCH-012 — IA: embeddings de duplicidade promovido a v1; scoring de flats vira assistência; renovação confirmada v1

**Data:** 2026-07-02 (decisão, Fase 1 da auditoria — implementação prevista em P-2.13/P-2.14/P-7.13, ainda pendentes)
**Registrado retroativamente em:** 2026-07-06 (P-0.16)
**Motivo:** Duas contradições internas do BRAIN identificadas pela auditoria (S1-12, S1-13), ambas resolvidas pela mesma pergunta e resposta:

- **S1-12:** BRAIN §6.2 listava "Detecção de duplicidade via embeddings (pgvector)" como IA do módulo Projetos (implicando v1), enquanto §2/§8 tratavam embeddings genericamente como v2+ ("Busca semântica / pgvector / embeddings" na lista de removidos). Nenhum prompt implementava (coerente com §8, contradiz §6.2).
- **S1-13:** §8 listava "IA: scoring de flats (critérios subjetivos)" e "detecção de renovação" como mantidos na v1, mas §6.8 especifica o scoring de Flats como 100% determinístico (tabela de pontos, sem menção a IA) e nenhum prompt implementava a detecção de renovação.

Perguntado se cada uma deveria virar v1 (com prompt) ou ficar v2+ (corrigindo o BRAIN), o Filipe decidiu (Fase 1 Q3): **"Pode criar os prompts"** — as três entram na v1, com prompts próprios: P-2.13 (renovação), P-2.14 (embeddings de duplicidade) e P-7.13 (assistência de scoring de flats).

**Decisão e semântica definida (elimina a ambiguidade que gerava a contradição):**

- **Embeddings/pgvector** deixam de ser tratados como um bloco único v2+. Distinção: **duplicidade de projetos (Projetos, P-2.14) é v1**; **busca semântica (Plataforma/Documentos) continua v2+**. São features diferentes que usavam o mesmo substantivo genérico ("embeddings") no BRAIN original.
- **Scoring de flats com IA** não substitui a tabela determinística do §6.8 — vira **assistência**: para os critérios subjetivos (d — saúde autodeclarada, g — intensidade ministerial), o sistema sugere uma pontuação a partir do texto livre; o gestor sempre confirma ou ajusta. A pontuação final permanece 100% determinística.
- **Detecção de renovação** (P-2.13): confirmada v1, sem mudança de semântica — auto-preenche campos de projetos anteriores similares da mesma organização.

**Impacto:**

- `BRAIN.md` §2 (stack IA): "Embeddings (v2+)" vira "Embeddings — v1 para duplicidade de projetos, v2+ para busca semântica".
- `BRAIN.md` §6.2 (IA de Projetos): linhas de duplicidade/renovação ganham referência de prompt (v1).
- `BRAIN.md` §6.8 (Flats): nova nota de assistência de IA no scoring, sem alterar a tabela de pontos.
- `BRAIN.md` §8: "Mantido na v1" e "Removido da v1" reescritos para eliminar a contradição S1-12/S1-13.

**Antes** (`BRAIN.md` §2, antes desta sessão):

```
- **Embeddings (v2+):** OpenAI text-embedding-3-small + pgvector
```

E (`BRAIN.md` §8, antes desta sessão):

```
### Mantido na v1
...
- IA: scoring, versão compacta, triagem, detecção de renovação
- IA: scoring de flats (critérios subjetivos)
...

### Removido da v1 (deferido)
...
- Busca semântica / pgvector / embeddings
...
```

**Depois** (`BRAIN.md` §2, texto vigente):

```
- **Embeddings:** OpenAI text-embedding-3-small + pgvector — **v1** para detecção de duplicidade de projetos (P-2.14 / PATCH-012); **v2+** para busca semântica (Plataforma/Documentos)
```

E (`BRAIN.md` §8, texto vigente):

```
### Mantido na v1
...
- IA: scoring, versão compacta, triagem
- IA: detecção de renovação de projetos (P-2.13, PATCH-012)
- IA: detecção de duplicidade de projetos via embeddings/pgvector (P-2.14, PATCH-012) — não confundir
  com a busca semântica da Plataforma/Documentos, que segue v2+ (ver "Removido da v1" abaixo)
- IA: assistência de sugestão de pontuação nos critérios subjetivos do scoring de Flats, com
  confirmação do gestor — nunca decide sozinha (P-7.13, PATCH-012); pontuação final 100%
  determinística (§6.8)
...

### Removido da v1 (deferido para v2+)
...
- Busca semântica / pgvector (Plataforma/Documentos) — embeddings para detecção de duplicidade de
  projetos é caso à parte, promovido a v1 (ver "Mantido na v1" acima, PATCH-012)
...
```
