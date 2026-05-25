"use client";

import * as React from "react";
import {
  Shield,
  Flag,
  Mail,
  Settings2,
  AlertCircle,
  UserCheck,
  UserCog,
  Check,
  Eye,
} from "lucide-react";
import {
  mockFeatureFlags,
  mockDesignations,
  mockSystemSettings,
  mockEmailTemplates,
  mockUsers,
} from "../../../lib/mock-data";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "designacoes" | "feature-flags" | "email-templates" | "sistema";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "designacoes", label: "Designações", icon: <Shield size={14} /> },
  { id: "feature-flags", label: "Feature flags", icon: <Flag size={14} /> },
  {
    id: "email-templates",
    label: "Templates de email",
    icon: <Mail size={14} />,
  },
  { id: "sistema", label: "Sistema", icon: <Settings2 size={14} /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

// ─── Designações ──────────────────────────────────────────────────────────────

function DesignacoesPanel() {
  const activeDesignations = mockDesignations.filter(
    (d) => d.revokedAt === null,
  );
  const revokedDesignations = mockDesignations
    .filter((d) => d.revokedAt !== null)
    .sort(
      (a, b) => (b.revokedAt?.getTime() ?? 0) - (a.revokedAt?.getTime() ?? 0),
    );

  const getAssignedByName = (id: string) =>
    mockUsers.find((u) => u.id === id)?.name ?? id;

  return (
    <div>
      <div className="hb-governance-callout">
        <AlertCircle
          size={18}
          aria-hidden="true"
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <div>
          <b>Governança dual.</b> Toda despesa exige aprovação por{" "}
          <b>Diretor Gestor</b> e autorização por <b>Diretor Autorizador</b> —
          duas pessoas distintas, em duas etapas. Não use o mesmo nome para os
          dois papéis.
        </div>
      </div>

      <div className="hb-grid hb-grid-2 hb-designation-grid">
        {activeDesignations.map((d) => {
          const isGestor = d.type === "gestor";
          const color = isGestor ? "#ea5a06" : "#07b4e7";
          const Icon = isGestor ? UserCheck : UserCog;
          return (
            <div
              key={d.id}
              className="hb-card hb-designation-card"
              style={{ borderColor: color, background: `${color}08` }}
            >
              <div className="hb-designation-card-header">
                <div
                  className="hb-designation-icon"
                  style={{ background: color }}
                >
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="hb-designation-title">
                    Diretor {isGestor ? "Gestor" : "Autorizador"}
                  </h3>
                  <p className="hb-designation-desc">
                    {isGestor
                      ? "Aprova lotes de pagamento e preside reuniões mensais."
                      : "Autoriza pagamentos no banco. Nunca pode ser o mesmo que o gestor."}
                  </p>
                </div>
              </div>

              <div className="hb-designation-preview">
                <div
                  className="hb-avatar hb-avatar-sm"
                  style={{ background: color }}
                  aria-hidden="true"
                >
                  {getInitials(d.directorName)}
                </div>
                <div>
                  <div className="hb-designation-preview-name">
                    {d.directorName}
                  </div>
                  <div className="hb-designation-preview-sub">
                    Designado em {formatDate(d.assignedAt)} · por{" "}
                    {getAssignedByName(d.assignedBy)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {revokedDesignations.length > 0 && (
        <div className="hb-card">
          <div className="hb-card-header">
            <h3>Histórico de designações</h3>
          </div>
          <div className="hb-card-body hb-card-body-tight">
            {revokedDesignations.map((d) => (
              <div key={d.id} className="hb-designation-history-row">
                <span className="hb-designation-history-name">
                  {d.directorName}
                </span>
                <span className="hb-badge">
                  {d.type === "gestor" ? "Gestor" : "Autorizador"}
                </span>
                <span className="hb-designation-history-date">
                  removido em {d.revokedAt ? formatDate(d.revokedAt) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

function FeatureFlagsPanel() {
  const [flags, setFlags] = React.useState(() =>
    mockFeatureFlags.map((f) => ({ ...f })),
  );

  function toggle(id: string) {
    setFlags((fs) =>
      fs.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
  }

  return (
    <div>
      <div className="hb-info-banner">
        <b>Apenas para flags técnicas.</b> Controles de negócio (datas de
        janela, valores limite, percentuais de quórum) ficam em{" "}
        <i>Janelas & calendário</i> — feature flags são para deploys
        progressivos.
      </div>

      <div className="hb-card">
        <div className="hb-flag-list">
          {flags.map((f) => (
            <div key={f.id} className="hb-flag-row">
              <div className="hb-flag-meta">
                <div className="hb-flag-key-badge">{f.key}</div>
                {f.description && (
                  <div className="hb-flag-desc">{f.description}</div>
                )}
                <div className="hb-flag-meta-row">
                  {f.rolloutPercent > 0 && f.rolloutPercent < 100 && (
                    <span>{f.rolloutPercent}% de rollout</span>
                  )}
                  <span>{formatDateTime(f.updatedAt)}</span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={f.enabled}
                aria-label={`${f.enabled ? "Desativar" : "Ativar"} ${f.key}`}
                onClick={() => toggle(f.id)}
                className={`hb-switch${f.enabled ? " on" : ""}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function renderWithHighlights(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((p, i) =>
    /^\{\{.+\}\}$/.test(p) ? (
      <span key={i} className="hb-tpl-var">
        {p}
      </span>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
}

function EmailTemplatesPanel() {
  const [selectedId, setSelectedId] = React.useState(
    mockEmailTemplates[0]?.id ?? "",
  );
  const selected = mockEmailTemplates.find((t) => t.id === selectedId);

  return (
    <div className="hb-settings-dual-col">
      {/* Sidebar */}
      <div className="hb-card hb-card-overflow">
        <div className="hb-tpl-sidebar-label">Templates</div>
        {mockEmailTemplates.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hb-tpl-sidebar-item${selectedId === t.id ? " active" : ""}`}
            onClick={() => setSelectedId(t.id)}
          >
            <div className="hb-tpl-sidebar-item-name">{t.key}</div>
            <div className="hb-tpl-sidebar-item-key">{t.subject}</div>
            <div className="hb-tpl-sidebar-item-date">
              {formatDate(t.updatedAt)}
            </div>
          </button>
        ))}
      </div>

      {/* Editor + preview */}
      {selected && (
        <div className="hb-tpl-editor">
          <div className="hb-card hb-designation-card">
            <div className="hb-tpl-editor-header">
              <div>
                <div className="hb-tpl-editor-title">{selected.key}</div>
                <div className="hb-tpl-editor-vars">
                  Variáveis:{" "}
                  {selected.variables.map((v, i) => (
                    <span key={i} className="hb-tpl-var">{`{{${v}}}`}</span>
                  ))}
                </div>
              </div>
              <div className="hb-tpl-editor-actions">
                <button className="hb-btn hb-btn-ghost hb-btn-sm" type="button">
                  <Mail size={13} aria-hidden="true" />
                  Enviar teste
                </button>
                <button
                  className="hb-btn hb-btn-primary hb-btn-sm"
                  type="button"
                >
                  <Check size={13} aria-hidden="true" />
                  Salvar
                </button>
              </div>
            </div>

            <div className="hb-form-row">
              <label>Assunto</label>
              <input
                className="hb-form-input"
                defaultValue={selected.subject}
              />
            </div>
            <div className="hb-form-row">
              <label>Corpo do email</label>
              <textarea
                className="hb-form-textarea hb-form-textarea-mono"
                defaultValue={selected.bodyText}
                rows={8}
              />
              <div className="hb-form-hint">
                Variáveis no formato <code>{"{{nome}}"}</code> são substituídas
                no envio.
              </div>
            </div>
          </div>

          <div className="hb-card">
            <div className="hb-card-header">
              <h3>Pré-visualização</h3>
              <div className="hb-card-header-actions">
                <span className="hb-card-header-hint">
                  <Eye size={13} aria-hidden="true" />
                  Variáveis aparecem destacadas.
                </span>
              </div>
            </div>
            <div className="hb-card-body">
              <div className="hb-tpl-preview-subject">
                {renderWithHighlights(selected.subject)}
              </div>
              <pre className="hb-tpl-preview-body">
                {renderWithHighlights(selected.bodyText)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sistema ──────────────────────────────────────────────────────────────────

function SistemaPanel() {
  return (
    <div>
      <div className="hb-note-banner">
        Configurações gerais do sistema. Alterações são registradas no log de
        auditoria.
      </div>
      <div className="hb-card hb-card-overflow">
        {mockSystemSettings.map((setting) => (
          <div key={setting.id} className="hb-setting-row">
            <div>
              <div className="hb-setting-label">{setting.label}</div>
              {setting.description && (
                <div className="hb-setting-desc">{setting.description}</div>
              )}
              <div className="hb-setting-key">{setting.key}</div>
            </div>
            <div className="hb-setting-value">
              <span className="hb-setting-value-badge">{setting.value}</span>
              <span className="hb-setting-value-date">
                {formatDate(setting.updatedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = React.useState<TabId>("designacoes");

  return (
    <div className="hb-page">
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">Painel · operação do sistema</div>
          <h1 className="hb-page-title">Configurações</h1>
          <p className="hb-page-subtitle">
            Designações de governança, feature flags técnicas e textos
            institucionais que circulam por todo o ecossistema.
          </p>
        </div>
      </div>

      <div
        className="hb-tabs"
        role="tablist"
        aria-label="Seções de configuração"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`hb-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === "designacoes" && <DesignacoesPanel />}
        {activeTab === "feature-flags" && <FeatureFlagsPanel />}
        {activeTab === "email-templates" && <EmailTemplatesPanel />}
        {activeTab === "sistema" && <SistemaPanel />}
      </div>
    </div>
  );
}
