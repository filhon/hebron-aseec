// Shared components for the Documentos prototype.
// Loads after data.jsx — assumes window.CATEGORIES / DOCUMENTS / etc.

const { useState, useEffect, useMemo, useRef } = React;

// ----- ICON (lucide-style inline SVG) -----
const ICONS = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  "arrow-left": (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
  printer: (
    <>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  scroll: (
    <>
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </>
  ),
  scale: (
    <>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </>
  ),
  stamp: (
    <>
      <path d="M5 22h14" />
      <path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z" />
      <path d="M14 13V8.5A2.5 2.5 0 0 1 16.5 6h0A2.5 2.5 0 0 1 19 3.5h-1" />
      <path d="M10 13V8.5A2.5 2.5 0 0 0 7.5 6h0A2.5 2.5 0 0 0 5 3.5h1" />
    </>
  ),
  "id-card": (
    <>
      <path d="M16 10h2" />
      <path d="M16 14h2" />
      <circle cx="8.5" cy="12.5" r="2.5" />
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="M3.62 18.118c.43-1.79 2.012-3.118 3.88-3.118h2c1.868 0 3.45 1.328 3.88 3.118" />
    </>
  ),
  "list-checks": (
    <>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </>
  ),
  calculator: (
    <>
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </>
  ),
  landmark: (
    <>
      <line x1="3" y1="22" x2="21" y2="22" />
      <line x1="6" y1="18" x2="6" y2="11" />
      <line x1="10" y1="18" x2="10" y2="11" />
      <line x1="14" y1="18" x2="14" y2="11" />
      <line x1="18" y1="18" x2="18" y2="11" />
      <polygon points="12 2 20 7 4 7" />
    </>
  ),
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  "file-text": (
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </>
  ),
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  "folder-open": (
    <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  calendar: (
    <>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  "more-horizontal": (
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </>
  ),
  send: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
  archive: (
    <>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </>
  ),
  "file-plus": (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </>
  ),
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  "git-branch": (
    <>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </>
  ),
  "trending-up": (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  hash: (
    <>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </>
  ),
  layers: (
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </>
  ),
  "book-open": (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  "log-out": (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  "user-check": (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  inbox: (
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  rss: (
    <>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </>
  ),
};

function Icon({
  name,
  size = 18,
  strokeWidth = 2,
  className = "",
  style = {},
}) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

// ----- TOPBAR -----
function Topbar({ role, onRoleChange, onNavigate, route }) {
  const r = ROLES[role];
  return (
    <div className="topbar">
      <form
        className="topbar-search"
        onSubmit={(e) => {
          e.preventDefault();
          onNavigate(
            "/buscar?q=" + encodeURIComponent(e.currentTarget.q.value || ""),
          );
        }}
      >
        <Icon name="search" size={18} style={{ color: "var(--fg-muted)" }} />
        <input
          name="q"
          placeholder="Buscar editais, certidões, políticas…"
          defaultValue={
            route.startsWith("/buscar")
              ? decodeURIComponent(route.split("q=")[1] || "")
              : ""
          }
        />
        <kbd>⌘ K</kbd>
      </form>
      <div className="topbar-actions">
        <button className="icon-btn" title="Assinaturas">
          <Icon name="rss" />
        </button>
        <button className="icon-btn" title="Notificações">
          <Icon name="bell" />
          <span className="badge-dot" />
        </button>
        <button className="icon-btn" title="Salvos">
          <Icon name="bookmark" />
        </button>
      </div>
      <div className="user-chip" title={r.label}>
        <div className="avatar">FH</div>
        <div className="who">
          <div className="name">Filipe Honório</div>
          <div className="role">{r.label}</div>
        </div>
      </div>
    </div>
  );
}

// ----- SIDEBAR -----
function Sidebar({ route, onNavigate, role }) {
  const isEditorial = route.startsWith("/editorial");
  const r = ROLES[role];

  // counts per top-level category (filtered by role visibility)
  const visibleDocs = DOCUMENTS.filter((d) =>
    r.visibilities.includes(d.visibility),
  );
  const countFor = (catId) => {
    return visibleDocs.filter((d) => {
      const cat = CATEGORIES.find((c) => c.id === catId);
      if (!cat) return false;
      if (d.category === catId) return true;
      return cat.children?.some((s) => s.id === d.category);
    }).length;
  };

  return (
    <aside className="sidebar">
      <a
        className="sidebar-brand"
        href="#/"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("/");
        }}
      >
        <img src="assets/symbol.png" alt="Hebron ASEEC" />
        <div className="sidebar-brand-text">
          <div className="module">Documentos</div>
          <div className="module-subtitle">Hebron ASEEC</div>
        </div>
      </a>

      {isEditorial ? (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-title">Área editorial</div>
            <a
              className={
                "sidebar-link" + (route === "/editorial" ? " active" : "")
              }
              href="#/editorial"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/editorial");
              }}
            >
              <Icon name="layers" size={16} /> Painel geral
            </a>
            <a
              className={
                "sidebar-link" +
                (route === "/editorial/editais" ? " active" : "")
              }
              href="#/editorial/editais"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/editorial/editais");
              }}
            >
              <Icon name="scroll" size={16} /> Editais
              <span className="count">
                {DOCUMENTS.filter((d) => d.type === "edital").length}
              </span>
            </a>
            <a
              className={
                "sidebar-link" +
                (route === "/editorial/documentos" ? " active" : "")
              }
              href="#/editorial/documentos"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/editorial/documentos");
              }}
            >
              <Icon name="file-text" size={16} /> Documentos
              <span className="count">
                {DOCUMENTS.filter((d) => d.type !== "edital").length}
              </span>
            </a>
            <a className="sidebar-link" href="#/editorial">
              <Icon name="folder" size={16} /> Categorias
            </a>
            <a className="sidebar-link" href="#/editorial">
              <Icon name="user-check" size={16} /> Assinaturas
              <span className="count">128</span>
            </a>
            <a className="sidebar-link" href="#/editorial">
              <Icon name="history" size={16} /> Auditoria
            </a>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Voltar</div>
            <a
              className="sidebar-link"
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/");
              }}
            >
              <Icon name="arrow-left" size={16} /> Portal público
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-title">Navegar</div>
            <a
              className={"sidebar-link" + (route === "/" ? " active" : "")}
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/");
              }}
            >
              <Icon name="home" size={16} /> Início
            </a>
            <a
              className={
                "sidebar-link" + (route.startsWith("/editais") ? " active" : "")
              }
              href="#/editais"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/editais");
              }}
            >
              <Icon name="scroll" size={16} /> Editais abertos
              <span className="count">
                {
                  DOCUMENTS.filter(
                    (d) => d.type === "edital" && d.edital?.status !== "closed",
                  ).length
                }
              </span>
            </a>
            <a
              className="sidebar-link"
              href="#/buscar"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/buscar?q=");
              }}
            >
              <Icon name="search" size={16} /> Busca avançada
            </a>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Categorias</div>
            {CATEGORIES.map((c) => (
              <React.Fragment key={c.id}>
                <a
                  className={
                    "sidebar-link" + (route === "/c/" + c.id ? " active" : "")
                  }
                  href={"#/c/" + c.id}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate("/c/" + c.id);
                  }}
                >
                  <Icon name={c.icon} size={16} /> {c.name}
                  <span className="count">{countFor(c.id)}</span>
                </a>
              </React.Fragment>
            ))}
          </div>

          {r.editor && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Edição</div>
              <a
                className="sidebar-link"
                href="#/editorial"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("/editorial");
                }}
              >
                <Icon name="edit" size={16} /> Área editorial
              </a>
            </div>
          )}

          <div className="sidebar-footer">
            <div className="sidebar-footer-app">Ecossistema</div>
            <div className="app-launcher">
              <a href="#">
                <Icon name="layers" size={14} /> Intranet
              </a>
              <a href="#">
                <Icon name="send" size={14} /> Projetos
              </a>
              <a href="#">
                <Icon name="calculator" size={14} /> Financeiro
              </a>
              <a href="#">
                <Icon name="list-checks" size={14} /> Tarefas
              </a>
              <a href="#">
                <Icon name="home" size={14} /> Flats
              </a>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

