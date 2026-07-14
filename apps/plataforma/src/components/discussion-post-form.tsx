"use client";

import * as React from "react";
import {
  createDiscussionPostSchema,
  type CreateDiscussionPostInput,
} from "@hebron/validators";
import { Button } from "@hebron/ui";
import { Send } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export interface DiscussionPostFormProps {
  lessonId: string;
  /** Preenchido quando o post é uma resposta a outro (thread aninhada). */
  parentPostId?: string | null;
  parentAuthorName?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit: (values: CreateDiscussionPostInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

/** Post no fórum de discussão de uma aula — comentário raiz ou resposta. */
export function DiscussionPostForm({
  lessonId,
  parentPostId = null,
  parentAuthorName,
  placeholder = "Escreva um comentário sobre esta aula…",
  autoFocus = false,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}: DiscussionPostFormProps) {
  const [content, setContent] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createDiscussionPostSchema.safeParse({
      lessonId,
      content,
      parentPostId,
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
      className={cn("space-y-1.5", className)}
    >
      {parentAuthorName && (
        <p className="text-xs text-(--fg-muted)">
          Respondendo a{" "}
          <span className="font-medium">
            {parentAuthorName}
          </span>
        </p>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={2}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          className="min-w-0 flex-1 resize-none rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
        />
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button
            type="submit"
            size="icon-sm"
            aria-label="Enviar comentário"
            disabled={!content.trim() || isLoading}
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-(--fg-muted) hover:text-(--fg)"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-(--color-destructive)">
          {error}
        </p>
      )}
    </form>
  );
}
