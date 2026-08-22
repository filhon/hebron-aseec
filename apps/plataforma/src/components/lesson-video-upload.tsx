"use client";

import * as React from "react";
import { Upload as TusUpload } from "tus-js-client";
import { Button } from "@hebron/ui";
import { CheckCircle2, Loader2, Video, X } from "lucide-react";
import { createLessonVideoUpload } from "../actions/uploads";

const VIDEO_MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const VIDEO_ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
];

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export interface LessonVideoUploadProps {
  /** Título da aula — usado como título do vídeo na Bunny Stream. */
  lessonTitle: string;
  /** videoId já salvo (edição de uma aula que já tem vídeo enviado). */
  videoId: string | null;
  onUploaded: (videoId: string) => void;
  onRemove: () => void;
  className?: string;
}

type UploadStatus = "idle" | "starting" | "uploading" | "error";

/** Upload de vídeo direto para a Bunny Stream via TUS resumível, com barra de
 * progresso — o arquivo nunca passa pela Server Function (P-6.20). */
export function LessonVideoUpload({
  lessonTitle,
  videoId,
  onUploaded,
  onRemove,
  className,
}: LessonVideoUploadProps) {
  const [status, setStatus] = React.useState<UploadStatus>("idle");
  const [progress, setProgress] = React.useState(0);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadRef = React.useRef<TusUpload | null>(null);

  React.useEffect(() => {
    return () => {
      uploadRef.current?.abort();
    };
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!VIDEO_ALLOWED_MIME_TYPES.includes(file.type)) {
      setStatus("error");
      setError("Formato não suportado. Use MP4, MOV, WebM ou MKV.");
      return;
    }
    if (file.size > VIDEO_MAX_SIZE_BYTES) {
      setStatus("error");
      setError("Arquivo muito grande. Tamanho máximo: 2 GB.");
      return;
    }

    setFileName(file.name);
    setProgress(0);
    setError(null);
    setStatus("starting");

    const result = await createLessonVideoUpload({
      title: lessonTitle || file.name,
    }).catch(() => null);

    const data = result?.data;
    if (!data) {
      setStatus("error");
      setError(
        result?.serverError ?? "Não foi possível iniciar o upload do vídeo.",
      );
      return;
    }

    setStatus("uploading");

    const upload = new TusUpload(file, {
      endpoint: data.upload.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        AuthorizationSignature: data.upload.authorizationSignature,
        AuthorizationExpire: String(data.upload.authorizationExpire),
        VideoId: data.upload.videoId,
        LibraryId: data.upload.libraryId,
      },
      metadata: { filetype: file.type, title: file.name },
      onProgress: (bytesSent, bytesTotal) => {
        setProgress(Math.round((bytesSent / bytesTotal) * 100));
      },
      onSuccess: () => {
        setStatus("idle");
        onUploaded(data.videoId);
      },
      onError: () => {
        setStatus("error");
        setError("Falha ao enviar o vídeo. Tente novamente.");
      },
    });

    uploadRef.current = upload;
    upload.start();
  }

  function cancelUpload() {
    uploadRef.current?.abort();
    uploadRef.current = null;
    setStatus("idle");
    setFileName(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (videoId && status === "idle") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-(--radius) border border-(--border) bg-(--bg-alt) px-4 py-3",
          className,
        )}
      >
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-(--hb-green)"
          aria-hidden="true"
        />
        <span className="flex-1 text-sm text-(--fg)">
          Vídeo enviado{fileName ? `: ${fileName}` : ""}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          Substituir vídeo
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-3 rounded-(--radius) border border-dashed border-(--border) bg-(--bg-alt) px-4 py-3">
        {status === "starting" || status === "uploading" ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-(--fg-muted)"
            aria-hidden="true"
          />
        ) : (
          <Video
            className="h-4 w-4 shrink-0 text-(--fg-muted)"
            aria-hidden="true"
          />
        )}

        {fileName && status !== "idle" ? (
          <span className="min-w-0 flex-1 truncate text-sm text-(--fg)">
            {fileName}
          </span>
        ) : (
          <span className="flex-1 text-sm text-(--fg-muted)">
            Nenhum vídeo selecionado
          </span>
        )}

        {status === "uploading" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cancelar upload"
            onClick={cancelUpload}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "starting"}
          >
            Selecionar vídeo
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Selecionar arquivo de vídeo"
        />
      </div>

      {status === "uploading" && (
        <div
          role="progressbar"
          aria-label="Progresso do upload"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-1.5 w-full overflow-hidden rounded-(--radius-pill) bg-(--border)"
        >
          <div
            className="h-full rounded-(--radius-pill) bg-(--hb-orange) transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {status === "uploading" && (
        <p className="text-xs text-(--fg-muted)">{progress}% enviado</p>
      )}

      {status === "error" && error && (
        <p className="text-xs text-(--color-destructive)">{error}</p>
      )}
    </div>
  );
}
