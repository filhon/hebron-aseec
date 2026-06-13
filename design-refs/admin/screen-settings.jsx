// Screen: Settings (designations, feature flags, email templates, branding)

const SettingsScreen = ({ onToast }) => {
  const [tab, setTab] = useState('designations');
  const tabs = [
    { key: 'designations', label: 'Designações', icon: 'shield' },
    { key: 'flags',        label: 'Feature flags', icon: 'flag' },
    { key: 'templates',    label: 'Templates de email', icon: 'mail' },
    { key: 'branding',     label: 'Identidade & branding', icon: 'building' },
    { key: 'operations',   label: 'Janelas & calendário', icon: 'calendar' },
  ];
  return (
    <div className="page">
      <PageHeader
        eyebrow="Painel · operação do sistema"
        title="Configurações"
        subtitle="Designações de governança, feature flags técnicas e textos institucionais que circulam por todo o ecossistema."
      />
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            <span style={{display:'inline-flex', alignItems:'center', gap:6}}><Icon name={t.icon} size={14}/> {t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'designations' && <DesignationsPanel onToast={onToast} />}
      {tab === 'flags' && <FeatureFlagsPanel onToast={onToast} />}
      {tab === 'templates' && <EmailTemplatesPanel onToast={onToast} />}
      {tab === 'branding' && <BrandingPanel onToast={onToast} />}
      {tab === 'operations' && <OperationsPanel onToast={onToast} />}
    </div>
  );
};

