"use client";

import * as React from "react";
import { UserCheck, UserCog, Mail, Flag, Settings2 } from "lucide-react";
import {
  mockFeatureFlags,
  mockDesignations,
  mockSystemSettings,
  mockEmailTemplates,
  mockUsers,
} from "../../../lib/mock-data";
import { FeatureFlagToggle } from "../../../components/feature-flag-toggle";

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabId =
  | "feature-flags"
  | "designacoes"
  | "configuracoes"
  | "email-templates";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "feature-flags", label: "Feature flags", icon: <Flag size={15} /> },
  {
    id: "designacoes",
    label: "Designações",
    icon: <UserCheck size={15} />,
  },
  {
    id: "configuracoes",
    label: "Sistema",
    icon: <Settings2 size={15} />,
  },
  {
    id: "email-templates",
    label: "Templates de e-mail",
    icon: <Mail size={15} />,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function FeatureFlagsSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-muted-foreground)",
        }}
      >
        Ative ou desative funcionalidades experimentais sem redeploy. Alterações
        são registradas no log de auditoria.
      </p>
      {mockFeatureFlags.map((flag) => (
        <FeatureFlagToggle key={flag.id} flag={flag} />
      ))}
    </div>
  );
}

function DesignacoesSection() {
  const activeDesignations = mockDesignations.filter(
    (d) => d.revokedAt === null,
  );
  const revokedDesignations = mockDesignations.filter(
    (d) => d.revokedAt !== null,
  );

  const getAssignedByUser = (assignedBy: string) =>
    mockUsers.find((u) => u.id === assignedBy);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-muted-foreground)",
        }}
      >
        Designações de gestor e autorizador para o módulo de projetos. A
        governança dual exige as duas funções preenchidas para aprovações
        financeiras.
      </p>

      {/* Active */}
      <section aria-labelledby="active-des-heading">
        <h3
          id="active-des-heading"
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-foreground)",
            marginBottom: "0.75rem",
          }}
        >
          Designações ativas
        </h3>

        {activeDesignations.length === 0 ? (
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-muted-foreground)",
              fontStyle: "italic",
            }}
          >
            Nenhuma designação ativa.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {activeDesignations.map((d) => {
              const assignedBy = getAssignedByUser(d.assignedBy);
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.875rem 1rem",
                    backgroundColor: "var(--color-muted)",
                    borderRadius: "var(--radius-md)",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor:
                          d.type === "gestor"
                            ? "var(--color-primary-muted)"
                            : "var(--color-accent-muted)",
                        color:
                          d.type === "gestor"
                            ? "var(--color-primary)"
                            : "var(--color-accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {d.type === "gestor" ? (
                        <UserCheck size={14} />
                      ) : (
                        <UserCog size={14} />
                      )}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "var(--text-sm)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--color-foreground)",
                        }}
                      >
                        {d.directorName}
                      </p>
                      <p
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--color-muted-foreground)",
                        }}
                      >
                        {d.type === "gestor" ? "Gestor" : "Autorizador"} · desde{" "}
                        {formatDate(d.assignedAt)}
                      </p>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-muted-foreground)",
                    }}
                  >
                    por {assignedBy?.name ?? d.assignedBy}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* History */}
      {revokedDesignations.length > 0 && (
        <section aria-labelledby="revoked-des-heading">
          <h3
            id="revoked-des-heading"
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-foreground)",
              marginBottom: "0.75rem",
            }}
          >
            Histórico
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {revokedDesignations.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.625rem 1rem",
                  backgroundColor: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  gap: "1rem",
                  opacity: 0.7,
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  {d.directorName} —{" "}
                  {d.type === "gestor" ? "Gestor" : "Autorizador"}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  removido em {d.revokedAt ? formatDate(d.revokedAt) : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SistemaSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-muted-foreground)",
        }}
      >
        Configurações gerais do sistema. Alterações são registradas no log de
        auditoria.
      </p>
      {mockSystemSettings.map((setting) => (
        <div
          key={setting.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "1rem",
            backgroundColor: "var(--color-background)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "12rem" }}>
            <p
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-foreground)",
              }}
            >
              {setting.label}
            </p>
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-muted-foreground)",
                marginTop: "0.25rem",
              }}
            >
              {setting.description}
            </p>
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-muted-foreground)",
                marginTop: "0.5rem",
              }}
            >
              Chave: <code>{setting.key}</code>
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "0.25rem",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)",
                fontFamily: "var(--font-mono)",
                padding: "0.25rem 0.5rem",
                backgroundColor: "var(--color-muted)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-foreground)",
              }}
            >
              {setting.value}
            </span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-muted-foreground)",
              }}
            >
              {formatDate(setting.updatedAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailTemplatesSection() {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-muted-foreground)",
        }}
      >
        Templates de e-mail transacional enviados via Resend. Variáveis
        disponíveis mostradas em cada template.
      </p>
      {mockEmailTemplates.map((tpl) => {
        const isExpanded = expandedId === tpl.id;
        return (
          <div
            key={tpl.id}
            style={{
              backgroundColor: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
              style={{
                width: "100%",
                padding: "1rem",
                textAlign: "left",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
              aria-expanded={isExpanded}
            >
              <div>
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-foreground)",
                  }}
                >
                  {tpl.key}
                </p>
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-muted-foreground)",
                    marginTop: "0.125rem",
                  }}
                >
                  {tpl.subject}
                </p>
              </div>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-muted-foreground)",
                  whiteSpace: "nowrap",
                  marginTop: "0.125rem",
                }}
              >
                {isExpanded ? "▲" : "▼"}
              </span>
            </button>

            {isExpanded && (
              <div
                style={{
                  padding: "0 1rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.375rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    Variáveis
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.375rem",
                    }}
                  >
                    {tpl.variables.map((v) => (
                      <code
                        key={v}
                        style={{
                          fontSize: "var(--text-xs)",
                          padding: "0.125rem 0.375rem",
                          backgroundColor: "var(--color-primary-muted)",
                          color: "var(--color-primary)",
                          borderRadius: "var(--radius-sm)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {"{{"}
                        {v}
                        {"}}"}
                      </code>
                    ))}
                  </div>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Texto (plain)
                  </p>
                  <pre
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-foreground)",
                      backgroundColor: "var(--color-muted)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {tpl.bodyText}
                  </pre>
                </div>
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  Última atualização: {formatDate(tpl.updatedAt)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = React.useState<TabId>("feature-flags");

  return (
    <div
      style={{
        padding: "1.5rem",
        maxWidth: "56rem",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-foreground)",
          }}
        >
          Configurações
        </h1>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-muted-foreground)",
            marginTop: "0.25rem",
          }}
        >
          Gerencie funcionalidades, designações e configurações do sistema
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Seções de configuração"
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "1px solid var(--color-border)",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.625rem 0.875rem",
              fontSize: "var(--text-sm)",
              fontWeight:
                activeTab === tab.id
                  ? "var(--font-weight-semibold)"
                  : "var(--font-weight-normal)",
              color:
                activeTab === tab.id
                  ? "var(--color-primary)"
                  : "var(--color-muted-foreground)",
              backgroundColor: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginBottom: "-1px",
              transition: "color var(--transition-fast)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === "feature-flags" && <FeatureFlagsSection />}
        {activeTab === "designacoes" && <DesignacoesSection />}
        {activeTab === "configuracoes" && <SistemaSection />}
        {activeTab === "email-templates" && <EmailTemplatesSection />}
      </div>
    </div>
  );
}
