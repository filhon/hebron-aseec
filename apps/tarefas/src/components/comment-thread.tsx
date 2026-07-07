"use client";

import type { ReactNode } from "react";
import type { Comment } from "@hebron/types/tarefas";
import { Avatar, EmptyState } from "@hebron/ui";
import { MessageSquare } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export interface CommentThreadPerson {
  id: string;
  name: string;
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

function renderMentionedContent(
  content: string,
  mentions: string[],
  people: CommentThreadPerson[],
): ReactNode[] {
  let parts: ReactNode[] = [content];

  for (const userId of mentions) {
    const person = people.find((p) => p.id === userId);
    if (!person) continue;
    const needle = `@${person.name}`;

    parts = parts.flatMap((part, partIdx) => {
      if (typeof part !== "string") return [part];
      const segments = part.split(needle);
      const result: ReactNode[] = [];
      segments.forEach((segment, i) => {
        if (segment) result.push(segment);
        if (i < segments.length - 1) {
          result.push(
            <span
              key={`${userId}-${partIdx}-${i}`}
              className="font-semibold text-(--hb-blue)"
            >
              {needle}
            </span>,
          );
        }
      });
      return result;
    });
  }

  return parts;
}

export interface CommentThreadProps {
  comments: Comment[];
  people: CommentThreadPerson[];
  className?: string;
}

/** Lista de comentários — a composição de um novo comentário é feita pelo
 * `CommentForm` (componente irmão), renderizado junto pela tela de detalhe. */
export function CommentThread({
  comments,
  people,
  className,
}: CommentThreadProps) {
  const sorted = [...comments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Nenhum comentário ainda"
        description="Use @ para mencionar um colega e ele será notificado."
        hideQuote
      />
    );
  }

  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {sorted.map((comment) => (
        <li key={comment.id} className="flex items-start gap-3">
          <Avatar name={comment.authorName} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1 rounded-(--radius) bg-(--surface-alt) px-3.5 py-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold text-(--fg)">
                {comment.authorName}
              </span>
              <span className="text-xs text-(--fg-muted)">
                {relativeTime(comment.createdAt)}
                {comment.updatedAt && " · editado"}
              </span>
            </div>
            <p className="mt-0.5 text-sm leading-relaxed text-(--fg)">
              {renderMentionedContent(
                comment.content,
                comment.mentions,
                people,
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
