import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { requireDiretorSession } from "../../lib/session";
import { getAuthUser } from "../../lib/queries";
import DiretoriaShell from "./shell";

export default async function DiretoriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDiretorSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  return <DiretoriaShell user={user}>{children}</DiretoriaShell>;
}
