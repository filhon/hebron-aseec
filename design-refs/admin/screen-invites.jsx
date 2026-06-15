// Screen: Invitations

const InvitesScreen = ({ onOpenInvite, onToast }) => {
  const [filter, setFilter] = useState("all");
  const list = AdminData.invitations;
  const filtered =
    filter === "all" ? list : list.filter((i) => i.status === filter);
  const tabs = [
    { key: "all", label: "Todos", count: list.length },
    {
      key: "pendente",
      label: "Pendentes",
      count: list.filter((i) => i.status === "pendente").length,
    },
    {
      key: "aceito",
      label: "Aceitos",
      count: list.filter((i) => i.status === "aceito").length,
    },
    {
      key: "expirado",
      label: "Expirados",
      count: list.filter((i) => i.status === "expirado").length,
    },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Aprovação · entrada no ecossistema"
        title="Convites"
        subtitle="Envie convites com expiração de 7 dias. O ecossistema aceita auto-cadastro com aprovação, mas o convite é o caminho preferido para pastores, missionários e colaboradores."
        actions={[
          <Button
            key="new"
            variant="primary"
            icon="plus"
            onClick={onOpenInvite}
          >
            Novo convite
          </Button>,
        ]}
      />

      <div
        style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`chip${filter === t.key ? " active" : ""}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}{" "}
            <span style={{ opacity: 0.65, fontSize: 11.5 }}>· {t.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Nenhum convite nesta categoria"
            body="Ao enviar um convite, o destinatário recebe um link com expiração de 7 dias."
            quote="Ide por todo o mundo e pregai o evangelho a toda criatura."
            cite="Marcos 16:15"
            action={
              <Button variant="primary" icon="plus" onClick={onOpenInvite}>
                Novo convite
              </Button>
            }
          />
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Destinatário</th>
                <th>Papéis</th>
                <th>Enviado por</th>
                <th>Status</th>
                <th>Enviado</th>
                <th>Expira</th>
                <th style={{ width: 180 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div className="user-cell">
                      <div
                        className="avatar avatar-sm"
                        style={{ background: "var(--hb-cyan)" }}
                      >
                        <Icon name="mail" size={14} />
                      </div>
                      <div className="user-cell-text">
                        <b>{inv.email}</b>
                        {inv.message && (
                          <span title={inv.message}>
                            {inv.message.slice(0, 50)}
                            {inv.message.length > 50 ? "…" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="role-stack">
                      {inv.roles.map((r) => (
                        <RoleBadge key={r} role={r} />
                      ))}
                    </div>
                  </td>
                  <td style={{ color: "var(--fg-muted)", fontSize: 13.5 }}>
                    {inv.invitedBy}
                  </td>
                  <td>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td style={{ color: "var(--fg-muted)", fontSize: 13 }}>
                    {fmt.relative(inv.sentAt)}
                  </td>
                  <td
                    style={{
                      color:
                        inv.status === "expirado"
                          ? "#b8331a"
                          : "var(--fg-muted)",
                      fontSize: 13,
                    }}
                  >
                    {inv.status === "aceito"
                      ? `aceito ${fmt.relative(inv.acceptedAt)}`
                      : fmt.date(inv.expiresAt)}
                  </td>
                  <td>
                    {inv.status === "pendente" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button
                          variant="ghost"
                          size="tiny"
                          icon="mail"
                          onClick={() =>
                            onToast("Convite reenviado para " + inv.email)
                          }
                        >
                          Reenviar
                        </Button>
                        <Button
                          variant="ghost"
                          size="tiny"
                          onClick={() => onToast("Convite revogado.")}
                        >
                          Revogar
                        </Button>
                      </div>
                    )}
                    {inv.status === "expirado" && (
                      <Button
                        variant="secondary"
                        size="tiny"
                        icon="mail"
                        onClick={() =>
                          onToast("Convite renovado por mais 7 dias.")
                        }
                      >
                        Renovar
                      </Button>
                    )}
                    {inv.status === "aceito" && (
                      <span
                        style={{ fontSize: 12.5, color: "var(--fg-muted)" }}
                      >
                        Convite aceito · usuário ativo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------------- INVITE MODAL ----------------
const InviteModal = ({ onClose, onSent }) => {
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState(["submissor"]);
  const [message, setMessage] = useState("");

  const eligibleRoles = AdminData.ROLES.filter(
    (r) => r.key !== "super_admin" && r.key !== "ouvinte",
  );

  const toggleRole = (k) => {
    setRoles((rs) => (rs.includes(k) ? rs.filter((x) => x !== k) : [...rs, k]));
  };

  // Conflict of interest: diretor/conselheiro + submissor/hospede
  const hasConflict =
    (roles.includes("diretor") || roles.includes("conselheiro")) &&
    (roles.includes("submissor") || roles.includes("hospede"));

  const submit = () => {
    if (!email || hasConflict || roles.length === 0) return;
    onSent(email);
  };

  return (
    <Modal
      title="Convidar usuário"
      description="Envie um link de acesso por email. O convite vale 7 dias."
      onClose={onClose}
      footer={[
        <Button key="c" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>,
        <Button key="s" variant="primary" icon="mail" onClick={submit}>
          Enviar convite
        </Button>,
      ]}
    >
      <div className="form-row">
        <label>Email do destinatário</label>
        <input
          className="form-input"
          type="email"
          placeholder="nome@exemplo.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </div>
      <div className="form-row">
        <label>Papéis a conceder</label>
        <div className="checkbox-list">
          {eligibleRoles.map((r) => (
            <label
              key={r.key}
              className={`cb-pill${roles.includes(r.key) ? " checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={roles.includes(r.key)}
                onChange={() => toggleRole(r.key)}
              />
              {r.label}
            </label>
          ))}
        </div>
        {hasConflict && (
          <div
            className="hint"
            style={{
              color: "#b8331a",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
            }}
          >
            <Icon name="alertCircle" size={14} /> Conflito de interesse:
            diretores e conselheiros não podem ser submissores nem hóspedes.
          </div>
        )}
        <div className="hint">
          Múltiplos papéis permitidos · suspensão de módulo é configurada
          depois.
        </div>
      </div>
      <div className="form-row">
        <label>
          Mensagem pessoal{" "}
          <span style={{ color: "var(--fg-muted)", fontWeight: 400 }}>
            (opcional)
          </span>
        </label>
        <textarea
          className="form-textarea"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Bem-vindo. Sua conta foi preparada para iniciar a submissão do projeto…"
        />
      </div>
      <div
        style={{
          padding: "12px 14px",
          background: "var(--hb-cream)",
          borderRadius: 10,
          fontSize: 12.5,
          color: "var(--fg-muted)",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <Icon name="alertCircle" size={16} />
        <div>
          O convite usa o template <b>"Convite de acesso"</b>. Edite o texto
          padrão em <i>Configurações → Templates de email</i>.
        </div>
      </div>
    </Modal>
  );
};

Object.assign(window, { InvitesScreen, InviteModal });
