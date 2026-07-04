import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { requireSubmissorSession } from "../../lib/session";
import { getAuthUser } from "../../lib/queries";
import SubmissorShell from "./shell";

export default async function SubmissorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSubmissorSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  return <SubmissorShell user={user}>{children}</SubmissorShell>;
}
