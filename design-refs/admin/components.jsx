// Shared components for Admin module
// All exported to window for cross-script access.

const { useState, useEffect, useMemo, useRef } = React;

// ---------- ICONS (Lucide-style minimal inline SVGs) ----------
const Icon = ({ name, size = 18, stroke = 1.8, className }) => {
  const props = {
    width: size, height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  };
  const paths = {
    search:   <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    bell:     <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    user:     <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    users:    <><circle cx="9" cy="8" r="4"/><path d="M3 21a6 6 0 0 1 12 0"/><circle cx="17" cy="6" r="3" /><path d="M15 14a5 5 0 0 1 7 4.5"/></>,
    mail:     <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    shield:   <><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    layers:   <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>,
    chevronRight: <><path d="m9 18 6-6-6-6"/></>,
    chevronLeft:  <><path d="m15 18-6-6 6-6"/></>,
    chevronDown:  <><path d="m6 9 6 6 6-6"/></>,
    plus:     <><path d="M12 5v14M5 12h14"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    filter:   <><path d="M3 4h18l-7 9v6l-4 2v-8L3 4Z"/></>,
    moreHorizontal: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    edit:     <><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18 2a2.5 2.5 0 0 1 3.5 3.5L12 15l-4 1 1-4 9-10Z"/></>,
    eye:      <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff:   <><path d="m9.9 4.2A10 10 0 0 1 12 4c6 0 10 8 10 8a17 17 0 0 1-3 4M6.6 6.6A17 17 0 0 0 2 12s4 8 10 8a10 10 0 0 0 4.2-.9"/><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/></>,
    arrowRight: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
    alertCircle: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>,
    check:    <><path d="m5 12 5 5 9-12"/></>,
    x:        <><path d="M18 6 6 18M6 6l18 12" transform="translate(-6,0)"/></>,
    close:    <><path d="M18 6 6 18M6 6l12 12"/></>,
    clock:    <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    pause:    <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>,
    play:     <><path d="M6 4v16l14-8L6 4Z"/></>,
    keyRound: <><circle cx="8" cy="15" r="4"/><path d="m10.85 12.15 8-8a2 2 0 0 1 2.83 2.83L19.5 9.17l2 2L17.83 14.85"/></>,
    logOut:   <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>,
    sparkles: <><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M19 17v4M17 19h4"/></>,
    folder:   <><path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></>,
    fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/></>,
    flag:     <><path d="M4 22V4a1 1 0 0 1 1.4-.9l14 5a1 1 0 0 1 0 1.8L8 13v9"/></>,
    radio:    <><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19a10 10 0 0 1 0-14"/></>,
    home:     <><path d="m3 11 9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9Z"/></>,
    coins:    <><circle cx="8" cy="8" r="6"/><path d="M18.1 10.5a6 6 0 1 1-5.6 9.5"/><path d="M7 6h1v4"/><path d="m16.7 14 .3-.5 1 .3"/></>,
    building: <><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M12 14h.01M8 14h.01M16 14h.01"/></>,
    bed:      <><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 14h20M6 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></>,
    list:     <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
};

// ---------- LOGO MARK ----------
const Mark = ({ size = 36 }) => (
  <div className="sidebar-brand-mark" style={{ width: size, height: size }}>
    <img src="assets/symbol.png" alt="Hebron ASEEC" />
  </div>
);

// ---------- AVATAR ----------
const Avatar = ({ name, initials, size = 'md', color }) => {
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'lg' ? 'avatar avatar-lg' : size === 'xl' ? 'avatar avatar-xl' : 'avatar';
  // deterministic color from name
  const palette = ['#202C85', '#EA5A06', '#07B4E7', '#A1C520', '#6b4ec8', '#0a8a7d', '#b8852a'];
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = color || palette[hash % palette.length];
  return (
    <div className={cls} style={{ background: bg }}>{initials}</div>
  );
};

// ---------- ROLE BADGE ----------
const RoleBadge = ({ role }) => {
  const meta = AdminData.getRole(role);
  if (!meta) return null;
  return <span className={`badge role-${role}`}>{meta.label}</span>;
};

// ---------- STATUS BADGE ----------
const StatusBadge = ({ status }) => {
  const map = {
    ativo: 'Ativo', pendente: 'Pendente', suspenso: 'Suspenso',
    aceito: 'Aceito', expirado: 'Expirado',
    agendada: 'Agendada', realizada: 'Realizada',
  };
  return <span className={`badge badge-${status}`}><span className="badge-dot"/>{map[status] || status}</span>;
};

// ---------- BUTTON ----------
const Button = ({ variant = 'primary', size, icon, children, onClick, type, title }) => {
  const cls = `btn btn-${variant}${size === 'sm' ? ' btn-sm' : size === 'tiny' ? ' btn-tiny' : ''}`;
  return (
    <button type={type || 'button'} className={cls} onClick={onClick} title={title}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
};

// ---------- SWITCH ----------
const Switch = ({ on, onToggle, ariaLabel }) => (
  <div
    role="switch"
    aria-checked={on}
    aria-label={ariaLabel}
    tabIndex={0}
    className={`switch${on ? ' on' : ''}`}
    onClick={onToggle}
    onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), onToggle())}
  />
);

// ---------- MODAL ----------
const Modal = ({ title, description, onClose, children, footer, wide }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{flex: 1}}>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ---------- PAGE HEADER ----------
const PageHeader = ({ eyebrow, title, subtitle, actions }) => (
  <div className="page-header">
    <div className="page-header-meta">
      {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="page-header-actions">{actions}</div>}
  </div>
);

