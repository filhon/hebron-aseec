// Screen: Overview / Dashboard

const Overview = ({ onNavigate, onStartImpersonation }) => {
  const { kpis, roleCounts, auditLog, invitations, meetings, users } =
    AdminData;
  const recentActivity = auditLog.slice(0, 6);
  const upcoming = meetings.filter((m) => m.status === "agendada").slice(0, 2);
  const pendingApprovals = users.filter((u) => u.status === "pendente");

  const totalRoleAssignments = roleCounts.reduce((acc, r) => acc + r.count, 0);

  return (
    <div className="page">
      <div className="welcome-card">
        <div className="welcome-card-inner">
          <div className="eyebrow">Painel administrativo · 23 maio 2026</div>
          <h2>
            Bom dia, Filipe. Hoje há{" "}
            <span style={{ color: "var(--hb-cyan)" }}>3 cadastros</span>{" "}
            aguardando aprovação e{" "}
            <span style={{ color: "var(--hb-orange)" }}>4 convites</span> em
            aberto.
          </h2>
          <p>
            A janela de submissão de projetos anuais 2026 abre em 01/07.
            Mantenha designações e templates de email em dia antes lá.
          </p>
          <div className="quick-actions">
            <Button
              variant="primary"
              icon="plus"
              onClick={() => onNavigate("invites")}
            >
              Novo convite
            </Button>
            <Button
              variant="secondary"
              icon="users"
              onClick={() => onNavigate("users")}
            >
              Aprovar cadastros
            </Button>
          </div>
        </div>
        <div className="welcome-card-circles" aria-hidden>
          <img src="assets/elemento-visual-circulos.png" alt="" />
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <StatCard
          label="Usuários ativos"
          value={kpis.usersActive}
          sub={`${kpis.usersTotal} no total`}
          dot="var(--hb-green)"
        />
        <StatCard
          label="Pendentes de aprovação"
          value={kpis.usersPending}
          sub={kpis.usersPending > 0 ? "requer ação" : "tudo em dia"}
          dot="var(--hb-orange)"
          flag={kpis.usersPending > 0}
        />
        <StatCard
          label="Convites em aberto"
          value={kpis.invitesPending}
          sub="expiram em 7 dias"
          dot="var(--hb-cyan)"
        />
        <StatCard
          label="Cobertura de MFA"
          value={`${kpis.mfaCoverage}%`}
          sub="diretores + super_admin · 100%"
          dot="var(--hb-blue)"
          up
        />
      </div>

      <div className="grid grid-stat" style={{ marginBottom: 22 }}>
        <div className="card">
          <div className="card-header">
            <h3>Atividade recente</h3>
            <div className="card-header-actions">
              <Button
                variant="ghost"
                size="sm"
                icon="activity"
                onClick={() => onNavigate("audit")}
              >
                Ver trilha completa
              </Button>
            </div>
          </div>
          <div
            className="card-body"
            style={{ paddingTop: 6, paddingBottom: 6 }}
          >
            <ul
              className="timeline"
              style={{ listStyle: "none", margin: 0, padding: "4px 0 0 26px" }}
            >
              {recentActivity.map((a, i) => {
                const cls = a.action.startsWith("impersonation")
                  ? "warm"
                  : a.action.startsWith("user.login")
                    ? "cool"
                    : a.action.startsWith("meeting")
                      ? "life"
                      : "";
                return (
                  <li key={a.id} className={`timeline-item ${cls}`}>
                    <div className="timeline-time">
                      {fmt.relative(a.at)} ·{" "}
                      <span style={{ fontFamily: "ui-monospace,monospace" }}>
                        {a.action}
                      </span>
                    </div>
                    <div className="timeline-text">
                      <b>{a.actor}</b> · {a.summary}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <h3>Distribuição de papéis</h3>
            </div>
            <div className="card-body">
              <div className="role-count-list">
                {roleCounts.map((r) => {
                  const pct = Math.round(
                    (r.count / Math.max(1, totalRoleAssignments)) * 100,
                  );
                  return (
                    <div className="role-count-row" key={r.key}>
                      <span
                        className="swatch"
                        style={{ background: r.color }}
                      />
                      <span className="name">{r.label}</span>
                      <span className="bar">
                        <span
                          className="bar-fill"
                          style={{ width: `${pct}%`, background: r.color }}
                        />
                      </span>
                      <span className="count">{r.count}</span>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--fg-muted)",
                  marginTop: 14,
                }}
              >
                Múltiplos papéis por usuário permitidos · conflitos de interesse
                verificados na atribuição.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Próximas reuniões</h3>
              <div className="card-header-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("meetings")}
                >
                  Abrir
                </Button>
              </div>
            </div>
            <div className="card-body" style={{ padding: "4px 22px 18px" }}>
              {upcoming.map((m) => {
                const d = new Date(m.date);
                const day = d.toLocaleDateString("pt-BR", { day: "2-digit" });
                const month = d
                  .toLocaleDateString("pt-BR", { month: "short" })
                  .replace(".", "")
                  .toUpperCase();
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: "1px solid var(--divider)",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        textAlign: "center",
                        background: "var(--hb-cream)",
                        borderRadius: 10,
                        padding: "8px 4px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "var(--hb-blue)",
                          lineHeight: 1,
                        }}
                      >
                        {day}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          color: "var(--fg-muted)",
                          marginTop: 4,
                        }}
                      >
                        {month}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Reunião{" "}
                        {m.type === "mensal" ? "mensal" : "extraordinária"}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--fg-muted)",
                          marginTop: 2,
                        }}
                      >
                        {m.time} · Preside: {m.chair}
                      </div>
                      {m.note && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--hb-orange-deep)",
                            marginTop: 4,
                            fontStyle: "italic",
                          }}
                        >
                          {m.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {pendingApprovals.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Cadastros aguardando aprovação</h3>
            <div className="card-header-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("users")}
              >
                Ver todos
              </Button>
            </div>
          </div>
          <div style={{ padding: "4px 22px 14px" }}>
            {pendingApprovals.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 0",
                  borderBottom: "1px solid var(--divider)",
                }}
              >
                <Avatar name={u.name} initials={u.initials} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                    {u.email} · auto-cadastro{" "}
                    {fmt.relative(u.createdAt + "T08:00:00Z")}
                  </div>
                </div>
                <div className="role-stack">
                  {u.roles.map((r) => (
                    <RoleBadge key={r} role={r} />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="eye"
                  onClick={() => onStartImpersonation(u)}
                >
                  Ver perfil
                </Button>
                <Button variant="primary" size="sm" icon="check">
                  Aprovar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, sub, dot, up, flag }) => (
  <div className="stat">
    <div className="stat-dot" style={{ background: dot }} />
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    <div className={`stat-trend${up ? " up" : ""}${flag ? " flag" : ""}`}>
      {sub}
    </div>
  </div>
);

Object.assign(window, { Overview });
