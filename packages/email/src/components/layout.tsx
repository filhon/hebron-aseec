import * as React from "react";
import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// ——————————————————————————————————————
// Tokens
// ——————————————————————————————————————

const colors = {
  primary: "#202C85",
  accent: "#EA5A06",
  foreground: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  background: "#FFFFFF",
  surface: "#F9FAFB",
} as const;

const fontFamily =
  '"Titillium Web", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// Web fonts (weights 400/600/700, latin subset) — clientes sem suporte a
// @font-face (Outlook desktop, etc.) caem no fallback de sistema acima.
function EmailFont() {
  return (
    <>
      <Font
        fontFamily="Titillium Web"
        fallbackFontFamily="sans-serif"
        fontWeight={400}
        fontStyle="normal"
        webFont={{
          url: "https://fonts.gstatic.com/s/titilliumweb/v19/NaPecZTIAOhVxoMyOr9n_E7fdMPmDQ.woff2",
          format: "woff2",
        }}
      />
      <Font
        fontFamily="Titillium Web"
        fallbackFontFamily="sans-serif"
        fontWeight={600}
        fontStyle="normal"
        webFont={{
          url: "https://fonts.gstatic.com/s/titilliumweb/v19/NaPDcZTIAOhVxoMyOr9n_E7ffBzCGItzYw.woff2",
          format: "woff2",
        }}
      />
      <Font
        fontFamily="Titillium Web"
        fallbackFontFamily="sans-serif"
        fontWeight={700}
        fontStyle="normal"
        webFont={{
          url: "https://fonts.gstatic.com/s/titilliumweb/v19/NaPDcZTIAOhVxoMyOr9n_E7ffHjDGItzYw.woff2",
          format: "woff2",
        }}
      />
    </>
  );
}

// ——————————————————————————————————————
// EmailHeader
// ——————————————————————————————————————

function EmailHeader() {
  return (
    <Section
      style={{
        backgroundColor: colors.primary,
        padding: "24px 40px",
        borderRadius: "8px 8px 0 0",
      }}
    >
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: "collapse" }}
      >
        <tbody>
          <tr>
            <td>
              <Text
                style={{
                  margin: 0,
                  fontFamily,
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#FFFFFF",
                  letterSpacing: "-0.3px",
                }}
              >
                Hebron Aseec
              </Text>
              <Text
                style={{
                  margin: "2px 0 0",
                  fontFamily,
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: "400",
                }}
              >
                Associação de Ensino e Extensão Cultural
              </Text>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

// ——————————————————————————————————————
// EmailFooter
// ——————————————————————————————————————

function EmailFooter() {
  const year = new Date().getFullYear();

  return (
    <Section
      style={{
        backgroundColor: colors.surface,
        padding: "24px 40px",
        borderTop: `1px solid ${colors.border}`,
        borderRadius: "0 0 8px 8px",
      }}
    >
      <Hr
        style={{
          display: "none",
        }}
      />

      <Text
        style={{
          margin: "0 0 8px",
          fontFamily,
          fontSize: "13px",
          color: colors.muted,
          textAlign: "center",
        }}
      >
        Hebron Aseec — Associação de Ensino e Extensão Cultural
      </Text>

      <Text
        style={{
          margin: "0 0 12px",
          fontFamily,
          fontSize: "12px",
          color: colors.muted,
          textAlign: "center",
        }}
      >
        Este é um email automático. Não responda a esta mensagem.
      </Text>

      <Text
        style={{
          margin: 0,
          fontFamily,
          fontSize: "11px",
          color: colors.border,
          textAlign: "center",
        }}
      >
        © {year} Hebron Aseec. Todos os direitos reservados.
      </Text>
    </Section>
  );
}

// ——————————————————————————————————————
// EmailLayout
// ——————————————————————————————————————

export interface EmailLayoutProps {
  /** Texto curto exibido no preview do cliente de email (max 150 chars) */
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head>
        <EmailFont />
      </Head>
      <Preview>{preview}</Preview>

      <Body
        style={{
          margin: 0,
          padding: "40px 0",
          backgroundColor: "#F3F4F6",
          fontFamily,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          {/* Header */}
          <EmailHeader />

          {/* Content */}
          <Section
            style={{
              backgroundColor: colors.background,
              padding: "40px",
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

// ——————————————————————————————————————
// Re-exports comuns para templates
// ——————————————————————————————————————

export { colors as emailColors, fontFamily as emailFontFamily };