// ---------- EMPTY STATE ----------
const EmptyState = ({ icon = 'sparkles', title, body, quote, cite, action }) => (
  <div className="empty">
    <div className="empty-icon"><Icon name={icon} size={24} /></div>
    <b>{title}</b>
    {body && <div style={{fontSize:13.5, marginTop:4}}>{body}</div>}
    {quote && <div className="quote">"{quote}"<cite>— {cite}</cite></div>}
    {action && <div style={{marginTop:18}}>{action}</div>}
  </div>
);

// ---------- SIDEBAR ----------
const Sidebar = ({ active, onNavigate, kpis }) => {
  const items = [
    { key: 'overview',   label: 'Visão geral',         icon: 'home' },
    { key: 'users',      label: 'Usuários',            icon: 'users', count: kpis.usersPending },
    { key: 'invites',    label: 'Convites',            icon: 'mail',  count: kpis.invitesPending },
    { key: 'meetings',   label: 'Reuniões',            icon: 'calendar' },
    { key: 'audit',      label: 'Auditoria',           icon: 'activity' },
    { key: 'settings',   label: 'Configurações',       icon: 'settings' },
  ];
  const appList = AdminData.APPS;
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Mark />
        <div className="sidebar-brand-text">
          <span className="org">HEBRON ASEEC</span>
          <span className="module">Admin</span>
        </div>
      </div>

      <div className="sidebar-section-label">Operação</div>
      <nav className="sidebar-nav">
        {items.map(it => (
          <button
            key={it.key}
            className={`nav-item${active === it.key ? ' active' : ''}`}
            onClick={() => onNavigate(it.key)}
          >
            <Icon name={it.icon} size={18} />
            <span>{it.label}</span>
            {it.count > 0 && <span className="nav-count">{it.count}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-apps">
        <div className="sidebar-section-label" style={{padding: 0}}>Ecossistema</div>
        <div className="sidebar-apps-grid">
          {appList.map(app => (
            <button key={app.key} className={`app-launcher-tile${app.key === 'admin' ? ' current' : ''}`} title={`${app.label} · ${app.key}.hebronaseec.com.br`}>
              {app.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

// ---------- TOPBAR ----------
const Topbar = ({ currentUser, onImpersonate, onProfile, route }) => {
  const titles = {
    overview: 'painel administrativo',
    users:    'gestão de usuários',
    invites:  'convites de acesso',
    audit:    'trilha de auditoria',
    meetings: 'reuniões da diretoria',
    settings: 'configurações do sistema',
    userDetail: 'perfil de usuário',
  };
  return (
    <div className="topbar">
      <div className="topbar-search">
        <Icon name="search" size={16} />
        <input placeholder="Buscar usuários, papéis, ações de auditoria…  ⌘K" />
      </div>
      <div className="topbar-actions">
        <span className="app-quote">{titles[route] || titles.overview}</span>
        <button className="icon-btn" title="Notificações"><Icon name="bell" size={18} /><span className="dot"/></button>
        <button className="icon-btn" title="Documentação"><Icon name="fileText" size={18} /></button>
        <div className="topbar-user" onClick={onProfile}>
          <Avatar name={currentUser.name} initials={currentUser.initials} size="sm" />
          <div className="topbar-user-name">
            <b>{currentUser.name}</b>
            <span>Super Admin · MFA ativo</span>
          </div>
          <Icon name="chevronDown" size={14} />
        </div>
      </div>
    </div>
  );
};

// ---------- IMPERSONATION BANNER ----------
const ImpersonationBanner = ({ user, onEnd }) => {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const min = Math.floor(secs / 60).toString().padStart(2, '0');
  const sec = (secs % 60).toString().padStart(2, '0');
  return (
    <div className="imp-banner">
      <div className="imp-banner-icon"><Icon name="eye" size={16} /></div>
      <div>
        Você está operando como <b>{user.name}</b> · {user.email}
        <span style={{opacity:0.85, marginLeft:8}}>— toda ação é registrada na trilha de auditoria.</span>
      </div>
      <div className="imp-banner-spacer" />
      <div className="imp-banner-timer">⏱ {min}:{sec}</div>
      <button onClick={onEnd}>Sair da impersonação</button>
    </div>
  );
};

// ---------- TOAST ----------
const Toast = ({ message, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div style={{
      position:'fixed', bottom: 24, right: 24,
      background: 'var(--hb-blue)', color: 'var(--hb-white)',
      padding: '12px 20px', borderRadius: 12,
      boxShadow: 'var(--shadow-lg)',
      fontSize: 14, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10,
      zIndex: 200,
      animation: 'pop-in 220ms var(--ease-out)',
    }}>
      <Icon name="check" size={18} />
      {message}
    </div>
  );
};

// ---------- formatters ----------
const fmt = {
  dateTime: (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  date: (iso) => {
    if (!iso) return '—';
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  relative: (iso) => {
    if (!iso) return '—';
    const now = new Date('2026-05-23T10:00:00Z').getTime();
    const t = new Date(iso).getTime();
    const diff = Math.round((now - t) / 1000);
    if (diff < 60) return 'agora há pouco';
    if (diff < 3600) return `há ${Math.round(diff/60)} min`;
    if (diff < 86400) return `há ${Math.round(diff/3600)} h`;
    if (diff < 86400 * 7) return `há ${Math.round(diff/86400)} dia${Math.round(diff/86400) > 1 ? 's' : ''}`;
    return fmt.date(iso);
  },
  time: (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },
};

Object.assign(window, { Icon, Mark, Avatar, RoleBadge, StatusBadge, Button, Switch, Modal, PageHeader, EmptyState, Sidebar, Topbar, ImpersonationBanner, Toast, fmt });
