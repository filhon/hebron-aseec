import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL, anyRoleRequiresMfa } from "@hebron/auth";
import { AuthCard, SupportFooter } from "../../../../components/auth-card";
import { MfaEnrollForm } from "./components/mfa-enroll-form";

export const metadata: Metadata = {
  title: "Ativar verificação em duas etapas — Hebron Aseec",
};

interface MfaEnrollPageProps {
  searchParams: Promise<{ return_to?: string }>;
}

export default async function MfaEnrollPage({
  searchParams,
}: MfaEnrollPageProps) {
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
      title="Ative a verificação em duas etapas"
      subtitle="Obrigatória para o seu papel na Hebron Aseec"
      footer={<SupportFooter />}
      tagline='"O nome do Senhor é uma torre forte; o justo corre para ela, e está seguro." — Pv 18.10'
    >
      <MfaEnrollForm returnTo={return_to ?? "/"} />
    </AuthCard>
  );
}
