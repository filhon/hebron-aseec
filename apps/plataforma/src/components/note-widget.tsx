"use client";

import * as React from "react";
import { Button, EmptyState } from "@hebron/ui";
import { Pencil, StickyNote, Trash2 } from "lucide-react";
import { NoteForm } from "./note-form";

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
 * Não existe entidade `Note` em `packages/types/plataforma` (P-6.1) — o
 * escopo de anotações no vídeo não foi coberto pelos tipos/schemas. Definido
 * localmente aqui; registrado como débito em SESSIONS.md para o backend
 * (P-6.6+) adicionar `Note` ao pacote compartilhado.
 */
export interface LessonNote {
  id: string;
  timestampSeconds: number;
  content: string;
  createdAt: Date;
}

export interface NoteWidgetProps {
  notes: LessonNote[];
  /** Tempo atual do vídeo (segundos) — usado como timestamp da próxima nota. */
  currentTimeSeconds: number;
  onAddNote: (content: string, timestampSeconds: number) => void;
  onUpdateNote: (noteId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onNoteClick?: (note: LessonNote) => void;
  isLoading?: boolean;
  /** Uma edição/remoção de nota em andamento (P-6.4b) — desabilita os
   * botões de editar/remover enquanto a Server Action correspondente roda. */
  isMutating?: boolean;
  className?: string;
}

/** Painel de notas por aula — cada nota fica ancorada a um minuto do vídeo e
 * é clicável para levar o player até aquele ponto. Todas as notas aqui já
 * são do próprio usuário (getLessonPageData filtra por autor) — editar/
 * remover não precisa de checagem de dono na UI, só na Server Action
 * (defesa em profundidade, P-6.4b). */
export function NoteWidget({
  notes,
  currentTimeSeconds,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onNoteClick,
  isLoading = false,
  isMutating = false,
  className,
}: NoteWidgetProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  const sortedNotes = [...notes].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds,
  );

  function startEdit(note: LessonNote) {
    setEditingId(note.id);
    setDraft(note.content);
  }

  function saveEdit(noteId: string) {
    const content = draft.trim();
    if (!content) return;
    onUpdateNote(noteId, content);
    setEditingId(null);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <NoteForm
        currentTimeSeconds={currentTimeSeconds}
        onSubmit={(values) =>
          onAddNote(values.content, values.timestampSeconds)
        }
        isLoading={isLoading}
      />

      {sortedNotes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Nenhuma nota nesta aula"
          description="Suas anotações ficam vinculadas ao minuto do vídeo."
          hideQuote
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sortedNotes.map((note) => (
            <li
              key={note.id}
              className="flex items-start gap-2.5 rounded-sm px-2.5 py-2 transition-colors hover:bg-(--surface-alt)"
            >
              <span className="mt-0.5 shrink-0 rounded-xs bg-(--brand-muted) px-1.5 py-0.5 font-mono text-xs text-(--brand)">
                {formatTimestamp(note.timestampSeconds)}
              </span>

              {editingId === note.id ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
                      onClick={() => saveEdit(note.id)}
                    >
                      Salvar
                    </Button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-(--fg-muted) hover:text-(--fg)"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onNoteClick?.(note)}
                    className="min-w-0 flex-1 text-left text-sm leading-relaxed text-(--fg)"
                  >
                    {note.content}
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar nota"
                      disabled={isMutating}
                      onClick={() => startEdit(note)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover nota"
                      disabled={isMutating}
                      onClick={() => onDeleteNote(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
