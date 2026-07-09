import { ErrorState, PageHeader } from "@hebron/ui";
import type { Role } from "@hebron/types/roles";
import { getAnnouncementsWithAuthors, getAuthUser } from "../../../lib/queries";
import { AnnouncementsList } from "../../../components/announcements-list";
import { AnnouncementCreateDialog } from "../../../components/announcement-create-dialog";

const BOARD_ROLES: Role[] = ["diretor", "conselheiro", "super_admin"];

async function loadAnunciosData() {
  const [announcements, user] = await Promise.all([
    getAnnouncementsWithAuthors(),
    getAuthUser(),
  ]);
  return {
    announcements,
    canCreate: user?.roles.some((role) => BOARD_ROLES.includes(role)) ?? false,
  };
}

export default async function AnunciosPage() {
  let data: Awaited<ReturnType<typeof loadAnunciosData>>;

  try {
    data = await loadAnunciosData();
  } catch {
    return (
      <div className="hb-page">
        <ErrorState
          title="Não foi possível carregar os anúncios"
          description="Verifique sua conexão e tente novamente."
        />
      </div>
    );
  }

  const { announcements, canCreate } = data;
  const sorted = [...announcements].sort((a, b) => {
    const aTime = a.publishedAt?.getTime() ?? a.createdAt.getTime();
    const bTime = b.publishedAt?.getTime() ?? b.createdAt.getTime();
    return bTime - aTime;
  });

  return (
    <div className="hb-page">
      <PageHeader
        title="Anúncios"
        description="Comunicados da diretoria e das equipes para toda a Hebron Aseec."
        actions={canCreate ? <AnnouncementCreateDialog /> : undefined}
      />

      <AnnouncementsList announcements={sorted} />
    </div>
  );
}
