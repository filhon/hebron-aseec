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
import { HelpCircle, Loader2, Paperclip, X } from "lucide-react";
import {
  getLessonAttachmentUploadUrl,
  getLessonAttachmentReadUrl,
} from "../actions/uploads";

type LessonAttachmentMimeType =
  | "application/pdf"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/zip";

const ATTACHMENT_MAX_SIZE_BYTES = 20 * 1024 * 1024;
const ATTACHMENT_ALLOWED_MIME_TYPES: LessonAttachmentMimeType[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
];

// Só é chamada depois que handleAttachmentChange já validou file.type contra
// ATTACHMENT_ALLOWED_MIME_TYPES — a asserção abaixo reflete essa garantia.
async function uploadLessonAttachment(
  file: File,
  courseId: string,
): Promise<string> {
  const urlResult = await getLessonAttachmentUploadUrl({
    fileName: file.name,
    mimeType: file.type as LessonAttachmentMimeType,
    courseId,
  });
  const uploadData = urlResult?.data;
  if (!uploadData) throw new Error("Não foi possível obter URL de upload.");

  const putRes = await fetch(uploadData.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Falha ao enviar anexo para o storage.");

  const readResult = await getLessonAttachmentReadUrl({
    storagePath: uploadData.storagePath,
  });
  const readData = readResult?.data;
  if (!readData) throw new Error("Não foi possível gerar a URL do anexo.");

  return readData.url;
}

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
  const [downloadFileName, setDownloadFileName] = React.useState(
    lesson?.downloadFileName ?? "",
  );
  const [downloadFileSizeBytes, setDownloadFileSizeBytes] = React.useState(
    lesson?.downloadFileSizeBytes ?? null,
  );
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(
    lesson?.downloadUrl ?? null,
  );
  const [uploadStatus, setUploadStatus] = React.useState<
    "idle" | "uploading" | "error"
  >("idle");
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [requiresCompletion, setRequiresCompletion] = React.useState(
    lesson?.requiresCompletion ?? true,
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!(ATTACHMENT_ALLOWED_MIME_TYPES as string[]).includes(file.type)) {
      setUploadStatus("error");
      setUploadError("Formato não suportado. Use PDF, Word ou ZIP.");
      return;
    }
    if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
      setUploadStatus("error");
      setUploadError("Arquivo muito grande. Tamanho máximo: 20 MB.");
      return;
    }

    setDownloadFileName(file.name);
    setDownloadFileSizeBytes(file.size);
    setDownloadUrl(null);
    setUploadStatus("uploading");
    setUploadError(null);

    uploadLessonAttachment(file, courseId)
      .then((url) => {
        setDownloadUrl(url);
        setUploadStatus("idle");
      })
      .catch(() => {
        setUploadStatus("error");
        setUploadError("Falha ao enviar anexo. Tente novamente.");
      });
  }

  function removeAttachment() {
    setDownloadFileName("");
    setDownloadFileSizeBytes(null);
    setDownloadUrl(null);
    setUploadStatus("idle");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (uploadStatus === "uploading") return;

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
      downloadUrl: type === "download" ? downloadUrl : null,
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
        <FormField
          label="Anexo"
          hint="PDF, Word ou ZIP, até 20 MB."
          error={uploadError ?? errors.downloadFileName}
          required
        >
          <div className="flex items-center gap-3 rounded-(--radius) border border-dashed border-(--border) bg-(--bg-alt) px-4 py-3">
            {uploadStatus === "uploading" ? (
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-(--fg-muted)"
                aria-hidden="true"
              />
            ) : (
              <Paperclip
                className="h-4 w-4 shrink-0 text-(--fg-muted)"
                aria-hidden="true"
              />
            )}
            {downloadFileName ? (
              <span className="min-w-0 flex-1 truncate text-sm text-(--fg)">
                {downloadFileName}
                {downloadFileSizeBytes !== null && (
                  <span className="text-(--fg-muted)">
                    {" "}
                    · {formatBytes(downloadFileSizeBytes)}
                  </span>
                )}
                {uploadStatus === "uploading" && (
                  <span className="text-(--fg-muted)"> · enviando…</span>
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
              disabled={uploadStatus === "uploading"}
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
                disabled={uploadStatus === "uploading"}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
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

      <Button
        type="submit"
        disabled={isLoading || uploadStatus === "uploading"}
        loading={isLoading}
      >
        {lesson ? "Salvar alterações" : "Criar aula"}
      </Button>
    </form>
  );
}
