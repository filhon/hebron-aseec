"use client";

// P-2.20 CORRETIVO — reprodução do vídeo de apresentação (Bunny Stream,
// P-6.20) na tela da diretoria. Versão mínima do player de
// apps/plataforma/src/components/lesson-player.tsx (mesmo hls.js, sem os
// controles customizados daquele — aqui bastam os controles nativos do
// `<video>`, não há trilha sequencial nem marcadores a desenhar).

import * as React from "react";
import type HlsType from "hls.js";

export function AttachmentVideoPlayer({ src }: { src: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: HlsType | null = null;
    let cancelled = false;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari/iOS reproduzem HLS nativamente — não baixa o hls.js.
      video.src = src;
    } else {
      void import("hls.js").then(({ default: Hls }) => {
        if (cancelled || !videoRef.current) return;
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(videoRef.current);
        } else {
          videoRef.current.src = src;
        }
      });
    }

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      className="aspect-video w-full rounded-(--radius) bg-(--hb-ink)"
    />
  );
}
