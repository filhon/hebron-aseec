"use client";

import * as React from "react";
import type { LessonDiscussionPost } from "../lib/queries";
import { Avatar, Button, EmptyState } from "@hebron/ui";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { DiscussionPostForm } from "./discussion-post-form";

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

interface PostBubbleProps {
  post: LessonDiscussionPost;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (content: string) => void;
  onDelete: () => void;
  isMutating?: boolean;
  className?: string;
}

/** Autor edita/remove o próprio post; super_admin remove qualquer post
 * (moderação, discussion_posts_mutate_admin — RLS já autoriza, faltava a
 * porta de entrada na UI, P-6.4b). "· editado" só aparece quando
 * updatedAt vem preenchido (updateDiscussionPost é o único caminho que o
 * grava). */
function PostBubble({
  post,
  editing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isMutating = false,
  className,
}: PostBubbleProps) {
  const [draft, setDraft] = React.useState(post.content);

  React.useEffect(() => {
    if (editing) setDraft(post.content);
  }, [editing, post.content]);

  const canDelete = post.isOwnPost || post.canModerate;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Avatar name={post.authorName} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1 rounded-(--radius) bg-(--surface-alt) px-3.5 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-(--fg)">
            {post.authorName}
          </span>
          <span className="text-xs text-(--fg-muted)">
            {relativeTime(post.createdAt)}
            {post.updatedAt && " · editado"}
          </span>
        </div>

        {editing ? (
          <div className="mt-1.5 flex flex-col gap-1.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              autoFocus
              className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) outline-none transition-colors focus:border-(--brand)"
            />
            <div className="flex gap-3">
              <Button
                type="button"
                size="sm"
                disabled={!draft.trim() || isMutating}
                loading={isMutating}
                onClick={() => onSaveEdit(draft.trim())}
              >
                Salvar
              </Button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="text-xs text-(--fg-muted) hover:text-(--fg)"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-0.5 text-sm leading-relaxed text-(--fg)">
              {post.content}
            </p>
            {canDelete && (
              <div className="mt-1 flex gap-1">
                {post.isOwnPost && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar comentário"
                    disabled={isMutating}
                    onClick={onStartEdit}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover comentário"
                    disabled={isMutating}
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export interface DiscussionThreadProps {
  lessonId: string;
  posts: LessonDiscussionPost[];
  onSubmit: (content: string, parentPostId: string | null) => void;
  onUpdatePost: (postId: string, content: string) => void;
  onDeletePost: (postId: string) => void;
  isLoading?: boolean;
  isMutatingPost?: boolean;
  className?: string;
}

/** Fórum de discussão por aula (BRAIN §6.3) — lista de comentários com uma
 * camada de respostas, mais o formulário de novo comentário/resposta
 * (DiscussionPostForm, P-6.4). */
export function DiscussionThread({
  lessonId,
  posts,
  onSubmit,
  onUpdatePost,
  onDeletePost,
  isLoading = false,
  isMutatingPost = false,
  className,
}: DiscussionThreadProps) {
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const rootPosts = posts
    .filter((p) => !p.parentPostId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  function repliesOf(postId: string) {
    return posts
      .filter((p) => p.parentPostId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  function handleSaveEdit(postId: string, content: string) {
    onUpdatePost(postId, content);
    setEditingId(null);
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
              <PostBubble
                post={post}
                editing={editingId === post.id}
                onStartEdit={() => setEditingId(post.id)}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={(content) => handleSaveEdit(post.id, content)}
                onDelete={() => onDeletePost(post.id)}
                isMutating={isMutatingPost}
              />

              {repliesOf(post.id).map((reply) => (
                <PostBubble
                  key={reply.id}
                  post={reply}
                  editing={editingId === reply.id}
                  onStartEdit={() => setEditingId(reply.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={(content) => handleSaveEdit(reply.id, content)}
                  onDelete={() => onDeletePost(reply.id)}
                  isMutating={isMutatingPost}
                  className="ml-10"
                />
              ))}

              <div className="ml-10">
                {replyingToId === post.id ? (
                  <DiscussionPostForm
                    lessonId={lessonId}
                    parentPostId={post.id}
                    parentAuthorName={post.authorName}
                    placeholder="Escreva uma resposta…"
                    autoFocus
                    isLoading={isLoading}
                    onCancel={() => setReplyingToId(null)}
                    onSubmit={(values) => {
                      onSubmit(values.content, values.parentPostId ?? post.id);
                      setReplyingToId(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setReplyingToId(post.id)}
                    className="text-xs font-medium text-(--fg-muted) hover:text-(--brand)"
                  >
                    Responder
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DiscussionPostForm
        lessonId={lessonId}
        placeholder="Escreva um comentário sobre esta aula…"
        isLoading={isLoading}
        onSubmit={(values) =>
          onSubmit(values.content, values.parentPostId ?? null)
        }
      />
    </div>
  );
}
