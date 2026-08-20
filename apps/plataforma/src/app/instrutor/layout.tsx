import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { getActiveImpersonation } from "@hebron/auth/impersonation-server";
import { getAdminUrl } from "@hebron/ui";
import { requireInstrutorSession, getAuthUser } from "../../lib/queries";
import InstrutorShell from "./shell";

const ADMIN_URL = getAdminUrl();

export default async function InstrutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireInstrutorSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  const impersonation = await getActiveImpersonation();

  return (
    <InstrutorShell
      user={user}
      isSuperAdmin={session.roles.includes("super_admin")}
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
    </InstrutorShell>
  );
}
