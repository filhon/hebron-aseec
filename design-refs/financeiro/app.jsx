// Main app — routing between screens
const { useState: useStateApp } = React;

function App() {
  const [current, setCurrent] = useStateApp("dashboard");

  const titles = {
    dashboard: { section: "Visão geral", title: "Painel financeiro" },
    lancamentos: { section: "Operação · Histórico", title: "Lançamentos" },
    "contas-pagar": { section: "Operação · A pagar", title: "Contas a pagar" },
    conciliacao: { section: "Operação", title: "Conciliação bancária" },
    orcamento: { section: "Planejamento", title: "Orçamento 2026" },
    "plano-contas": { section: "Configuração", title: "Plano de contas" },
    importacao: { section: "Operação", title: "Importação de extrato" },
    "centros-custo": { section: "Relatórios", title: "Centros de custo" },
    relatorios: { section: "Relatórios", title: "Demonstrativos" },
  };
  const t = titles[current] || titles.dashboard;

  const badges = {
    pagar: MOCK.payables.filter((p) => p.status === "pendente").length,
    recon: MOCK.bankRows.filter((b) => !b.matched).length,
  };

  const screens = {
    dashboard: <ScreenDashboard />,
    lancamentos: <ScreenLancamentos />,
    "contas-pagar": <ScreenContasPagar />,
    conciliacao: <ScreenConciliacao />,
    orcamento: <ScreenOrcamento />,
    "plano-contas": <ScreenPlanoContas />,
    importacao: <ScreenImportacao />,
    "centros-custo": (
      <Placeholder
        name="Centros de custo"
        hint="Visão consolidada por projeto · execução, parcelas pagas, próximas datas."
      />
    ),
    relatorios: (
      <Placeholder
        name="Demonstrativos"
        hint="DRE simplificado, fluxo de caixa, relatório mensal exportável (PDF + XLSX + ZIP)."
      />
    ),
  };

  const headerActions =
    current === "dashboard" ? (
      <button className="btn btn--primary">
        <Icons.Plus size={14} />
        Novo lançamento
      </button>
    ) : current === "contas-pagar" ? (
      <button className="btn btn--accent">
        <Icons.Plus size={14} />
        Novo pagamento
      </button>
    ) : null;

  return (
    <div className="app" data-screen-label={"00 " + t.title}>
      <Sidebar current={current} onNav={setCurrent} badges={badges} />
      <main className="main">
        <TopBar section={t.section} title={t.title} actions={headerActions} />
        {screens[current]}
      </main>
    </div>
  );
}

function Placeholder({ name, hint }) {
  return (
    <div className="page">
      <div className="card" style={{ padding: 64, textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--bg-alt)",
            color: "var(--hb-blue)",
            margin: "0 auto 14px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icons.FileText size={22} />
        </div>
        <div className="section-title" style={{ marginBottom: 6 }}>
          {name}
        </div>
        <div
          className="muted"
          style={{ fontSize: 14, maxWidth: 460, margin: "0 auto" }}
        >
          {hint}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
