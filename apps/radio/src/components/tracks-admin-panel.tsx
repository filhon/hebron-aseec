"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Disc3, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
} from "@hebron/ui";
import type { Author, Series, Track } from "@hebron/types/radio";
import {
  TrackUploadForm,
  type TrackUploadFormValues,
} from "./track-upload-form";
import { createTrack, getTrackUploadUrl } from "../actions/tracks";

export interface TracksAdminPanelProps {
  authors: Author[];
  series: Series[];
  tracks: Track[];
}

const AUDIO_CONTENT_TYPES = ["audio/mpeg", "audio/mp3"] as const;

function normalizeAudioContentType(type: string): "audio/mpeg" | "audio/mp3" {
  return (AUDIO_CONTENT_TYPES as readonly string[]).includes(type)
    ? (type as "audio/mpeg" | "audio/mp3")
    : "audio/mpeg";
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Faixas: só upload/criação (sem edição/remoção) — escopo literal de
 * P-8.8 ("upload de faixa", não "CRUD de faixas"). */
export function TracksAdminPanel({
  authors,
  series,
  tracks,
}: TracksAdminPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const { execute: create, status: createStatus } = useAction(createTrack, {
    onSuccess: () => {
      setCreateOpen(false);
      router.refresh();
    },
    onError: ({ error }) =>
      setFormError(error.serverError ?? "Erro ao criar faixa"),
  });

  async function handleSubmit(values: TrackUploadFormValues) {
    setFormError(null);
    setIsUploading(true);
    try {
      const uploadResult = await getTrackUploadUrl({
        fileName: values.file.name,
        contentType: normalizeAudioContentType(values.file.type),
      });
      if (!uploadResult?.data) {
        throw new Error(
          uploadResult?.serverError ?? "Falha ao preparar upload",
        );
      }
      await fetch(uploadResult.data.uploadUrl, {
        method: "PUT",
        body: values.file,
        headers: { "Content-Type": values.file.type || "audio/mpeg" },
      });
      create({
        title: values.title,
        authorId: values.authorId,
        seriesId: values.seriesId,
        fileUrl: uploadResult.data.key,
        durationSeconds: values.durationSeconds,
      });
    } catch {
      setFormError("Falha ao enviar o arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section aria-labelledby="faixas-admin-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          id="faixas-admin-heading"
          className="flex items-center gap-2 font-(family-name:--font-display) text-base font-(--font-weight-semibold) text-(--fg)"
        >
          <Disc3 className="h-4.5 w-4.5 text-(--brand)" aria-hidden="true" />
          Faixas ({tracks.length})
        </h2>
        <Button
          type="button"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          disabled={authors.length === 0}
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          Nova faixa
        </Button>
      </div>

      {tracks.length === 0 ? (
        <EmptyState
          title="Nenhuma faixa cadastrada"
          description={
            authors.length === 0
              ? "Cadastre um autor antes de enviar uma faixa."
              : "Envie a primeira faixa .mp3 para começar a rotação."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-(--divider) rounded-(--radius-md) border border-(--border)">
          {tracks.map((track) => (
            <li key={track.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-(--font-weight-semibold) text-(--fg)">
                  {track.title}
                </p>
                <p className="truncate text-xs text-(--fg-muted)">
                  {track.authorName}
                  {track.seriesName ? ` · ${track.seriesName}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-(--fg-muted)">
                {formatDuration(track.durationSeconds)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova faixa</DialogTitle>
          </DialogHeader>
          {formError && (
            <p role="alert" className="text-sm text-(--color-destructive)">
              {formError}
            </p>
          )}
          <TrackUploadForm
            authors={authors}
            series={series}
            onSubmit={handleSubmit}
            isLoading={isUploading || createStatus === "executing"}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
