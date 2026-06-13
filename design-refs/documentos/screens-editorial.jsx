// Editorial-area screens: dashboard, edital editor, version history.

const { useState: useStateE, useMemo: useMemoE } = React;

// ============================================================
// EDITORIAL DASHBOARD
// ============================================================
function EditorialDashboardScreen({ onNavigate }) {
  const total = DOCUMENTS.length;
  const editais = DOCUMENTS.filter(d => d.type === "edital").length;
  const internal = DOCUMENTS.filter(d => d.visibility === "internal").length;
  const restricted = DOCUMENTS.filter(d => d.visibility === "restricted").length;
  const recentlyUpdated = [...DOCUMENTS].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 8);
  const expiringCertidoes = DOCUMENTS.filter(d => d.validUntil && daysBetween(new Date(), new Date(d.validUntil)) < 120);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
        <div>
          <span className="eyebrow">Área editorial</span>
          <h1 className="page-title" style={{ margin: "6px 0 4px" }}>Painel da equipe editorial</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Publicações, edição e versionamento. Apenas super_admins e editores designados acessam esta área.</p>
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
          <button className="btn btn-ghost"><Icon name="upload" size={15} /> Importar PDF</button>
          <button className="btn btn-primary"><Icon name="plus" size={15} /> Novo documento</button>
          <button className="btn btn-accent" onClick={() => onNavigate("/editorial/edital/novo")}>
            <Icon name="scroll" size={15} /> Novo edital
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="accent" />
          <div className="label">Total publicado</div>
          <div className="value tabular">{total}</div>
          <div className="delta up"><Icon name="trending-up" size={12} /> +3 nos últimos 30 dias</div>
        </div>
        <div className="kpi-card accent-orange">
          <div className="accent" />
          <div className="label">Editais</div>
          <div className="value tabular">{editais}</div>
          <div className="delta">2 abertos · 1 encerrando</div>
        </div>
        <div className="kpi-card accent-cyan">
          <div className="accent" />
          <div className="label">Visualizações (30 dias)</div>
          <div className="value tabular">12.4k</div>
          <div className="delta up"><Icon name="trending-up" size={12} /> +18% vs período anterior</div>
        </div>
        <div className="kpi-card accent-green">
          <div className="accent" />
          <div className="label">Assinaturas ativas</div>
          <div className="value tabular">128</div>
          <div className="delta">+12 esta semana</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "var(--sp-5)", alignItems: "flex-start" }}>
        {/* Recently updated table */}
        <section>
          <div className="section-head">
            <div className="left">
              <span className="eyebrow">Edição recente</span>
              <h2>Últimas atualizações</h2>
            </div>
            <div className="actions">
              <button className="filter-chip active">Todos</button>
              <button className="filter-chip">Editais</button>
              <button className="filter-chip">Políticas</button>
            </div>
          </div>

          <div className="editorial-table">
            <table>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Categoria</th>
                  <th>Visibilidade</th>
                  <th>Versão</th>
                  <th>Atualizado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentlyUpdated.map(d => (
                  <tr key={d.id}>
                    <td className="td-title">
                      <a href={"#/d/" + d.slug} onClick={(e) => { e.preventDefault(); onNavigate("/d/" + d.slug); }} style={{ color: "var(--hb-blue)" }}>
                        {d.title}
                      </a>
                      <div className="sub">{d.author.split("(")[0]}</div>
                    </td>
                    <td><span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{categoryNameOf(d.category)}</span></td>
                    <td><VisibilityBadge visibility={d.visibility} /></td>
                    <td className="tabular" style={{ fontWeight: 600 }}>v{d.version}</td>
                    <td className="tabular muted">{formatDate(d.updatedAt)}</td>
                    <td className="td-actions">
                      {d.type === "edital" ? (
                        <button className="icon-btn-sm" title="Editar edital" onClick={() => onNavigate("/editorial/edital/" + d.slug)}><Icon name="edit" size={14} /></button>
                      ) : (
                        <button className="icon-btn-sm" title="Editar"><Icon name="edit" size={14} /></button>
                      )}
                      <button className="icon-btn-sm" title="Histórico" onClick={() => onNavigate("/d/" + d.slug + "/versoes")}><Icon name="history" size={14} /></button>
                      <button className="icon-btn-sm" title="Mais"><Icon name="more-horizontal" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Side stack */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          {/* Editais em destaque */}
          <div className="card" style={{ padding: "var(--sp-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-3)" }}>
              <div>
                <span className="eyebrow">Editais ativos</span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: "2px 0 0", fontWeight: 700 }}>Estado da pipeline</h3>
              </div>
              <a className="btn btn-quiet btn-sm" href="#/editorial/editais" onClick={(e) => { e.preventDefault(); onNavigate("/editorial/editais"); }}>Ver todos</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              {DOCUMENTS.filter(d => d.type === "edital").map(d => {
                const e = d.edital;
                const daysToClose = e.closesAt ? daysBetween(new Date(), new Date(e.closesAt)) : null;
                return (
                  <div key={d.id} style={{ padding: "var(--sp-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: 6, cursor: "pointer" }}
                       onClick={() => onNavigate("/editorial/edital/" + d.slug)}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <StatusPill status={e.status} />
                      <span style={{ fontSize: 11.5, color: "var(--fg-muted)", fontWeight: 600 }}>v{d.version}</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25 }}>{d.title}</div>
                    {e.status !== "permanent" && daysToClose !== null && (
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                        Encerra em <strong style={{ color: e.status === "closing-soon" ? "var(--hb-orange)" : "var(--fg)" }}>{daysToClose} dias</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vigência das certidões */}
          <div className="card" style={{ padding: "var(--sp-5)" }}>
            <span className="eyebrow">Vigência</span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: "2px 0 var(--sp-3)", fontWeight: 700 }}>Certidões a renovar</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {expiringCertidoes.map(d => {
                const days = daysBetween(new Date(), new Date(d.validUntil));
                const urgent = days < 30;
                return (
                  <li key={d.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--divider)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: urgent ? "var(--hb-orange)" : "var(--hb-green)" }} />
                    <div style={{ fontSize: 13.5, lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 600 }}>{d.title.replace("Certidão", "Cert.").slice(0, 42)}</div>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>Válida até {formatDate(d.validUntil)}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: urgent ? "var(--hb-orange)" : "var(--fg)" }}>{days}d</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Pending review (fake) */}
          <div className="card" style={{ padding: "var(--sp-5)" }}>
            <span className="eyebrow">Fila de revisão</span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: "2px 0 var(--sp-3)", fontWeight: 700 }}>Aguardando publicação</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
              <li style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--divider)" }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(7,180,231,0.14)", color: "#056A87", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="edit" size={15} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>SOP — Conciliação bancária</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>Em revisão · Letícia Pires</div>
                </div>
                <button className="btn btn-quiet btn-sm">Abrir</button>
              </li>
              <li style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--divider)" }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(234,90,6,0.14)", color: "#B14304", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="scroll" size={15} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>Edital de projetos pontuais — v6</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>Aguarda diretoria · Filipe Honório</div>
                </div>
                <button className="btn btn-quiet btn-sm">Abrir</button>
              </li>
              <li style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", padding: "10px 0" }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(161,197,32,0.18)", color: "#5C7510", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="file-plus" size={15} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>Descrição de cargo — Diretor Autorizador</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>Rascunho · Marcos Andrade</div>
                </div>
                <button className="btn btn-quiet btn-sm">Abrir</button>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ============================================================
