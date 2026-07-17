import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { requireSuperAdminSession, getAuthUser } from "../../lib/queries";
import AdminShell from "./shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdminSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  return <AdminShell user={user}>{children}</AdminShell>;
}
