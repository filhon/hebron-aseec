import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { requireStaffSession, getAuthUser, getTasks } from "../../lib/queries";
import TarefasShell from "./shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  const tasks = await getTasks();

  return (
    <TarefasShell user={user} tasks={tasks}>
      {children}
    </TarefasShell>
  );
}
