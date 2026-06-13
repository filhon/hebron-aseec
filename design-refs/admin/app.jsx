// Main App orchestrator

const App = () => {
  const [route, setRoute] = useState('overview');     // overview | users | userDetail | invites | audit | meetings | settings
  const [userId, setUserId] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [impersonating, setImpersonating] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmImp, setConfirmImp] = useState(null);

  const currentUser = AdminData.getUser('u-005'); // Filipe

  const navigate = (key) => {
    setRoute(key);
    if (key !== 'userDetail') setUserId(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const openUser = (id) => {
    setUserId(id);
    setRoute('userDetail');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const showToast = (msg) => setToast(msg);

  const onStartImpersonation = (user) => setConfirmImp(user);
  const confirmImpersonation = () => {
    setImpersonating(confirmImp);
    setConfirmImp(null);
    showToast(`Impersonação iniciada — registrada na trilha de auditoria.`);
  };
  const endImpersonation = () => {
    showToast(`Impersonação encerrada. Você voltou para sua sessão.`);
    setImpersonating(null);
  };

  return (
    <div>
      {impersonating && (
        <ImpersonationBanner user={impersonating} onEnd={endImpersonation} />
      )}
      <div className="app-shell">
        <Sidebar
          active={route === 'userDetail' ? 'users' : route}
          onNavigate={navigate}
          kpis={AdminData.kpis}
        />
        <div>
          <Topbar
            currentUser={impersonating || currentUser}
            onImpersonate={() => {}}
            onProfile={() => showToast('Menu do perfil — não implementado no protótipo.')}
            route={route}
          />
          {route === 'overview' && <Overview onNavigate={navigate} onStartImpersonation={openUser} />}
          {route === 'users' && <UsersScreen onOpenUser={openUser} onOpenInvite={() => setShowInvite(true)} />}
          {route === 'userDetail' && <UserDetail userId={userId} onBack={() => navigate('users')} onImpersonate={onStartImpersonation} onToast={showToast} />}
          {route === 'invites' && <InvitesScreen onOpenInvite={() => setShowInvite(true)} onToast={showToast} />}
          {route === 'audit' && <AuditScreen />}
          {route === 'meetings' && <MeetingsScreen onToast={showToast} />}
          {route === 'settings' && <SettingsScreen onToast={showToast} />}
        </div>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSent={(email) => { setShowInvite(false); showToast(`Convite enviado para ${email}.`); }}
        />
      )}

      {confirmImp && (
        <Modal
          title={`Impersonar ${confirmImp.name}?`}
          description="Toda ação será registrada com seu nome e o do usuário impersonado. Esta funcionalidade é destinada a suporte por telefone — substitui o uso de AnyDesk."
          onClose={() => setConfirmImp(null)}
          footer={[
            <Button key="c" variant="ghost" onClick={() => setConfirmImp(null)}>Cancelar</Button>,
            <Button key="i" variant="accent" icon="eye" onClick={confirmImpersonation}>Iniciar impersonação</Button>,
          ]}
        >
          <div style={{display:'flex', gap:14, padding:'14px 16px', background:'var(--hb-cream)', borderRadius:12, alignItems:'center'}}>
            <Avatar name={confirmImp.name} initials={confirmImp.initials} size="lg" />
            <div>
              <div style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:16}}>{confirmImp.name}</div>
              <div style={{fontSize:13, color:'var(--fg-muted)'}}>{confirmImp.email}</div>
              <div className="role-stack" style={{marginTop:6}}>
                {confirmImp.roles.map(r => <RoleBadge key={r} role={r} />)}
              </div>
            </div>
          </div>
          <div className="form-row" style={{marginTop:18}}>
            <label>Motivo da impersonação (obrigatório)</label>
            <textarea className="form-textarea" rows={2} placeholder="Ex: Atendimento por telefone — submissor não encontra a tela de envio de relatório trimestral." />
            <div className="hint">Este texto aparece na trilha de auditoria e em qualquer relatório posterior.</div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
