"use client";

import * as React from "react";
import type { z } from "zod";
import { Loader2, Music, X } from "lucide-react";
import { createTrackSchema } from "@hebron/validators/radio";
import type { Author, Series } from "@hebron/types/radio";
import {
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";

const AUDIO_MAX_SIZE_BYTES = 200 * 1024 * 1024;
const AUDIO_ALLOWED_MIME_TYPES = ["audio/mpeg", "audio/mp3"];

const NO_SERIES = "__sem_serie__";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export interface TrackUploadFormValues {
  title: string;
  authorId: string;
  seriesId: string | null;
  file: File;
  durationSeconds: number;
}

export interface TrackUploadFormProps {
  authors: Author[];
  series: Series[];
  onSubmit: (values: TrackUploadFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Upload de faixa .mp3 com extração automática de duração (music-metadata). */
export function TrackUploadForm({
  authors,
  series,
  onSubmit,
  isLoading = false,
  className,
}: TrackUploadFormProps) {
  const [title, setTitle] = React.useState("");
  const [authorId, setAuthorId] = React.useState(authors[0]?.id ?? "");
  const [seriesSelectValue, setSeriesSelectValue] = React.useState(NO_SERIES);
  const [file, setFile] = React.useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = React.useState<number | null>(
    null,
  );
  const [analyzeStatus, setAnalyzeStatus] = React.useState<
    "idle" | "analyzing" | "error"
  >("idle");
  const [analyzeError, setAnalyzeError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const availableSeries = series.filter((s) => s.authorId === authorId);

  function handleAuthorChange(value: string) {
    setAuthorId(value);
    if (seriesSelectValue !== NO_SERIES) {
      const stillValid = series.some(
        (s) => s.id === seriesSelectValue && s.authorId === value,
      );
      if (!stillValid) setSeriesSelectValue(NO_SERIES);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;

    const looksLikeMp3 =
      AUDIO_ALLOWED_MIME_TYPES.includes(selected.type) ||
      selected.name.toLowerCase().endsWith(".mp3");
    if (!looksLikeMp3) {
      setFile(null);
      setDurationSeconds(null);
      setAnalyzeStatus("error");
      setAnalyzeError("Formato não suportado. Envie um arquivo .mp3.");
      return;
    }
    if (selected.size > AUDIO_MAX_SIZE_BYTES) {
      setFile(null);
      setDurationSeconds(null);
      setAnalyzeStatus("error");
      setAnalyzeError("Arquivo muito grande. Tamanho máximo: 200 MB.");
      return;
    }

    setFile(selected);
    setDurationSeconds(null);
    setAnalyzeStatus("analyzing");
    setAnalyzeError(null);

    try {
      // music-metadata só é necessária ao escolher o arquivo — carregada sob
      // demanda para ficar fora do bundle inicial do painel (P-9.3). O estado
      // "analyzing" já cobre a espera.
      const { parseBlob } = await import("music-metadata");
      const metadata = await parseBlob(selected);
      const duration = metadata.format.duration;
      if (duration === undefined || !Number.isFinite(duration)) {
        throw new Error("Duração ausente");
      }
      setDurationSeconds(Math.round(duration));
      setAnalyzeStatus("idle");
    } catch {
      setAnalyzeStatus("error");
      setAnalyzeError(
        "Não foi possível ler a duração do arquivo. Tente outro .mp3.",
      );
    }
  }

  function removeFile() {
    setFile(null);
    setDurationSeconds(null);
    setAnalyzeStatus("idle");
    setAnalyzeError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (analyzeStatus === "analyzing") return;

    const seriesId = seriesSelectValue === NO_SERIES ? null : seriesSelectValue;

    const result = createTrackSchema
      .omit({ fileUrl: true, durationSeconds: true })
      .safeParse({ title, authorId, seriesId });

    const errs = result.success ? {} : fieldErrors(result.error);

    if (!file) {
      errs.file = "Selecione um arquivo .mp3";
    } else if (analyzeStatus === "error" || durationSeconds === null) {
      errs.file =
        analyzeError ?? "Não foi possível determinar a duração do arquivo";
    }

    if (!result.success || Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!file || durationSeconds === null) return;

    setErrors({});
    onSubmit({
      title: result.data.title,
      authorId: result.data.authorId,
      seriesId: result.data.seriesId,
      file,
      durationSeconds,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-5", className)}
    >
      <FormField label="Título" error={errors.title} required>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: A justiça de Deus revelada"
        />
      </FormField>

      <FormField label="Autor" error={errors.authorId} required>
        <Select value={authorId} onValueChange={handleAuthorChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um autor" />
          </SelectTrigger>
          <SelectContent>
            {authors.map((author) => (
              <SelectItem key={author.id} value={author.id}>
                {author.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Série"
        hint="Coleção temática à qual esta faixa pertence, se houver."
      >
        <Select value={seriesSelectValue} onValueChange={setSeriesSelectValue}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma série" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SERIES}>Sem série</SelectItem>
            {availableSeries.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Arquivo de áudio"
        hint="MP3, até 200 MB. A duração é extraída automaticamente."
        error={errors.file}
        required
      >
        <div className="flex items-center gap-3 rounded-(--radius) border border-dashed border-(--border) bg-(--bg-alt) px-4 py-3">
          {analyzeStatus === "analyzing" ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-(--fg-muted)"
              aria-hidden="true"
            />
          ) : (
            <Music
              className="h-4 w-4 shrink-0 text-(--fg-muted)"
              aria-hidden="true"
            />
          )}

          {file ? (
            <span className="min-w-0 flex-1 truncate text-sm text-(--fg)">
              {file.name}
              <span className="text-(--fg-muted)">
                {" "}
                · {formatBytes(file.size)}
                {analyzeStatus === "analyzing" && " · analisando…"}
                {durationSeconds !== null &&
                  ` · ${formatDuration(durationSeconds)}`}
              </span>
            </span>
          ) : (
            <span className="flex-1 text-sm text-(--fg-muted)">
              Nenhum arquivo selecionado
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzeStatus === "analyzing"}
          >
            Selecionar
          </Button>
          {file && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remover arquivo"
              onClick={removeFile}
              disabled={analyzeStatus === "analyzing"}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,audio/mpeg,audio/mp3"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Selecionar arquivo de áudio"
          />
        </div>
      </FormField>

      <Button
        type="submit"
        disabled={isLoading || analyzeStatus === "analyzing"}
        loading={isLoading}
      >
        Enviar faixa
      </Button>
    </form>
  );
}
