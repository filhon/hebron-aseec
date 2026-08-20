import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { getActiveImpersonation } from "@hebron/auth/impersonation-server";
import { getAdminUrl } from "@hebron/ui";
import { requireStaffSession, getAuthUser, getTasks } from "../../lib/queries";
import TarefasShell from "./shell";

const ADMIN_URL = getAdminUrl();

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  const tasks = await getTasks();
  const impersonation = await getActiveImpersonation();

  return (
    <TarefasShell
      user={user}
      tasks={tasks}
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
    </TarefasShell>
  );
}
