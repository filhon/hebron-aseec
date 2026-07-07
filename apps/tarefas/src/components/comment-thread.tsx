"use client";

import { type ReactNode, useState } from "react";
import type { Comment } from "@hebron/types/tarefas";
import { Avatar, EmptyState } from "@hebron/ui";
import { Send, AtSign, MessageSquare } from "lucide-react";

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
  currentUserName?: string;
  onSubmit?: (content: string, mentions: string[]) => void;
  className?: string;
}

export function CommentThread({
  comments,
  people,
  currentUserName,
  onSubmit,
  className,
}: CommentThreadProps) {
  const [content, setContent] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [pendingMentions, setPendingMentions] = useState<Set<string>>(
    new Set(),
  );

  const sorted = [...comments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(mentionFilter),
  );

  function handleChange(value: string) {
    setContent(value);
    const match = /@([^\s@]*)$/.exec(value);
    if (match) {
      setShowMentions(true);
      setMentionFilter(match[1]?.toLowerCase() ?? "");
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(person: CommentThreadPerson) {
    setContent((prev) => `${prev.replace(/@([^\s@]*)$/, "")}@${person.name} `);
    setPendingMentions((prev) => new Set(prev).add(person.id));
    setShowMentions(false);
  }

  function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed, [...pendingMentions]);
    setContent("");
    setPendingMentions(new Set());
    setShowMentions(false);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {sorted.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhum comentário ainda"
          description="Use @ para mencionar um colega e ele será notificado."
          hideQuote
        />
      ) : (
        <ul className="flex flex-col gap-4">
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
      )}

      <div className="relative flex items-start gap-3 border-t border-(--divider) pt-4">
        <Avatar name={currentUserName ?? "?"} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-end gap-2 rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 transition-colors focus-within:border-(--hb-blue)">
            <textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Escreva um comentário — use @ para mencionar"
              rows={2}
              className="min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-(--fg-muted)"
            />
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--hb-blue) text-(--fg-invert) transition-colors hover:bg-(--hb-blue-soft) disabled:opacity-40"
              aria-label="Enviar comentário"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

          {showMentions && filteredPeople.length > 0 && (
            <div className="absolute z-(--z-dropdown) mt-1 w-64 overflow-hidden rounded-(--radius) border border-(--border) bg-(--bg) shadow-(--shadow-md)">
              <p className="flex items-center gap-1.5 border-b border-(--divider) px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-(--fg-muted)">
                <AtSign className="h-3 w-3" />
                Mencionar
              </p>
              {filteredPeople.slice(0, 6).map((person) => (
                <button
                  key={person.id}
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
        </div>
      </div>
    </div>
  );
}
