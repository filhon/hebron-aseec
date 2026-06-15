// Dashboard — visão geral do Financeiro
function ScreenDashboard() {
  const totalSaldo = MOCK.accounts.reduce((s, a) => s + a.balance, 0);
  const monthIn = MOCK.transactions
    .filter((t) => t.value > 0)
    .reduce((s, t) => s + t.value, 0);
  const monthOut = Math.abs(
    MOCK.transactions
      .filter((t) => t.value < 0)
      .reduce((s, t) => s + t.value, 0),
  );
  const proxPagar = MOCK.payables
    .filter((p) => p.status === "autorizado" || p.status === "aprovado")
    .reduce((s, p) => s + p.value, 0);
  const aguardandoAprovacao = MOCK.payables.filter(
    (p) => p.status === "pendente",
  );
  const recentes = MOCK.transactions.slice(0, 6);

  return (
    <div className="page">
      {/* KPI ROW */}
      <div className="kpi-grid">
        <KPI
          label="Saldo consolidado"
          value={fmtBRL(totalSaldo)}
          delta="+8,4% no mês"
          deltaDir="up"
          accent="blue"
          sparkline={
            <Sparkline
              points={MOCK.cashFlow30.slice(0, 12).map((p) => p.v)}
              color="#07B4E7"
            />
          }
        />
        <KPI
          label="Receitas no mês"
          value={fmtBRL(monthIn)}
          delta="+R$ 12.300 vs abr"
          deltaDir="up"
          sparkline={
            <Sparkline
              points={[120, 130, 145, 138, 150, 161]}
              color="#A1C520"
            />
          }
        />
        <KPI
          label="Despesas no mês"
          value={fmtBRL(monthOut)}
          delta="−R$ 3.800 vs abr"
          deltaDir="up"
          sparkline={
            <Sparkline points={[88, 92, 96, 94, 89, 86]} color="#EA5A06" />
          }
        />
        <KPI
          label="A pagar (próx. 7 dias)"
          value={fmtBRL(proxPagar)}
          delta="3 lotes em fluxo"
          deltaDir="down"
          sparkline={
            <Sparkline points={[10, 18, 32, 28, 36, 44]} color="#202C85" />
          }
        />
      </div>

      {/* MAIN GRID */}
      <div className="dash-grid">
        {/* LEFT: chart + recent + accounts */}
        <div className="stack">
          {/* Cash flow chart */}
          <div className="card">
            <SectionHeader
              eyebrow="Projeção · 30 dias"
              title="Fluxo de caixa"
              hint="Saldo projetado considerando recebimentos e contas a pagar agendadas"
              actions={
                <React.Fragment>
                  <button className="chip is-active">30d</button>
                  <button className="chip">60d</button>
                  <button className="chip">90d</button>
                </React.Fragment>
              }
            />
            <AreaChart
              data={MOCK.cashFlow30}
              accentEvents={[
                { i: 5, color: "var(--hb-green)" },
                { i: 10, color: "var(--hb-orange)" },
                { i: 14, color: "var(--hb-orange)" },
              ]}
            />
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 8,
                fontSize: 12,
                color: "var(--fg-muted)",
              }}
            >
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--hb-green)",
                  }}
                />
                Hebron Farmacêutica · D+5
              </span>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--hb-orange)",
                  }}
                />
                Folha de pagamento · D+10
              </span>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--hb-orange)",
                  }}
                />
                Repasses (15 projetos) · D+14
              </span>
            </div>
          </div>

          {/* Contas bancárias */}
          <div>
            <SectionHeader
              eyebrow="3 contas"
              title="Saldo por conta bancária"
              actions={
                <button className="btn btn--ghost btn--sm">
                  <Icons.Plus size={12} />
                  Nova conta
                </button>
              }
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              {MOCK.accounts.map((a) => (
                <AccountCard key={a.id} acc={a} />
              ))}
            </div>
          </div>

          {/* Lançamentos recentes */}
          <div className="tbl-wrap">
            <div className="tbl-wrap__head">
              <span className="section-title">Lançamentos recentes</span>
              <button
                className="btn btn--ghost btn--sm"
                style={{ marginLeft: "auto" }}
              >
                Ver todos
                <Icons.ArrowRight size={12} />
              </button>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 84 }}>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th className="num" style={{ width: 140 }}>
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((t) => (
                  <tr key={t.id}>
                    <td className="muted">{fmtDate(t.date)}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{t.desc}</span>
                        {t.attach && (
                          <Icons.Paperclip size={12} color="var(--fg-muted)" />
                        )}
                      </div>
                      {t.cc && <div className="muted">{t.cc}</div>}
                    </td>
                    <td className="muted">{t.cat}</td>
                    <td>
                      <StatusPill status={t.status} />
                    </td>
                    <td
                      className={
                        "num " + (t.value > 0 ? "num--in" : "num--out")
                      }
                    >
                      {fmtBRL(t.value, { sign: t.value > 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: governance, alerts */}
        <div className="stack">
          {/* Lote semanal aguardando aprovação */}
          <div className="card card--accent">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--hb-orange)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.AlertCircle size={16} />
              </span>
              <div>
                <div
                  className="eyebrow"
                  style={{ color: "var(--hb-orange-deep)" }}
                >
                  Aguardando aprovação
                </div>
                <div className="section-title">Lote L-2026-22 · Semana 22</div>
              </div>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--fg)",
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              {aguardandoAprovacao.length} pagamentos totalizando{" "}
              <strong>
                {fmtBRL(aguardandoAprovacao.reduce((s, p) => s + p.value, 0))}
              </strong>{" "}
              aguardam aprovação do diretor gestor (Pr. Cláudio Brito).
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn--primary">Revisar lote</button>
              <button className="btn btn--ghost">Adiar</button>
            </div>
          </div>

          {/* Governance reminder */}
          <div className="card">
            <SectionHeader
              eyebrow="Governança dual"
              title="Fluxo do pagamento"
            />
            <GovernanceFlow stage={2} />
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: "var(--bg-alt)",
                borderRadius: 10,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Icons.AlertCircle size={16} color="var(--hb-blue)" />
              <p
                style={{
                  fontSize: 12,
                  color: "var(--fg-muted)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Quem aprova nunca pode autorizar. As duas camadas são pessoas
                diferentes — regra inviolável da governança.
              </p>
            </div>
          </div>

          {/* Conciliação pendente */}
          <div className="card">
            <SectionHeader
              eyebrow="Itaú · Conta principal"
              title="Conciliação bancária"
              actions={
                <button className="btn btn--ghost btn--sm">
                  Conciliar
                  <Icons.ArrowRight size={12} />
                </button>
              }
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  Pendentes
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                  de 11 linhas importadas
                </div>
              </div>
              <div style={{ width: 80, height: 80, position: "relative" }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="var(--hb-gray-50)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="var(--hb-green)"
                    strokeWidth="8"
                    strokeDasharray={`${(9 / 11) * 201} 201`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                  <text
                    x="40"
                    y="46"
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="700"
                    fill="var(--fg)"
                    fontFamily="var(--font-display)"
                  >
                    82%
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* Verse strip */}
          <div
            className="card"
            style={{
              background: "var(--hb-blue)",
              color: "var(--fg-invert)",
              border: "none",
            }}
          >
            <div className="eyebrow" style={{ color: "var(--hb-cyan)" }}>
              Mordomia cristã
            </div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                lineHeight: 1.45,
                marginTop: 8,
                marginBottom: 6,
              }}
            >
              "Cada um administre aos outros o dom como o recebeu, como bons
              despenseiros da multiforme graça de Deus."
            </p>
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                fontWeight: 700,
                margin: 0,
              }}
            >
              1 Pedro 4:10
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ScreenDashboard = ScreenDashboard;
