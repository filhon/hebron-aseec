import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import {
  CANONICAL_LOGIN_URL,
  anyRoleRequiresMfa,
  hasVerifiedTotpFactor,
} from "@hebron/auth";
import { resolveReturnToDestination } from "@hebron/auth/app-middleware";
import { AuthCard, SupportFooter } from "../../../../components/auth-card";
import { getSessionSupabaseClient } from "../../../../lib/session-client";
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
  // Mesmo saneamento de `/post-login` (quem monta este link): caminho
  // relativo do próprio app ou subdomínio Hebron permitido; qualquer outro
  // host vira "/". Aplicado aqui também para que um link montado à mão não
  // atravesse a página até o formulário.
  const destination = resolveReturnToDestination(return_to);
  const cookieStore = await cookies();

  let session;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  if (!anyRoleRequiresMfa(session.roles)) redirect("/");

  // Defesa em profundidade (débito de S-60): quem já concluiu o enrollment e
  // chega aqui por link salvo, histórico ou botão "voltar" precisa apenas
  // confirmar o código — enrolar um segundo fator não é o que essa pessoa
  // quer. Fator só `unverified` (enrollment interrompido no meio) NÃO
  // redireciona: ela precisa poder concluir o que começou.
  const supabase = await getSessionSupabaseClient();
  if (await hasVerifiedTotpFactor(supabase)) {
    redirect(`/mfa/challenge?return_to=${encodeURIComponent(destination)}`);
  }

  return (
    <AuthCard
      title="Ative a verificação em duas etapas"
      subtitle="Obrigatória para o seu papel na Hebron Aseec"
      footer={<SupportFooter />}
      tagline='"O nome do Senhor é uma torre forte; o justo corre para ela, e está seguro." — Pv 18.10'
    >
      <MfaEnrollForm returnTo={destination} />
    </AuthCard>
  );
}
