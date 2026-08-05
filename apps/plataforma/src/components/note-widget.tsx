"use client";

import { EmptyState } from "@hebron/ui";
import { StickyNote } from "lucide-react";
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
  onNoteClick?: (note: LessonNote) => void;
  isLoading?: boolean;
  className?: string;
}

/** Painel de notas por aula — cada nota fica ancorada a um minuto do vídeo e
 * é clicável para levar o player até aquele ponto. */
export function NoteWidget({
  notes,
  currentTimeSeconds,
  onAddNote,
  onNoteClick,
  isLoading = false,
  className,
}: NoteWidgetProps) {
  const sortedNotes = [...notes].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds,
  );

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
            <li key={note.id}>
              <button
                type="button"
                onClick={() => onNoteClick?.(note)}
                className="flex w-full items-start gap-2.5 rounded-sm px-2.5 py-2 text-left transition-colors hover:bg-(--surface-alt)"
              >
                <span className="mt-0.5 shrink-0 rounded-xs bg-(--brand-muted) px-1.5 py-0.5 font-(family-name:--font-mono) text-xs text-(--brand)">
                  {formatTimestamp(note.timestampSeconds)}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-relaxed text-(--fg)">
                  {note.content}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
