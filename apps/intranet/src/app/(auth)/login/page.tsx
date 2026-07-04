import type { Metadata } from "next";
import { LoginForm } from "./components/login-form";
import { AuthCard, SupportFooter } from "../../../components/auth-card";

export const metadata: Metadata = {
  title: "Acesso — Hebron Aseec",
  description: "Faça login para acessar o sistema da Hebron Aseec.",
};

interface LoginPageProps {
  searchParams: Promise<{ return_to?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { return_to: returnTo } = await searchParams;

  return (
    <AuthCard
      title="Acesso ao Sistema"
      subtitle="Intranet · Hebron Aseec"
      footer={<SupportFooter />}
      tagline='"Sede fortes e corajosos. Não temais, nem vos assusteis diante deles." — Dt 31.6'
    >
      <LoginForm returnTo={returnTo ?? null} />
    </AuthCard>
  );
}
