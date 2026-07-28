import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight, Hash } from "lucide-react";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { getAuthUser, getMyOrganizations } from "../../../lib/queries";
import { CreateOrganizationForm } from "../../../components/create-organization-form";

export default async function InstituicaoPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect(CANONICAL_LOGIN_URL);

  const orgs = await getMyOrganizations();
  const org = orgs[0] ?? null;

  return (
    <div className="hb-page">
      <div style={{ marginBottom: 28 }}>
        <p
          className="hb-eyebrow"
          style={{ marginBottom: 8, color: "var(--hb-blue)" }}
        >
          Cadastro
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
          Minha Instituição
        </h1>
        <p style={{ color: "var(--fg-muted)", marginTop: 8, fontSize: 15 }}>
          Dados cadastrais da sua organização no ecossistema Hebron.
        </p>
      </div>

      {!org ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)",
              padding: "40px 32px",
              textAlign: "center",
            }}
          >
            <Building2
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
              Nenhuma instituição vinculada
            </p>
            <p
              style={{
                fontSize: 14,
                color: "var(--fg-muted)",
                maxWidth: 400,
                margin: "0 auto 20px",
              }}
            >
              Cadastre sua instituição abaixo para poder submeter projetos.
            </p>
            <p
              style={{
                fontSize: 13,
                fontStyle: "italic",
                color: "var(--fg-subtle)",
              }}
            >
              "Não abandonemos a nossa congregação, como é costume de alguns." —
              Hb 10:25
            </p>
          </div>

          <CreateOrganizationForm />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card principal */}
          <section
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: org.cnpj ? 20 : 0,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: "var(--brand-tint)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Building2
                  width={28}
                  height={28}
                  style={{ color: "var(--hb-blue)" }}
                  aria-hidden
                />
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 22,
                    margin: 0,
                    color: "var(--fg)",
                  }}
                >
                  {org.nome}
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--fg-muted)",
                    marginTop: 4,
                  }}
                >
                  Organização parceira Hebron Aseec
                </p>
              </div>
            </div>

            {org.cnpj && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 0 0",
                  borderTop: "1px solid var(--divider)",
                }}
              >
                <Hash
                  width={16}
                  height={16}
                  style={{ color: "var(--fg-muted)", flexShrink: 0 }}
                  aria-hidden
                />
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--fg-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    CNPJ
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--fg)",
                      fontWeight: 500,
                      marginTop: 2,
                    }}
                  >
                    {org.cnpj}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Ação de atualizar */}
          <div
            style={{
              background: "var(--brand-tint-subtle)",
              border: "1px solid var(--brand-tint-border)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 15,
                  color: "var(--fg)",
                  margin: 0,
                }}
              >
                Dados desatualizados?
              </p>
              <p
                style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4 }}
              >
                Entre em contato com o administrador para atualizar o cadastro.
              </p>
            </div>
            <Link
              href="mailto:admin@hebronaseec.com.br"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
                textDecoration: "none",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 14,
                padding: "10px 18px",
                borderRadius: 99,
                whiteSpace: "nowrap",
              }}
            >
              Contatar administrador
              <ArrowRight width={15} height={15} aria-hidden />
            </Link>
          </div>

          {/* Cadastrar outra instituição — submissor pode estar vinculado a
              múltiplas instituições (N:N, BRAIN §6.2). */}
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--hb-blue)",
                userSelect: "none",
              }}
            >
              Cadastrar outra instituição
            </summary>
            <div style={{ marginTop: 16 }}>
              <CreateOrganizationForm />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
