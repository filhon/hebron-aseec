import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Scale,
  Banknote,
  Users,
  Scroll,
  Workflow,
  BarChart2,
  Search,
} from "lucide-react";
import { PublicNav } from "../components/public-nav";
import { DocumentCard } from "../components/document-card";
import { EditalCard } from "../components/edital-card";
import { mockDocuments, mockEditais, mockCategories } from "../lib/mock-data";

export const metadata: Metadata = {
  title: "Documentos — Hebron Aseec",
  description:
    "Portal de documentos, editais e chamadas. Tudo o que rege a missão da Hebron Aseec em um só lugar.",
  openGraph: {
    title: "Portal de Documentos — Hebron Aseec",
    description:
      "Editais abertos, políticas, certidões e procedimentos operacionais com histórico de versões.",
  },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "juridico-legal": <Scale size={20} aria-hidden="true" />,
  "fiscal-contabil": <Banknote size={20} aria-hidden="true" />,
  "recursos-humanos": <Users size={20} aria-hidden="true" />,
  "editais-chamadas": <Scroll size={20} aria-hidden="true" />,
  "procedimentos-internos": <Workflow size={20} aria-hidden="true" />,
  "comunicacoes-relatorios": <BarChart2 size={20} aria-hidden="true" />,
};

function getEditalStatus(edital: {
  cycleType: string;
  opensAt: Date | null;
  closesAt: Date | null;
}): "open" | "closed" | "permanent" | "upcoming" {
  if (edital.cycleType === "pontual") return "permanent";
  const now = new Date();
  if (edital.opensAt && now < new Date(edital.opensAt)) return "upcoming";
  if (edital.closesAt && now > new Date(edital.closesAt)) return "closed";
  return "open";
}

export default function HomePage() {
  const publicEditais = mockEditais.filter(
    (e) => e.visibility === "public" || e.visibility === "internal",
  );
  const openEditais = publicEditais.filter((e) => {
    const s = getEditalStatus(e);
    return s === "open" || s === "permanent";
  });

  const recentDocs = [...mockDocuments]
    .filter((d) => d.visibility === "public" || d.visibility === "internal")
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 6);

  const totalDocs = mockDocuments.length + mockEditais.length;
  const openCount = openEditais.length;

  return (
    <>
      <PublicNav />

      {/* ── Hero ── */}
      <section className="docs-hero" aria-label="Apresentação do portal">
        <div className="docs-hero-inner">
          <span className="hb-eyebrow" style={{ color: "var(--hb-cyan)" }}>
            Portal de documentos · Hebron Aseec
          </span>
          <h1>Tudo o que rege a nossa missão — em um só lugar.</h1>
          <p>
            Editais abertos, políticas, certidões em vigência e procedimentos
            operacionais. Cada documento traz histórico de versões e responde
            por uma fonte única de verdade.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/editais" className="hb-btn hb-btn-accent">
              Ver editais abertos
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/busca"
              className="hb-btn"
              style={{
                background: "transparent",
                color: "var(--hb-white)",
                boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.28)",
              }}
            >
              <Search size={15} aria-hidden="true" />
              Buscar documento
            </Link>
          </div>

          <div className="docs-hero-stats" aria-label="Estatísticas do portal">
            <div className="docs-hero-stat">
              <div className="big">{totalDocs}</div>
              <div className="label">Documentos publicados</div>
            </div>
            <div className="docs-hero-stat">
              <div className="big">{openCount}</div>
              <div className="label">Editais disponíveis</div>
            </div>
            <div className="docs-hero-stat">
              <div className="big">{mockCategories.length}</div>
              <div className="label">Categorias</div>
            </div>
            <div className="docs-hero-stat">
              <div className="big">7</div>
              <div className="label">Atualizações em 30 dias</div>
            </div>
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="docs-hero-deco-cyan" aria-hidden="true" />
        <div className="docs-hero-deco-green" aria-hidden="true" />
      </section>

      <main className="docs-page">
        {/* ── Editais em destaque ── */}
        {openEditais.length > 0 && (
          <section className="docs-section" aria-labelledby="editais-heading">
            <div className="docs-section-head">
              <div className="left">
                <span className="hb-eyebrow">Editais em destaque</span>
                <h2 id="editais-heading">Janelas abertas para submissão</h2>
              </div>
              <Link href="/editais" className="hb-btn hb-btn-ghost hb-btn-sm">
                Ver todos
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                gap: 18,
              }}
            >
              {openEditais.map((edital) => (
                <EditalCard
                  key={edital.id}
                  edital={edital}
                  href={`/editais/${edital.slug}`}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Two-col: recentes + categorias ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 40,
            marginBottom: 56,
            alignItems: "flex-start",
          }}
        >
          {/* Documentos recentes */}
          <section aria-labelledby="recentes-heading">
            <div className="docs-section-head">
              <div className="left">
                <span className="hb-eyebrow">Atualizados recentemente</span>
                <h2 id="recentes-heading">Últimas publicações</h2>
              </div>
            </div>

            <div
              className="hb-card hb-card-padded hb-card-overflow"
              style={{ padding: "4px 0" }}
            >
              {recentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/${doc.slug}`}
                  className="docs-row"
                  style={{ padding: "14px 24px" }}
                >
                  <div className="docs-row-icon">
                    <FileText size={16} aria-hidden="true" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="docs-row-title">{doc.title}</div>
                    <div className="docs-row-meta">
                      <span>{doc.category.name}</span>
                      <span>·</span>
                      <span>
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(doc.updatedAt))}
                      </span>
                    </div>
                  </div>
                  {doc.visibility === "public" && (
                    <span className="docs-open-stripe" style={{ fontSize: 11 }}>
                      Público
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {/* Categorias */}
          <section aria-labelledby="categorias-heading">
            <div className="docs-section-head">
              <div className="left">
                <span className="hb-eyebrow">Navegação</span>
                <h2 id="categorias-heading">Explorar por área</h2>
              </div>
            </div>

            <div className="docs-cat-grid">
              {mockCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/busca?categoria=${cat.id}`}
                  className="docs-cat-card"
                >
                  <div className="docs-cat-icon">
                    {CATEGORY_ICONS[cat.slug] ?? (
                      <FileText size={20} aria-hidden="true" />
                    )}
                  </div>
                  <div className="docs-cat-name">{cat.name}</div>
                  <div className="docs-cat-count">
                    {cat.documentCount} documento
                    {cat.documentCount === 1 ? "" : "s"}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* ── Grid de documentos recentes ── */}
        <section className="docs-section" aria-labelledby="grid-heading">
          <div className="docs-section-head">
            <div className="left">
              <span className="hb-eyebrow">Documentos</span>
              <h2 id="grid-heading">Publicações em destaque</h2>
            </div>
            <Link href="/busca" className="hb-btn hb-btn-ghost hb-btn-sm">
              Ver todos
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>

          <div
            className="hb-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            {recentDocs.slice(0, 3).map((doc) => (
              <DocumentCard key={doc.id} document={doc} href={`/${doc.slug}`} />
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px 36px",
          background: "var(--bg-alt)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 13,
            color: "var(--fg-muted)",
          }}
        >
          <span>
            © {new Date().getFullYear()} Hebron Aseec · docs.hebronaseec.com.br
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link
              href="/busca?tipo=policy"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Política de Privacidade
            </Link>
            <Link
              href="/editorial"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Área editorial
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
