"use client";

import * as React from "react";
import { z } from "zod";
import { Button } from "@hebron/ui";
import { Plus } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Não existe entidade `Note` em `packages/types/plataforma` nem schema em
 * `packages/validators/plataforma` (P-6.1) — mesmo débito já registrado em
 * `note-widget.tsx`. Schema local até o Bloco B adicionar `createNoteSchema`
 * ao pacote compartilhado.
 */
const noteFormSchema = z.object({
  content: z.string().min(1, "Escreva algo antes de salvar").max(2000),
  timestampSeconds: z.number().int().min(0),
});

export interface NoteFormValues {
  content: string;
  timestampSeconds: number;
}

export interface NoteFormProps {
  /** Tempo atual do vídeo (segundos) — vira o timestamp da nota. */
  currentTimeSeconds: number;
  onSubmit: (values: NoteFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Nota pessoal ancorada a um timestamp da aula. */
export function NoteForm({
  currentTimeSeconds,
  onSubmit,
  isLoading = false,
  className,
}: NoteFormProps) {
  const [content, setContent] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = noteFormSchema.safeParse({
      content,
      timestampSeconds: currentTimeSeconds,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }

    setError(undefined);
    onSubmit(result.data);
    setContent("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("flex flex-col gap-2", className)}
    >
      <label className="text-xs font-medium text-(--fg-muted)">
        Nova nota em {formatTimestamp(currentTimeSeconds)}
      </label>
      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva uma anotação sobre este momento da aula…"
          rows={2}
          aria-invalid={error ? true : undefined}
          className="min-w-0 flex-1 resize-none rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
        />
        <Button
          type="submit"
          size="icon-sm"
          aria-label="Adicionar nota"
          disabled={!content.trim() || isLoading}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-(--color-destructive)">
          {error}
        </p>
      )}
    </form>
  );
}
