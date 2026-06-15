// Contas a pagar — núcleo da governança dual
function ScreenContasPagar() {
  const [tab, setTab] = useState("pendente");
  const [selected, setSelected] = useState(
    new Set(["p-1", "p-2", "p-3", "p-4", "p-9"]),
  );
  const [drawer, setDrawer] = useState(null); // batch detail sheet

  const groups = {
    pendente: MOCK.payables.filter((p) => p.status === "pendente"),
    aprovado: MOCK.payables.filter((p) => p.status === "aprovado"),
    autorizado: MOCK.payables.filter((p) => p.status === "autorizado"),
  };
  const rows = groups[tab];
  const totals = {
    pendente: groups.pendente.reduce((s, p) => s + p.value, 0),
    aprovado: groups.aprovado.reduce((s, p) => s + p.value, 0),
    autorizado: groups.autorizado.reduce((s, p) => s + p.value, 0),
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const selectedTotal = Array.from(selected).reduce((s, id) => {
    const r = MOCK.payables.find((p) => p.id === id);
    return r ? s + r.value : s;
  }, 0);
  const selectedCount = Array.from(selected).filter((id) =>
    rows.find((r) => r.id === id),
  ).length;

  const dueClass = (iso) => {
    const days = Math.ceil((new Date(iso) - new Date()) / 86400000);
    if (days < 0) return "red";
    if (days <= 3) return "orange";
    if (days <= 7) return "cyan";
    return "gray";
  };

  return (
    <div className="page">
      {/* Tabs row */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 18,
          background: "var(--surface)",
          padding: 6,
          borderRadius: 12,
          border: "1px solid var(--border)",
          width: "fit-content",
        }}
      >
        {[
          {
            id: "pendente",
            label: "Aguardando aprovação",
            count: groups.pendente.length,
          },
          { id: "aprovado", label: "Aprovados", count: groups.aprovado.length },
          {
            id: "autorizado",
            label: "Autorizados",
            count: groups.autorizado.length,
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: tab === t.id ? "var(--hb-blue)" : "transparent",
              color: tab === t.id ? "white" : "var(--fg-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 140ms",
            }}
          >
            {t.label}
            <span
              style={{
                background:
                  tab === t.id ? "rgba(255,255,255,0.18)" : "var(--hb-gray-50)",
                color: tab === t.id ? "white" : "var(--fg-muted)",
                padding: "1px 7px",
                borderRadius: 999,
                fontSize: 11,
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Stage info card */}
      {tab === "pendente" && (
        <div
          className="card card--accent"
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--hb-orange)",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icons.Clock size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="section-title" style={{ marginBottom: 2 }}>
              Lote L-2026-22 · Semana de 19 a 25 de maio
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
              Sistema agrupou {groups.pendente.length} pagamentos. Envie para
              aprovação do <strong>{MOCK.director.name}</strong> (CC:{" "}
              {MOCK.authorizer.name}).
            </div>
          </div>
          <button className="btn btn--ghost">
            <Icons.FileText size={14} />
            Ver e-mail
          </button>
          <button
            className="btn btn--accent"
            onClick={() => setDrawer("approve-batch")}
          >
            <Icons.Check size={14} />
            Enviar para aprovação
          </button>
        </div>
      )}
      {tab === "aprovado" && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 18,
            borderLeft: "4px solid var(--hb-cyan)",
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(7,180,231,0.15)",
              color: "var(--hb-cyan-deep)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icons.Check size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="section-title" style={{ marginBottom: 2 }}>
              Aprovados pelo diretor gestor
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
              Inclua no banco e avise <strong>{MOCK.authorizer.name}</strong>{" "}
              via WhatsApp para autorizar.
              <span
                style={{
                  color: "var(--hb-orange-deep)",
                  fontWeight: 600,
                  marginLeft: 6,
                }}
              >
                Aprovador ≠ autorizador.
              </span>
            </div>
          </div>
          <button className="btn btn--primary">
            <Icons.ArrowRight size={14} />
            Marcar como incluído no banco
          </button>
        </div>
      )}
      {tab === "autorizado" && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 18,
            borderLeft: "4px solid var(--hb-green)",
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(161,197,32,0.20)",
              color: "var(--hb-green-deep)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icons.CheckSquare size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="section-title" style={{ marginBottom: 2 }}>
              Autorizados no banco
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
              Pagamentos liberados pelo diretor autorizador. Marque como pagos
              após confirmação no extrato.
            </div>
          </div>
          <button className="btn btn--green">
            <Icons.Check size={14} />
            Marcar todos como pagos
          </button>
        </div>
      )}

      {/* Table */}
      <div className="tbl-wrap">
        <div
          className="tbl-wrap__head"
          style={{ justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <input
              type="checkbox"
              checked={selectedCount === rows.length && rows.length > 0}
              onChange={toggleAll}
              style={{ width: 16, height: 16, accentColor: "var(--hb-blue)" }}
            />
            <span className="section-title">
              {rows.length} pagamentos ·{" "}
              {fmtBRL(rows.reduce((s, p) => s + p.value, 0))}
            </span>
            {selectedCount > 0 && (
              <span className="pill pill--blue">
                <span className="pill__dot" />
                {selectedCount} selecionados · {fmtBRL(selectedTotal)}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost btn--sm">
              <Icons.Filter size={12} />
              Filtros
            </button>
            <button className="btn btn--ghost btn--sm">
              <Icons.Download size={12} />
              Exportar
            </button>
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Descrição</th>
              <th>Categoria · CC</th>
              <th style={{ width: 130 }}>Vencimento</th>
              <th style={{ width: 160 }}>Governança</th>
              <th className="num" style={{ width: 130 }}>
                Valor
              </th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    style={{
                      width: 15,
                      height: 15,
                      accentColor: "var(--hb-blue)",
                    }}
                  />
                </td>
                <td>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {p.source === "projeto" && (
                      <span
                        title="Pagamento gerado por projeto aprovado"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: "rgba(7,180,231,0.15)",
                          color: "var(--hb-cyan-deep)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icons.Link size={12} />
                      </span>
                    )}
                    {p.source === "recorrente" && (
                      <span
                        title="Recorrente"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: "var(--hb-gray-50)",
                          color: "var(--fg-muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icons.Repeat size={12} />
                      </span>
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.desc}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Lote {p.batch}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  <div>{p.cat}</div>
                  {p.cc && (
                    <div style={{ color: "var(--hb-blue)", fontWeight: 600 }}>
                      {p.cc}
                    </div>
                  )}
                </td>
                <td>
                  <span className={"pill pill--" + dueClass(p.due)}>
                    <span className="pill__dot" />
                    {fmtDate(p.due)}
                  </span>
                </td>
                <td>
                  {p.status === "pendente" && (
                    <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                      Aguardando 1ª camada
                    </span>
                  )}
                  {p.status === "aprovado" && (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--hb-cyan-deep)",
                          fontWeight: 600,
                        }}
                      >
                        <Icons.Check size={11} /> {p.approvedBy}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        aprovou em {fmtDate(p.approvedAt)}
                      </div>
                    </div>
                  )}
                  {p.status === "autorizado" && (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--hb-green-deep)",
                          fontWeight: 600,
                        }}
                      >
                        <Icons.CheckSquare size={11} /> {p.authorizedBy}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        autorizou em {fmtDate(p.authorizedAt)}
                      </div>
                    </div>
                  )}
                </td>
                <td className="num">{fmtBRL(p.value)}</td>
                <td>
                  <button
                    className="icon-btn"
                    style={{ width: 28, height: 28, border: "none" }}
                  >
                    <Icons.MoreHorizontal size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer / sheet */}
      {drawer === "approve-batch" && (
        <BatchApprovalSheet
          items={groups.pendente}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

function BatchApprovalSheet({ items, onClose }) {
  const total = items.reduce((s, p) => s + p.value, 0);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow" style={{ color: "var(--hb-orange-deep)" }}>
              Lote L-2026-22 · semana 22
            </div>
            <div className="section-title" style={{ marginTop: 2 }}>
              Enviar para aprovação
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            style={{ border: "none" }}
          >
            <Icons.X />
          </button>
        </div>
        <div className="sheet__body">
          <div
            className="card"
            style={{
              marginBottom: 18,
              background: "var(--bg-alt)",
              border: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span className="eyebrow">Destinatários</span>
              <button className="btn btn--ghost btn--sm">Alterar</button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <span className="avatar cyan">CB</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {MOCK.director.name}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Para · Aprovará (1ª camada)
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="avatar green">RT</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {MOCK.authorizer.name}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Em cópia · Autorizará no banco
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="section-title">Pagamentos no lote</span>
            <span className="pill pill--gray">
              {items.length} itens · {fmtBRL(total)}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.desc}</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {p.cat} {p.cc && "· " + p.cc} · vence {fmtDate(p.due)}
                  </div>
                </div>
                <div
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {fmtBRL(p.value)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <label
              className="eyebrow"
              style={{ marginBottom: 8, display: "block" }}
            >
              Observações (opcional)
            </label>
            <textarea
              rows="3"
              placeholder="Notas para o aprovador…"
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 10,
                resize: "vertical",
                background: "var(--bg)",
                fontSize: 13,
              }}
            />
          </div>
        </div>
        <div className="sheet__foot">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn--accent" onClick={onClose}>
            <Icons.ArrowRight size={14} />
            Enviar lote
          </button>
        </div>
      </div>
    </div>
  );
}

window.ScreenContasPagar = ScreenContasPagar;
