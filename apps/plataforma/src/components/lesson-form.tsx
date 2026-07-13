"use client";

import * as React from "react";
import type { z } from "zod";
import type { Lesson, LessonType } from "@hebron/types/plataforma";
import { createLessonSchema } from "@hebron/validators";
import {
  FormField,
  Input,
  RichTextEditor,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
} from "@hebron/ui";
import { HelpCircle, Paperclip, X } from "lucide-react";

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

const TYPE_LABEL: Record<LessonType, string> = {
  video: "Vídeo",
  text: "Texto",
  quiz: "Quiz",
  download: "Material para download",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export interface LessonFormValues {
  title: string;
  type: LessonType;
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  textContent: string | null;
  /** Upload real do anexo para storage acontece no Bloco B. */
  downloadFile: File | null;
  downloadUrl: string | null;
  downloadFileName: string | null;
  downloadFileSizeBytes: number | null;
  requiresCompletion: boolean;
}

export interface LessonFormProps {
  moduleId: string;
  courseId: string;
  lesson?: Lesson;
  onSubmit: (values: LessonFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Criar/editar aula (título, tipo, conteúdo/vídeo URL, anexos). */
export function LessonForm({
  moduleId,
  courseId,
  lesson,
  onSubmit,
  isLoading = false,
  className,
}: LessonFormProps) {
  const [title, setTitle] = React.useState(lesson?.title ?? "");
  const [type, setType] = React.useState<LessonType>(lesson?.type ?? "video");
  const [videoUrl, setVideoUrl] = React.useState(lesson?.videoUrl ?? "");
  const [videoDuration, setVideoDuration] = React.useState(
    lesson?.videoDurationSeconds ? String(lesson.videoDurationSeconds) : "",
  );
  const [textContent, setTextContent] = React.useState(
    lesson?.textContent ?? "",
  );
  const [downloadFile, setDownloadFile] = React.useState<File | null>(null);
  const [downloadFileName, setDownloadFileName] = React.useState(
    lesson?.downloadFileName ?? "",
  );
  const [downloadFileSizeBytes, setDownloadFileSizeBytes] = React.useState(
    lesson?.downloadFileSizeBytes ?? null,
  );
  const [requiresCompletion, setRequiresCompletion] = React.useState(
    lesson?.requiresCompletion ?? true,
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sem upload real de storage nesta fase (Bloco A) — a URL local do arquivo
  // apenas satisfaz a validação do schema compartilhado (que exige downloadUrl
  // não nulo). O Bloco B substitui por uma URL real do bucket após o upload.
  const [downloadObjectUrl, setDownloadObjectUrl] = React.useState<
    string | null
  >(lesson?.downloadUrl ?? null);

  React.useEffect(() => {
    if (!downloadFile) return;
    const url = URL.createObjectURL(downloadFile);
    setDownloadObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [downloadFile]);

  function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setDownloadFile(file);
    setDownloadFileName(file?.name ?? "");
    setDownloadFileSizeBytes(file?.size ?? null);
  }

  function removeAttachment() {
    setDownloadFile(null);
    setDownloadFileName("");
    setDownloadFileSizeBytes(null);
    setDownloadObjectUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createLessonSchema.safeParse({
      moduleId,
      courseId,
      title,
      type,
      order: lesson?.order ?? 0,
      videoUrl: type === "video" ? videoUrl || null : null,
      videoDurationSeconds:
        type === "video" && videoDuration ? Number(videoDuration) : null,
      textContent: type === "text" ? textContent || null : null,
      downloadUrl: type === "download" ? downloadObjectUrl : null,
      downloadFileName: type === "download" ? downloadFileName || null : null,
      downloadFileSizeBytes: type === "download" ? downloadFileSizeBytes : null,
      requiresCompletion,
    });

    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    onSubmit({
      title: result.data.title,
      type: result.data.type,
      videoUrl: result.data.videoUrl,
      videoDurationSeconds: result.data.videoDurationSeconds,
      textContent: result.data.textContent,
      downloadFile,
      downloadUrl: result.data.downloadUrl,
      downloadFileName: result.data.downloadFileName,
      downloadFileSizeBytes: result.data.downloadFileSizeBytes,
      requiresCompletion: result.data.requiresCompletion,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-5", className)}
    >
      <FormField label="Título" error={errors.title} required>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormField>

      <FormField label="Tipo de aula" required>
        <Select value={type} onValueChange={(v) => setType(v as LessonType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABEL) as LessonType[]).map((key) => (
              <SelectItem key={key} value={key}>
                {TYPE_LABEL[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {type === "video" && (
        <>
          <FormField label="URL do vídeo" error={errors.videoUrl} required>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://video.hebronaseec.com.br/…"
            />
          </FormField>
          <FormField label="Duração (segundos)">
            <Input
              type="number"
              min={0}
              value={videoDuration}
              onChange={(e) => setVideoDuration(e.target.value)}
            />
          </FormField>
        </>
      )}

      {type === "text" && (
        <FormField label="Conteúdo" error={errors.textContent} required>
          <RichTextEditor value={textContent} onChange={setTextContent} />
        </FormField>
      )}

      {type === "download" && (
        <FormField label="Anexo" error={errors.downloadFileName} required>
          <div className="flex items-center gap-3 rounded-(--radius) border border-dashed border-(--border) bg-(--bg-alt) px-4 py-3">
            <Paperclip
              className="h-4 w-4 shrink-0 text-(--fg-muted)"
              aria-hidden="true"
            />
            {downloadFileName ? (
              <span className="min-w-0 flex-1 truncate text-sm text-(--fg)">
                {downloadFileName}
                {downloadFileSizeBytes !== null && (
                  <span className="text-(--fg-muted)">
                    {" "}
                    · {formatBytes(downloadFileSizeBytes)}
                  </span>
                )}
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
            >
              Selecionar
            </Button>
            {downloadFileName && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remover anexo"
                onClick={removeAttachment}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleAttachmentChange}
              className="sr-only"
              aria-label="Selecionar arquivo do anexo"
            />
          </div>
        </FormField>
      )}

      {type === "quiz" && (
        <div className="flex items-start gap-2.5 rounded-(--radius) border border-(--border) bg-(--surface-alt) px-4 py-3 text-sm text-(--fg-muted)">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Perguntas e nota de aprovação são definidas no editor de quiz, depois
          que esta aula for salva.
        </div>
      )}

      <label className="flex items-center gap-2.5 text-sm text-(--fg)">
        <input
          type="checkbox"
          checked={requiresCompletion}
          onChange={(e) => setRequiresCompletion(e.target.checked)}
          className="h-4 w-4 accent-(--hb-blue)"
        />
        Só desbloqueia após concluir a aula anterior
      </label>

      <Button type="submit" disabled={isLoading} loading={isLoading}>
        {lesson ? "Salvar alterações" : "Criar aula"}
      </Button>
    </form>
  );
}
