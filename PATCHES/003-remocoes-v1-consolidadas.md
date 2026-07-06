# PATCH-003 — Remoções consolidadas da v1 (escopo original vs. atual)

**Data da decisão original:** decisões tomadas em pontos diferentes do desenvolvimento (a maioria antes da Fase 0 formal), consolidadas por escrito em `.docs/Claude.md` (aviso de revisão 2026-06-13) e em `BRAIN.md` §8.
**Data deste registro retroativo:** 2026-07-06 (P-0.16, autorizado por Filipe — Fase 0, pergunta 4).
**Motivo:** Além da tipografia (PATCH-001) e do escopo da Rádio (PATCH-002), o documento técnico original (`.docs/Claude.md`) previa um conjunto maior de funcionalidades que foram deferidas para v2+ ou removidas sem nunca terem um PATCH individual: Google OAuth, push notifications (OneSignal), SMS (Twilio/Zenvia), doações Pix, busca semântica/pgvector/embeddings (à época, sem distinção entre Plataforma e Projetos — ver PATCH-012 para a correção dessa distinção), transcrição Whisper, recomendações personalizadas, modo offline, Open Finance, audit replay, check-in autônomo/fechadura, operações em lote de usuários. Cada uma está corretamente refletida em `BRAIN.md` §8 hoje; o que faltava era o registro formal da mudança. A auditoria (S1-16) confirmou que `PATCHES/` estava vazio apesar de pelo menos 3 mudanças de decisão já efetivas, e o Filipe autorizou a reconstrução retroativa consolidada em um único PATCH (em vez de fragmentar artificialmente decisões cuja data individual não foi registrada).

**Impacto:**

- Nenhuma mudança de código — o comportamento atual já reflete estas remoções; este PATCH formaliza o registro.
- `BRAIN.md` §8 é a referência única e atual da v1 vs. v2+ (com a subdivisão adicional feita por PATCH-011 e PATCH-012 nesta mesma sessão).
- Nenhum prompt de `PROMPTS.md` (P-0.1 em diante) implementa qualquer item da lista "Removido"/"Descartado" — confirmado por leitura integral na auditoria (Fase 1, `AUDIT/01-specs.md`).

**Antes** (`.docs/Claude.md`, funcionalidades previstas no documento técnico original, nunca implementadas):

```
- Google OAuth (login) — ativado por padrão, "passwordless como fallback"
- Push (OneSignal) — notificações de tarefas, atualizações de projeto, programa ao vivo
- SMS (Zenvia/Twilio) — MFA fallback e alertas críticos de Financeiro
- Doações Pix (AbacatePay/Asaas) — trilho pronto desde o dia 1
- Busca semântica (pgvector) — Plataforma e Documentos
- Transcrição automática (Whisper) — vídeos da Plataforma, episódios da Rádio, atas da Intranet
- Recomendação personalizada — Plataforma
- Modo offline (PWA, download de áudio + slides) — Plataforma
- Open Finance (Pluggy/Belvo) — Financeiro, fase 2
- Audit replay ("reconstruir o estado de um registro em qualquer ponto do passado") — Admin
- Check-in autônomo / fechadura digital — Flats
- Operações em lote de usuários (bulk operations via CSV) — Admin
```

**Depois** (`BRAIN.md` §8, Escopo v1 vs v2+ — texto vigente após este PATCH e após PATCH-011/PATCH-012):

```
### Removido da v1 (deferido para v2+)

- Doações Pix do público
- Busca semântica / pgvector (Plataforma/Documentos) — embeddings para detecção de duplicidade de
  projetos é caso à parte, promovido a v1 (ver "Mantido na v1", PATCH-012)
- Transcrição automática Whisper
- Recomendações personalizadas
- Modo offline (exceto PWA Rádio)
- AzuraCast / VPS / Icecast / live streaming
- Open Finance
- Audit replay (apenas busca de logs)
- DJs ao vivo, podcasts, pedidos musicais (Rádio)
- Smart locks / check-in autônomo
- SMS, push notifications, Google OAuth
- Operações em lote de usuários
```
