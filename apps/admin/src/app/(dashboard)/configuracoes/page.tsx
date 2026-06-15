import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@hebron/db/client";
import { eq, asc } from "drizzle-orm";
import { users, designations } from "@hebron/db/schema";
import {
  featureFlags,
  systemSettings,
  emailTemplates,
} from "@hebron/db/schema";
import {
  Shield,
  Flag,
  Mail,
  Settings2,
  AlertCircle,
  UserCheck,
  UserCog,
  Eye,
} from "lucide-react";
import { toggleFeatureFlag } from "../../../actions/settings";

// ─── DB ───────────────────────────────────────────────────────────────────────

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

// ─── Server Actions ───────────────────────────────────────────────────────────

async function handleToggleFlag(formData: FormData) {
  "use server";
  const key = formData.get("key") as string;
  const currentEnabled = formData.get("enabled") === "true";
  await toggleFeatureFlag({ key, enabled: !currentEnabled });
  revalidatePath("/configuracoes");
  redirect("/configuracoes?tab=feature-flags");
}

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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

function renderWithHighlights(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((p, i) =>
    /^\{\{.+\}\}$/.test(p) ? (
      <span key={i} className="hb-tpl-var">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

// ─── Sub-panels (RSC) ─────────────────────────────────────────────────────────

function DesignacoesPanel({
  activeDesignations,
  revokedCount,
}: {
  activeDesignations: Array<{
    id: string;
    type: "gestor" | "autorizador";
    userId: string;
    assignedBy: string | null;
    assignedAt: Date;
    userName: string | null;
  }>;
  revokedCount: number;
}) {
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

      {activeDesignations.length === 0 ? (
        <div className="hb-card">
          <div className="hb-empty">
            <b>Nenhuma designação ativa</b>
            <div className="hb-empty-body">
              Atribua um Diretor Gestor e um Diretor Autorizador para habilitar
              a governança dual.
            </div>
          </div>
        </div>
      ) : (
        <div className="hb-grid hb-grid-2 hb-designation-grid">
          {activeDesignations.map((d) => {
            const isGestor = d.type === "gestor";
            const color = isGestor ? "var(--hb-orange)" : "var(--hb-cyan)";
            const bgColor = isGestor
              ? "var(--hb-orange-muted)"
              : "var(--hb-cyan-muted)";
            const Icon = isGestor ? UserCheck : UserCog;
            return (
              <div
                key={d.id}
                className="hb-card hb-designation-card"
                style={{ borderColor: color, background: bgColor }}
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
                    {getInitials(d.userName)}
                  </div>
                  <div>
                    <div className="hb-designation-preview-name">
                      {d.userName ?? "—"}
                    </div>
                    <div className="hb-designation-preview-sub">
                      Designado em {formatDate(d.assignedAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {revokedCount > 0 && (
        <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--fg-muted)" }}>
          {revokedCount} designaç
          {revokedCount === 1 ? "ão anterior" : "ões anteriores"} no histórico
          (ver trilha de auditoria).
        </p>
      )}
    </div>
  );
}

function FeatureFlagsPanel({
  flags,
}: {
  flags: Array<{
    id: string;
    key: string;
    enabled: boolean;
    description: string | null;
    rolloutPercent: number;
    updatedAt: Date;
  }>;
}) {
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
            <form action={handleToggleFlag} key={f.id} className="hb-flag-row">
              <input type="hidden" name="key" value={f.key} />
              <input type="hidden" name="enabled" value={String(f.enabled)} />
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
                type="submit"
                role="switch"
                aria-checked={f.enabled}
                aria-label={`${f.enabled ? "Desativar" : "Ativar"} ${f.key}`}
                className={`hb-switch${f.enabled ? " on" : ""}`}
              />
            </form>
          ))}
          {flags.length === 0 && (
            <p
              style={{
                padding: "24px 20px",
                fontSize: 13,
                color: "var(--fg-muted)",
              }}
            >
              Nenhuma feature flag cadastrada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailTemplatesPanel({
  templates,
  selectedSlug,
}: {
  templates: Array<{
    id: string;
    slug: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    variables: string[];
    updatedAt: Date;
  }>;
  selectedSlug: string;
}) {
  const selected =
    templates.find((t) => t.slug === selectedSlug) ?? templates[0];

  return (
    <div className="hb-settings-dual-col">
      {/* Sidebar */}
      <div className="hb-card hb-card-overflow">
        <div className="hb-tpl-sidebar-label">Templates</div>
        {templates.map((t) => (
          <a
            key={t.id}
            href={`/configuracoes?tab=email-templates&template=${t.slug}`}
            className={`hb-tpl-sidebar-item${selected?.slug === t.slug ? " active" : ""}`}
          >
            <div className="hb-tpl-sidebar-item-name">{t.slug}</div>
            <div className="hb-tpl-sidebar-item-key">{t.subject}</div>
            <div className="hb-tpl-sidebar-item-date">
              {formatDate(t.updatedAt)}
            </div>
          </a>
        ))}
      </div>

      {/* Preview */}
      {selected && (
        <div className="hb-tpl-editor">
          <div className="hb-card hb-designation-card">
            <div className="hb-tpl-editor-header">
              <div>
                <div className="hb-tpl-editor-title">{selected.slug}</div>
                <div className="hb-tpl-editor-vars">
                  Variáveis:{" "}
                  {selected.variables.map((v, i) => (
                    <span key={i} className="hb-tpl-var">{`{{${v}}}`}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="hb-form-row">
              <label>Assunto</label>
              <input
                className="hb-form-input"
                defaultValue={selected.subject}
                readOnly
                aria-label="Assunto do template (somente leitura)"
              />
            </div>
            <div className="hb-form-row">
              <label>Corpo do email</label>
              <textarea
                className="hb-form-textarea hb-form-textarea-mono"
                defaultValue={selected.bodyText}
                rows={8}
                readOnly
                aria-label="Corpo do template (somente leitura)"
              />
              <div className="hb-form-hint">
                Edição de templates disponível em breve via interface dedicada.
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

function SistemaPanel({
  settings,
}: {
  settings: Array<{
    id: string;
    key: string;
    value: unknown;
    label: string;
    description: string | null;
    isPublic: boolean;
    updatedAt: Date;
  }>;
}) {
  return (
    <div>
      <div className="hb-note-banner">
        Configurações gerais do sistema. Alterações são registradas no log de
        auditoria.
      </div>
      <div className="hb-card hb-card-overflow">
        {settings.map((setting) => (
          <div key={setting.id} className="hb-setting-row">
            <div>
              <div className="hb-setting-label">{setting.label}</div>
              {setting.description && (
                <div className="hb-setting-desc">{setting.description}</div>
              )}
              <div className="hb-setting-key">{setting.key}</div>
            </div>
            <div className="hb-setting-value">
              <span className="hb-setting-value-badge">
                {String(setting.value)}
              </span>
              <span className="hb-setting-value-date">
                {formatDate(setting.updatedAt)}
              </span>
            </div>
          </div>
        ))}
        {settings.length === 0 && (
          <p
            style={{
              padding: "24px 20px",
              fontSize: 13,
              color: "var(--fg-muted)",
            }}
          >
            Nenhuma configuração encontrada.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; template?: string }>;
}) {
  const params = await searchParams;
  const activeTab = (params.tab ?? "designacoes") as TabId;
  const selectedTemplate = params.template ?? "";

  // Fetch all data upfront (tabs switch client-side via URL)
  const [designationRows, flagRows, templateRows, settingRows] =
    await Promise.all([
      db
        .select({
          id: designations.id,
          type: designations.type,
          userId: designations.userId,
          assignedBy: designations.assignedBy,
          assignedAt: designations.assignedAt,
          userName: users.fullName,
        })
        .from(designations)
        .innerJoin(users, eq(designations.userId, users.id))
        .orderBy(asc(designations.assignedAt)),

      db.select().from(featureFlags).orderBy(asc(featureFlags.key)),

      db.select().from(emailTemplates).orderBy(asc(emailTemplates.slug)),

      db.select().from(systemSettings).orderBy(asc(systemSettings.key)),
    ]);

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

      {/* Tab navigation — URL-based */}
      <div
        className="hb-tabs"
        role="tablist"
        aria-label="Seções de configuração"
      >
        {TABS.map((tab) => (
          <a
            key={tab.id}
            href={`/configuracoes?tab=${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`hb-tab${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.icon}
            {tab.label}
          </a>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === "designacoes" && (
          <DesignacoesPanel
            activeDesignations={designationRows}
            revokedCount={0}
          />
        )}
        {activeTab === "feature-flags" && (
          <FeatureFlagsPanel flags={flagRows} />
        )}
        {activeTab === "email-templates" && (
          <EmailTemplatesPanel
            templates={templateRows}
            selectedSlug={selectedTemplate}
          />
        )}
        {activeTab === "sistema" && <SistemaPanel settings={settingRows} />}
      </div>
    </div>
  );
}
