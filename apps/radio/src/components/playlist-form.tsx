"use client";

import * as React from "react";
import type { z } from "zod";
import { GripVertical, Plus, X } from "lucide-react";
import { createPlaylistSchema } from "@hebron/validators/radio";
import type { Playlist, Track } from "@hebron/types/radio";
import { Button, FormField, Input } from "@hebron/ui";

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

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export interface PlaylistFormValues {
  name: string;
  trackIds: string[];
  loop: boolean;
}

export interface PlaylistFormProps {
  tracks: Track[];
  playlist?: Playlist;
  onSubmit: (values: PlaylistFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Criar/editar playlist (nome, faixas reordenáveis via drag-drop, repetição). */
export function PlaylistForm({
  tracks,
  playlist,
  onSubmit,
  isLoading = false,
  className,
}: PlaylistFormProps) {
  const [name, setName] = React.useState(playlist?.name ?? "");
  const [loop, setLoop] = React.useState(playlist?.loop ?? true);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    playlist?.tracks.map((t) => t.id) ?? [],
  );
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const trackById = React.useMemo(
    () => new Map(tracks.map((t) => [t.id, t])),
    [tracks],
  );
  const selectedTracks = selectedIds
    .map((id) => trackById.get(id))
    .filter((t): t is Track => t !== undefined);
  const availableTracks = tracks.filter((t) => !selectedIds.includes(t.id));

  function addTrack(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function removeTrack(id: string) {
    setSelectedIds((prev) => prev.filter((trackId) => trackId !== id));
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;
    setSelectedIds((prev) => {
      const from = prev.indexOf(draggedId);
      const to = prev.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedId);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createPlaylistSchema.safeParse({
      name,
      trackIds: selectedIds,
      loop,
    });

    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-5", className)}
    >
      <FormField label="Nome" error={errors.name} required>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Manhãs com Romanos"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Faixas disponíveis" hint="Clique para adicionar.">
          <ul className="flex max-h-72 flex-col divide-y divide-(--divider) overflow-y-auto rounded-(--radius) border border-(--border)">
            {availableTracks.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-(--fg-muted)">
                {tracks.length === 0
                  ? "Nenhuma faixa cadastrada"
                  : "Todas as faixas já estão na playlist"}
              </li>
            ) : (
              availableTracks.map((track) => (
                <li key={track.id}>
                  <button
                    type="button"
                    onClick={() => addTrack(track.id)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-(--fg) transition-colors duration-(--transition-fast) hover:bg-(--surface-alt)"
                  >
                    <Plus
                      className="h-3.5 w-3.5 shrink-0 text-(--fg-muted)"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {track.title}
                    </span>
                    <span className="shrink-0 text-xs text-(--fg-muted)">
                      {formatDuration(track.durationSeconds)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </FormField>

        <FormField
          label="Faixas na playlist"
          error={errors.trackIds}
          hint="Arraste para reordenar."
        >
          <ul className="flex max-h-72 flex-col divide-y divide-(--divider) overflow-y-auto rounded-(--radius) border border-(--border)">
            {selectedTracks.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-(--fg-muted)">
                Nenhuma faixa selecionada
              </li>
            ) : (
              selectedTracks.map((track, index) => (
                <li
                  key={track.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedId(track.id);
                  }}
                  onDragOver={(e) => handleDragOver(e, track.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={cn(
                    "flex items-center gap-2 bg-(--surface) px-3 py-2.5 text-sm",
                    "transition-opacity duration-(--transition-fast)",
                    draggedId === track.id && "opacity-50",
                  )}
                >
                  <GripVertical
                    className="h-3.5 w-3.5 shrink-0 cursor-grab text-(--fg-subtle)"
                    aria-hidden="true"
                  />
                  <span className="shrink-0 text-xs text-(--fg-muted)">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-(--fg)">
                    {track.title}
                  </span>
                  <span className="shrink-0 text-xs text-(--fg-muted)">
                    {formatDuration(track.durationSeconds)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTrack(track.id)}
                    aria-label={`Remover ${track.title}`}
                    className="shrink-0 rounded-sm p-1 text-(--fg-muted) transition-colors duration-(--transition-fast) hover:bg-(--surface-alt) hover:text-(--color-destructive)"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </FormField>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-(--fg)">
        <input
          type="checkbox"
          checked={loop}
          onChange={(e) => setLoop(e.target.checked)}
          className="h-4 w-4 accent-(--hb-blue)"
        />
        Reiniciar da primeira faixa ao terminar (repetir)
      </label>

      <Button type="submit" disabled={isLoading} loading={isLoading}>
        {playlist ? "Salvar alterações" : "Criar playlist"}
      </Button>
    </form>
  );
}
