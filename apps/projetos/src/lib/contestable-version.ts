import { desc, eq } from "drizzle-orm";
import { projectVersions, submitterContestations } from "@hebron/db/schema";
import type { AuthenticatedTx } from "@hebron/db/authenticated";

export interface ContestableVersion {
  id: string;
  createdAt: Date;
}

/**
 * O "evento de alteração" contestável mais recente (Q32/PATCH-029): a
 * última versão de `validacao` criada por `updateProjectInValidation`
 * (P-2.16) que ainda não tem uma linha em `submitter_contestations` —
 * "uma vez por alteração", resolvido pelo servidor, nunca escolhido pelo
 * cliente (createSubmitterContestationSchema não recebe projectVersionId).
 * `null` se o projeto nunca foi editado em validação, ou se a última edição
 * já foi contestada.
 */
export async function getLatestContestableVersion(
  tx: AuthenticatedTx,
  projectId: string,
): Promise<ContestableVersion | null> {
  const versionRows = await tx
    .select({
      id: projectVersions.id,
      data: projectVersions.data,
      createdAt: projectVersions.createdAt,
    })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.versionNumber));

  const latestEdit = versionRows.find(
    (v) =>
      (v.data as Record<string, unknown> | null)?._source ===
      "updateProjectInValidation",
  );
  if (!latestEdit) return null;

  const [existing] = await tx
    .select({ id: submitterContestations.id })
    .from(submitterContestations)
    .where(eq(submitterContestations.projectVersionId, latestEdit.id))
    .limit(1);

  if (existing) return null;

  return { id: latestEdit.id, createdAt: latestEdit.createdAt };
}
