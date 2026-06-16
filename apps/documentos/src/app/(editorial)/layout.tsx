import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Scroll,
  FolderOpen,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { BrandMark } from "@hebron/ui";

export default function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="docs-editorial-shell">
      {/* Sidebar */}
      <aside
        className="docs-editorial-sidebar"
        aria-label="Navegação editorial"
      >
        <div className="docs-editorial-sidebar-header">
          <Link href="/editorial" className="docs-editorial-sidebar-brand">
            <BrandMark
              style={{ height: 24, filter: "brightness(0) invert(1)" }}
            />
            <span style={{ marginLeft: 8 }}>Documentos</span>
          </Link>
          <div className="docs-editorial-sidebar-sub">Área editorial</div>
        </div>

        <nav className="docs-editorial-nav">
          <div className="docs-editorial-nav-label">Principal</div>

          <Link href="/editorial" className="docs-editorial-nav-item">
            <LayoutDashboard size={15} aria-hidden="true" />
            Painel
          </Link>

          <Link href="/editorial/novo" className="docs-editorial-nav-item">
            <FileText size={15} aria-hidden="true" />
            Novo documento
          </Link>

          <div className="docs-editorial-nav-label" style={{ marginTop: 16 }}>
            Conteúdo
          </div>

          <Link href="/editorial" className="docs-editorial-nav-item">
            <Scroll size={15} aria-hidden="true" />
            Editais
          </Link>

          <Link href="/editorial" className="docs-editorial-nav-item">
            <FolderOpen size={15} aria-hidden="true" />
            Categorias
          </Link>

          <div className="docs-editorial-nav-label" style={{ marginTop: 16 }}>
            Portal
          </div>

          <Link href="/" className="docs-editorial-nav-item">
            <Globe size={15} aria-hidden="true" />
            Ver portal público
          </Link>

          <Link href="/" className="docs-editorial-nav-item">
            <ArrowLeft size={15} aria-hidden="true" />
            Sair da área editorial
          </Link>
        </nav>
      </aside>

      {/* Main area */}
      <div className="docs-editorial-main">
        {/* Top bar */}
        <div className="docs-editorial-topbar">
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--fg)",
              fontFamily: "var(--font-display)",
            }}
          >
            Área editorial
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "var(--fg-muted)",
            }}
          >
            Acesso restrito: super_admin / editor
          </span>
        </div>

        {/* Page content */}
        <div className="docs-editorial-content">{children}</div>
      </div>
    </div>
  );
}
