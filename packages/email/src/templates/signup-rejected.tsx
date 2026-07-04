import * as React from "react";
import { Hr, Text } from "@react-email/components";
import {
  EmailLayout,
  emailColors,
  emailFontFamily,
} from "../components/layout";

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

const text: React.CSSProperties = {
  fontFamily: emailFontFamily,
  fontSize: 15,
  lineHeight: "1.65",
  color: emailColors.foreground,
  margin: "0 0 14px",
};

const textSm: React.CSSProperties = {
  fontFamily: emailFontFamily,
  fontSize: 13,
  lineHeight: "1.5",
  color: emailColors.muted,
  margin: "0 0 8px",
};

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export interface SignupRejectedEmailProps {
  /** Nome de quem solicitou o cadastro */
  name: string;
}

export function SignupRejectedEmail({ name }: SignupRejectedEmailProps) {
  const firstName = name.split(" ")[0] ?? name;

  return (
    <EmailLayout preview="Sua solicitação de cadastro na Hebron Aseec foi avaliada.">
      <Text style={text}>Olá, {firstName}.</Text>

      <Text style={text}>
        Avaliamos sua solicitação de acesso à plataforma{" "}
        <strong>Hebron Aseec</strong> e, neste momento, não foi possível
        aprová-la.
      </Text>

      <Text style={text}>
        Se você acredita que isso é um engano ou deseja mais informações, entre
        em contato com a administração.
      </Text>

      <Hr style={{ borderColor: emailColors.border, margin: "4px 0 20px" }} />

      <Text style={{ ...textSm, margin: 0 }}>
        <a
          href="mailto:admin@hebronaseec.com.br"
          style={{ color: emailColors.primary }}
        >
          admin@hebronaseec.com.br
        </a>
      </Text>
    </EmailLayout>
  );
}

export default SignupRejectedEmail;
