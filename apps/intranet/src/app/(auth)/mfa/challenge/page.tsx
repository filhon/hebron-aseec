import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL, anyRoleRequiresMfa } from "@hebron/auth";
import { AuthCard, SupportFooter } from "../../../../components/auth-card";
import { MfaChallengeForm } from "./components/mfa-challenge-form";

export const metadata: Metadata = {
  title: "Verificação em duas etapas — Hebron Aseec",
};

interface MfaChallengePageProps {
  searchParams: Promise<{ return_to?: string }>;
}

export default async function MfaChallengePage({
  searchParams,
}: MfaChallengePageProps) {
  const { return_to } = await searchParams;
  const cookieStore = await cookies();

  let session;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  if (!anyRoleRequiresMfa(session.roles)) redirect("/");

  return (
    <AuthCard
      title="Verificação em duas etapas"
      subtitle="Confirme com seu aplicativo autenticador"
      footer={<SupportFooter />}
    >
      <MfaChallengeForm returnTo={return_to ?? "/"} />
    </AuthCard>
  );
}
