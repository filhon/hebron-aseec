// Public-facing screens for the Documentos portal.

const { useState: useStateP, useMemo: useMemoP } = React;

// ============================================================
// HOME — destaques + editais abertos
// ============================================================
function HomeScreen({ onNavigate, onSubmit, role }) {
  const r = ROLES[role];
  const visibleDocs = DOCUMENTS.filter((d) =>
    r.visibilities.includes(d.visibility),
  );
  const featuredEditals = visibleDocs.filter(
    (d) => d.type === "edital" && d.featured,
  );
  const recent = visibleDocs
    .filter((d) => d.type !== "edital")
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6);
  const certidoes = visibleDocs.filter(
    (d) => d.category && d.category.startsWith("certidoes-"),
  );

  return (
    <div className="page">
      {/* Hero */}
      <div className="hero">
        <div>
          <span className="eyebrow">Portal de documentos · Hebron ASEEC</span>
          <h1>Tudo o que rege a nossa missão — em um só lugar.</h1>
          <p>
            Editais abertos, políticas, certidões em vigência e procedimentos
            operacionais. Cada documento traz histórico de versões e responde
            por uma fonte única de verdade.
          </p>
          <div className="actions">
            <a
              className="btn btn-accent btn-lg"
              href="#/editais"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/editais");
              }}
            >
              Ver editais abertos <Icon name="arrow-right" size={16} />
            </a>
            <a
              className="btn btn-ghost btn-lg"
              style={{
                color: "var(--hb-white)",
                borderColor: "rgba(255,255,255,0.25)",
              }}
              href="#/buscar"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/buscar?q=");
              }}
            >
              Buscar documento
            </a>
          </div>
        </div>
        <div className="deco-cyan" />
        <div className="deco-green" />
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="big">{DOCUMENTS.length}</div>
            <div className="label">Documentos publicados</div>
          </div>
          <div className="hero-stat">
            <div className="big">
              {
                DOCUMENTS.filter(
                  (d) => d.type === "edital" && d.edital?.status !== "closed",
                ).length
              }
            </div>
            <div className="label">Editais disponíveis</div>
          </div>
          <div className="hero-stat">
            <div className="big">{CATEGORIES.length}</div>
            <div className="label">Categorias</div>
          </div>
          <div className="hero-stat">
            <div className="big">7</div>
            <div className="label">Atualizações em 30 dias</div>
          </div>
        </div>
      </div>

      {/* Editais em destaque */}
      <section className="section">
        <div className="section-head">
          <div className="left">
            <span className="eyebrow">Editais em destaque</span>
            <h2>Janelas abertas para submissão</h2>
          </div>
          <div className="actions">
            <a
              className="btn btn-quiet"
              href="#/editais"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/editais");
              }}
            >
              Ver todos <Icon name="arrow-right" size={14} />
            </a>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: "var(--sp-4)",
          }}
        >
          {featuredEditals.map((d) => (
            <EditalCard
              key={d.id}
              doc={d}
              onClick={(x) => onNavigate("/editais/" + x.slug)}
              onSubmit={onSubmit}
            />
          ))}
        </div>
      </section>

      {/* Two-column row: recentes + certidões vigentes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: "var(--sp-6)",
          marginBottom: "var(--sp-7)",
        }}
      >
        <section>
          <div className="section-head">
            <div className="left">
              <span className="eyebrow">Atualizados recentemente</span>
              <h2>Últimas publicações</h2>
            </div>
            <a
              className="btn btn-quiet"
              href="#/c/juridico"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/c/juridico");
              }}
            >
              Navegar por categoria
            </a>
          </div>
          <div className="doc-list">
            {recent.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                onClick={(x) => onNavigate("/d/" + x.slug)}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="section-head">
            <div className="left">
              <span className="eyebrow">Documentação institucional</span>
              <h2>Certidões vigentes</h2>
            </div>
          </div>
          <div className="card" style={{ padding: "var(--sp-5)" }}>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--sp-3)",
              }}
            >
              {certidoes.map((d) => {
                const valid = d.validUntil
                  ? daysBetween(new Date(), new Date(d.validUntil))
                  : null;
                return (
                  <li
                    key={d.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: "var(--sp-3)",
                      alignItems: "center",
                      padding: "var(--sp-2) 0",
                      borderBottom: "1px solid var(--divider)",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "rgba(161,197,32,0.16)",
                        color: "#5C7510",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="shield" size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <a
                        href={"#/d/" + d.slug}
                        onClick={(ev) => {
                          ev.preventDefault();
                          onNavigate("/d/" + d.slug);
                        }}
                        style={{
                          display: "block",
                          fontWeight: 600,
                          fontSize: 14,
                          color: "var(--fg)",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                        }}
                      >
                        {d.title}
                      </a>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                        Válida até{" "}
                        <strong style={{ color: "var(--fg)" }}>
                          {formatDate(d.validUntil)}
                        </strong>{" "}
                        · {valid} dias
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      style={{ width: 32, height: 32 }}
                      title="Baixar PDF"
                    >
                      <Icon name="download" size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div style={{ height: "var(--sp-3)" }} />
          <div className="cta-balao">
            <span className="eyebrow">Para parceiros e missionários</span>
            <h3>Receba alertas quando um edital abrir.</h3>
            <p>
              Cadastre-se para ser notificado por email sobre novas publicações
              nas categorias que importam para você.
            </p>
            <a
              className="btn btn-ghost"
              href="#"
              style={{
                background: "var(--hb-white)",
                color: "var(--hb-orange)",
                borderColor: "var(--hb-white)",
                alignSelf: "flex-start",
                marginTop: 8,
              }}
            >
              <Icon name="rss" size={14} /> Configurar assinaturas
            </a>
          </div>
        </section>
      </div>

      {/* Browse by category */}
      <section className="section">
        <div className="section-head">
          <div className="left">
            <span className="eyebrow">Navegação por categoria</span>
            <h2>Explore por área</h2>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "var(--sp-3)",
          }}
        >
          {CATEGORIES.map((c) => {
            const count = DOCUMENTS.filter(
              (d) =>
                r.visibilities.includes(d.visibility) &&
                (d.category === c.id ||
                  c.children?.some((s) => s.id === d.category)),
            ).length;
            return (
              <a
                key={c.id}
                className="card"
                href={"#/c/" + c.id}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("/c/" + c.id);
                }}
                style={{
                  padding: "var(--sp-4)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--sp-2)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--hb-cream)",
                    color: "var(--hb-blue)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={c.icon} size={20} />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 17,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {c.name}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                  {count} documento{count === 1 ? "" : "s"}
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// CATEGORY — listing by category
// ============================================================
function CategoryScreen({ catId, onNavigate, onSubmit, role }) {
  const [activeSub, setActiveSub] = useStateP(null);
  const [view, setView] = useStateP("grid");
  const [vis, setVis] = useStateP("all");
  const cat = CATEGORIES.find((c) => c.id === catId);
  const r = ROLES[role];

  if (!cat) {
    return (
      <div className="page">
        <EmptyState
          icon="folder"
          title="Categoria não encontrada"
          description="Verifique o link ou volte para o início."
        />
      </div>
    );
  }

  const subcats = cat.children || [];
  const baseDocs = DOCUMENTS.filter(
    (d) =>
      r.visibilities.includes(d.visibility) &&
      (d.category === cat.id || subcats.some((s) => s.id === d.category)),
  );
  const filteredDocs = baseDocs
    .filter((d) => (activeSub ? d.category === activeSub : true))
    .filter((d) => (vis === "all" ? true : d.visibility === vis));

  return (
    <div className="page">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[
          { label: "Início", href: "/" },
          { label: "Categorias" },
          { label: cat.name },
        ]}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--sp-5)",
          marginBottom: "var(--sp-5)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "var(--hb-blue)",
            color: "var(--hb-white)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={cat.icon} size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <span className="eyebrow muted">Categoria</span>
          <h1 className="page-title" style={{ margin: "4px 0 8px" }}>
            {cat.name}
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {baseDocs.length} documento{baseDocs.length === 1 ? "" : "s"}{" "}
            disponíve{baseDocs.length === 1 ? "l" : "is"} para o seu perfil.
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="filters">
        <button
          className={"filter-chip" + (!activeSub ? " active" : "")}
          onClick={() => setActiveSub(null)}
        >
          Tudo <span className="count">{baseDocs.length}</span>
        </button>
        {subcats.map((s) => {
          const c = baseDocs.filter((d) => d.category === s.id).length;
          return (
            <button
              key={s.id}
              className={"filter-chip" + (activeSub === s.id ? " active" : "")}
              onClick={() => setActiveSub(s.id)}
            >
              {s.name} <span className="count">{c}</span>
            </button>
          );
        })}
        <span className="filter-divider" />
        <button
          className={"filter-chip" + (vis === "all" ? " active" : "")}
          onClick={() => setVis("all")}
        >
          Todas visibilidades
        </button>
        <button
          className={"filter-chip" + (vis === "public" ? " active" : "")}
          onClick={() => setVis("public")}
        >
          Públicos
        </button>
        {r.visibilities.includes("internal") && (
          <button
            className={"filter-chip" + (vis === "internal" ? " active" : "")}
            onClick={() => setVis("internal")}
          >
            Internos
          </button>
        )}
        {r.visibilities.includes("restricted") && (
          <button
            className={"filter-chip" + (vis === "restricted" ? " active" : "")}
            onClick={() => setVis("restricted")}
          >
            Restritos
          </button>
        )}
        <span style={{ marginLeft: "auto" }} />
        <button
          className={"filter-chip" + (view === "grid" ? " active" : "")}
          onClick={() => setView("grid")}
        >
          <Icon name="layers" size={14} /> Cartões
        </button>
        <button
          className={"filter-chip" + (view === "list" ? " active" : "")}
          onClick={() => setView("list")}
        >
          <Icon name="list-checks" size={14} /> Lista
        </button>
      </div>

      {filteredDocs.length === 0 ? (
        <EmptyState
          icon="folder-open"
          title="Nada por aqui ainda"
          description="Tente ajustar os filtros ou navegar por outra subcategoria."
          verse={VERSES.empty}
        />
      ) : view === "grid" ? (
        <div className="doc-grid">
          {filteredDocs.map((d) => {
            if (d.type === "edital") {
              return (
                <div key={d.id} style={{ gridColumn: "span 2" }}>
                  <EditalCard
                    doc={d}
                    onClick={(x) => onNavigate("/editais/" + x.slug)}
                    onSubmit={onSubmit}
                  />
                </div>
              );
            }
            return (
              <DocCard
                key={d.id}
                doc={d}
                onClick={(x) => onNavigate("/d/" + x.slug)}
              />
            );
          })}
        </div>
      ) : (
        <div className="doc-list">
          {filteredDocs.map((d) => (
            <DocRow
              key={d.id}
              doc={d}
              onClick={(x) => onNavigate("/d/" + x.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// EDITAIS LIST
// ============================================================
function EditaisScreen({ onNavigate, onSubmit, role }) {
  const [status, setStatus] = useStateP("all");
  const r = ROLES[role];
  const all = DOCUMENTS.filter(
    (d) => d.type === "edital" && r.visibilities.includes(d.visibility),
  );
  const counts = {
    all: all.length,
    open: all.filter((d) => d.edital?.status === "open").length,
    "closing-soon": all.filter((d) => d.edital?.status === "closing-soon")
      .length,
    permanent: all.filter((d) => d.edital?.status === "permanent").length,
    closed: all.filter((d) => d.edital?.status === "closed").length,
  };
  const list =
    status === "all" ? all : all.filter((d) => d.edital?.status === status);

  return (
    <div className="page">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[{ label: "Início", href: "/" }, { label: "Editais" }]}
      />
      <div>
        <span className="eyebrow">Editais Hebron ASEEC</span>
        <h1 className="page-title">Janelas para submissão de projetos</h1>
        <p className="page-subtitle">
          Editais anuais abrem janelas específicas para projetos com vigência em
          ano-calendário; editais pontuais permanecem abertos continuamente para
          situações emergenciais.
        </p>
      </div>

      <div className="filters">
        <button
          className={"filter-chip" + (status === "all" ? " active" : "")}
          onClick={() => setStatus("all")}
        >
          Tudo <span className="count">{counts.all}</span>
        </button>
        <button
          className={"filter-chip" + (status === "open" ? " active" : "")}
          onClick={() => setStatus("open")}
        >
          Abertos <span className="count">{counts.open}</span>
        </button>
        <button
          className={
            "filter-chip" + (status === "closing-soon" ? " active" : "")
          }
          onClick={() => setStatus("closing-soon")}
        >
          Encerrando <span className="count">{counts["closing-soon"]}</span>
        </button>
        <button
          className={"filter-chip" + (status === "permanent" ? " active" : "")}
          onClick={() => setStatus("permanent")}
        >
          Permanentes <span className="count">{counts.permanent}</span>
        </button>
        {counts.closed > 0 && (
          <button
            className={"filter-chip" + (status === "closed" ? " active" : "")}
            onClick={() => setStatus("closed")}
          >
            Encerrados <span className="count">{counts.closed}</span>
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "var(--sp-4)",
        }}
      >
        {list.map((d) => (
          <EditalCard
            key={d.id}
            doc={d}
            onClick={(x) => onNavigate("/editais/" + x.slug)}
            onSubmit={onSubmit}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EDITAL DETAIL
// ============================================================
function EditalDetailScreen({ slug, onNavigate, onSubmit, role }) {
  const doc = DOCUMENTS.find((d) => d.slug === slug);
  if (!doc || doc.type !== "edital") {
    return (
      <div className="page">
        <EmptyState
          title="Edital não encontrado"
          description="Verifique o link ou volte para a lista de editais."
        />
      </div>
    );
  }
  const e = doc.edital;
  const daysToOpen = e.opensAt
    ? daysBetween(new Date(), new Date(e.opensAt))
    : null;
  const daysToClose = e.closesAt
    ? daysBetween(new Date(), new Date(e.closesAt))
    : null;
  const r = ROLES[role];
  const canSubmit = e.projectType && e.status !== "closed";

  return (
    <div className="page">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[
          { label: "Início", href: "/" },
          { label: "Editais", href: "/editais" },
          { label: doc.title },
        ]}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: "var(--sp-6)",
          alignItems: "flex-start",
        }}
      >
        {/* Main column */}
        <div>
          <div
            className="card"
            style={{ padding: "var(--sp-7)", marginBottom: "var(--sp-5)" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-2)",
                marginBottom: "var(--sp-3)",
                flexWrap: "wrap",
              }}
            >
              <StatusPill status={e.status} />
              <VisibilityBadge visibility={doc.visibility} />
              <FormatBadge format={doc.format} />
              <span
                style={{
                  fontSize: 13,
                  color: "var(--fg-muted)",
                  marginLeft: "auto",
                }}
              >
                Versão {doc.version} · {formatDate(doc.updatedAt)}
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 40,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                margin: "0 0 var(--sp-3)",
                textWrap: "balance",
              }}
            >
              {doc.title}
            </h1>
            <p
              style={{
                fontSize: 18,
                lineHeight: 1.55,
                color: "var(--fg)",
                margin: 0,
                maxWidth: "62ch",
              }}
            >
              {doc.summary}
            </p>

            {/* Timeline */}
            <div
              style={{
                marginTop: "var(--sp-6)",
                padding: "var(--sp-5)",
                background: "var(--hb-cream)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="eyebrow"
                style={{ display: "block", marginBottom: "var(--sp-3)" }}
              >
                Cronograma
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "var(--sp-4)",
                  position: "relative",
                }}
              >
                <TimelineStep label="Abertura" date={e.opensAt} state="done" />
                <TimelineStep
                  label={
                    e.status === "permanent"
                      ? "Sempre disponível"
                      : "Em andamento"
                  }
                  date="hoje"
                  state="current"
                />
                <TimelineStep
                  label="Encerramento"
                  date={e.status === "permanent" ? "—" : e.closesAt}
                  state={e.status === "closed" ? "done" : "pending"}
                />
              </div>
              {e.status !== "permanent" && daysToClose !== null && (
                <div
                  style={{
                    marginTop: "var(--sp-4)",
                    padding: "var(--sp-3) var(--sp-4)",
                    background: "var(--hb-white)",
                    borderRadius: "var(--radius-sm)",
                    borderLeft:
                      "4px solid " +
                      (e.status === "closing-soon"
                        ? "var(--hb-orange)"
                        : "var(--hb-blue)"),
                    fontSize: 14,
                  }}
                >
                  <strong>{daysToClose}</strong> dia
                  {daysToClose === 1 ? "" : "s"} restante
                  {daysToClose === 1 ? "" : "s"} até o encerramento da janela de
                  submissão.
                </div>
              )}
            </div>

            {/* CTA */}
            {canSubmit && (
              <div
                style={{
                  display: "flex",
                  gap: "var(--sp-3)",
                  marginTop: "var(--sp-5)",
                  alignItems: "center",
                }}
              >
                <button
                  className="btn btn-accent btn-lg"
                  onClick={() => onSubmit(doc)}
                >
                  Submeter projeto neste edital{" "}
                  <Icon name="external" size={16} />
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => alert("PDF baixado (mock)")}
                >
                  <Icon name="download" size={16} /> Baixar edital (
                  {doc.fileSize})
                </button>
                <span
                  style={{
                    fontSize: 12.5,
                    color: "var(--fg-muted)",
                    marginLeft: "auto",
                  }}
                >
                  Você será redirecionado para projetos.hebronaseec.com.br
                </span>
              </div>
            )}
          </div>

          {/* Conteúdo do edital — mock PDF viewer */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--sp-4) var(--sp-5)",
                borderBottom: "1px solid var(--divider)",
              }}
            >
              <div>
                <span className="eyebrow muted">Documento completo</span>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 18,
                  }}
                >
                  Visualização inline · página 1 de {doc.pages}
                </div>
              </div>
              <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="download" size={14} /> Baixar
                </button>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="printer" size={14} /> Imprimir
                </button>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="share" size={14} /> Compartilhar
                </button>
              </div>
            </div>
            <PDFViewer doc={doc} />
          </div>
        </div>

        {/* Aside */}
        <div className="doc-aside">
          <div className="aside-card">
            <div className="label">Detalhes</div>
            <div className="field">
              <span className="k">Tipo de projeto</span>
              <span className="v" style={{ textTransform: "capitalize" }}>
                {e.projectType || "—"}
              </span>
            </div>
            <div className="field">
              <span className="k">Categoria</span>
              <span className="v">{e.projectCategory || "—"}</span>
            </div>
            <div className="field">
              <span className="k">Versão</span>
              <span className="v">{doc.version}</span>
            </div>
            <div className="field">
              <span className="k">Páginas</span>
              <span className="v">{doc.pages}</span>
            </div>
            <div className="field">
              <span className="k">Tamanho</span>
              <span className="v">{doc.fileSize}</span>
            </div>
            <div className="field">
              <span className="k">Downloads</span>
              <span className="v">{doc.downloads.toLocaleString("pt-BR")}</span>
            </div>
          </div>

          <div className="aside-card">
            <div className="label">Tags</div>
            <div className="tag-cloud">
              {doc.tags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div className="aside-card">
            <div className="label">FAQ rápido</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
              <details style={{ paddingBottom: 8 }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: "6px 0",
                  }}
                >
                  Quem pode submeter?
                </summary>
                <div style={{ color: "var(--fg-muted)", paddingTop: 4 }}>
                  Pastores, missionários e instituições religiosas cadastradas e
                  aprovadas pelo super_admin.
                </div>
              </details>
              <details
                style={{
                  paddingBottom: 8,
                  borderTop: "1px solid var(--divider)",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: "6px 0",
                  }}
                >
                  Posso submeter mais de um?
                </summary>
                <div style={{ color: "var(--fg-muted)", paddingTop: 4 }}>
                  Sim, desde que respeitando o teto orçamentário anual da
                  instituição vinculada.
                </div>
              </details>
              <details
                style={{
                  paddingBottom: 8,
                  borderTop: "1px solid var(--divider)",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: "6px 0",
                  }}
                >
                  Como funciona a avaliação?
                </summary>
                <div style={{ color: "var(--fg-muted)", paddingTop: 4 }}>
                  Avaliadores designados emitem parecer; diretoria e conselho
                  votam de forma secreta; quórum mínimo de 50%.
                </div>
              </details>
            </div>
          </div>

          <div
            className="aside-card"
            style={{
              background: "var(--hb-blue)",
              color: "var(--hb-white)",
              border: "none",
            }}
          >
            <div className="label" style={{ color: "var(--fg-invert-muted)" }}>
              Histórico
            </div>
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.5,
                margin: "0 0 var(--sp-3)",
                color: "var(--fg-invert-muted)",
              }}
            >
              Este edital tem {VERSION_HISTORY[doc.id]?.length || doc.version}{" "}
              revisão
              {(VERSION_HISTORY[doc.id]?.length || doc.version) === 1
                ? ""
                : "ões"}{" "}
              publicadas.
            </p>
            <a
              className="btn btn-ghost btn-sm"
              style={{
                background: "var(--hb-white)",
                color: "var(--hb-blue)",
                borderColor: "var(--hb-white)",
              }}
              href={"#/d/" + doc.slug + "/versoes"}
              onClick={(ev) => {
                ev.preventDefault();
                onNavigate("/d/" + doc.slug + "/versoes");
              }}
            >
              <Icon name="history" size={14} /> Ver histórico
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ label, date, state }) {
  const colors = {
    done: {
      ring: "var(--hb-green)",
      fill: "var(--hb-green)",
      text: "var(--fg)",
    },
    current: {
      ring: "var(--hb-orange)",
      fill: "var(--hb-white)",
      text: "var(--fg)",
    },
    pending: {
      ring: "var(--border-strong)",
      fill: "var(--hb-white)",
      text: "var(--fg-muted)",
    },
  }[state];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: colors.fill,
          border: "3px solid " + colors.ring,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {state === "done" && (
          <Icon name="check" size={11} style={{ color: "var(--hb-white)" }} />
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 700,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 16,
            color: colors.text,
            marginTop: 2,
          }}
        >
          {date === "hoje"
            ? "Hoje"
            : typeof date === "string"
              ? date.includes("-")
                ? formatDate(date)
                : date
              : "—"}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DOCUMENT DETAIL (PDF or Markdown)
// ============================================================
function DocumentDetailScreen({ slug, onNavigate, role }) {
  const doc = DOCUMENTS.find((d) => d.slug === slug);
  if (!doc) {
    return (
      <div className="page">
        <EmptyState
          title="Documento não encontrado"
          description="Verifique o link."
        />
      </div>
    );
  }
  const r = ROLES[role];
  const canSee = r.visibilities.includes(doc.visibility);
  const versions = VERSION_HISTORY[doc.id];

  return (
    <div className="page">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[
          { label: "Início", href: "/" },
          ...(doc.category
            ? [
                {
                  label: categoryNameOf(doc.category),
                  href: "/c/" + topCategoryOf(doc.category),
                },
              ]
            : []),
          { label: doc.title },
        ]}
      />

      {!canSee && <RestrictedBanner visibility={doc.visibility} role={role} />}

      <div className="doc-layout">
        <div className="doc-main">
          <div className="doc-header">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-2)",
                flexWrap: "wrap",
              }}
            >
              <VisibilityBadge visibility={doc.visibility} />
              <FormatBadge format={doc.format} />
              {doc.tags.slice(0, 3).map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
              <span style={{ marginLeft: "auto" }} />
              <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => alert("Baixado (mock)")}
                >
                  <Icon name="download" size={14} /> Baixar
                </button>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="printer" size={14} /> Imprimir
                </button>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="share" size={14} /> Compartilhar
                </button>
              </div>
            </div>
            <h1>{doc.title}</h1>
            <div className="meta-row">
              <span>
                <Icon name="user" size={13} style={{ verticalAlign: "-2px" }} />{" "}
                {doc.author}
              </span>
              <span className="dot-sep" />
              <span>
                <Icon
                  name="calendar"
                  size={13}
                  style={{ verticalAlign: "-2px" }}
                />{" "}
                {formatDate(doc.updatedAt)}
              </span>
              <span className="dot-sep" />
              <span>
                <Icon
                  name="git-branch"
                  size={13}
                  style={{ verticalAlign: "-2px" }}
                />{" "}
                Versão {doc.version}
              </span>
              <span className="dot-sep" />
              <span>
                <Icon name="eye" size={13} style={{ verticalAlign: "-2px" }} />{" "}
                {doc.views.toLocaleString("pt-BR")} visualizações
              </span>
              <span className="dot-sep" />
              <span>
                <Icon
                  name="download"
                  size={13}
                  style={{ verticalAlign: "-2px" }}
                />{" "}
                {doc.downloads.toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="summary">{doc.summary}</p>
          </div>

          {doc.format === "pdf" ? (
            <PDFViewer doc={doc} />
          ) : (
            <div
              className="md-body"
              dangerouslySetInnerHTML={{
                __html:
                  DOC_CONTENT[doc.content] || "<p>Conteúdo indisponível.</p>",
              }}
            />
          )}
        </div>

        {/* Aside */}
        <div className="doc-aside">
          {doc.validUntil && (
            <div
              className="aside-card"
              style={{
                background: "rgba(161,197,32,0.12)",
                borderColor: "rgba(161,197,32,0.3)",
              }}
            >
              <div className="label" style={{ color: "#5C7510" }}>
                Vigência
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon
                  name="shield"
                  size={20}
                  style={{ color: "var(--hb-green-deep)" }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 17,
                    }}
                  >
                    Válido até {formatDate(doc.validUntil)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                    {daysBetween(new Date(), new Date(doc.validUntil))} dias
                    restantes
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="aside-card">
            <div className="label">Metadados</div>
            <div className="field">
              <span className="k">Categoria</span>
              <span className="v">{categoryNameOf(doc.category)}</span>
            </div>
            <div className="field">
              <span className="k">Versão atual</span>
              <span className="v">{doc.version}</span>
            </div>
            {doc.pages && (
              <div className="field">
                <span className="k">Páginas</span>
                <span className="v">{doc.pages}</span>
              </div>
            )}
            <div className="field">
              <span className="k">Tamanho</span>
              <span className="v">{doc.fileSize}</span>
            </div>
            <div className="field">
              <span className="k">Publicado</span>
              <span className="v">{formatDate(doc.publishedAt)}</span>
            </div>
            <div className="field">
              <span className="k">Atualizado</span>
              <span className="v">{formatDate(doc.updatedAt)}</span>
            </div>
          </div>

          <div className="aside-card">
            <div className="label">Tags</div>
            <div className="tag-cloud">
              {doc.tags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          {versions && versions.length > 1 && (
            <div className="aside-card">
              <div className="label">Histórico</div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                }}
              >
                {versions.slice(0, 3).map((v) => (
                  <li
                    key={v.version}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: 10,
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--divider)",
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        background: v.current
                          ? "var(--hb-blue)"
                          : "var(--hb-gray-50)",
                        color: v.current
                          ? "var(--hb-white)"
                          : "var(--fg-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 12,
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      v{v.version}
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>
                        {formatDate(v.date)}
                      </div>
                      <div style={{ color: "var(--fg-muted)", fontSize: 12 }}>
                        {v.author.split("(")[0]}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <a
                className="btn btn-ghost btn-sm"
                style={{ marginTop: "var(--sp-3)", width: "100%" }}
                href={"#/d/" + doc.slug + "/versoes"}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("/d/" + doc.slug + "/versoes");
                }}
              >
                <Icon name="history" size={13} /> Ver histórico completo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function categoryNameOf(catId) {
  for (const c of CATEGORIES) {
    if (c.id === catId) return c.name;
    const sub = c.children?.find((s) => s.id === catId);
    if (sub) return c.name + " · " + sub.name;
  }
  return catId;
}
function topCategoryOf(catId) {
  for (const c of CATEGORIES) {
    if (c.id === catId) return c.id;
    if (c.children?.some((s) => s.id === catId)) return c.id;
  }
  return catId;
}

// ============================================================
// PDF VIEWER MOCK
// ============================================================
function PDFViewer({ doc }) {
  const [page, setPage] = useStateP(1);
  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))}>
          <Icon name="chevron-left" size={14} />
        </button>
        <span className="page-num">
          <input
            value={page}
            onChange={(e) =>
              setPage(
                Math.max(
                  1,
                  Math.min(doc.pages || 1, parseInt(e.target.value) || 1),
                ),
              )
            }
          />{" "}
          / {doc.pages}
        </span>
        <button onClick={() => setPage((p) => Math.min(doc.pages, p + 1))}>
          <Icon name="chevron-right" size={14} />
        </button>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>100%</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <button title="Download">
          <Icon name="download" size={14} />
        </button>
        <button title="Print">
          <Icon name="printer" size={14} />
        </button>
      </div>
      <div className="pdf-page">
        <img className="pdf-logo" src="assets/logo-horizontal.png" alt="" />
        <h1 className="pdf-title">{doc.title}</h1>
        <div className="pdf-subtitle">
          {doc.author} · Versão {doc.version} · {formatDate(doc.updatedAt)}
        </div>
        <h2 className="pdf-h">1. Apresentação</h2>
        <p>
          A Hebron ASEEC — Assistência Social, Educacional, Evangélica e
          Científica — torna público o presente documento, que estabelece as
          diretrizes, critérios e procedimentos aplicáveis à sua finalidade
          institucional.
        </p>
        <p>
          Este documento integra a base normativa da associação e é mantido sob
          versionamento, com histórico auditável de revisões e responsáveis por
          cada alteração.
        </p>
        <h2 className="pdf-h">2. Finalidade</h2>
        <p>
          Estabelecer com clareza o conjunto de regras, prazos e expectativas
          que regem a relação entre a Hebron ASEEC, seus colaboradores,
          parceiros institucionais e beneficiários, em consonância com os
          valores cristãos que orientam a missão da associação.
        </p>
        <h2 className="pdf-h">3. Aplicabilidade</h2>
        <p>
          O documento se aplica a todas as partes envolvidas no escopo descrito,
          sem exceção, e produz efeitos a partir da data de publicação indicada
          na capa.
        </p>
        <ol>
          <li>Pastores e missionários cadastrados como submissores.</li>
          <li>Instituições religiosas vinculadas à Hebron ASEEC.</li>
          <li>Diretoria, conselho consultivo e equipe administrativa.</li>
        </ol>
        <h2 className="pdf-h">4. Cronograma</h2>
        <p>
          Os prazos previstos neste documento podem ser alterados a critério da
          diretoria, com comunicação prévia aos interessados pelos canais
          oficiais.
        </p>
        <div className="pdf-foot">
          <span>{doc.author}</span>
          <span>
            página {page} de {doc.pages}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SEARCH SCREEN
// ============================================================
function SearchScreen({ query, onNavigate, role }) {
  const r = ROLES[role];
  const q = (query || "").toLowerCase().trim();
  const all = DOCUMENTS.filter((d) => r.visibilities.includes(d.visibility));

  const results = q
    ? all.filter((d) => {
        return (
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.tags.some((t) => t.includes(q))
        );
      })
    : all.slice(0, 8);

  const hit = (txt) => {
    if (!q) return txt;
    const re = new RegExp(
      "(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")",
      "gi",
    );
    return txt.replace(re, "<mark>$1</mark>");
  };

  const suggestions = [
    "edital projetos",
    "lgpd",
    "certidão receita",
    "pagamento autorização",
    "flats",
  ];

  return (
    <div className="page page-narrow">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[{ label: "Início", href: "/" }, { label: "Busca" }]}
      />

      <div style={{ marginBottom: "var(--sp-5)" }}>
        <span className="eyebrow">Busca global</span>
        <h1 className="page-title" style={{ margin: "8px 0 0" }}>
          {q ? (
            <>
              Resultados para "
              <span style={{ color: "var(--hb-orange)" }}>{query}</span>"
            </>
          ) : (
            "O que você está procurando?"
          )}
        </h1>
        <p className="page-subtitle">
          {q
            ? `${results.length} documento${results.length === 1 ? "" : "s"} encontrado${results.length === 1 ? "" : "s"} no seu nível de acesso.`
            : "Busque por título, conteúdo, tags ou categoria. Tente uma das sugestões abaixo."}
        </p>
        {!q && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggestions.map((s) => (
              <button
                key={s}
                className="filter-chip"
                onClick={() => onNavigate("/buscar?q=" + encodeURIComponent(s))}
              >
                <Icon name="search" size={12} /> {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {q && (
        <div className="filters">
          <button className="filter-chip active">
            Tudo <span className="count">{results.length}</span>
          </button>
          <button className="filter-chip">
            Editais{" "}
            <span className="count">
              {results.filter((d) => d.type === "edital").length}
            </span>
          </button>
          <button className="filter-chip">
            Políticas{" "}
            <span className="count">
              {results.filter((d) => d.category?.includes("politica")).length}
            </span>
          </button>
          <button className="filter-chip">
            Certidões{" "}
            <span className="count">
              {
                results.filter((d) => d.category?.startsWith("certidoes"))
                  .length
              }
            </span>
          </button>
          <span className="filter-divider" />
          <button className="filter-chip">
            <Icon name="filter" size={13} /> Mais filtros
          </button>
        </div>
      )}

      <div className="card" style={{ padding: "0 var(--sp-5)" }}>
        {results.length === 0 ? (
          <div style={{ padding: "var(--sp-7) 0" }}>
            <EmptyState
              icon="search"
              title="Nenhum resultado"
              description="Tente reformular a busca ou navegar pelas categorias."
              verse={VERSES.search}
            />
          </div>
        ) : (
          results.map((d) => (
            <a
              key={d.id}
              className={
                "search-result" + (d.format === "markdown" ? " md" : "")
              }
              href={"#/d/" + d.slug}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/d/" + d.slug);
              }}
            >
              <div className="fmt-icon">
                <span>{d.format === "pdf" ? "PDF" : "MD"}</span>
                {d.pages && (
                  <span style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>
                    {d.pages}p
                  </span>
                )}
              </div>
              <div>
                <div className="breadcrumb">
                  {categoryNameOf(d.category)} ·{" "}
                  <span style={{ textTransform: "capitalize" }}>{d.type}</span>{" "}
                  · v{d.version}
                </div>
                <h3
                  className="title"
                  dangerouslySetInnerHTML={{ __html: hit(d.title) }}
                />
                <p
                  className="excerpt"
                  dangerouslySetInnerHTML={{ __html: hit(d.summary) }}
                />
                <div className="meta">
                  <VisibilityBadge visibility={d.visibility} />
                  <span>
                    <Icon
                      name="calendar"
                      size={11}
                      style={{ verticalAlign: "-1px" }}
                    />{" "}
                    {formatDate(d.updatedAt)}
                  </span>
                  <span>
                    <Icon
                      name="eye"
                      size={11}
                      style={{ verticalAlign: "-1px" }}
                    />{" "}
                    {d.views.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  HomeScreen,
  CategoryScreen,
  EditaisScreen,
  EditalDetailScreen,
  DocumentDetailScreen,
  PDFViewer,
  SearchScreen,
  categoryNameOf,
  topCategoryOf,
});
