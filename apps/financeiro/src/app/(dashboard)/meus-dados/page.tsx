import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { resolveSession } from "@hebron/auth/server";
import {
  exportMyData,
  getMyDataSnapshot,
  type DataExportFormat,
} from "@hebron/auth/data-export";
import {
  getLatestDeletionRequest,
  requestDataDeletion,
} from "@hebron/auth/data-deletion";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { setConsent } from "@hebron/db/consents";
import { consentPurposeEnum } from "@hebron/db/schema";
import type { ConsentPurpose } from "@hebron/db/schema";
import {
  MyDataPage,
  type MyDataConsentView,
  type MyDataDeletionStatus,
  type MyDataExportFile,
  type MyDataProfileView,
} from "@hebron/ui";

// "Meus Dados" (P-9.2) — superfície de titular montada por app. Reusa o
// componente compartilhado (@hebron/ui) e as primitivas de @hebron/auth; a
// UI é presentation-only, toda a lógica de dados/RLS/auditoria mora aqui.
const MEUS_DADOS_PATH = "/meus-dados";

function toConsentPurpose(value: string): ConsentPurpose {
  const purposes: readonly string[] = consentPurposeEnum.enumValues;
  if (!purposes.includes(value)) {
    throw new Error(`Finalidade de consentimento inválida: ${value}`);
  }
  return value as ConsentPurpose;
}

async function currentActorId(): Promise<string> {
  try {
    const { actorId } = await resolveSession(await cookies());
    return actorId;
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }
}

export default async function MeusDadosPage() {
  const actorId = await currentActorId();

  const { snapshot, deletionRequest } = await withAuthenticatedContext(
    { actorId },
    async (tx) => ({
      snapshot: await getMyDataSnapshot(actorId, tx),
      deletionRequest: await getLatestDeletionRequest(actorId, tx),
    }),
  );

  const profile: MyDataProfileView = {
    fullName: snapshot.profile.fullName,
    email: snapshot.profile.email,
    phone: snapshot.profile.phone,
    documentCpf: snapshot.profile.documentCpf,
    createdAt: snapshot.profile.createdAt.toISOString(),
    anonymizedAt: snapshot.profile.anonymizedAt
      ? snapshot.profile.anonymizedAt.toISOString()
      : null,
  };

  const consents: MyDataConsentView[] = snapshot.consents.map((consent) => ({
    purpose: consent.purpose,
    granted: consent.granted,
    grantedAt: consent.grantedAt ? consent.grantedAt.toISOString() : null,
    revokedAt: consent.revokedAt ? consent.revokedAt.toISOString() : null,
  }));

  const deletionStatus: MyDataDeletionStatus | null =
    deletionRequest?.status ?? null;

  async function toggleConsentAction(purpose: string, granted: boolean) {
    "use server";
    const id = await currentActorId();
    const validated = toConsentPurpose(purpose);
    await withAuthenticatedContext({ actorId: id }, (tx) =>
      setConsent(
        { userId: id, purpose: validated, granted, source: "meus-dados" },
        tx,
      ),
    );
    revalidatePath(MEUS_DADOS_PATH);
  }

  async function exportAction(
    format: DataExportFormat,
  ): Promise<MyDataExportFile> {
    "use server";
    const id = await currentActorId();
    return withAuthenticatedContext({ actorId: id }, (tx) =>
      exportMyData(id, format, tx),
    );
  }

  async function requestDeletionAction(reason: string) {
    "use server";
    const id = await currentActorId();
    await withAuthenticatedContext({ actorId: id }, (tx) =>
      requestDataDeletion(
        { userId: id, reason: reason.length > 0 ? reason : undefined },
        tx,
      ),
    );
    revalidatePath(MEUS_DADOS_PATH);
  }

  return (
    <MyDataPage
      profile={profile}
      consents={consents}
      deletionStatus={deletionStatus}
      onToggleConsent={toggleConsentAction}
      onExport={exportAction}
      onRequestDeletion={requestDeletionAction}
    />
  );
}
