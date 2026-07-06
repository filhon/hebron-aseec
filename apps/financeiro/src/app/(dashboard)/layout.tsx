import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { requireColaboradorSession } from "../../lib/session";
import { getAuthUser } from "../../lib/queries";
import FinanceiroShell from "./shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireColaboradorSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  return <FinanceiroShell user={user}>{children}</FinanceiroShell>;
}
