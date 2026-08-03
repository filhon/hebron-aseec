"use client";

import { useId, useState } from "react";
import {
  createCommentSchema,
  type CreateCommentInput,
} from "@hebron/validators/tarefas";
import { Avatar, FormField } from "@hebron/ui";
import { AtSign, Send } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export interface CommentFormPerson {
  id: string;
  name: string;
}

export interface CommentFormProps {
  taskId: string;
  people: CommentFormPerson[];
  onSubmit: (values: CreateCommentInput) => void;
  isLoading?: boolean;
  className?: string;
}

export function CommentForm({
  taskId,
  people,
  onSubmit,
  isLoading = false,
  className,
}: CommentFormProps) {
  const fieldId = useId();
  const [content, setContent] = useState("");
  const [mentionFilter, setMentionFilter] = useState<string | null>(null);
  const [pendingMentions, setPendingMentions] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | undefined>();

  const suggestions =
    mentionFilter === null
      ? []
      : people.filter((p) => p.name.toLowerCase().includes(mentionFilter));

  function handleChange(value: string) {
    setContent(value);
    setError(undefined);
    const match = /@([^\s@]*)$/.exec(value);
    setMentionFilter(match ? (match[1]?.toLowerCase() ?? "") : null);
  }

  function insertMention(person: CommentFormPerson) {
    setContent((prev) => `${prev.replace(/@([^\s@]*)$/, "")}@${person.name} `);
    setPendingMentions((prev) => new Set(prev).add(person.id));
    setMentionFilter(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mentions = people
      .filter(
        (p) => pendingMentions.has(p.id) && content.includes(`@${p.name}`),
      )
      .map((p) => p.id);
    const result = createCommentSchema.safeParse({ taskId, content, mentions });
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    onSubmit(result.data);
    setContent("");
    setPendingMentions(new Set());
    setMentionFilter(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("relative flex flex-col gap-2", className)}
    >
      <FormField id={fieldId} error={error}>
        <div className="flex items-end gap-2 rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 transition-colors focus-within:border-(--hb-blue)">
          <textarea
            id={fieldId}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Escreva um comentário — use @ para mencionar"
            rows={2}
            className="min-w-0 flex-1 resize-none bg-transparent text-sm text-(--fg) outline-none placeholder:text-(--fg-muted)"
          />
          <button
            type="submit"
            disabled={!content.trim() || isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--hb-blue) text-(--fg-invert) transition-colors hover:bg-(--hb-blue-soft) disabled:opacity-40"
            aria-label="Enviar comentário"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </FormField>

      {mentionFilter !== null && suggestions.length > 0 && (
        <div className="absolute top-full z-(--z-dropdown) mt-1 w-64 overflow-hidden rounded-(--radius) border border-(--border) bg-(--bg) shadow-(--shadow-md)">
          <p className="flex items-center gap-1.5 border-b border-(--divider) px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-(--fg-muted)">
            <AtSign className="h-3 w-3" aria-hidden="true" />
            Mencionar
          </p>
          {suggestions.slice(0, 6).map((person) => (
            <button
              key={person.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMention(person)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--fg) transition-colors hover:bg-(--surface-alt)"
            >
              <Avatar
                name={person.name}
                size="sm"
                className="h-5 w-5 text-[9px]"
              />
              {person.name}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
