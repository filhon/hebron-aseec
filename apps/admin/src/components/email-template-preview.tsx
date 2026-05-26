"use client";

import * as React from "react";

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface EmailTemplatePreviewProps {
  subject: string;
  bodyHtml: string;
  variables?: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Example values substituted in preview
// ──────────────────────────────────────────────────────────────────────────────

const EXAMPLE_VARS: Record<string, string> = {
  nome: "João Silva",
  link: "https://app.hebronaseec.com.br/convite?token=exemplo",
  papel: "Colaborador",
  modulo: "Projetos",
};

function renderBodyHtml(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const val = EXAMPLE_VARS[name];
    if (val) {
      return `<span style="background:#DBEAFE;color:#1D4ED8;padding:1px 6px;border-radius:4px;font-size:0.875em;font-weight:500;">${val}</span>`;
    }
    return `<span style="background:#FEE2E2;color:#B91C1C;padding:1px 6px;border-radius:4px;font-size:0.875em;font-family:monospace;">{{${name}}}</span>`;
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Design tokens (mirroring packages/email/src/components/layout.tsx)
// ──────────────────────────────────────────────────────────────────────────────

const C = {
  primary: "#202C85",
  accent: "#EA5A06",
  foreground: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  surface: "#F9FAFB",
  white: "#FFFFFF",
} as const;

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function EmailTemplatePreview({
  subject,
  bodyHtml,
  variables = [],
}: EmailTemplatePreviewProps) {
  const year = new Date().getFullYear();
  const renderedBody = renderBodyHtml(bodyHtml);

  // Detect unresolved variables (present in bodyHtml but not in EXAMPLE_VARS)
  const unresolvedVars = (bodyHtml.match(/\{\{(\w+)\}\}/g) ?? [])
    .map((m) => m.slice(2, -2))
    .filter((v) => !EXAMPLE_VARS[v]);

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: 13,
      }}
    >
      {/* Variable legend */}
      {variables.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
            padding: "10px 14px",
            background: C.surface,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
            Valores de exemplo:
          </span>
          {variables.map((v) => {
            const val = EXAMPLE_VARS[v];
            return (
              <span
                key={v}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: val ? "#DBEAFE" : "#FEE2E2",
                  color: val ? "#1D4ED8" : "#B91C1C",
                  fontWeight: 500,
                }}
              >
                <code
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    opacity: 0.75,
                  }}
                >{`{{${v}}}`}</code>
                {val && (
                  <>
                    <span style={{ opacity: 0.5 }}>→</span>
                    <span>{val}</span>
                  </>
                )}
                {!val && (
                  <span style={{ opacity: 0.7, fontSize: 10 }}>
                    sem exemplo
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Email client chrome */}
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        }}
      >
        {/* Client top bar */}
        <div
          style={{
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            padding: "10px 16px 0",
          }}
        >
          {/* Traffic lights */}
          <div
            style={{ display: "flex", gap: 5, marginBottom: 10 }}
            aria-hidden="true"
          >
            {(["#FF5F57", "#FFBD2E", "#28C840"] as const).map((color, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: color,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>

          {/* Email headers */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 10,
            }}
          >
            <tbody>
              {[
                {
                  label: "De",
                  value: "Hebron Aseec <noreply@hebronaseec.com.br>",
                },
                { label: "Assunto", value: subject },
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td
                    style={{
                      width: 60,
                      paddingBottom: 4,
                      fontSize: 11,
                      color: C.muted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      verticalAlign: "top",
                      paddingTop: 2,
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      paddingBottom: 4,
                      fontSize: 13,
                      color: C.foreground,
                      fontWeight: label === "Assunto" ? 600 : 400,
                    }}
                  >
                    {value || (
                      <span style={{ color: C.muted, fontStyle: "italic" }}>
                        (sem assunto)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Email viewport */}
        <div
          style={{
            background: "#F3F4F6",
            padding: "24px 16px",
            minHeight: 200,
          }}
        >
          <div
            style={{
              maxWidth: 600,
              margin: "0 auto",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            {/* Email header */}
            <div
              style={{
                background: C.primary,
                padding: "20px 32px",
              }}
            >
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "-0.3px",
                  marginBottom: 2,
                }}
              >
                Hebron Aseec
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                Associação de Ensino e Extensão Cultural
              </div>
            </div>

            {/* Email body */}
            <div
              style={{
                background: C.white,
                padding: "32px",
                fontFamily: FONT,
                fontSize: 15,
                lineHeight: "1.65",
                color: C.foreground,
              }}
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />

            {/* Email footer */}
            <div
              style={{
                background: C.surface,
                borderTop: `1px solid ${C.border}`,
                padding: "20px 32px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 12,
                  color: C.muted,
                  marginBottom: 6,
                }}
              >
                Hebron Aseec — Associação de Ensino e Extensão Cultural
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  color: C.muted,
                  marginBottom: 8,
                }}
              >
                Este é um email automático. Não responda a esta mensagem.
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  color: C.border,
                }}
              >
                © {year} Hebron Aseec. Todos os direitos reservados.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unresolved variables warning */}
      {unresolvedVars.length > 0 && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "#FEF3C7",
            border: "1px solid #FDE68A",
            borderRadius: 6,
            fontSize: 12,
            color: "#92400E",
          }}
        >
          Variável(eis) sem valor de exemplo:{" "}
          {unresolvedVars.map((v) => (
            <code
              key={v}
              style={{
                fontFamily: "ui-monospace, monospace",
                background: "#FDE68A",
                padding: "0 4px",
                borderRadius: 3,
                marginRight: 4,
              }}
            >
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}
