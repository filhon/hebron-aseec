import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { getAuthUser } from "../../../lib/queries";

export default async function RelatoriosDiretoriaPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect(CANONICAL_LOGIN_URL);

  return (
    <div className="hb-page">
      <div style={{ marginBottom: 28 }}>
        <p
          className="hb-eyebrow"
          style={{ marginBottom: 8, color: "var(--hb-blue)" }}
        >
          Análise
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(22px, 3vw, 28px)",
            lineHeight: 1.1,
            margin: 0,
            color: "var(--fg)",
          }}
        >
          Relatórios da Diretoria
        </h1>
        <p style={{ color: "var(--fg-muted)", marginTop: 8, fontSize: 15 }}>
          Consolidado de relatórios recebidos e pendências por projeto.
        </p>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <BarChart3
          width={40}
          height={40}
          style={{ color: "var(--fg-subtle)", margin: "0 auto 16px" }}
          aria-hidden
        />
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--fg)",
            marginBottom: 6,
          }}
        >
          Em desenvolvimento
        </p>
        <p
          style={{
            fontSize: 14,
            color: "var(--fg-muted)",
            maxWidth: 400,
            margin: "0 auto 20px",
          }}
        >
          O painel consolidado de relatórios da diretoria estará disponível em
          breve. Os relatórios individuais podem ser acessados em cada projeto
          no pipeline.
        </p>
        <p
          style={{
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--fg-subtle)",
          }}
        >
          "Seja diligente para te apresentares aprovado a Deus." — 2Tm 2:15
        </p>
      </div>
    </div>
  );
}
