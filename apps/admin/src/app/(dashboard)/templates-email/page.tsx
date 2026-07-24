import { redirect } from "next/navigation";

// Rota consolidada em Configurações → Templates de email (P-1.10b). Mantida
// como redirect permanente para não quebrar links salvos/URLs digitadas.
export default function TemplatesEmailPage() {
  redirect("/configuracoes?tab=email-templates");
}
