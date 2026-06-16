import Link from "next/link";
import {
  Plus,
  Upload,
  TrendingUp,
  Eye,
  Scroll,
  Edit,
  Clock,
} from "lucide-react";
import { mockDocuments, mockEditais } from "../../lib/mock-data";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getEditalStatus(e: {
  cycleType: string;
  opensAt: Date | null;
  closesAt: Date | null;
}): "open" | "closed" | "permanent" | "upcoming" {
  if (e.cycleType === "pontual") return "permanent";
  const now = new Date();
  if (e.opensAt && now < new Date(e.opensAt)) return "upcoming";
  if (e.closesAt && now > new Date(e.closesAt)) return "closed";
  return "open";
}

export default function EditorialDashboardPage() {
  const total = mockDocuments.length + mockEditais.length;
  const openEditais = mockEditais.filter((e) => {
    const s = getEditalStatus(e);
    return s === "open" || s === "permanent";
  }).length;

  const recentlyUpdated = [...mockDocuments, ...mockEditais]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 8);

  const VISIBILITY_LABEL: Record<string, string> = {
    public: "Público",
    internal: "Interno",
    restricted: "Restrito",
  };

  const VISIBILITY_CLS: Record<string, string> = {
    public: "bg-[--hb-green-muted] text-[--hb-green-fg]",
    internal: "bg-[--hb-cyan-muted] text-[--hb-cyan-fg]",
    restricted: "bg-[--color-destructive-muted] text-[--hb-red]",
  };

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="hb-eyebrow">Área editorial</span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              margin: "6px 0 4px",
              color: "var(--fg)",
            }}
          >
            Painel da equipe editorial
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--fg-muted)" }}>
            Publicações, edição e versionamento. Apenas super_admins e editores
            designados acessam esta área.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="hb-btn hb-btn-ghost hb-btn-sm">
            <Upload size={14} aria-hidden="true" />
            Importar PDF
          </button>
          <Link href="/editorial/novo" className="hb-btn hb-btn-primary">
            <Plus size={15} aria-hidden="true" />
            Novo documento
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="docs-kpi-grid">
        {[
          {
            label: "Total publicado",
            value: total,
            delta: "+3 nos últimos 30 dias",
            up: true,
            color: "var(--hb-blue)",
          },
          {
            label: "Editais abertos",
            value: openEditais,
            delta: `${mockEditais.length} total`,
            up: false,
            color: "var(--hb-orange)",
          },
          {
            label: "Visualizações (30 dias)",
            value: "12.4k",
            delta: "+18% vs período anterior",
            up: true,
            color: "var(--hb-cyan)",
          },
          {
            label: "Assinaturas ativas",
            value: 128,
            delta: "+12 esta semana",
            up: true,
            color: "var(--hb-green)",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="hb-stat">
            <div
              className="hb-stat-dot"
              style={{ background: kpi.color }}
              aria-hidden="true"
            />
            <div className="hb-stat-label">{kpi.label}</div>
            <div className="hb-stat-value">{kpi.value}</div>
            <div className={`hb-stat-trend ${kpi.up ? "up" : ""}`}>
              {kpi.up && <TrendingUp size={12} aria-hidden="true" />}
              {kpi.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Recently updated table */}
        <section>
          <div className="hb-card hb-card-overflow">
            <div className="hb-card-header">
              <Eye
                size={16}
                style={{ color: "var(--brand)" }}
                aria-hidden="true"
              />
              <h3>Últimas atualizações</h3>
              <div className="hb-card-header-actions">
                <button type="button" className="hb-btn hb-btn-ghost hb-btn-xs">
                  Todos
                </button>
                <button type="button" className="hb-btn hb-btn-ghost hb-btn-xs">
                  Editais
                </button>
              </div>
            </div>

            <table className="hb-tbl">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Visibilidade</th>
                  <th>Versão</th>
                  <th>Atualizado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentlyUpdated.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 600,
                          fontSize: 13.5,
                          color: "var(--brand)",
                        }}
                      >
                        {doc.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--fg-muted)",
                          marginTop: 2,
                        }}
                      >
                        {doc.category.name}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`hb-badge ${VISIBILITY_CLS[doc.visibility] ?? ""}`}
                      >
                        {VISIBILITY_LABEL[doc.visibility] ?? doc.visibility}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      v{doc.currentVersion?.version ?? 1}
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                      {formatDate(doc.updatedAt)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Link
                          href="/editorial/novo"
                          className="hb-btn hb-btn-ghost hb-btn-xs"
                          title="Editar"
                        >
                          <Edit size={13} aria-hidden="true" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Side stack */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Active editais */}
          <div className="hb-card" style={{ padding: "20px 22px" }}>
            <span className="hb-eyebrow">Editais ativos</span>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                margin: "4px 0 16px",
              }}
            >
              Estado da pipeline
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mockEditais.map((e) => {
                const s = getEditalStatus(e);
                const STATUS_COLOR: Record<string, string> = {
                  open: "var(--hb-green)",
                  closed: "var(--hb-red)",
                  permanent: "var(--hb-cyan)",
                  upcoming: "var(--hb-orange)",
                };
                const STATUS_LABEL: Record<string, string> = {
                  open: "Aberto",
                  closed: "Encerrado",
                  permanent: "Permanente",
                  upcoming: "Em breve",
                };

                return (
                  <div
                    key={e.id}
                    style={{
                      padding: "12px 14px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span
                        className="hb-badge"
                        style={{
                          background: `color-mix(in srgb, ${STATUS_COLOR[s]} 14%, transparent)`,
                          color: STATUS_COLOR[s],
                          fontSize: 11,
                        }}
                      >
                        <span
                          className="hb-badge-dot"
                          style={{ backgroundColor: STATUS_COLOR[s] }}
                        />
                        {STATUS_LABEL[s]}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          color: "var(--fg-muted)",
                          fontWeight: 600,
                        }}
                      >
                        v{e.currentVersion?.version ?? 1}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.25,
                      }}
                    >
                      {e.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review queue */}
          <div className="hb-card" style={{ padding: "20px 22px" }}>
            <span className="hb-eyebrow">Fila de revisão</span>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                margin: "4px 0 14px",
              }}
            >
              Aguardando publicação
            </h3>

            {[
              {
                title: "SOP — Conciliação bancária",
                sub: "Em revisão · Letícia Pires",
                color: "var(--hb-cyan)",
                bg: "rgba(7,180,231,0.12)",
              },
              {
                title: "Edital de projetos pontuais — v6",
                sub: "Aguarda diretoria · Filipe Honório",
                color: "var(--hb-orange)",
                bg: "rgba(234,90,6,0.12)",
              },
              {
                title: "Descrição de cargo — Diretor Autorizador",
                sub: "Rascunho · Marcos Andrade",
                color: "var(--hb-green)",
                bg: "rgba(161,197,32,0.14)",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--divider)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: item.bg,
                    color: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Clock size={15} aria-hidden="true" />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: "var(--fg)",
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                    {item.sub}
                  </div>
                </div>
                <Link
                  href="/editorial/novo"
                  className="hb-btn hb-btn-ghost hb-btn-xs"
                >
                  <Scroll size={12} aria-hidden="true" />
                  Abrir
                </Link>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
