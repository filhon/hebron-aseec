// Screens: Audit log + Meetings

const AuditScreen = () => {
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [period, setPeriod] = useState("7d");

  const allActors = useMemo(() => {
    const set = new Set();
    AdminData.auditLog.forEach((a) => set.add(a.actor));
    return Array.from(set);
  }, []);

  const actionGroups = [
    { key: "all", label: "Todas as ações" },
    { key: "user", label: "Usuários (login, criação, suspensão)" },
    { key: "invitation", label: "Convites" },
    { key: "role", label: "Atribuição de papéis" },
    { key: "impersonation", label: "Impersonação" },
    { key: "meeting", label: "Reuniões" },
    { key: "email_template", label: "Templates de email" },
    { key: "feature_flag", label: "Feature flags" },
    { key: "system_setting", label: "Configurações" },
  ];

  const filtered = useMemo(() => {
    return AdminData.auditLog.filter((a) => {
      const matchesSearch =
        !search ||
        a.summary.toLowerCase().includes(search.toLowerCase()) ||
        a.actor.toLowerCase().includes(search.toLowerCase()) ||
        a.action.toLowerCase().includes(search.toLowerCase()) ||
        (a.entityId || "").toLowerCase().includes(search.toLowerCase());
      const matchesActor = actorFilter === "all" || a.actor === actorFilter;
      const matchesAction =
        actionFilter === "all" || a.action.startsWith(actionFilter);
      return matchesSearch && matchesActor && matchesAction;
    });
  }, [search, actorFilter, actionFilter, period]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Trilha imutável · LGPD compliant"
        title="Auditoria"
        subtitle="Toda mutação no ecossistema é registrada com ator, ação, entidade, IP e diff. Particionado por mês — replay completo na v2."
        actions={[
          <Button key="export" variant="secondary" icon="download">
            Exportar CSV
          </Button>,
          <Button key="json" variant="ghost" size="sm" icon="fileText">
            JSON
          </Button>,
        ]}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <StatCardSmall label="Eventos hoje" value="38" dot="var(--hb-blue)" />
        <StatCardSmall label="Logins (24h)" value="14" dot="var(--hb-cyan)" />
        <StatCardSmall
          label="Impersonações no mês"
          value="3"
          dot="var(--hb-orange)"
        />
        <StatCardSmall
          label="Falhas de login"
          value="0"
          sub="últimas 24h"
          dot="var(--hb-green)"
        />
      </div>

      <div className="filter-row">
        <div className="field" style={{ flex: "1 1 280px", maxWidth: 380 }}>
          <Icon name="search" size={16} />
          <input
            placeholder="Buscar por ator, ação, entidade ou IP"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Ator</label>
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {allActors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Ação</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            {actionGroups.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Período</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="custom">Customizado…</option>
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>
          {filtered.length} eventos
        </span>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Quando</th>
              <th>Ator</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Resumo</th>
              <th style={{ width: 110 }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const isSystem = a.actorId === "system";
              const isImpersonation = a.action.startsWith("impersonation");
              return (
                <tr key={a.id} className={isSystem ? "system" : ""}>
                  <td
                    style={{
                      whiteSpace: "nowrap",
                      fontSize: 13,
                      color: "var(--fg-muted)",
                    }}
                  >
                    <div style={{ color: "var(--fg)" }}>
                      {fmt.dateTime(a.at)}
                    </div>
                    <div style={{ fontSize: 11.5, marginTop: 2 }}>
                      {fmt.relative(a.at)}
                    </div>
                  </td>
                  <td>
                    {isSystem ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13.5,
                          color: "var(--hb-cyan-deep)",
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: "rgba(7,180,231,0.14)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Icon name="sparkles" size={12} />
                        </div>
                        Sistema
                      </span>
                    ) : (
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                        {a.actor}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 12,
                        background: isImpersonation
                          ? "rgba(234,90,6,0.12)"
                          : "var(--hb-cream)",
                        color: isImpersonation
                          ? "var(--hb-orange-deep)"
                          : "var(--fg)",
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {a.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                    <div
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 12,
                      }}
                    >
                      {a.entity}
                    </div>
                    {a.entityId !== "system" && (
                      <div style={{ fontSize: 11.5 }}>{a.entityId}</div>
                    )}
                  </td>
                  <td
                    style={{
                      fontSize: 13.5,
                      color: isImpersonation ? "#7a2614" : "var(--fg)",
                    }}
                  >
                    {a.summary}
                  </td>
                  <td
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12,
                      color: "var(--fg-muted)",
                    }}
                  >
                    {a.ip}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: 12.5,
          color: "var(--fg-muted)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon name="shield" size={14} /> A trilha é imutável — apenas{" "}
        <b>super_admin</b> pode visualizar. Audit log é particionado por mês e
        armazenado em{" "}
        <code style={{ fontFamily: "ui-monospace,monospace" }}>
          admin.audit_log
        </code>
        .
      </div>
    </div>
  );
};

const StatCardSmall = ({ label, value, sub, dot }) => (
  <div className="stat" style={{ padding: "16px 18px" }}>
    <div
      className="stat-dot"
      style={{ background: dot, width: 40, height: 40 }}
    />
    <div className="stat-label" style={{ fontSize: 12, marginBottom: 6 }}>
      {label}
    </div>
    <div className="stat-value" style={{ fontSize: 26 }}>
      {value}
    </div>
    {sub && (
      <div className="stat-trend" style={{ marginTop: 6, fontSize: 11.5 }}>
        {sub}
      </div>
    )}
  </div>
);

// ---------------- MEETINGS ----------------
const MeetingsScreen = ({ onToast }) => {
  const [filter, setFilter] = useState("upcoming");

  const upcoming = AdminData.meetings.filter((m) => m.status === "agendada");
  const past = AdminData.meetings.filter((m) => m.status === "realizada");
  const list = filter === "upcoming" ? upcoming : past;

  const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Diretoria · ata e convocação"
        title="Reuniões"
        subtitle="Reuniões mensais são auto-criadas na 1ª quarta-feira do mês, às 19:30. Extraordinárias são abertas pelo super_admin ou diretor gestor."
        actions={[
          <Button
            key="new"
            variant="primary"
            icon="plus"
            onClick={() =>
              onToast("Modal de nova reunião (não implementado no protótipo).")
            }
          >
            Nova reunião
          </Button>,
        ]}
      />

      <div
        className="card card-padded"
        style={{
          marginBottom: 22,
          display: "flex",
          gap: 18,
          alignItems: "center",
          background: "var(--hb-cream)",
          border: "none",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--hb-blue)",
            color: "white",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="calendar" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <b style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>
            Próxima reunião mensal: quarta-feira, 03 de junho de 2026
          </b>
          <div
            style={{ color: "var(--fg-muted)", fontSize: 13.5, marginTop: 2 }}
          >
            19:30 · Presidente da sessão: Roberto Capelowski · 4 pontos de pauta
            sugeridos
          </div>
        </div>
        <Button variant="secondary" icon="fileText">
          Ver pauta
        </Button>
        <Button
          variant="primary"
          icon="mail"
          size="sm"
          onClick={() => onToast("Convocações enviadas a 9 destinatários.")}
        >
          Convocar
        </Button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        <button
          className={`chip${filter === "upcoming" ? " active" : ""}`}
          onClick={() => setFilter("upcoming")}
        >
          Próximas{" "}
          <span style={{ opacity: 0.65, fontSize: 11.5 }}>
            · {upcoming.length}
          </span>
        </button>
        <button
          className={`chip${filter === "past" ? " active" : ""}`}
          onClick={() => setFilter("past")}
        >
          Realizadas{" "}
          <span style={{ opacity: 0.65, fontSize: 11.5 }}>· {past.length}</span>
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((m) => {
          const d = new Date(m.date + "T12:00:00");
          const day = d.toLocaleDateString("pt-BR", { day: "2-digit" });
          const month = d
            .toLocaleDateString("pt-BR", { month: "short" })
            .replace(".", "")
            .toUpperCase();
          const weekday = dayNames[d.getDay()];
          return (
            <div className="meeting-card" key={m.id}>
              <div className="date-block">
                <div className="day">{day}</div>
                <div className="month">{month}</div>
                <div className="weekday">{weekday}</div>
              </div>
              <div>
                <h4>
                  Reunião {m.type === "mensal" ? "mensal" : "extraordinária"} ·{" "}
                  {fmt.date(m.date + "T12:00:00")}
                </h4>
                <div className="sub">
                  Preside: {m.chair} · {m.time}
                </div>
                <div className="meta-row">
                  <span>
                    <Icon name="users" size={12} /> {m.participants} convocados
                  </span>
                  <span>
                    <Icon name="list" size={12} /> {m.agendaItems} pontos de
                    pauta
                  </span>
                  <StatusBadge status={m.status} />
                </div>
                {m.note && <div className="note">{m.note}</div>}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                {m.status === "agendada" ? (
                  <>
                    <Button variant="primary" size="sm" icon="fileText">
                      Editar pauta
                    </Button>
                    <Button variant="ghost" size="sm" icon="mail">
                      Reconvocar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" icon="fileText">
                      Ver ata
                    </Button>
                    <Button variant="ghost" size="sm" icon="download">
                      Baixar PDF
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { AuditScreen, MeetingsScreen, StatCardSmall });
