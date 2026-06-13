// Shared components for the Financeiro module
const { useState, useMemo } = React;

// ============ STATUS PILL ============
function StatusPill({ status }) {
  const map = {
    pendente:    { cls: 'pill--gray',   label: 'Pendente' },
    aprovado:    { cls: 'pill--cyan',   label: 'Aprovado' },
    autorizado:  { cls: 'pill--orange', label: 'Autorizado' },
    pago:        { cls: 'pill--blue',   label: 'Pago' },
    conciliado:  { cls: 'pill--green',  label: 'Conciliado' },
    cancelado:   { cls: 'pill--red',    label: 'Cancelado' },
  };
  const m = map[status] || map.pendente;
  return (
    <span className={'pill ' + m.cls}>
      <span className="pill__dot" />{m.label}
    </span>
  );
}

// ============ SIDEBAR ============
function Sidebar({ current, onNav, badges }) {
  const items = [
    { id: 'dashboard',     label: 'Painel',           icon: 'Dashboard' },
    { id: 'lancamentos',   label: 'Lançamentos',      icon: 'List' },
    { id: 'contas-pagar',  label: 'Contas a pagar',   icon: 'Receipt', badge: badges?.pagar },
    { id: 'conciliacao',   label: 'Conciliação',      icon: 'Repeat',  badge: badges?.recon },
    { id: 'orcamento',     label: 'Orçamento',        icon: 'BarChart' },
    { id: 'plano-contas',  label: 'Plano de contas',  icon: 'Tree' },
    { id: 'importacao',    label: 'Importação',       icon: 'Upload' },
  ];
  const otherApps = [
    { id: 'admin',      icon: 'Settings',    title: 'Admin' },
    { id: 'projetos',   icon: 'CheckSquare', title: 'Projetos' },
    { id: 'intranet',   icon: 'Home',        title: 'Intranet' },
    { id: 'flats',      icon: 'Building',    title: 'Flats' },
    { id: 'plataforma', icon: 'FileText',    title: 'Plataforma' },
    { id: 'radio',      icon: 'Mic',         title: 'Rádio' },
    { id: 'documentos', icon: 'Folder',      title: 'Documentos' },
    { id: 'tarefas',    icon: 'CheckSquare', title: 'Tarefas' },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src="assets/symbol.png" alt="Hebron ASEEC" />
        <div className="sidebar__brand-text">
          <div className="eyebrow">Hebron Aseec</div>
          <div className="title">Financeiro</div>
        </div>
      </div>

      <div className="sidebar__section">Operação</div>
      {items.map(it => {
        const Ico = Icons[it.icon];
        return (
          <div key={it.id}
               className={'nav-item ' + (current === it.id ? 'is-active' : '')}
               onClick={() => onNav(it.id)}>
            <Ico className="nav-item__icon" />
            <span>{it.label}</span>
            {it.badge ? <span className="nav-item__badge">{it.badge}</span> : null}
          </div>
        );
      })}

      <div className="sidebar__section" style={{ marginTop: 16 }}>Relatórios</div>
      <div className="nav-item" onClick={() => onNav('relatorios')}>
        <Icons.PieChart className="nav-item__icon" />
        <span>Demonstrativos</span>
      </div>
      <div className="nav-item" onClick={() => onNav('centros-custo')}>
        <Icons.Folder className="nav-item__icon" />
        <span>Centros de custo</span>
      </div>

      <div className="app-switcher" title="Outros módulos">
        {otherApps.map(a => {
          const Ico = Icons[a.icon];
          return (
            <div key={a.id} className="app-tile" title={a.title}>
              <Ico />
            </div>
          );
        })}
      </div>

      <div className="sidebar__user">
        <div className="sidebar__user-avatar">{MOCK.user.initials}</div>
        <div className="sidebar__user-meta">
          <span className="name">{MOCK.user.name}</span>
          <span className="role">Super admin</span>
        </div>
      </div>
    </aside>
  );
}

// ============ TOPBAR ============
function TopBar({ section, title, actions }) {
  return (
    <div className="topbar">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="topbar__breadcrumb">{section}</div>
        <div className="topbar__title">{title}</div>
      </div>
      <div className="topbar__actions">
        <div className="searchbar">
          <Icons.Search />
          <input placeholder="Buscar lançamentos, fornecedores, CC…" />
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4 }}>⌘K</span>
        </div>
        <button className="icon-btn" title="Notificações">
          <Icons.Bell />
          <span className="icon-btn__dot" />
        </button>
        {actions}
      </div>
    </div>
  );
}

// ============ KPI ============
function KPI({ label, value, delta, deltaDir, accent, sparkline }) {
  return (
    <div className={'kpi ' + (accent === 'blue' ? 'kpi--blue' : '')}>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      {delta ? (
        <div className={'kpi__delta ' + (deltaDir === 'up' ? 'up' : 'down')}>
          {deltaDir === 'up' ? <Icons.ArrowUp size={12} /> : <Icons.ArrowDown size={12} />}
          {delta}
        </div>
      ) : null}
      {sparkline ? <div className="kpi__chart">{sparkline}</div> : null}
    </div>
  );
}

