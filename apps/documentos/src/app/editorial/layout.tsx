import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Scroll,
  FolderOpen,
  Globe,
  ArrowLeft,
  Bell,
  ClipboardList,
} from "lucide-react";
import { ModuleLogo, ImpersonationBanner, getAdminUrl } from "@hebron/ui";
import { getActiveImpersonation } from "@hebron/auth/impersonation-server";
import { requireEditorSession } from "../../lib/session";

const ADMIN_URL = getAdminUrl();

export default async function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireEditorSession();

  const impersonation = await getActiveImpersonation();

  return (
    <div className="docs-editorial-shell">
      {/* Sidebar */}
      <aside
        className="docs-editorial-sidebar"
        aria-label="Navegação editorial"
      >
        <div className="docs-editorial-sidebar-header">
          <Link href="/editorial" className="docs-editorial-sidebar-brand">
            <ModuleLogo
              module="documentos"
              variant="horizontal"
              size={40}
              dark
            />
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

          <Link
            href="/editorial/documentos"
            className="docs-editorial-nav-item"
          >
            <FileText size={15} aria-hidden="true" />
            Documentos
          </Link>

          <Link href="/editorial/editais" className="docs-editorial-nav-item">
            <Scroll size={15} aria-hidden="true" />
            Editais
          </Link>

          <Link
            href="/editorial/categorias"
            className="docs-editorial-nav-item"
          >
            <FolderOpen size={15} aria-hidden="true" />
            Categorias
          </Link>

          <div className="docs-editorial-nav-label" style={{ marginTop: 16 }}>
            Sistema
          </div>

          <Link
            href="/editorial/assinaturas"
            className="docs-editorial-nav-item"
          >
            <Bell size={15} aria-hidden="true" />
            Assinaturas
          </Link>

          <Link href="/editorial/auditoria" className="docs-editorial-nav-item">
            <ClipboardList size={15} aria-hidden="true" />
            Auditoria
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
        {impersonation && (
          <ImpersonationBanner
            impersonatedName={impersonation.impersonatedName}
            actorName={impersonation.actorName}
            startedAt={impersonation.startedAt}
            stopHref={`${ADMIN_URL}/usuarios`}
          />
        )}
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
