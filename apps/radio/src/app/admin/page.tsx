import { PageHeader } from "@hebron/ui";
import { AuthorsAdminPanel } from "../../components/authors-admin-panel";
import { SeriesAdminPanel } from "../../components/series-admin-panel";
import { TracksAdminPanel } from "../../components/tracks-admin-panel";
import { PlaylistsAdminPanel } from "../../components/playlists-admin-panel";
import { MaterialsAdminPanel } from "../../components/materials-admin-panel";
import {
  getAuthUser,
  getExclusiveMaterialsList,
  getPlaylistsWithTracks,
  getRadioCatalog,
} from "../../lib/queries";

export default async function AdminRadioPage() {
  // Sessão já validada por admin/layout.tsx (super_admin) — `user` aqui só
  // fornece o `actorId` para as leituras via withAuthenticatedContext.
  const user = await getAuthUser();
  const actorId = user?.id ?? "";

  const [{ authors, series, tracks }, playlists, materials] = await Promise.all(
    [
      getRadioCatalog(),
      getPlaylistsWithTracks(actorId),
      getExclusiveMaterialsList(actorId),
    ],
  );

  return (
    <div className="px-4 py-8 sm:px-6">
      <PageHeader
        title="Painel da rádio"
        description="Autores, séries, faixas, playlists e materiais exclusivos em rotação no Auto DJ."
      />

      <div className="flex flex-col gap-10">
        <AuthorsAdminPanel authors={authors} />
        <SeriesAdminPanel authors={authors} series={series} />
        <TracksAdminPanel authors={authors} series={series} tracks={tracks} />
        <PlaylistsAdminPanel playlists={playlists} tracks={tracks} />
        <MaterialsAdminPanel materials={materials} />
      </div>
    </div>
  );
}
