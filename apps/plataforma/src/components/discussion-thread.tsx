"use client";

import * as React from "react";
import type { DiscussionPost } from "@hebron/types/plataforma";
import { Avatar, EmptyState } from "@hebron/ui";
import { MessageSquare, Send } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
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

interface ComposerProps {
  placeholder: string;
  autoFocus?: boolean;
  isLoading?: boolean;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
}

function Composer({
  placeholder,
  autoFocus,
  isLoading,
  onSubmit,
  onCancel,
}: ComposerProps) {
  const [content, setContent] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 resize-none rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
      />
      <div className="flex shrink-0 flex-col gap-1.5">
        <button
          type="submit"
          disabled={!content.trim() || isLoading}
          aria-label="Enviar comentário"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-(--brand) text-(--brand-fg) transition-colors hover:bg-(--hb-blue-soft) disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
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
    </form>
  );
}

interface PostBubbleProps {
  post: DiscussionPost;
  className?: string;
}

function PostBubble({ post, className }: PostBubbleProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Avatar name={post.authorName} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1 rounded-(--radius) bg-(--surface-alt) px-3.5 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-(--font-weight-semibold) text-(--fg)">
            {post.authorName}
          </span>
          <span className="text-xs text-(--fg-muted)">
            {relativeTime(post.createdAt)}
            {post.updatedAt && " · editado"}
          </span>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-(--fg)">
          {post.content}
        </p>
      </div>
    </div>
  );
}

export interface DiscussionThreadProps {
  posts: DiscussionPost[];
  onSubmit: (content: string, parentPostId: string | null) => void;
  isLoading?: boolean;
  className?: string;
}

/** Fórum de discussão por aula (BRAIN §6.3) — lista de comentários com uma
 * camada de respostas, mais o formulário de novo comentário/resposta. */
export function DiscussionThread({
  posts,
  onSubmit,
  isLoading = false,
  className,
}: DiscussionThreadProps) {
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);

  const rootPosts = posts
    .filter((p) => !p.parentPostId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  function repliesOf(postId: string) {
    return posts
      .filter((p) => p.parentPostId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {rootPosts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhum comentário ainda"
          description="Seja o primeiro a comentar sobre esta aula."
          hideQuote
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {rootPosts.map((post) => (
            <li key={post.id} className="space-y-2.5">
              <PostBubble post={post} />

              {repliesOf(post.id).map((reply) => (
                <PostBubble key={reply.id} post={reply} className="ml-10" />
              ))}

              <div className="ml-10">
                {replyingToId === post.id ? (
                  <Composer
                    placeholder="Escreva uma resposta…"
                    autoFocus
                    isLoading={isLoading}
                    onCancel={() => setReplyingToId(null)}
                    onSubmit={(content) => {
                      onSubmit(content, post.id);
                      setReplyingToId(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setReplyingToId(post.id)}
                    className="text-xs font-(--font-weight-medium) text-(--fg-muted) hover:text-(--brand)"
                  >
                    Responder
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Composer
        placeholder="Escreva um comentário sobre esta aula…"
        isLoading={isLoading}
        onSubmit={(content) => onSubmit(content, null)}
      />
    </div>
  );
}
