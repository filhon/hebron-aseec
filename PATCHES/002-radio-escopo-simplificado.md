# PATCH-002 — Rádio: escopo drasticamente simplificado

**Data da decisão original:** não registrada formalmente; primeira menção escrita em `.docs/Claude.md` (aviso de revisão 2026-06-13).
**Data deste registro retroativo:** 2026-07-06 (P-0.16, autorizado por Filipe — Fase 0, pergunta 4).
**Motivo:** O documento técnico original (`.docs/Claude.md` §2.7/§4.4) especificava uma estação de rádio completa: servidor AzuraCast em VPS dedicada (Hetzner/Contabo), Icecast/Shoutcast, DJs ao vivo com console remoto, grade de programação semanal, pedidos musicais com dedicatória, "estúdio aberto" com WhatsApp Business API, distribuição de podcast via RSS, alertas push de programa ao vivo. O escopo real definido com o Filipe é muito menor: Auto DJ 24/7 tocando `.mp3` pré-gravados, sem infraestrutura dedicada. A mudança nunca gerou um PATCH — só a nota de revogação em `.docs/Claude.md` e o título "(escopo drasticamente simplificado)" em BRAIN.md §6.4. A auditoria (S1-16) identificou a lacuna.

**Impacto:**

- Elimina a necessidade de VPS dedicada, AzuraCast, Icecast, ECAD/OBRAMUS como bloqueador de go-live (licenciamento ainda pode ser necessário para o conteúdo tocado, mas fora do escopo de infraestrutura).
- `radio.schedule_slots`, `radio.song_requests`, `radio.podcast_subscribers` (do desenho original) não existem — substituídos por armazenamento simples em Cloudflare R2 organizado por autor/série.
- Fase 8 (`PROMPTS.md` P-8.1–P-8.12) é dimensionada para o escopo simplificado, não para o original.
- Tecnologia real: Cloudflare R2 + Next.js API route (player server-side) + Supabase Realtime ("tocando agora") + signed URLs (conteúdo exclusivo) + PWA com background play.

**Antes** (`.docs/Claude.md` §2.7 e §4.4, resumo do escopo original):

```
Servidor de transmissão: AzuraCast (open source) em VPS Hetzner CCX13 (€11/mês) ou Contabo VPS S —
Suporta Icecast + Shoutcast, Auto DJ 24/7, agendamento de playlists, transmissões ao vivo (DJ remoto
via BUTT/Mixxx), API HTTP completa para "now playing".
[...]
Funcionalidades específicas: Auto DJ 24/7 via AzuraCast com rotação inteligente; Transmissão ao vivo
com 1 clique pelo apresentador; Distribuição automática de podcast (RSS); Programação dinâmica
(slot vazio cai em playlist temática); Modo "estúdio aberto" com WhatsApp Business API; Alerta de
programa ao vivo (push notification).
```

**Depois** (`BRAIN.md` §6.4, Rádio):

```
### 6.4. Rádio (escopo drasticamente simplificado)

**O que a Rádio É:**

- Auto DJ 24/7 tocando sermões pré-gravados (.mp3)
- Armazenamento em Cloudflare R2 (migrar do Google Drive)
- Player simples com "tocando agora"
- PWA com background play
- Conteúdo organizado por autor e série

**O que a Rádio NÃO É (removido):**

- Sem DJs ao vivo, sem grade programada, sem podcasts, sem pedidos musicais
- Sem "estúdio aberto", sem WhatsApp
- Sem AzuraCast, Icecast ou VPS dedicada
- Sem live streaming
```
