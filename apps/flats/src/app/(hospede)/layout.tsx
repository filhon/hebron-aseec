import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { getActiveImpersonation } from "@hebron/auth/impersonation-server";
import { getAdminUrl } from "@hebron/ui";
import { requireHospedeSession, getAuthUser } from "../../lib/queries";
import HospedeShell from "./shell";

const ADMIN_URL = getAdminUrl();

export default async function HospedeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireHospedeSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  const impersonation = await getActiveImpersonation();

  return (
    <HospedeShell
      user={user}
      impersonation={
        impersonation
          ? {
              impersonatedName: impersonation.impersonatedName,
              actorName: impersonation.actorName,
              startedAt: impersonation.startedAt,
              stopHref: `${ADMIN_URL}/usuarios`,
            }
          : null
      }
    >
      {children}
    </HospedeShell>
  );
}
