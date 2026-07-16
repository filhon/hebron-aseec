import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { requireHospedeSession, getAuthUser } from "../../lib/queries";
import HospedeShell from "./shell";

export default async function HospedeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireHospedeSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  return <HospedeShell user={user}>{children}</HospedeShell>;
}
