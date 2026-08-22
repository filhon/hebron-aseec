"use client";

import * as React from "react";
import type HlsType from "hls.js";
import {
  AlertTriangle,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getLessonVideoPlaybackUrl } from "../actions/uploads";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export interface LessonPlayerMarker {
  timeSeconds: number;
  label: string;
}

export interface LessonPlayerProps {
  /** Identifica a aula para resolver a URL de reprodução assinada por
   * matrícula (getLessonVideoPlaybackUrl) quando `videoId` está presente. */
  lessonId: string;
  /** guid do vídeo na Bunny Stream (P-6.20) — quando presente, a reprodução
   * usa uma URL assinada resolvida sob demanda, nunca o guid cru. */
  videoId: string | null;
  /** Fallback de aulas antigas com URL colada à mão (sem `videoId`). */
  videoUrl: string | null;
  /** Usada como fallback de duração antes do metadata do vídeo carregar. */
  durationSeconds?: number | null;
  /** Marcadores exibidos na barra de progresso (ex.: notas do aluno). */
  markers?: LessonPlayerMarker[];
  /** Ponto de retomada, em segundos (última posição assistida). */
  startAtSeconds?: number;
  onTimeUpdate?: (currentTimeSeconds: number) => void;
  onEnded?: () => void;
  onMarkerClick?: (marker: LessonPlayerMarker) => void;
  className?: string;
}

/** Player de vídeo com suporte a HLS (hls.js), controle de velocidade e
 * marcadores na barra de progresso. Sem dependência de biblioteca de UI —
 * controles nativos construídos sobre o elemento `<video>`. */
export function LessonPlayer({
  lessonId,
  videoId,
  videoUrl,
  durationSeconds,
  markers = [],
  startAtSeconds,
  onTimeUpdate,
  onEnded,
  onMarkerClick,
  className,
}: LessonPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const seekBarRef = React.useRef<HTMLDivElement>(null);
  const speedMenuRef = React.useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(startAtSeconds ?? 0);
  const [duration, setDuration] = React.useState(durationSeconds ?? 0);
  const [muted, setMuted] = React.useState(false);
  const [playbackRate, setPlaybackRate] = React.useState<number>(1);
  const [speedMenuOpen, setSpeedMenuOpen] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [src, setSrc] = React.useState<string | null>(
    videoId ? null : videoUrl,
  );
  const [resolveError, setResolveError] = React.useState(false);

  // videoId (Bunny Stream, P-6.20): resolve a URL de reprodução assinada por
  // matrícula sob demanda — nunca reproduz a partir do guid cru. Sem
  // videoId, cai no fallback de aulas antigas com videoUrl colado à mão.
  React.useEffect(() => {
    if (!videoId) {
      setSrc(videoUrl);
      return;
    }
    let cancelled = false;
    setSrc(null);
    setResolveError(false);
    getLessonVideoPlaybackUrl({ lessonId })
      .then((result) => {
        if (cancelled) return;
        if (result?.data?.url) {
          setSrc(result.data.url);
        } else {
          setResolveError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setResolveError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId, videoId, videoUrl]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // hls.js (~150 KB) sai do bundle inicial: os controles do player pintam
    // de imediato e o parser é buscado em paralelo (P-9.3). `cancelled`
    // cobre a desmontagem antes de o import resolver.
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

    if (startAtSeconds) {
      video.currentTime = startAtSeconds;
    }

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, startAtSeconds]);

  React.useEffect(() => {
    if (!speedMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (!speedMenuRef.current?.contains(e.target as Node)) {
        setSpeedMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [speedMenuOpen]);

  React.useEffect(() => {
    function handleFullscreenChange() {
      setFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function changePlaybackRate(rate: number) {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
    setPlaybackRate(rate);
    setSpeedMenuOpen(false);
  }

  function seekToClientX(clientX: number) {
    const video = videoRef.current;
    const bar = seekBarRef.current;
    if (!video || !bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = ratio * duration;
  }

  function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.requestFullscreen();
    }
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/player relative overflow-hidden rounded-md bg-(--hb-ink)",
        className,
      )}
    >
      <video
        ref={videoRef}
        className="aspect-video w-full bg-black"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const time = e.currentTarget.currentTime;
          setCurrentTime(time);
          onTimeUpdate?.(time);
        }}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
      />

      {!src && (
        <div className="absolute inset-0 flex aspect-video items-center justify-center bg-(--hb-ink) text-white/85">
          {resolveError ? (
            <div className="flex flex-col items-center gap-2 text-center text-sm">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Não foi possível carregar o vídeo desta aula.
            </div>
          ) : (
            <Loader2
              className="h-6 w-6 animate-spin"
              aria-hidden="true"
              aria-label="Carregando vídeo"
            />
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-linear-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8">
        {/* Barra de progresso + marcadores */}
        <div
          ref={seekBarRef}
          role="slider"
          aria-label="Progresso do vídeo"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
          onClick={(e) => seekToClientX(e.clientX)}
          onKeyDown={(e) => {
            const video = videoRef.current;
            if (!video) return;
            if (e.key === "ArrowRight") video.currentTime += 5;
            if (e.key === "ArrowLeft") video.currentTime -= 5;
          }}
          className="relative h-1.5 w-full cursor-pointer rounded-(--radius-pill) bg-white/25"
        >
          <div
            className="h-full rounded-(--radius-pill) bg-(--hb-orange)"
            style={{ width: `${progressPercent}%` }}
          />
          {markers.map((marker) => (
            <button
              key={marker.timeSeconds}
              type="button"
              title={marker.label}
              aria-label={marker.label}
              onClick={(e) => {
                e.stopPropagation();
                const video = videoRef.current;
                if (video) video.currentTime = marker.timeSeconds;
                onMarkerClick?.(marker);
              }}
              style={{
                left: `${duration > 0 ? (marker.timeSeconds / duration) * 100 : 0}%`,
              }}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--hb-cyan) ring-2 ring-black/40 transition-transform hover:scale-125"
            />
          ))}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3 text-white">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pausar" : "Reproduzir"}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Ativar som" : "Silenciar"}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <span className="tabular-nums text-xs text-white/85">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <div className="relative" ref={speedMenuRef}>
              <button
                type="button"
                onClick={() => setSpeedMenuOpen((v) => !v)}
                aria-label="Velocidade de reprodução"
                aria-expanded={speedMenuOpen}
                className="flex h-8 items-center gap-1 rounded-sm px-2 text-xs font-medium transition-colors hover:bg-white/15"
              >
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                {playbackRate}x
              </button>

              {speedMenuOpen && (
                <div className="absolute bottom-full right-0 mb-1.5 w-24 overflow-hidden rounded-sm border border-white/10 bg-(--hb-ink) py-1 shadow-(--shadow-md)">
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changePlaybackRate(rate)}
                      className={cn(
                        "block w-full px-3 py-1.5 text-left text-xs text-white/90 transition-colors hover:bg-white/10",
                        rate === playbackRate && "text-(--hb-cyan)",
                      )}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            >
              {fullscreen ? (
                <Minimize className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
