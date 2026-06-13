// Main app — hash-based routing, role tweaks, screen dispatch.

const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "role": "super_admin",
  "showEditorialBadge": true
}/*EDITMODE-END*/;

function parseRoute() {
  const h = window.location.hash || "#/";
  return h.startsWith("#") ? h.slice(1) : h;
}

function App() {
  const [route, setRoute] = useStateA(parseRoute());
  const [tweaks, setTweaksState] = useStateA(() => {
    try {
      const saved = localStorage.getItem("hb-docs-tweaks");
      return saved ? { ...TWEAK_DEFAULTS, ...JSON.parse(saved) } : TWEAK_DEFAULTS;
    } catch (e) { return TWEAK_DEFAULTS; }
  });

  // Hash routing
  useEffectA(() => {
    const onHash = () => {
      setRoute(parseRoute());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Tweaks panel protocol
  useEffectA(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode")   window.__setTweaksOpen?.(true);
      if (d.type === "__deactivate_edit_mode") window.__setTweaksOpen?.(false);
    };
    window.addEventListener("message", onMsg);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch (e) {}
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const setTweak = (key, value) => {
    let edits;
    if (typeof key === "object") edits = key;
    else edits = { [key]: value };
    setTweaksState(prev => {
      const next = { ...prev, ...edits };
      try { localStorage.setItem("hb-docs-tweaks", JSON.stringify(next)); } catch (e) {}
      return next;
    });
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*"); } catch (e) {}
  };

  const navigate = (to) => {
    window.location.hash = "#" + to;
  };

  const onSubmit = (doc) => {
    // simulate redirect to projetos
    alert(`Redirecionando para projetos.hebronaseec.com.br\n\n?edital=${doc.slug}&tipo=${doc.edital?.projectType || "geral"}\n\n(Mock — em produção abriria o wizard de novo projeto com pré-preenchimento.)`);
  };

  const role = tweaks.role || "super_admin";

  // Route dispatch
  let screen;
  let path = route.split("?")[0];
  let qs = route.includes("?") ? route.split("?")[1] : "";

  if (path === "/" || path === "") {
    screen = <HomeScreen onNavigate={navigate} onSubmit={onSubmit} role={role} />;
  } else if (path === "/buscar") {
    const q = decodeURIComponent((qs.match(/q=([^&]*)/) || [])[1] || "");
    screen = <SearchScreen query={q} onNavigate={navigate} role={role} />;
  } else if (path === "/editais") {
    screen = <EditaisScreen onNavigate={navigate} onSubmit={onSubmit} role={role} />;
  } else if (path.startsWith("/editais/")) {
    const slug = path.replace("/editais/", "");
    screen = <EditalDetailScreen slug={slug} onNavigate={navigate} onSubmit={onSubmit} role={role} />;
  } else if (path.startsWith("/c/")) {
    const catId = path.replace("/c/", "");
    screen = <CategoryScreen catId={catId} onNavigate={navigate} onSubmit={onSubmit} role={role} />;
  } else if (path.startsWith("/d/") && path.endsWith("/versoes")) {
    const slug = path.replace("/d/", "").replace("/versoes", "");
    screen = <VersionHistoryScreen slug={slug} onNavigate={navigate} />;
  } else if (path.startsWith("/d/")) {
    const slug = path.replace("/d/", "");
    screen = <DocumentDetailScreen slug={slug} onNavigate={navigate} role={role} />;
  } else if (path === "/editorial") {
    screen = ROLES[role].editor
      ? <EditorialDashboardScreen onNavigate={navigate} />
      : <NoAccessScreen role={role} onNavigate={navigate} />;
  } else if (path === "/editorial/editais" || path === "/editorial/documentos") {
    screen = ROLES[role].editor
      ? <EditorialDashboardScreen onNavigate={navigate} />
      : <NoAccessScreen role={role} onNavigate={navigate} />;
  } else if (path.startsWith("/editorial/edital/")) {
    const slug = path.replace("/editorial/edital/", "");
    screen = ROLES[role].editor
      ? <EditalEditorScreen slug={slug === "novo" ? null : slug} onNavigate={navigate} />
      : <NoAccessScreen role={role} onNavigate={navigate} />;
  } else {
    screen = <NotFoundScreen onNavigate={navigate} />;
  }

  return (
    <div data-screen-label={routeLabel(route)}>
      <div className="app-shell">
        <Sidebar route={path} onNavigate={navigate} role={role} />
        <main className="main">
          <Topbar role={role} onNavigate={navigate} route={route} />
          {screen}
        </main>
      </div>
      <DocsTweaksPanel tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

function routeLabel(route) {
  const p = route.split("?")[0];
  if (p === "/" || p === "") return "Home";
  if (p === "/buscar") return "Busca";
  if (p === "/editais") return "Editais";
  if (p.startsWith("/editais/")) return "Edital — " + p.replace("/editais/", "");
  if (p.startsWith("/c/")) return "Categoria — " + p.replace("/c/", "");
  if (p.endsWith("/versoes")) return "Histórico — " + p.replace("/d/", "").replace("/versoes", "");
  if (p.startsWith("/d/")) return "Documento — " + p.replace("/d/", "");
  if (p === "/editorial") return "Editorial — Painel";
  if (p.startsWith("/editorial/edital/")) return "Editorial — Editor";
  return p;
}

function NoAccessScreen({ role, onNavigate }) {
  const r = ROLES[role];
  return (
    <div className="page page-narrow">
      <div className="empty">
        <div className="icon-wrap" style={{ background: "rgba(234,90,6,0.1)", color: "var(--hb-orange)" }}>
          <Icon name="alert-triangle" size={26} />
        </div>
        <h3>Acesso restrito à área editorial</h3>
        <p>Você está autenticado como <strong>{r.label}</strong>. Apenas super_admins e colaboradores com papel de editor podem publicar e editar documentos.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => onNavigate("/")}>Voltar ao portal</button>
        </div>
        <div className="verse">
          <span className="ref">Lucas 12:48</span>
          <span>"A quem muito foi dado, muito será exigido."</span>
        </div>
      </div>
    </div>
  );
}

function NotFoundScreen({ onNavigate }) {
  return (
    <div className="page page-narrow">
      <div className="empty">
        <div className="icon-wrap"><Icon name="folder-open" size={26} /></div>
        <h3>Página não encontrada</h3>
        <p>O endereço acessado não existe ou foi movido.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => onNavigate("/")}>Ir para o início</button>
          <button className="btn btn-ghost" onClick={() => onNavigate("/buscar?q=")}>Buscar</button>
        </div>
      </div>
    </div>
  );
}

// ----- TWEAKS PANEL -----
function DocsTweaksPanel({ tweaks, setTweak }) {
  const role = tweaks.role || "super_admin";
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Perfil de acesso">
        <TweakRadio
          label="Papel ativo"
          value={role}
          onChange={(v) => setTweak("role", v)}
          options={[
            { value: "anon",        label: "Anônimo" },
            { value: "submissor",   label: "Submissor" },
            { value: "diretor",     label: "Diretor" },
            { value: "super_admin", label: "Super admin" },
          ]}
        />
        <div style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.45, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6 }}>
          {role === "anon"        && "Visitante anônimo: apenas documentos públicos."}
          {role === "submissor"   && "Submissor: vê público + interno. Sem acesso à área editorial."}
          {role === "diretor"     && "Diretor: vê público, interno e restrito. Sem acesso à área editorial."}
          {role === "super_admin" && "Super admin: vê tudo + acessa a área editorial."}
        </div>
      </TweakSection>

      <TweakSection label="Atalhos de tela">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <a className="twk-shortcut" href="#/">Início</a>
          <a className="twk-shortcut" href="#/editais">Editais</a>
          <a className="twk-shortcut" href="#/c/juridico">Categoria</a>
          <a className="twk-shortcut" href="#/buscar?q=edital">Busca</a>
          <a className="twk-shortcut" href="#/d/edital-projetos-anuais-2026">Doc (PDF)</a>
          <a className="twk-shortcut" href="#/d/politica-protecao-dados-lgpd">Doc (MD)</a>
          <a className="twk-shortcut" href="#/d/edital-projetos-anuais-2026/versoes">Versões</a>
          <a className="twk-shortcut" href="#/editais/edital-projetos-anuais-2026">Edital</a>
          {ROLES[role]?.editor && (
            <>
              <a className="twk-shortcut" href="#/editorial">Painel editorial</a>
              <a className="twk-shortcut" href="#/editorial/edital/edital-projetos-anuais-2026">Editor</a>
            </>
          )}
        </div>
      </TweakSection>

      <TweakSection label="Sobre">
        <div style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          Protótipo Bloco A — prompts P-1.13 a P-1.17. Dados mockados.
        </div>
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
