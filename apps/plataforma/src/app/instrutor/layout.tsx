import { redirect } from "next/navigation";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { requireInstrutorSession, getAuthUser } from "../../lib/queries";
import InstrutorShell from "./shell";

export default async function InstrutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireInstrutorSession();

  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  return <InstrutorShell user={user}>{children}</InstrutorShell>;
}
