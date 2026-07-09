import { Suspense } from "react";
import { ErrorState, PageHeader } from "@hebron/ui";
import { getDirectoryMembers } from "../../../lib/queries";
import { DirectoryList } from "../../../components/directory-list";
import { DirectorySkeleton } from "../../../components/directory-skeleton";

async function DirectoryContent() {
  let members;

  try {
    members = await getDirectoryMembers();
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar o diretório"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  return <DirectoryList members={members} />;
}

export default function DiretorioPage() {
  return (
    <div className="hb-page">
      <PageHeader
        title="Diretório"
        description="Equipe interna da Hebron Aseec — diretoria, conselho e colaboradores."
      />
      <Suspense fallback={<DirectorySkeleton />}>
        <DirectoryContent />
      </Suspense>
    </div>
  );
}
