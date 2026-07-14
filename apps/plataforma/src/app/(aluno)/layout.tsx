import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { requireAlunoSession, getAuthUser } from "../../lib/queries";
import AlunoShell from "./shell";

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAlunoSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  return <AlunoShell user={user}>{children}</AlunoShell>;
}
