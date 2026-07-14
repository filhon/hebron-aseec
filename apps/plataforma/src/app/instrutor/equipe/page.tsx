import { PageHeader } from "@hebron/ui";
import { InstructorTable } from "../../../components/instructor-table";
import {
  requireSuperAdminSession,
  getInstructorsWithStats,
  getUsersForInstructorLink,
} from "../../../lib/queries";

export default async function EquipeInstrutoresPage() {
  const session = await requireSuperAdminSession();

  const [instructors, users] = await Promise.all([
    getInstructorsWithStats(session.actorId),
    getUsersForInstructorLink(session.actorId),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <PageHeader
        title="Equipe de instrutores"
        description="Cadastre e gerencie os instrutores que podem ser vinculados a cursos."
      />

      <InstructorTable instructors={instructors} users={users} />
    </div>
  );
}