// ----- BADGES & SMALL BITS -----
function VisibilityBadge({ visibility }) {
  const v = VISIBILITY[visibility];
  return (
    <span className={"badge badge-" + visibility}>
      <span className="dot" /> {v.label}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    open: { cls: "status-open", label: "Aberto" },
    "closing-soon": { cls: "status-closing", label: "Encerra em breve" },
    closed: { cls: "status-closed", label: "Encerrado" },
    permanent: { cls: "status-permanent", label: "Permanente" },
  };
  const it = map[status] || map.closed;
  return (
    <span className={"status-pill " + it.cls}>
      <span className="dot" /> {it.label}
    </span>
  );
}

function FormatBadge({ format }) {
  return (
    <span className="badge badge-format">
      {format === "pdf" ? "PDF" : "MD"}
    </span>
  );
}

// ----- DOCUMENT CARD -----
function DocCard({ doc, onClick }) {
  return (
    <a
      className="card card-link doc-card"
      href={"#/d/" + doc.slug}
      onClick={(e) => {
        e.preventDefault();
        onClick(doc);
      }}
    >
      <div className="meta">
        <VisibilityBadge visibility={doc.visibility} />
        <FormatBadge format={doc.format} />
      </div>
      <h3 className="title">{doc.title}</h3>
      <p className="summary">{doc.summary}</p>
      <div className="footer">
        <span className="author">
          <Icon name="user" size={12} /> {doc.author.split("(")[0].trim()}
        </span>
        <span className="dot-sep" />
        <span>{formatDate(doc.updatedAt)}</span>
        <span className="dot-sep" />
        <span>
          <Icon name="eye" size={12} style={{ verticalAlign: "-2px" }} />{" "}
          {doc.views.toLocaleString("pt-BR")}
        </span>
      </div>
    </a>
  );
}