// EDITAL EDITOR
// ============================================================
function EditalEditorScreen({ slug, onNavigate }) {
  const existing = slug ? DOCUMENTS.find(d => d.slug === slug && d.type === "edital") : null;
  const isNew = !existing;

  const [tab, setTab] = useStateE("conteudo");
  const [form, setForm] = useStateE({
    title:        existing?.title || "",
    summary:      existing?.summary || "",
    visibility:   existing?.visibility || "public",
    projectType:  existing?.edital?.projectType || "anual",
    opensAt:      existing?.edital?.opensAt || "",
    closesAt:     existing?.edital?.closesAt || "",
    category:     existing?.category || "editais-anuais",
    tags:         existing?.tags || ["projetos", "anuais"],
    content: `# Edital de Projetos Anuais 2026

## 1. Objeto
A Hebron ASEEC torna público o presente edital, que tem por objeto a seleção de projetos com vigência em ano-calendário (jan–dez/2026), apresentados por pastores, missionários e instituições religiosas cadastradas.

## 2. Cronograma
- Abertura das submissões: 01 de fevereiro de 2026
- Encerramento: 15 de março de 2026
- Avaliação e parecer: 16 de março a 30 de abril de 2026
- Votação da diretoria e conselho: reunião ordinária de maio
- Homologação: até 15 dias após a votação

## 3. Critérios de avaliação
A avaliação considera, entre outros:
- **Aderência à missão** da Hebron ASEEC (peso 30%)
- **Viabilidade orçamentária** (peso 20%)
- **Impacto missionário** estimado (peso 20%)
- **Capacidade institucional** da entidade proponente (peso 15%)
- **Impacto regional** (peso 10%)
- **Histórico de prestação de contas** (peso 5%)

## 4. Submissão
A submissão é realizada pelo módulo Projetos do ecossistema Hebron ASEEC, em \`projetos.hebronaseec.com.br\`, mediante login e vínculo com instituição previamente aprovada.

## 5. Disposições finais
Casos omissos serão decididos pela diretoria. Este edital pode ser revisado mediante publicação de nova versão neste portal.`,
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const visibilities = ["public", "internal", "restricted"];
  const projectTypes = ["anual", "pontual"];

  const checklist = [
    { done: !!form.title, label: "Título preenchido" },
    { done: form.summary.length > 40, label: "Resumo com 40+ caracteres" },
    { done: !!form.opensAt && !!form.closesAt, label: "Cronograma definido" },
    { done: form.tags.length >= 2, label: "Pelo menos 2 tags" },
    { done: form.content.length > 400, label: "Conteúdo com base completa" },
    { done: false, label: "Aprovação da diretoria registrada" },
  ];

  return (
    <div className="page">
      <Breadcrumbs onNavigate={onNavigate} items={[
        { label: "Área editorial", href: "/editorial" },
        { label: "Editais", href: "/editorial" },
        { label: isNew ? "Novo edital" : form.title || existing.title },
      ]} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--sp-5)", gap: "var(--sp-5)" }}>
        <div>
          <span className="eyebrow">{isNew ? "Criando" : "Editando rascunho · v" + (existing.version + 1)}</span>
          <h1 className="page-title" style={{ margin: "6px 0 4px" }}>{isNew ? "Novo edital" : form.title}</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {isNew ? "Defina o conteúdo, o cronograma e a integração com o módulo Projetos." : "As alterações serão salvas como uma nova versão. Publique para tornar pública a revisão."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Rascunho salvo às 14:32</span>
          <button className="btn btn-ghost"><Icon name="eye" size={14} /> Pré-visualizar</button>
          <button className="btn btn-primary"><Icon name="send" size={14} /> Publicar nova versão</button>
        </div>
      </div>

      <div className="editor-shell">
        <div className="editor-pane">
          <div className="editor-tabs">
            <button className={"editor-tab" + (tab === "conteudo" ? " active" : "")} onClick={() => setTab("conteudo")}>Conteúdo</button>
            <button className={"editor-tab" + (tab === "metadados" ? " active" : "")} onClick={() => setTab("metadados")}>Metadados</button>
            <button className={"editor-tab" + (tab === "submissao" ? " active" : "")} onClick={() => setTab("submissao")}>Integração com Projetos</button>
            <button className={"editor-tab" + (tab === "faq" ? " active" : "")} onClick={() => setTab("faq")}>FAQ</button>
          </div>

          {tab === "conteudo" && (
            <div className="field-group">
              <div className="form-field">
                <label>Título</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Edital de Projetos Anuais 2026" />
              </div>
              <div className="form-field">
                <label>Resumo</label>
                <div className="hint">Aparece nos cards, no compartilhamento social e como meta description.</div>
                <textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={3}
                  placeholder="Descreva em até 240 caracteres o propósito deste edital." style={{ fontFamily: "inherit", fontSize: 14, minHeight: 80 }} />
              </div>

              <div className="form-field">
                <label>Conteúdo (Markdown)</label>
                <div className="hint">Renderizado com a tipografia da Hebron ASEEC. Use cabeçalhos para estruturar e listas para critérios.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                  <textarea value={form.content} onChange={(e) => set("content", e.target.value)}
                    style={{ minHeight: 360, fontFamily: "ui-monospace, monospace", fontSize: 13, lineHeight: 1.55 }} />
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "var(--sp-4)", overflowY: "auto", maxHeight: 360, background: "var(--hb-cream)" }}>
                    <MarkdownPreview md={form.content} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "metadados" && (
            <div className="field-group">
              <div className="form-field">
                <label>Visibilidade</label>
                <div className="toggle-group">
                  {visibilities.map(v => (
                    <button key={v} type="button"
                      className={"toggle-pill" + (form.visibility === v ? " active" : "")}
                      onClick={() => set("visibility", v)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <VisibilityBadge visibility={v} />
                      </div>
                      <div className="help">{VISIBILITY[v].description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-row">
                <div className="form-field">
                  <label>Categoria</label>
                  <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {CATEGORIES.flatMap(c => [
                      <option key={c.id} value={c.id} disabled>{c.name}</option>,
                      ...(c.children?.map(s => <option key={s.id} value={s.id}>&nbsp;&nbsp;&nbsp;{s.name}</option>) || []),
                    ])}
                  </select>
                </div>
                <div className="form-field">
                  <label>Slug</label>
                  <input value={(form.title || "novo-edital").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")} readOnly style={{ background: "var(--hb-cream)" }} />
                  <div className="hint">Gerado a partir do título.</div>
                </div>
              </div>

              <div className="form-field">
                <label>Tags</label>
                <div className="tag-input">
                  {form.tags.map(t => (
                    <span key={t} className="tag-chip">{t} <Icon name="x" size={11} /></span>
                  ))}
                  <input placeholder="adicionar tag..." />
                </div>
                <div className="hint">Sugestões: projetos · 2026 · missoes · submissao</div>
              </div>
            </div>
          )}

          {tab === "submissao" && (
            <div className="field-group">
              <div className="form-field">
                <label>Tipo de projeto que este edital recebe</label>
                <div className="toggle-group">
                  {projectTypes.map(t => (
                    <button key={t} type="button"
                      className={"toggle-pill" + (form.projectType === t ? " active" : "")}
                      onClick={() => set("projectType", t)}>
                      <div className="title" style={{ textTransform: "capitalize" }}>{t}</div>
                      <div className="help">{t === "anual" ? "Avaliado em ciclo único, com janela definida (jan–mar)." : "Avaliação mensal, sem janela; pagamento único."}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-row">
                <div className="form-field">
                  <label>Abertura da janela</label>
                  <input type="date" value={form.opensAt} onChange={(e) => set("opensAt", e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Encerramento da janela</label>
                  <input type="date" value={form.closesAt} onChange={(e) => set("closesAt", e.target.value)} />
                  <div className="hint">Deixe em branco para edital permanente.</div>
                </div>
              </div>

              <div className="form-field">
                <label>Botão "Submeter projeto"</label>
                <div className="hint">Quando habilitado, exibe o botão no edital público que redireciona ao módulo Projetos com tipo e categoria pré-preenchidos.</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "var(--sp-3)", background: "var(--hb-cream)", borderRadius: "var(--radius-sm)" }}>
                  <Icon name="external" size={18} style={{ color: "var(--hb-blue)" }} />
                  <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5, color: "var(--fg-muted)" }}>
                    projetos.hebronaseec.com.br/novo?edital={(form.title || "x").toLowerCase().replace(/\s+/g, "-")}&tipo={form.projectType}
                  </code>
                </div>
              </div>
            </div>
          )}

          {tab === "faq" && (
            <div className="field-group">
              <div className="form-field">
                <label>Perguntas frequentes</label>
                <div className="hint">Adicione perguntas e respostas que apareceram na lateral do edital. Reordene arrastando.</div>
              </div>
              {[
                { q: "Quem pode submeter?", a: "Pastores, missionários e instituições religiosas cadastradas e aprovadas." },
                { q: "Posso submeter mais de um projeto?", a: "Sim, respeitando o teto orçamentário anual da instituição vinculada." },
                { q: "Como funciona a avaliação?", a: "Avaliadores designados emitem parecer; diretoria e conselho votam de forma secreta." },
              ].map((f, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "var(--sp-3)", padding: "var(--sp-4)", background: "var(--hb-cream)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--hb-blue)", color: "var(--hb-white)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.q}</div>
                    <div style={{ fontSize: 13.5, color: "var(--fg-muted)" }}>{f.a}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="icon-btn" style={{ width: 28, height: 28 }}><Icon name="edit" size={13} /></button>
                    <button className="icon-btn" style={{ width: 28, height: 28 }}><Icon name="trash" size={13} /></button>
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ alignSelf: "flex-start" }}><Icon name="plus" size={14} /> Adicionar pergunta</button>
            </div>
          )}
        </div>

        {/* Aside */}
        <div className="editor-aside">
          <div className="editor-aside-card">
            <div className="title">Checklist de publicação</div>
            <ul className="checklist">
              {checklist.map((c, i) => (
                <li key={i} className={c.done ? "done" : ""}>
                  <span className="check">{c.done && <Icon name="check" size={9} />}</span>
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="editor-aside-card" style={{ background: "var(--hb-blue)", color: "var(--hb-white)", borderColor: "var(--hb-blue)" }}>
            <div className="title" style={{ color: "var(--hb-white)" }}>Pré-visualização rápida</div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "var(--sp-3)", borderRadius: "var(--radius-sm)", marginBottom: "var(--sp-3)" }}>
              <StatusPill status="open" />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginTop: 8, lineHeight: 1.2 }}>
                {form.title || "Título do edital"}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-invert-muted)", marginTop: 6, lineHeight: 1.4 }}>
                {(form.summary || "Resumo aparecerá aqui assim que for preenchido.").slice(0, 110)}…
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-invert-muted)" }}>
              {form.opensAt && form.closesAt ? `${formatDate(form.opensAt)} → ${formatDate(form.closesAt)}` : "Cronograma não definido"}
            </div>
          </div>

          <div className="editor-aside-card">
            <div className="title">Histórico recente</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { v: 3, who: "Filipe", when: "hoje, 14:32", what: "Rascunho atualizado" },
                { v: 3, who: "Filipe", when: "hoje, 11:08", what: "Rascunho iniciado" },
                { v: 2, who: "Letícia", when: "08/dez/25", what: "Publicado" },
                { v: 1, who: "Filipe", when: "04/nov/25", what: "Versão inicial" },
              ].map((h, i) => (
                <li key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, padding: "8px 0", borderBottom: i < 3 ? "1px solid var(--divider)" : "none", alignItems: "center" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--hb-cream)", color: "var(--hb-blue)", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>v{h.v}</div>
                  <div style={{ fontSize: 12.5 }}>
                    <div style={{ fontWeight: 600 }}>{h.what}</div>
                    <div style={{ color: "var(--fg-muted)" }}>{h.who} · {h.when}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tiny markdown preview (headings, bold, lists)
function MarkdownPreview({ md }) {
  const html = md
    .split("\n")
    .map(line => {
      if (/^# /.test(line)) return `<h2 style="font-family:var(--font-display);font-size:18px;font-weight:700;letter-spacing:-0.01em;color:var(--hb-blue);margin:0 0 6px;">${line.replace(/^# /, "")}</h2>`;
      if (/^## /.test(line)) return `<h3 style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--fg);margin:14px 0 4px;">${line.replace(/^## /, "")}</h3>`;
      if (/^- /.test(line)) return `<li style="font-size:13px;line-height:1.5;">${line.replace(/^- /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</li>`;
      if (line.trim() === "") return "";
      return `<p style="font-size:13px;line-height:1.55;color:var(--fg);margin:0 0 8px;">${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, '<code style="background:var(--hb-white);padding:1px 5px;border-radius:3px;font-size:11.5px;">$1</code>')}</p>`;
    })
    .join("");
  // Wrap consecutive li in ul
  const wrapped = html.replace(/(<li.*?<\/li>\s*)+/g, m => `<ul style="margin:0 0 10px;padding-left:18px;">${m}</ul>`);
  return <div dangerouslySetInnerHTML={{ __html: wrapped }} />;
}

// ============================================================
// VERSION HISTORY
// ============================================================
function VersionHistoryScreen({ slug, onNavigate }) {
  const [diffOpen, setDiffOpen] = useStateE(null);
  const doc = DOCUMENTS.find(d => d.slug === slug);
  if (!doc) {
    return <div className="page"><EmptyState title="Documento não encontrado" /></div>;
  }
  const versions = VERSION_HISTORY[doc.id] || [{
    version: doc.version, date: doc.updatedAt, author: doc.author,
    summary: "Versão inicial publicada.",
    changes: [{ type: "add", section: "Documento", note: "Publicação inicial." }],
    current: true,
  }];

  return (
    <div className="page page-narrow">
      <Breadcrumbs onNavigate={onNavigate} items={[
        { label: "Início", href: "/" },
        { label: doc.title, href: doc.type === "edital" ? "/editais/" + doc.slug : "/d/" + doc.slug },
        { label: "Histórico de versões" },
      ]} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
        <div>
          <span className="eyebrow">Versionamento</span>
          <h1 className="page-title" style={{ margin: "6px 0 4px" }}>Histórico — {doc.title}</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>{versions.length} revis{versions.length === 1 ? "ão" : "ões"} publicadas. Toda alteração no documento gera uma nova versão imutável.</p>
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
          <button className="btn btn-ghost"><Icon name="download" size={14} /> Exportar log</button>
          <button className="btn btn-primary" onClick={() => onNavigate("/editorial/edital/" + doc.slug)}>
            <Icon name="edit" size={14} /> Nova revisão
          </button>
        </div>
      </div>

      {/* Diff comparator hint */}
      <div className="card" style={{ padding: "var(--sp-4) var(--sp-5)", marginBottom: "var(--sp-5)", display: "flex", alignItems: "center", gap: "var(--sp-4)" }}>
        <Icon name="git-branch" size={20} style={{ color: "var(--hb-blue)" }} />
        <div style={{ flex: 1, fontSize: 13.5 }}>
          <div style={{ fontWeight: 600 }}>Comparar versões</div>
          <div style={{ color: "var(--fg-muted)" }}>Selecione duas versões abaixo para ver as diferenças linha a linha.</div>
        </div>
        <select style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }}>
          {versions.map(v => <option key={v.version}>v{v.version} · {formatDate(v.date)}</option>)}
        </select>
        <span style={{ color: "var(--fg-muted)" }}>vs</span>
        <select style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }} defaultValue={versions[versions.length - 1].version}>
          {versions.map(v => <option key={v.version}>v{v.version} · {formatDate(v.date)}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm">Comparar</button>
      </div>

      <div className="version-list">
        {versions.map(v => (
          <div key={v.version} className={"version-row" + (v.current ? " current" : "")}>
            <div className="version-tag">
              <span className="v-sub">Versão</span>
              v{v.version}
            </div>
            <div>
              <div className="version-summary">{v.summary}</div>
              <div className="version-meta">
                <Icon name="user" size={13} /> {v.author}
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--fg-subtle)" }} />
                <Icon name="calendar" size={13} /> {formatDate(v.date)}
                {v.current && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--fg-subtle)" }} />
                    <span className="badge badge-public" style={{ fontSize: 10 }}><span className="dot" /> Versão atual</span>
                  </>
                )}
              </div>
              <ul className="version-changes">
                {v.changes.map((c, i) => (
                  <li key={i}>
                    <span className={"change-icon " + (c.type === "add" ? "change-add" : "change-edit")}>
                      {c.type === "add" ? <Icon name="plus" size={11} /> : <Icon name="edit" size={11} />}
                    </span>
                    <span className="change-section">{c.section}</span>
                    <span>{c.note}</span>
                  </li>
                ))}
              </ul>

              {diffOpen === v.version && (
                <div className="diff-block" style={{ marginTop: "var(--sp-3)" }}>
                  <div><span className="del">— Período de submissão: 15 jan a 28 fev.</span></div>
                  <div><span className="add">+ Período de submissão: 01 fev a 15 mar.</span></div>
                  <div style={{ height: 4 }} />
                  <div><span className="add">+ Critério: impacto regional (peso 10%).</span></div>
                </div>
              )}
            </div>
            <div className="version-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setDiffOpen(diffOpen === v.version ? null : v.version)}>
                <Icon name={diffOpen === v.version ? "eye-off" : "eye"} size={13} /> {diffOpen === v.version ? "Ocultar" : "Ver"} diff
              </button>
              {!v.current && (
                <button className="btn btn-ghost btn-sm">
                  <Icon name="history" size={13} /> Restaurar
                </button>
              )}
              <button className="btn btn-ghost btn-sm">
                <Icon name="download" size={13} /> Baixar v{v.version}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  EditorialDashboardScreen, EditalEditorScreen, VersionHistoryScreen, MarkdownPreview,
});
