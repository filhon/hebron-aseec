// Service worker do PWA da Rádio Hebron Aseec (BRAIN §6.4). Escopo mínimo:
// só o necessário para o Chrome/Android considerar o app "instalável" (um
// service worker com handler de `fetch` registrado) — background play em si
// vem do <audio> + Media Session API em player.tsx, não deste arquivo (o
// áudio decodifica no player, o SW não intercepta o stream de
// /api/stream). Sem cache offline: conteúdo é sempre buscado da rede
// (simplicidade — BRAIN "público-alvo em transição tecnológica").

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