// ----- DOC LIST ROW (compact) -----
function DocRow({ doc, onClick }) {
  return (
    <a
      className="row"
      href={"#/d/" + doc.slug}
      onClick={(e) => {
        e.preventDefault();
        onClick(doc);
      }}
    >
      <div className={"fmt" + (doc.format === "markdown" ? " fmt-md" : "")}>
        {doc.format === "pdf" ? "PDF" : "MD"}
      </div>
      <div>
        <div className="title">{doc.title}</div>
        <div className="sub">
          {doc.author} · v{doc.version}
        </div>
      </div>
      <VisibilityBadge visibility={doc.visibility} />
      <span className="num">{formatDate(doc.updatedAt)}</span>
      <span className="num">{doc.views.toLocaleString("pt-BR")} vis.</span>
      <Icon
        name="chevron-right"
        size={16}
        style={{ color: "var(--fg-muted)" }}
      />
    </a>
  );
}

// ----- EDITAL CARD -----
function EditalCard({ doc, onClick, onSubmit }) {
  const e = doc.edital || {};
  const cls =
    e.status === "permanent"
      ? "is-permanent"
      : e.status === "closing-soon"
        ? "is-closing"
        : e.status === "closed"
          ? "is-closed"
          : "";
  const daysToClose = e.closesAt
    ? daysBetween(new Date(), new Date(e.closesAt))
    : null;
  return (
    <div className={"edital-card " + cls}>
      <div className="accent-bar" />
      <div className="header">
        <StatusPill status={e.status} />
        <VisibilityBadge visibility={doc.visibility} />
      </div>
      <h3 className="title" style={{ marginTop: 4 }}>
        {doc.title}
      </h3>
      <p className="summary">{doc.summary}</p>

      {e.status === "permanent" ? (
        <div className="timeline">
          <div>
            <div className="label">Vigência</div>
            <div className="value">Permanente</div>
          </div>
          <div>
            <div className="label">Tipo de projeto</div>
            <div className="value" style={{ textTransform: "capitalize" }}>
              {e.projectType}
            </div>
          </div>
        </div>
      ) : (
        <div className="timeline">
          <div>
            <div className="label">Abertura</div>
            <div className="value">
              {e.opensAt ? formatDate(e.opensAt) : "—"}
            </div>
          </div>
          <div>
            <div className="label">Encerramento</div>
            <div className="value">
              {e.closesAt ? formatDate(e.closesAt) : "—"}
            </div>
          </div>
        </div>
      )}

      <div className="actions">
        <a
          className="btn btn-primary"
          href={"#/editais/" + doc.slug}
          onClick={(ev) => {
            ev.preventDefault();
            onClick(doc);
          }}
        >
          Ver edital <Icon name="arrow-right" size={14} />
        </a>
        {e.projectType && e.status !== "closed" && (
          <button className="btn btn-accent" onClick={() => onSubmit(doc)}>
            Submeter projeto <Icon name="external" size={14} />
          </button>
        )}
        {daysToClose !== null && e.status !== "closed" && (
          <span className="days-left" style={{ marginLeft: "auto" }}>
            <strong>{daysToClose}</strong> dias para o encerramento
          </span>
        )}
      </div>
    </div>
  );
}

// ----- FORMATTING UTILS -----
function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  const months = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${d.getUTCDate().toString().padStart(2, "0")} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function daysBetween(a, b) {
  return Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

// ----- BREADCRUMBS -----
function Breadcrumbs({ items, onNavigate }) {
  return (
    <nav className="breadcrumbs">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="sep">
              <Icon name="chevron-right" size={12} />
            </span>
          )}
          {it.href ? (
            <a
              href={"#" + it.href}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(it.href);
              }}
            >
              {it.label}
            </a>
          ) : (
            <span style={{ color: "var(--fg)" }}>{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ----- EMPTY STATE -----
function EmptyState({ icon = "inbox", title, description, verse, action }) {
  return (
    <div className="empty">
      <div className="icon-wrap">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {verse && (
        <div className="verse">
          <span className="ref">{verse.ref}</span>
          <span>"{verse.text}"</span>
        </div>
      )}
      {action}
    </div>
  );
}

// ----- RESTRICTED BANNER -----
function RestrictedBanner({ visibility, role }) {
  const r = ROLES[role];
  if (r.visibilities.includes(visibility)) return null;
  const v = VISIBILITY[visibility];
  return (
    <div className="restricted-banner">
      <Icon name="alert-triangle" size={18} className="icon" />
      <div>
        Este documento é <strong>{v.label.toLowerCase()}</strong>. Você está
        autenticado como <strong>{r.label}</strong> — algumas seções podem
        aparecer tarjadas ou indisponíveis para download.
      </div>
    </div>
  );
}

Object.assign(window, {
  Icon,
  Topbar,
  Sidebar,
  VisibilityBadge,
  StatusPill,
  FormatBadge,
  DocCard,
  DocRow,
  EditalCard,
  formatDate,
  daysBetween,
  Breadcrumbs,
  EmptyState,
  RestrictedBanner,
});
