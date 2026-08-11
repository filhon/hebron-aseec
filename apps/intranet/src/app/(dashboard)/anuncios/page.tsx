import { Suspense } from "react";
import { ErrorState, PageHeader } from "@hebron/ui";
import type { Role } from "@hebron/types/roles";
import { getAnnouncementsWithAuthors, getAuthUser } from "../../../lib/queries";
import { AnnouncementsList } from "../../../components/announcements-list";
import { AnnouncementCreateDialog } from "../../../components/announcement-create-dialog";
import { AnnouncementsSkeleton } from "../../../components/announcements-skeleton";

const BOARD_ROLES: Role[] = ["diretor", "conselheiro", "super_admin"];

// Mesmo valor de ANNOUNCEMENTS_LIST_LIMIT em actions/announcements.ts — não
// importável de um arquivo "use server" (só exporta funções async).
const ANNOUNCEMENTS_LIST_LIMIT = 50;

async function AnnouncementsContent({ canEdit }: { canEdit: boolean }) {
  let announcements: Awaited<ReturnType<typeof getAnnouncementsWithAuthors>>;

  try {
    announcements = await getAnnouncementsWithAuthors();
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar os anúncios"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  const sorted = [...announcements].sort((a, b) => {
    const aTime = a.publishedAt?.getTime() ?? a.createdAt.getTime();
    const bTime = b.publishedAt?.getTime() ?? b.createdAt.getTime();
    return bTime - aTime;
  });

  return (
    <AnnouncementsList
      announcements={sorted}
      canEdit={canEdit}
      capped={sorted.length >= ANNOUNCEMENTS_LIST_LIMIT}
    />
  );
}

export default async function AnunciosPage() {
  const user = await getAuthUser();
  const canCreate =
    user?.roles.some((role) => BOARD_ROLES.includes(role)) ?? false;
  const canEdit = user?.roles.includes("super_admin") ?? false;

  return (
    <div className="hb-page">
      <PageHeader
        title="Anúncios"
        description="Comunicados da diretoria e das equipes para toda a Hebron Aseec."
        actions={canCreate ? <AnnouncementCreateDialog /> : undefined}
      />

      <Suspense fallback={<AnnouncementsSkeleton />}>
        <AnnouncementsContent canEdit={canEdit} />
      </Suspense>
    </div>
  );
}
