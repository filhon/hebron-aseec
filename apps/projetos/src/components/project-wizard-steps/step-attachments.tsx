"use client";

import { useRef, useState } from "react";
import {
  Upload,
  Video,
  FileSpreadsheet,
  FileText,
  X,
  AlertCircle,
  Check,
  Clock,
} from "lucide-react";
import type { WizardFiles, WizardErrors } from "../project-wizard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler o vídeo"));
    };
    video.src = url;
  });
}

// ─── AttachmentSlot ───────────────────────────────────────────────────────────

interface AttachmentSlotProps {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  accept: string;
  file: File | null;
  error?: string;
  required?: boolean;
  hint?: string;
  onFile: (file: File | null) => void;
  onError?: (msg: string | null) => void;
  renderPreview?: (file: File) => React.ReactNode;
}

function AttachmentSlot({
  id,
  label,
  description,
  icon: Icon,
  accept,
  file,
  error,
  required,
  hint,
  onFile,
  onError,
  renderPreview,
}: AttachmentSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleRemove() {
    onFile(null);
    onError?.(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      className="rounded-[--radius-md] border overflow-hidden"
      style={{
        borderColor: error ? "var(--color-destructive)" : "var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: "var(--surface-alt)" }}
      >
        <div
          className="w-9 h-9 rounded-[--radius] flex items-center justify-center shrink-0"
          style={{
            backgroundColor: file
              ? "var(--hb-green-muted)"
              : "var(--hb-gray-50)",
          }}
        >
          {file ? (
            <Check
              className="w-4 h-4"
              style={{ color: "var(--hb-green)" }}
              aria-hidden
            />
          ) : (
            <Icon
              className="w-4 h-4"
              style={{ color: "var(--fg-muted)" }}
              aria-hidden
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
            {label}
            {required && (
              <span
                className="ml-0.5"
                style={{ color: "var(--color-destructive)" }}
                aria-hidden
              >
                *
              </span>
            )}
          </p>
          <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
            {description}
          </p>
        </div>
        {file ? (
          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Remover ${label}`}
            className="shrink-0 rounded-full p-1 transition-colors"
            style={{ color: "var(--fg-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-destructive)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--fg-muted)";
            }}
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 rounded-[--radius] border px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--fg-muted)",
              backgroundColor: "var(--surface)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "var(--brand)";
              el.style.color = "var(--brand)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "var(--border)";
              el.style.color = "var(--fg-muted)";
            }}
          >
            Selecionar
          </button>
        )}
      </div>

      {/* File info or preview */}
      {file && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          {renderPreview ? (
            renderPreview(file)
          ) : (
            <div className="flex items-center gap-3">
              <FileText
                className="w-4 h-4 shrink-0"
                style={{ color: "var(--hb-blue)" }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--fg)" }}
                >
                  {file.name}
                </p>
                <p className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
                  {formatBytes(file.size)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drop zone (shown when no file) */}
      {!file && (
        <label
          htmlFor={id}
          className="flex flex-col items-center gap-2 py-6 px-4 cursor-pointer border-t border-dashed"
          style={{ borderColor: "var(--border)" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files[0];
            if (dropped) onFile(dropped);
          }}
        >
          <Upload
            className="w-5 h-5"
            style={{ color: "var(--fg-subtle)" }}
            aria-hidden
          />
          <span
            className="text-xs text-center"
            style={{ color: "var(--fg-muted)" }}
          >
            Arraste o arquivo aqui ou clique em{" "}
            <span style={{ color: "var(--hb-blue)" }}>Selecionar</span>
            {hint && (
              <>
                <br />
                <span style={{ color: "var(--fg-subtle)" }}>{hint}</span>
              </>
            )}
          </span>
        </label>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 border-t"
          style={{
            borderColor: "var(--color-destructive)",
            backgroundColor: "var(--color-destructive-muted)",
          }}
        >
          <AlertCircle
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: "var(--color-destructive)" }}
            aria-hidden
          />
          <p className="text-xs" style={{ color: "var(--color-destructive)" }}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── VideoPreview ─────────────────────────────────────────────────────────────

function VideoPreview({ file }: { file: File }) {
  const url = URL.createObjectURL(file);
  return (
    <div className="flex items-start gap-3">
      <video
        src={url}
        className="w-24 h-16 object-cover rounded-[--radius] shrink-0"
        preload="metadata"
        muted
        playsInline
        aria-label={`Pré-visualização de ${file.name}`}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium truncate"
          style={{ color: "var(--fg)" }}
        >
          {file.name}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--fg-muted)" }}>
          {formatBytes(file.size)}
        </p>
        <p
          className="text-[11px] flex items-center gap-1 mt-0.5"
          style={{ color: "var(--hb-green)" }}
        >
          <Check className="w-3 h-3" aria-hidden />
          Duração verificada (máx. 3 min)
        </p>
      </div>
    </div>
  );
}

// ─── StepAttachments ─────────────────────────────────────────────────────────

interface AttachmentsStepProps {
  files: WizardFiles;
  onFileChange: (patch: Partial<WizardFiles>) => void;
  errors: WizardErrors;
}

export function StepAttachments({
  files,
  onFileChange,
  errors,
}: AttachmentsStepProps) {
  const [videoError, setVideoError] = useState<string | null>(null);
  const [checkingVideo, setCheckingVideo] = useState(false);

  async function handleVideoFile(file: File | null) {
    if (!file) {
      onFileChange({ video: null });
      setVideoError(null);
      return;
    }

    setCheckingVideo(true);
    try {
      const duration = await getVideoDuration(file);
      if (duration > 180) {
        setVideoError(
          `Vídeo com ${formatDuration(duration)} — máximo permitido é 3:00 (3 minutos).`,
        );
        onFileChange({ video: null });
      } else {
        setVideoError(null);
        onFileChange({ video: file });
      }
    } catch {
      setVideoError(
        "Não foi possível verificar a duração. Tente outro formato.",
      );
    } finally {
      setCheckingVideo(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--fg-muted)" }}
      >
        Envie os anexos do projeto. A carta de recomendação é obrigatória; vídeo
        e planilha são altamente recomendados para fortalecer a análise.
      </p>

      {/* Video */}
      <div>
        <AttachmentSlot
          id="file-video"
          label="Vídeo de Apresentação"
          description="Apresente o projeto em até 3 minutos"
          icon={Video}
          accept="video/mp4,video/quicktime,video/webm,video/*"
          file={files.video}
          error={videoError ?? undefined}
          hint="MP4, MOV ou WebM · máx. 3 min"
          onFile={(f) => {
            void handleVideoFile(f);
          }}
          onError={(msg) => setVideoError(msg)}
          renderPreview={(f) => <VideoPreview file={f} />}
        />
        {checkingVideo && (
          <div className="flex items-center gap-2 mt-2">
            <Clock
              className="w-3.5 h-3.5 animate-spin"
              style={{ color: "var(--hb-blue)" }}
              aria-hidden
            />
            <p className="text-xs" style={{ color: "var(--hb-blue)" }}>
              Verificando duração do vídeo…
            </p>
          </div>
        )}
      </div>

      {/* Spreadsheet */}
      <AttachmentSlot
        id="file-spreadsheet"
        label="Planilha de Orçamento"
        description="Detalhamento completo das despesas previstas"
        icon={FileSpreadsheet}
        accept=".xlsx,.xls,.ods,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet,application/pdf"
        file={files.spreadsheet}
        error={errors.spreadsheet}
        hint="Excel, ODS ou PDF · máx. 10 MB"
        onFile={(f) => onFileChange({ spreadsheet: f })}
      />

      {/* Letter */}
      <AttachmentSlot
        id="file-letter"
        label="Carta de Recomendação"
        description="Assinada por liderança reconhecida (PDF)"
        icon={FileText}
        accept=".pdf,application/pdf"
        file={files.letter}
        required
        hint="PDF · máx. 5 MB"
        onFile={(f) => onFileChange({ letter: f })}
      />

      {/* Status summary */}
      {(files.video ?? files.spreadsheet ?? files.letter) && (
        <div
          className="rounded-[--radius] border px-4 py-3 flex flex-col gap-1.5"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-alt)",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--fg-muted)" }}
          >
            Anexos carregados
          </p>
          {[
            { key: "video", label: "Vídeo", file: files.video },
            { key: "spreadsheet", label: "Planilha", file: files.spreadsheet },
            {
              key: "letter",
              label: "Carta de Recomendação",
              file: files.letter,
            },
          ].map(({ key, label, file }) => (
            <div key={key} className="flex items-center gap-2">
              {file ? (
                <Check
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: "var(--hb-green)" }}
                  aria-hidden
                />
              ) : (
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 shrink-0"
                  style={{ borderColor: "var(--border)" }}
                  aria-hidden
                />
              )}
              <span
                className="text-xs"
                style={{
                  color: file ? "var(--fg)" : "var(--fg-muted)",
                  fontWeight: file ? 500 : 400,
                }}
              >
                {label}
                {file && (
                  <span className="ml-1.5" style={{ color: "var(--fg-muted)" }}>
                    — {file.name}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