// ============ MINI SPARKLINE ============
function Sparkline({ points, width = 76, height = 28, color = '#A1C520' }) {
  if (!points.length) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  return (
    <svg width={width} height={height}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============ AREA CHART (cash flow) ============
function AreaChart({ data, width = 660, height = 200, color = 'var(--hb-blue)', accentEvents = [] }) {
  if (!data.length) return null;
  const padL = 62, padR = 16, padT = 12, padB = 28;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const vals = data.map(p => p.v);
  const max = Math.max(...vals) * 1.06;
  const min = Math.min(...vals) * 0.92;
  const range = max - min || 1;
  const xStep = w / (data.length - 1);
  const x = i => padL + i * xStep;
  const y = v => padT + h - ((v - min) / range) * h;
  const linePath = data.map((p, i) => (i === 0 ? 'M' : 'L') + x(i) + ',' + y(p.v)).join(' ');
  const areaPath = linePath + ` L${x(data.length - 1)},${padT + h} L${x(0)},${padT + h} Z`;
  const gridLines = 4;
  const yTicks = Array.from({ length: gridLines + 1 }).map((_, i) => min + (range * i / gridLines));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#202C85" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#202C85" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={y(t)} x2={width - padR} y2={y(t)} stroke="var(--divider)" strokeDasharray="2 4" />
          <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--fg-muted)" fontFamily="var(--font-body)">
            {fmtBRLshort(t)}
          </text>
        </g>
      ))}
      {/* x axis labels: dia 1, 7, 14, 21, 30 */}
      {[0, 7, 14, 21, 30].map(i => (
        <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--fg-muted)" fontFamily="var(--font-body)">
          {`D+${i}`}
        </text>
      ))}
      <path d={areaPath} fill="url(#ar-grad)" />
      <path d={linePath} fill="none" stroke="var(--hb-blue)" strokeWidth="2" strokeLinejoin="round" />

      {/* event markers */}
      {accentEvents.map((ev, i) => (
        <g key={i}>
          <line x1={x(ev.i)} y1={padT} x2={x(ev.i)} y2={padT + h} stroke={ev.color || 'var(--hb-orange)'} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <circle cx={x(ev.i)} cy={y(data[ev.i].v)} r="4.5" fill="white" stroke={ev.color || 'var(--hb-orange)'} strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}

// ============ ACCOUNT CARD ============
function AccountCard({ acc }) {
  const colorMap = { 'IT': '#EC7000', 'ST': '#EC0000', 'CX': '#0E5099' };
  const bandClass = acc.short === 'IT' ? '' : (acc.short === 'ST' ? 'cyan' : 'green');
  return (
    <div className="acct">
      <span className={'acct__band ' + bandClass} />
      <div className="acct__bank">
        <span className="acct__bank-logo" style={{ background: colorMap[acc.short] }}>{acc.short}</span>
        <span>{acc.name}</span>
      </div>
      <div className="acct__balance">{fmtBRL(acc.balance)}</div>
      <div className="acct__sub">Atualizado {acc.last}</div>
    </div>
  );
}

// ============ GOVERNANCE FLOW ============
function GovernanceFlow({ stage }) {
  // stage: 0=criado, 1=aprovado, 2=autorizado, 3=pago
  const steps = [
    { label: 'Criação',    meta: 'Sistema agrupou em lote' },
    { label: 'Aprovação',  meta: 'Diretor Gestor (1ª camada)' },
    { label: 'Autorização', meta: 'Diretor Autorizador (2ª camada)' },
    { label: 'Pagamento',  meta: 'Super_admin confirma no banco' },
  ];
  return (
    <div className="governance-flow">
      {steps.map((s, i) => {
        const cls = i < stage ? 'is-done' : (i === stage ? 'is-current' : '');
        return (
          <div key={i} className={'gv-step ' + cls}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="gv-step__num">{i < stage ? <Icons.Check size={12} /> : i + 1}</span>
              <span className="gv-step__label">{s.label}</span>
            </div>
            <div className="gv-step__meta">{s.meta}</div>
          </div>
        );
      })}
    </div>
  );
}

// ============ EMPTY STATE WITH BIBLE QUOTE ============
function EmptyState({ icon = 'Check', quote, ref, hint }) {
  const Ico = Icons[icon] || Icons.Check;
  return (
    <div className="empty">
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--hb-cream)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--hb-blue)' }}>
        <Ico size={22} />
      </div>
      <p className="empty__quote">"{quote}"</p>
      <p className="empty__ref">{ref}</p>
      {hint ? <p style={{ marginTop: 18, color: 'var(--fg-muted)', fontSize: 14 }}>{hint}</p> : null}
    </div>
  );
}

// ============ SECTION HEADER (within content) ============
function SectionHeader({ eyebrow, title, hint, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
      <div>
        {eyebrow ? <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div> : null}
        <div className="section-title">{title}</div>
        {hint ? <div style={{ color: 'var(--fg-muted)', fontSize: 13, marginTop: 4 }}>{hint}</div> : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 8 }}>{actions}</div> : null}
    </div>
  );
}

Object.assign(window, {
  StatusPill, Sidebar, TopBar, KPI, Sparkline, AreaChart, AccountCard,
  GovernanceFlow, EmptyState, SectionHeader,
});
