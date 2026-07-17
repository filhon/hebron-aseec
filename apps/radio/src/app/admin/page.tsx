import { Disc3, FileText, ListMusic, Plus } from "lucide-react";
import { Button, PageHeader } from "@hebron/ui";
import { PlaylistView } from "../../components/playlist-view";
import {
  mockExclusiveMaterials,
  mockPlaylists,
  mockTracks,
} from "../../lib/mock-data";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function AdminRadioPage() {
  return (
    <div className="px-4 py-8 sm:px-6">
      <PageHeader
        title="Painel da rádio"
        description="Faixas, playlists e materiais exclusivos em rotação no Auto DJ."
      />

      <div className="flex flex-col gap-10">
        {/* ── Faixas ── */}
        <section aria-labelledby="faixas-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="faixas-heading"
              className="flex items-center gap-2 font-(--font-display) text-base font-(--font-weight-semibold) text-(--fg)"
            >
              <Disc3
                className="h-4.5 w-4.5 text-(--brand)"
                aria-hidden="true"
              />
              Faixas ({mockTracks.length})
            </h2>
            <Button
              type="button"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Nova faixa
            </Button>
          </div>

          <ul className="flex flex-col divide-y divide-(--divider) rounded-(--radius-md) border border-(--border)">
            {mockTracks.map((track) => (
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
        </section>

        {/* ── Playlists ── */}
        <section aria-labelledby="playlists-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="playlists-heading"
              className="flex items-center gap-2 font-(--font-display) text-base font-(--font-weight-semibold) text-(--fg)"
            >
              <ListMusic
                className="h-4.5 w-4.5 text-(--brand)"
                aria-hidden="true"
              />
              Playlists ({mockPlaylists.length})
            </h2>
            <Button
              type="button"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Nova playlist
            </Button>
          </div>

          <div className="flex flex-col gap-6">
            {mockPlaylists.map((playlist) => (
              <PlaylistView
                key={playlist.id}
                name={`${playlist.name}${playlist.loop ? " · repete" : ""}`}
                tracks={playlist.tracks}
              />
            ))}
          </div>
        </section>

        {/* ── Materiais exclusivos ── */}
        <section aria-labelledby="materiais-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="materiais-heading"
              className="flex items-center gap-2 font-(--font-display) text-base font-(--font-weight-semibold) text-(--fg)"
            >
              <FileText
                className="h-4.5 w-4.5 text-(--brand)"
                aria-hidden="true"
              />
              Materiais exclusivos ({mockExclusiveMaterials.length})
            </h2>
            <Button
              type="button"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Novo material
            </Button>
          </div>

          <ul className="flex flex-col divide-y divide-(--divider) rounded-(--radius-md) border border-(--border)">
            {mockExclusiveMaterials.map((material) => (
              <li
                key={material.id}
                className="flex items-center gap-4 px-5 py-3"
              >
                <p className="min-w-0 flex-1 truncate text-sm font-(--font-weight-semibold) text-(--fg)">
                  {material.title}
                </p>
                <span className="shrink-0 text-xs text-(--fg-muted)">
                  {material.requiresTerm
                    ? "Requer aceite do termo"
                    : "Sem restrição"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
