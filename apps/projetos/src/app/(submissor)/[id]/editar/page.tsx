import { notFound, redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { getAuthUser, getDraftProjectForEdit } from "../../../../lib/queries";
import { EditDraftClient } from "./_client";

export default async function EditarProjetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) redirect(CANONICAL_LOGIN_URL);

  const project = await getDraftProjectForEdit(id, authUser.id);
  if (!project) notFound();

  return <EditDraftClient project={project} />;
}