// ---------------- DESIGNATIONS ----------------
const DesignationsPanel = ({ onToast }) => {
  const diretores = AdminData.users.filter(u => u.roles.includes('diretor'));
  const [gestor, setGestor] = useState('u-001');
  const [autorizador, setAutorizador] = useState('u-002');
  const sameUser = gestor === autorizador;

  return (
    <div>
      <div style={{padding:'14px 18px', background:'rgba(7,180,231,0.08)', borderRadius:12, fontSize:13.5, marginBottom: 18, display:'flex', alignItems:'flex-start', gap:10, color:'#075e7a'}}>
        <Icon name="alertCircle" size={18} />
        <div>
          <b>Governança dual.</b> Toda despesa exige aprovação por <b>Diretor Gestor</b> e autorização por <b>Diretor Autorizador</b> — duas pessoas distintas, em duas etapas. Não use o mesmo nome para os dois papéis.
        </div>
      </div>

      <div className="grid grid-2">
        <DesignationCard
          title="Diretor Gestor"
          description="Aprova lotes de pagamento semanais. Preside reuniões mensais e registra decisões sobre projetos pontuais."
          color="var(--hb-orange)"
          icon="shield"
          value={gestor}
          options={diretores}
          onChange={(v) => { setGestor(v); onToast('Designação de Diretor Gestor atualizada.'); }}
        />
        <DesignationCard
          title="Diretor Autorizador"
          description="Autoriza pagamentos no internet banking. Nunca pode ser o mesmo que aprovou o lote — dupla autorização é a regra inviolável."
          color="var(--hb-cyan)"
          icon="keyRound"
          value={autorizador}
          options={diretores}
          onChange={(v) => { setAutorizador(v); onToast('Designação de Diretor Autorizador atualizada.'); }}
          warn={sameUser ? 'Mesmo diretor designado para os dois papéis. Isso viola a separação de funções.' : null}
        />
      </div>

      <div className="card" style={{marginTop:22}}>
        <div className="card-header">
          <h3>Avaliadores designados (projetos anuais 2026)</h3>
          <div className="card-header-actions"><Button variant="ghost" size="sm" icon="plus">Designar</Button></div>
        </div>
        <div style={{padding:'4px 22px 16px'}}>
          {[
            { dir: 'Roberto Capelowski',  area: 'Educação teológica',    qtd: 4 },
            { dir: 'Elaine Vasconcellos', area: 'Missões transculturais', qtd: 6 },
            { dir: 'Pra. Larissa Bonfim', area: 'Assistência social',     qtd: 3 },
            { dir: 'Giseli Henrique',     area: 'Infraestrutura ministerial', qtd: 2 },
          ].map((d, i) => (
            <div key={i} style={{display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:'1px solid var(--divider)'}}>
              <Avatar name={d.dir} initials={d.dir.split(' ').map(w => w[0]).slice(0,2).join('')} size="sm" />
              <div style={{flex:1}}>
                <div style={{fontWeight:600, fontSize:14}}>{d.dir}</div>
                <div style={{fontSize:12.5, color:'var(--fg-muted)'}}>Área: {d.area}</div>
              </div>
              <span className="badge" style={{background:'var(--hb-cream)'}}>{d.qtd} projetos atribuídos</span>
              <button className="icon-btn" style={{width:32, height:32}}><Icon name="moreHorizontal" size={14}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DesignationCard = ({ title, description, color, icon, value, options, onChange, warn }) => {
  const selected = options.find(o => o.id === value);
  return (
    <div className="card card-padded" style={{borderLeft: `4px solid ${color}`}}>
      <div style={{display:'flex', alignItems:'flex-start', gap: 12, marginBottom: 14}}>
        <div style={{width:36, height:36, borderRadius:10, background: color, color:'white', display:'grid', placeItems:'center', flexShrink:0}}>
          <Icon name={icon} size={18} />
        </div>
        <div>
          <h3 style={{margin:0, fontFamily:'var(--font-display)', fontSize:17, fontWeight:700}}>{title}</h3>
          <p style={{margin:'4px 0 0', fontSize:13, color:'var(--fg-muted)'}}>{description}</p>
        </div>
      </div>
      <div className="form-row" style={{marginBottom: 6}}>
        <label>Diretor designado</label>
        <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      {selected && (
        <div style={{display:'flex', gap:10, alignItems:'center', marginTop:12, padding:'10px 12px', background:'var(--hb-cream)', borderRadius:10}}>
          <Avatar name={selected.name} initials={selected.initials} size="sm" />
          <div style={{flex:1, fontSize:13}}>
            <b>{selected.name}</b>
            <div style={{color:'var(--fg-muted)', fontSize:12}}>{selected.email}</div>
          </div>
          {selected.mfa && <span style={{fontSize:11.5, color:'#5e7a10', display:'flex', alignItems:'center', gap:4}}><Icon name="shield" size={12}/> MFA</span>}
        </div>
      )}
      {warn && (
        <div style={{marginTop:12, padding:'10px 12px', background:'rgba(184,51,26,0.08)', color:'#7a2614', borderRadius:10, fontSize:12.5, display:'flex', alignItems:'flex-start', gap:8}}>
          <Icon name="alertCircle" size={14} /> {warn}
        </div>
      )}
    </div>
  );
};

// ---------------- FEATURE FLAGS ----------------
const FeatureFlagsPanel = ({ onToast }) => {
  const [flags, setFlags] = useState(AdminData.featureFlags);
  const toggle = (key) => {
    setFlags(fs => fs.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
    onToast(`Feature flag "${key}" atualizada.`);
  };
  return (
    <div>
      <div style={{padding:'14px 18px', background:'var(--hb-cream)', borderRadius:12, fontSize:13.5, marginBottom: 18, color:'var(--fg-muted)'}}>
        <b style={{color:'var(--fg)'}}>Apenas para flags técnicas.</b> Controles de negócio (datas de janela, valores limite, percentuais de quórum) ficam em <i>Janelas & calendário</i> — feature flags são para deploys progressivos.
      </div>
      <div className="card">
        <div style={{padding:'4px 24px'}}>
          {flags.map(f => (
            <div key={f.key} className="flag-row">
              <div className="flag-meta">
                <b>{f.label}</b>
                <div className="desc">{f.description}</div>
                <div style={{display:'flex', gap:14, marginTop:8, fontSize:12, color:'var(--fg-muted)'}}>
                  <span className="key">{f.key}</span>
                  <span>Audiência: <b style={{color:'var(--fg)'}}>{f.audience}</b></span>
                </div>
              </div>
              <Switch on={f.enabled} onToggle={() => toggle(f.key)} ariaLabel={f.label} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------- EMAIL TEMPLATES ----------------
const EmailTemplatesPanel = ({ onToast }) => {
  const [selected, setSelected] = useState(AdminData.emailTemplates[0].slug);
  const tpl = AdminData.emailTemplates.find(t => t.slug === selected);
  const [subject, setSubject] = useState(tpl.subject);
  const [body, setBody] = useState(tpl.body);

  useEffect(() => {
    setSubject(tpl.subject);
    setBody(tpl.body);
  }, [selected]);

  // Render preview with variables highlighted
  const renderBodyWithHighlights = (text) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((p, i) => /^\{\{.+\}\}$/.test(p) ? <span key={i} className="tpl-var">{p}</span> : <React.Fragment key={i}>{p}</React.Fragment>);
  };
  const renderSubjectWithHighlights = (text) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((p, i) => /^\{\{.+\}\}$/.test(p) ? <span key={i} className="tpl-var">{p}</span> : <React.Fragment key={i}>{p}</React.Fragment>);
  };

  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:'260px 1fr', gap: 18, alignItems:'flex-start'}}>
        <div className="card">
          <div style={{padding: '12px 14px', borderBottom:'1px solid var(--divider)', fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--fg-muted)', fontWeight:600}}>Templates</div>
          {AdminData.emailTemplates.map(t => (
            <button
              key={t.slug}
              onClick={() => setSelected(t.slug)}
              style={{
                display:'block', width:'100%', textAlign:'left',
                padding:'12px 16px',
                background: selected === t.slug ? 'var(--hb-cream)' : 'transparent',
                border:'none',
                borderBottom: '1px solid var(--divider)',
                cursor:'pointer',
                borderLeft: selected === t.slug ? '3px solid var(--hb-blue)' : '3px solid transparent',
              }}
            >
              <div style={{fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color: selected === t.slug ? 'var(--hb-blue)' : 'var(--fg)'}}>{t.name}</div>
              <div style={{fontSize:11.5, color:'var(--fg-muted)', marginTop:2, fontFamily:'ui-monospace,monospace'}}>{t.slug}</div>
              <div style={{fontSize:11.5, color:'var(--fg-muted)', marginTop:4}}>Atualizado em {fmt.date(t.updatedAt + 'T12:00:00')}</div>
            </button>
          ))}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap: 14}}>
          <div className="card card-padded">
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom: 14}}>
              <div>
                <div style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:18}}>{tpl.name}</div>
                <div style={{fontSize:12.5, color:'var(--fg-muted)'}}>Variáveis disponíveis: {tpl.variables.map((v,i) => <span key={i} className="tpl-var" style={{marginRight:4}}>{v}</span>)}</div>
              </div>
              <div style={{marginLeft:'auto', display:'flex', gap:8}}>
                <Button variant="ghost" size="sm" icon="mail" onClick={() => onToast('Email de teste enviado para você.')}>Enviar teste</Button>
                <Button variant="primary" size="sm" icon="check" onClick={() => onToast('Template salvo.')}>Salvar</Button>
              </div>
            </div>

            <div className="form-row">
              <label>Assunto</label>
              <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Corpo do email</label>
              <textarea className="form-textarea" value={body} onChange={e => setBody(e.target.value)} style={{minHeight: 220, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13}} />
              <div className="hint">Texto puro. Quebras de linha são preservadas. Variáveis no formato <code style={{fontFamily:'ui-monospace,monospace'}}>{'{{nome}}'}</code> são substituídas no envio.</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Pré-visualização</h3>
              <div className="card-header-actions">
                <span style={{fontSize:12, color:'var(--fg-muted)', display:'flex', alignItems:'center', gap:6}}>
                  <Icon name="eye" size={14}/> Renderização sem dados injetados — variáveis aparecem destacadas.
                </span>
              </div>
            </div>
            <div style={{padding:'14px 22px 18px'}}>
              <div className="tpl-preview-subject">{renderSubjectWithHighlights(subject)}</div>
              <div className="tpl-preview">{renderBodyWithHighlights(body)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------- BRANDING ----------------
const BrandingPanel = ({ onToast }) => {
  const b = AdminData.settings.branding;
  return (
    <div className="grid grid-stat">
      <div className="card card-padded">
        <h3 style={{margin:'0 0 16px', fontFamily:'var(--font-display)', fontSize:17, fontWeight:700}}>Dados institucionais</h3>
        <div className="form-row">
          <label>Nome de apresentação</label>
          <input className="form-input" defaultValue={b.orgName} />
        </div>
        <div className="form-row">
          <label>Razão social</label>
          <input className="form-input" defaultValue={b.legalName} />
        </div>
        <div className="form-row-grid">
          <div className="form-row">
            <label>CNPJ</label>
            <input className="form-input" defaultValue={b.cnpj} />
          </div>
          <div className="form-row">
            <label>Email de suporte</label>
            <input className="form-input" defaultValue={b.supportEmail} />
          </div>
        </div>
        <div className="form-row">
          <label>Tagline institucional</label>
          <input className="form-input" defaultValue={b.tagline} />
          <div className="hint">Aparece no rodapé de emails e cartões impressos. <b>Deus</b> em ciano, <b>transformação</b> em verde, <b>vidas</b> em laranja.</div>
        </div>
        <div className="form-row-grid">
          <div className="form-row">
            <label>Site institucional</label>
            <input className="form-input" defaultValue={b.site} />
          </div>
          <div className="form-row">
            <label>Handle social</label>
            <input className="form-input" defaultValue={b.social} />
          </div>
        </div>
        <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop: 8}}>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="primary" icon="check" onClick={() => onToast('Branding atualizado em todos os módulos.')}>Salvar alterações</Button>
        </div>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap: 18}}>
        <div className="card card-padded">
          <h3 style={{margin:'0 0 14px', fontFamily:'var(--font-display)', fontSize:16, fontWeight:700}}>Pré-visualização</h3>
          <div style={{
            background: 'var(--hb-blue)', color:'var(--hb-white)',
            borderRadius: 16, padding: '22px 22px 28px',
            position:'relative', overflow:'hidden',
          }}>
            <img src="assets/logo-horizontal.png" alt="Hebron ASEEC" style={{height: 28, filter:'brightness(0) invert(1)', display:'block', marginBottom:14}} />
            <div style={{fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, lineHeight:1.2, textWrap:'balance'}}>
              Instrumentos <span style={{color:'var(--hb-cyan)'}}>de Deus</span> na <span style={{color:'var(--hb-green)'}}>transformação</span> de <span style={{color:'var(--hb-orange)'}}>vidas.</span>
            </div>
            <div style={{marginTop:18, fontSize:12, color:'var(--fg-invert-muted)', display:'flex', justifyContent:'space-between'}}>
              <span>{b.site}</span>
              <span>{b.social}</span>
            </div>
          </div>
        </div>

        <div className="card card-padded">
          <h3 style={{margin:'0 0 14px', fontFamily:'var(--font-display)', fontSize:16, fontWeight:700}}>Logos & assets</h3>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            {[
              { name: 'Logo horizontal', file: 'logo-horizontal.png' },
              { name: 'Logo vertical',   file: 'symbol.png' },
              { name: 'Símbolo',         file: 'symbol.png' },
              { name: 'Monocromática',   file: 'logo-horizontal.png' },
            ].map((l) => (
              <div key={l.name} style={{padding:14, background:'var(--hb-cream)', borderRadius:10, textAlign:'center'}}>
                <div style={{height:60, display:'grid', placeItems:'center', marginBottom:8}}>
                  <img src={`assets/${l.file}`} style={{maxHeight:'100%', maxWidth:'100%'}} alt={l.name} />
                </div>
                <div style={{fontSize:12, color:'var(--fg-muted)'}}>{l.name}</div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon="download" style={{marginTop:10}}>Baixar pacote completo</Button>
        </div>
      </div>
    </div>
  );
};

// ---------------- OPERATIONS ----------------
const OperationsPanel = ({ onToast }) => {
  const o = AdminData.settings.operations;
  return (
    <div className="grid grid-2">
      <div className="card card-padded">
        <h3 style={{margin:'0 0 6px', fontFamily:'var(--font-display)', fontSize:17, fontWeight:700}}>Reuniões mensais</h3>
        <p style={{margin:'0 0 16px', fontSize:13, color:'var(--fg-muted)'}}>Auto-criadas todo mês. Você pode adiar reuniões individuais sem alterar a regra geral.</p>
        <div className="form-row-grid">
          <div className="form-row">
            <label>Dia padrão</label>
            <select className="form-select" defaultValue={o.monthlyMeetingDay}>
              <option>1ª segunda-feira</option>
              <option>1ª terça-feira</option>
              <option>1ª quarta-feira</option>
              <option>1ª quinta-feira</option>
              <option>1ª sexta-feira</option>
            </select>
          </div>
          <div className="form-row">
            <label>Horário</label>
            <input className="form-input" type="time" defaultValue={o.monthlyMeetingTime} />
          </div>
        </div>
        <Button variant="primary" size="sm" icon="check" onClick={() => onToast('Configurações de reunião atualizadas.')}>Salvar</Button>
      </div>

      <div className="card card-padded">
        <h3 style={{margin:'0 0 6px', fontFamily:'var(--font-display)', fontSize:17, fontWeight:700}}>Convites</h3>
        <p style={{margin:'0 0 16px', fontSize:13, color:'var(--fg-muted)'}}>Validade do link de convite por email. Expirados podem ser renovados manualmente.</p>
        <div className="form-row">
          <label>Validade do convite (dias)</label>
          <input className="form-input" type="number" defaultValue={o.invitationTtlDays} min={1} max={30} />
        </div>
      </div>

      <div className="card card-padded">
        <h3 style={{margin:'0 0 6px', fontFamily:'var(--font-display)', fontSize:17, fontWeight:700}}>Janela de submissão · projetos anuais 2026</h3>
        <p style={{margin:'0 0 16px', fontSize:13, color:'var(--fg-muted)'}}>Período em que submissores podem registrar projetos anuais. Pontuais são aceitos o ano todo.</p>
        <div className="form-row-grid">
          <div className="form-row">
            <label>Abertura</label>
            <input className="form-input" type="date" defaultValue={o.annualWindowStart} />
          </div>
          <div className="form-row">
            <label>Fechamento</label>
            <input className="form-input" type="date" defaultValue={o.annualWindowEnd} />
          </div>
        </div>
      </div>

      <div className="card card-padded">
        <h3 style={{margin:'0 0 6px', fontFamily:'var(--font-display)', fontSize:17, fontWeight:700}}>Homologação & contestações</h3>
        <p style={{margin:'0 0 16px', fontSize:13, color:'var(--fg-muted)'}}>Após aprovação, projetos entram em homologação. Cada pessoa pode contestar uma vez.</p>
        <div className="form-row-grid">
          <div className="form-row">
            <label>Dias de homologação</label>
            <input className="form-input" type="number" defaultValue={o.homologationDays} />
          </div>
          <div className="form-row">
            <label>Contestações máximas</label>
            <input className="form-input" type="number" defaultValue={o.maxContestations} />
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { SettingsScreen });
