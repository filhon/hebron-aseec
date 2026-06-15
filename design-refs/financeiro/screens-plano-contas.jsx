// Plano de contas — árvore hierárquica
function ScreenPlanoContas() {
  const [expanded, setExpanded] = useState(new Set(["1", "2", "3"]));
  const [hovered, setHovered] = useState(null);

  const toggle = (code) => {
    const next = new Set(expanded);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setExpanded(next);
  };

  const renderNode = (node, depth) => {
    const hasChildren = !!(node.children && node.children.length);
    const isOpen = expanded.has(node.code);
    const rows = [
      <div
        key={node.code}
        className={"tree-node depth-" + depth}
        onMouseEnter={() => setHovered(node.code)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => hasChildren && toggle(node.code)}
      >
        {hasChildren ? (
          <Icons.ChevRight
            size={14}
            className={"tree-node__chev " + (isOpen ? "open" : "")}
          />
        ) : (
          <span style={{ width: 14, height: 14, display: "inline-block" }} />
        )}
        {depth === 0 && (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background:
                depth === 0
                  ? node.code === "1"
                    ? "rgba(161,197,32,0.18)"
                    : node.code === "2"
                      ? "rgba(32,44,133,0.10)"
                      : node.code === "3"
                        ? "rgba(7,180,231,0.14)"
                        : "rgba(234,90,6,0.12)"
                  : "transparent",
              color:
                node.code === "1"
                  ? "var(--hb-green-deep)"
                  : node.code === "2"
                    ? "var(--hb-blue)"
                    : node.code === "3"
                      ? "var(--hb-cyan-deep)"
                      : "var(--hb-orange-deep)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {node.code === "1" && <Icons.TrendingUp size={14} />}
            {node.code === "2" && <Icons.Building size={14} />}
            {node.code === "3" && <Icons.Heart size={14} />}
            {node.code === "4" && <Icons.FileText size={14} />}
          </span>
        )}
        <span className="tree-node__code">{node.code}</span>
        <span
          style={{
            fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 500,
            color: depth === 0 ? "var(--fg)" : "inherit",
          }}
        >
          {node.name}
        </span>
        {hovered === node.code && (
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
            <button
              className="icon-btn"
              style={{ width: 26, height: 26, border: "none" }}
              title="Adicionar sub"
            >
              <Icons.Plus size={12} />
            </button>
            <button
              className="icon-btn"
              style={{ width: 26, height: 26, border: "none" }}
              title="Mais"
            >
              <Icons.MoreHorizontal size={12} />
            </button>
          </span>
        )}
      </div>,
    ];
    if (hasChildren && isOpen) {
      node.children.forEach((c) => rows.push(...renderNode(c, depth + 1)));
    }
    return rows;
  };

  return (
    <div className="page">
      <div
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}
      >
        {/* Tree */}
        <div className="card" style={{ padding: 0 }}>
          <div
            className="tbl-wrap__head"
            style={{ justifyContent: "space-between" }}
          >
            <div>
              <div className="eyebrow">Plano de contas · 2026</div>
              <div className="section-title" style={{ marginTop: 2 }}>
                Estrutura hierárquica
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn--ghost btn--sm">
                <Icons.Download size={12} />
                Exportar
              </button>
              <button className="btn btn--primary btn--sm">
                <Icons.Plus size={12} />
                Nova categoria
              </button>
            </div>
          </div>
          <div style={{ padding: "8px 14px 14px" }}>
            {MOCK.categories.map((c) => renderNode(c, 0))}
          </div>
        </div>

        {/* Side panel */}
        <div className="stack">
          <div className="card">
            <SectionHeader eyebrow="Sugestão" title="Defaults editáveis" />
            <p
              style={{
                fontSize: 13,
                color: "var(--fg-muted)",
                lineHeight: 1.55,
              }}
            >
              O plano de contas começa com a estrutura sugerida — quatro grandes
              grupos: receitas, despesas operacionais, despesas missionárias e
              tributos. Tudo pode ser editado, reordenado por arrastar-e-soltar
              e expandido conforme a operação cresce.
            </p>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span className="pill pill--green">
                <span className="pill__dot" />4 categorias-raiz
              </span>
              <span className="pill pill--blue">
                <span className="pill__dot" />
                18 subcategorias
              </span>
              <span className="pill pill--gray">
                <span className="pill__dot" />6 níveis máx.
              </span>
            </div>
          </div>

          <div className="card">
            <SectionHeader eyebrow="Atalhos" title="Operações comuns" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Importar plano padrão CFC", icon: "Download" },
                { label: "Vincular a centros de custo", icon: "Link" },
                { label: "Gerar DRE preliminar", icon: "BarChart" },
                { label: "Exportar para contabilidade", icon: "FileText" },
              ].map((s) => {
                const Ico = Icons[s.icon];
                return (
                  <button
                    key={s.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: "left",
                      transition: "all 140ms",
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "var(--bg-alt)",
                        color: "var(--hb-blue)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ico size={14} />
                    </span>
                    {s.label}
                    <Icons.ArrowRight
                      size={12}
                      color="var(--fg-muted)"
                      style={{ marginLeft: "auto" }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="card"
            style={{
              background: "var(--hb-blue)",
              color: "var(--fg-invert)",
              border: "none",
            }}
          >
            <div className="eyebrow" style={{ color: "var(--hb-cyan)" }}>
              Boa prática
            </div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                lineHeight: 1.5,
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              Use níveis de detalhe apenas onde houver decisão a ser tomada.
              Categoria demais cria ruído na DRE.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ScreenPlanoContas = ScreenPlanoContas;
