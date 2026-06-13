// Screens: Users list + User detail

const UsersScreen = ({ onOpenUser, onOpenInvite }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    return AdminData.users.filter(u => {
      const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.institutions.join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.roles.includes(roleFilter);
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [search, roleFilter, statusFilter]);

  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  return (
    <div className="page">
      <PageHeader
        eyebrow="Operação · 150 contas ativas"
        title="Usuários"
        subtitle="Aprove cadastros, atribua papéis e mantenha a hierarquia de acesso ao ecossistema Hebron ASEEC."
        actions={[
          <Button key="export" variant="secondary" icon="download">Exportar CSV</Button>,
          <Button key="invite" variant="primary" icon="plus" onClick={onOpenInvite}>Convidar usuário</Button>,
        ]}
      />

      <div className="filter-row">
        <div className="field" style={{flex: '1 1 280px', maxWidth: 380}}>
          <Icon name="search" size={16} />
          <input placeholder="Buscar por nome, email ou instituição" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="field">
          <Icon name="filter" size={14} />
          <label>Papel</label>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="all">Todos</option>
            {AdminData.ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="pendente">Pendente</option>
            <option value="suspenso">Suspenso</option>
          </select>
        </div>
        <div style={{flex:1}} />
        <span style={{fontSize:13, color:'var(--fg-muted)'}}>
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        {pageItems.length === 0 ? (
          <EmptyState
            title="Nenhum usuário corresponde aos filtros"
            body="Ajuste os critérios ou convide um novo usuário."
            quote="Os que semeiam com lágrimas com júbilo ceifarão."
            cite="Salmos 126:5"
            action={<Button variant="primary" icon="plus" onClick={onOpenInvite}>Convidar usuário</Button>}
          />
        ) : (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Papéis</th>
                  <th>Instituição</th>
                  <th>Status</th>
                  <th>MFA</th>
                  <th>Último acesso</th>
                  <th style={{width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(u => (
                  <tr key={u.id} onClick={() => onOpenUser(u.id)}>
                    <td>
                      <div className="user-cell">
                        <Avatar name={u.name} initials={u.initials} />
                        <div className="user-cell-text">
                          <b>{u.name}</b>
                          <span>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="role-stack">
                        {u.roles.slice(0, 2).map(r => <RoleBadge key={r} role={r} />)}
                        {u.roles.length > 2 && <span className="badge" style={{background:'var(--hb-gray-50)'}}>+{u.roles.length - 2}</span>}
                      </div>
                    </td>
                    <td style={{color:'var(--fg-muted)', fontSize:13.5}}>{u.institutions[0] || '—'}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>
                      {u.mfa ? (
                        <span style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'#5e7a10'}}>
                          <Icon name="shield" size={14} /> Ativo
                        </span>
                      ) : (
                        <span style={{fontSize:13, color:'var(--fg-muted)'}}>—</span>
                      )}
                    </td>
                    <td style={{color:'var(--fg-muted)', fontSize:13}}>{u.lastLogin ? fmt.relative(u.lastLogin) : 'nunca'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="icon-btn" title="Ações" style={{width:32, height:32}}><Icon name="moreHorizontal" size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <span className="pagination-info">Página {page} de {totalPages} · {filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'}</span>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p-1)}><Icon name="chevronLeft" size={14}/></button>
              {Array.from({length: totalPages}, (_, i) => i+1).map(n => (
                <button key={n} className={`page-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p+1)}><Icon name="chevronRight" size={14}/></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------- USER DETAIL ----------------
const UserDetail = ({ userId, onBack, onImpersonate, onToast }) => {
  const u = AdminData.getUser(userId);
  if (!u) return <div className="page"><EmptyState title="Usuário não encontrado" /></div>;
  const userAudit = AdminData.auditLog.filter(a => a.actorId === u.id || a.entityId === u.id).slice(0, 8);

  const allowedImpersonation = !u.roles.includes('super_admin');

  return (
    <div className="page">
      <button className="back-link" onClick={onBack}><Icon name="chevronLeft" size={14}/> Voltar para usuários</button>

      <div className="detail-header">
        <Avatar name={u.name} initials={u.initials} size="xl" />
        <div className="detail-header-meta">
          <div className="role-stack">{u.roles.map(r => <RoleBadge key={r} role={r} />)}</div>
          <h1>{u.name}</h1>
          <div className="email">{u.email} · {u.phone}</div>
          <div style={{marginTop: 12, display:'flex', gap: 16, flexWrap:'wrap', fontSize:13, color:'var(--fg-muted)'}}>
            <span><b style={{color:'var(--fg)'}}>Status:</b> <StatusBadge status={u.status} /></span>
            <span><b style={{color:'var(--fg)'}}>Conta criada:</b> {fmt.date(u.createdAt)}</span>
            <span><b style={{color:'var(--fg)'}}>Último acesso:</b> {u.lastLogin ? fmt.dateTime(u.lastLogin) : 'nunca'}</span>
          </div>
        </div>
        <div className="detail-header-actions">
          <Button variant="secondary" icon="edit">Editar</Button>
          <Button variant="secondary" icon="keyRound" onClick={() => onToast('Email de redefinição enviado para ' + u.email)}>Resetar senha</Button>
          {allowedImpersonation && (
            <Button variant="accent" icon="eye" onClick={() => onImpersonate(u)} title="Disponível para suporte por telefone">Impersonar</Button>
          )}
        </div>
      </div>

      <div className="grid grid-stat">
        <div style={{display:'flex', flexDirection:'column', gap:18}}>
          <div className="card">
            <div className="card-header"><h3>Atividade recente</h3></div>
            <div className="card-body" style={{paddingTop:8, paddingBottom:8}}>
              {userAudit.length === 0 ? (
                <EmptyState title="Sem atividade registrada" body="Nenhuma ação no audit log para este usuário." quote="Mesmo o que ainda não fez, será feito a seu tempo." cite="Eclesiastes 3:11" />
              ) : (
                <ul className="timeline" style={{listStyle:'none', margin:0, padding:'4px 0 0 26px'}}>
                  {userAudit.map(a => (
                    <li key={a.id} className={`timeline-item ${a.action.startsWith('impersonation') ? 'warm' : a.action.startsWith('user.login') ? 'cool' : ''}`}>
                      <div className="timeline-time">{fmt.dateTime(a.at)} · <span style={{fontFamily:'ui-monospace,monospace'}}>{a.action}</span></div>
                      <div className="timeline-text">{a.summary}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Acesso por módulo</h3></div>
            <div className="card-body">
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10}}>
                {AdminData.APPS.map(app => {
                  const suspended = u.suspendedModules.includes(app.key);
                  return (
                    <div key={app.key} style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 12px', borderRadius:10,
                      background: suspended ? 'rgba(184,51,26,0.06)' : 'var(--hb-cream)',
                      border: suspended ? '1px solid rgba(184,51,26,0.2)' : '1px solid var(--border)',
                    }}>
                      <span style={{flex:1, fontSize:13.5, fontWeight: 500, color: suspended ? '#b8331a' : 'var(--fg)'}}>{app.label}</span>
                      {suspended ? (
                        <span style={{fontSize:11.5, color:'#b8331a', fontWeight:600}}>suspenso</span>
                      ) : (
                        <Switch on={true} onToggle={() => {}} ariaLabel={`Acesso a ${app.label}`} />
                      )}
                    </div>
                  );
                })}
              </div>
              {u.suspendedReason && (
                <div style={{marginTop: 14, padding:'12px 14px', background:'rgba(184,51,26,0.06)', borderRadius:10, fontSize:13, color:'#7a2614'}}>
                  <b>Motivo da suspensão:</b> {u.suspendedReason}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:18}}>
          <div className="card">
            <div className="card-header"><h3>Identidade & segurança</h3></div>
            <div className="card-body">
              <dl className="meta-list">
                <dt>ID interno</dt><dd style={{fontFamily:'ui-monospace,monospace', fontSize:13}}>{u.id}</dd>
                <dt>Email</dt><dd>{u.email}</dd>
                <dt>Telefone</dt><dd>{u.phone}</dd>
                <dt>MFA (TOTP)</dt><dd>{u.mfa ? <span style={{color:'#5e7a10', fontWeight:600}}>● Habilitado</span> : <span style={{color:'var(--hb-orange-deep)', fontWeight:600}}>● Não habilitado</span>}</dd>
                <dt>Designações</dt><dd>{u.designations.length > 0 ? u.designations.join(' · ') : <span style={{color:'var(--fg-muted)'}}>nenhuma</span>}</dd>
              </dl>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Vínculos institucionais</h3></div>
            <div className="card-body">
              {u.institutions.map(inst => (
                <div key={inst} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--divider)'}}>
                  <div style={{width:32, height:32, borderRadius:8, background:'var(--hb-cream)', display:'grid', placeItems:'center'}}>
                    <Icon name="building" size={16} />
                  </div>
                  <span style={{flex:1, fontSize:14, fontWeight:500}}>{inst}</span>
                </div>
              ))}
            </div>
          </div>

          {u.status === 'pendente' && (
            <div className="card" style={{borderColor:'rgba(234,90,6,0.3)', background:'rgba(234,90,6,0.03)'}}>
              <div className="card-body">
                <div style={{display:'flex', gap:10, alignItems:'flex-start'}}>
                  <div style={{width:32, height:32, background:'var(--hb-orange)', color:'white', borderRadius:8, display:'grid', placeItems:'center', flexShrink:0}}><Icon name="alertCircle" size={18}/></div>
                  <div>
                    <b style={{fontFamily:'var(--font-display)'}}>Aprovação pendente</b>
                    <p style={{margin:'4px 0 12px', fontSize:13.5, color:'var(--fg-muted)'}}>
                      Este usuário se auto-cadastrou. Valide vínculo e papéis antes de liberar o acesso.
                    </p>
                    <div style={{display:'flex', gap:8}}>
                      <Button variant="primary" icon="check" size="sm" onClick={() => onToast(`Cadastro de ${u.name} aprovado.`)}>Aprovar cadastro</Button>
                      <Button variant="ghost" size="sm">Recusar</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { UsersScreen, UserDetail });
