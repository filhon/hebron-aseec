import { notFound, redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import {
  getAuthUser,
  getProjectForValidationEdit,
} from "../../../../../lib/queries";
import { requireDiretorSession } from "../../../../../lib/session";
import { EditValidationClient } from "./_client";

// P-2.16 CORRETIVO (AUDIT/06 §1.2/§1.3, Q23): só super_admin edita um
// projeto em validação — requireDiretorSession também deixa diretor e
// conselheiro passarem (é o gate padrão da área), então o papel exato é
// checado aqui, camada 1 do BRAIN §3 (autenticar ≠ autorizar). A action
// (updateProjectInValidation, superAdminAction) é a barreira real; este
// redirect só evita que um diretor chegue a uma tela cujo salvamento sempre
// falharia.
export default async function EditarProjetoValidacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await requireDiretorSession();
  if (!session.roles.includes("super_admin")) {
    redirect(`/pipeline/${id}`);
  }

  const authUser = await getAuthUser();
  if (!authUser) redirect(CANONICAL_LOGIN_URL);

  const project = await getProjectForValidationEdit(id, authUser.id);
  if (!project) notFound();

  return <EditValidationClient project={project} />;
}
