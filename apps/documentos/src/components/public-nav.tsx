import Link from "next/link";
import { FileText, Search, Scroll, LayoutGrid } from "lucide-react";
import { BrandMark } from "@hebron/ui";

export function PublicNav() {
  return (
    <nav className="docs-nav" aria-label="Navegação principal">
      <div className="docs-nav-inner">
        <Link href="/" className="docs-nav-brand">
          <BrandMark style={{ height: 28 }} />
          <span className="docs-nav-brand-sep" aria-hidden="true" />
          <span className="docs-nav-brand-name">Documentos</span>
        </Link>

        <div className="docs-nav-links">
          <Link href="/" className="docs-nav-link">
            <LayoutGrid size={14} aria-hidden="true" />
            Início
          </Link>
          <Link href="/editais" className="docs-nav-link">
            <Scroll size={14} aria-hidden="true" />
            Editais
          </Link>
          <Link href="/busca" className="docs-nav-link">
            <Search size={14} aria-hidden="true" />
            Buscar
          </Link>
        </div>

        <div className="docs-nav-actions">
          <Link href="/editorial" className="hb-btn hb-btn-sm hb-btn-secondary">
            <FileText size={13} aria-hidden="true" />
            Área editorial
          </Link>
        </div>
      </div>
    </nav>
  );
}
