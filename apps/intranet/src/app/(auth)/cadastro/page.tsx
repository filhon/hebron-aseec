import type { Metadata } from "next";
import { AuthCard, SupportFooter } from "../../../components/auth-card";
import { CadastroForm } from "./components/cadastro-form";

export const metadata: Metadata = {
  title: "Cadastro — Hebron Aseec",
  description: "Solicite acesso à plataforma Hebron Aseec.",
};

export default function CadastroPage() {
  return (
    <AuthCard
      title="Solicitar acesso"
      subtitle="Cadastro para instituições parceiras"
      footer={<SupportFooter />}
      tagline='"Não abandonemos a nossa congregação, como é costume de alguns." — Hb 10.25'
    >
      <CadastroForm />
    </AuthCard>
  );
}
