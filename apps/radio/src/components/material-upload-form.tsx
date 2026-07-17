"use client";

import * as React from "react";
import type { z } from "zod";
import { Upload, X } from "lucide-react";
import { createExclusiveMaterialSchema } from "@hebron/validators/radio";
import { Button, FormField, Input } from "@hebron/ui";

const MATERIAL_MAX_SIZE_BYTES = 20 * 1024 * 1024;
const MATERIAL_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
];

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

export interface MaterialUploadFormValues {
  title: string;
  description: string;
  file: File;
  requiresTerm: boolean;
}

export interface MaterialUploadFormProps {
  onSubmit: (values: MaterialUploadFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Upload de material exclusivo (título, arquivo, descrição, termo de uso). */
export function MaterialUploadForm({
  onSubmit,
  isLoading = false,
  className,
}: MaterialUploadFormProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [requiresTerm, setRequiresTerm] = React.useState(true);
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;

    if (!(MATERIAL_ALLOWED_MIME_TYPES as string[]).includes(selected.type)) {
      setFileError("Formato não suportado. Use PDF, Word ou ZIP.");
      return;
    }
    if (selected.size > MATERIAL_MAX_SIZE_BYTES) {
      setFileError("Arquivo muito grande. Tamanho máximo: 20 MB.");
      return;
    }

    setFile(selected);
    setFileError(null);
  }

  function removeFile() {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createExclusiveMaterialSchema
      .omit({ fileUrl: true })
      .safeParse({ title, requiresTerm });

    const errs = result.success ? {} : fieldErrors(result.error);
    if (!file) errs.file = "Selecione um arquivo";

    if (!result.success || Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!file) return;

    setErrors({});
    onSubmit({
      title: result.data.title,
      description: description.trim(),
      file,
      requiresTerm: result.data.requiresTerm,
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
          placeholder="Ex.: Guia de estudo — Romanos"
        />
      </FormField>

      <FormField
        label="Descrição"
        error={errors.description}
        hint="Explique o conteúdo do material."
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
          placeholder="Opcional"
        />
      </FormField>

      <FormField
        label="Arquivo"
        hint="PDF, Word ou ZIP, até 20 MB."
        error={fileError ?? errors.file}
        required
      >
        <div className="flex items-center gap-3 rounded-(--radius) border border-dashed border-(--border) bg-(--bg-alt) px-4 py-3">
          <Upload
            className="h-4 w-4 shrink-0 text-(--fg-muted)"
            aria-hidden="true"
          />
          {file ? (
            <span className="min-w-0 flex-1 truncate text-sm text-(--fg)">
              {file.name}{" "}
              <span className="text-(--fg-muted)">
                · {formatBytes(file.size)}
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
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Selecionar arquivo do material"
          />
        </div>
      </FormField>

      <label className="flex items-center gap-2.5 text-sm text-(--fg)">
        <input
          type="checkbox"
          checked={requiresTerm}
          onChange={(e) => setRequiresTerm(e.target.checked)}
          className="h-4 w-4 accent-(--hb-blue)"
        />
        Requer aceite do termo de uso antes do download
      </label>

      <Button type="submit" disabled={isLoading} loading={isLoading}>
        Enviar material
      </Button>
    </form>
  );
}
