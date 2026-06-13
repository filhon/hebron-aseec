// Lançamentos — lista completa com filtros, busca e exportação
function ScreenLancamentos() {
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let rows = MOCK.transactions;
    if (filter === 'entradas') rows = rows.filter(t => t.value > 0);
    if (filter === 'saidas') rows = rows.filter(t => t.value < 0);
    if (filter === 'projetos') rows = rows.filter(t => !!t.cc);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(t => t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q));
    }
    return rows;
  }, [filter, search]);

  const total = filtered.reduce((s, t) => s + t.value, 0);

  return (
    <div className="page">
      {/* Stats strip */}
      <div className="kpi-grid">
        <KPI label="Lançamentos no mês" value={MOCK.transactions.length}
             delta={`+${MOCK.transactions.length - 8} vs abril`} deltaDir="up" />
        <KPI label="Entradas" value={fmtBRL(MOCK.transactions.filter(t => t.value > 0).reduce((s,t) => s+t.value, 0))}
             delta="Hebron Farmacêutica D+5" deltaDir="up" />
        <KPI label="Saídas" value={fmtBRL(Math.abs(MOCK.transactions.filter(t => t.value < 0).reduce((s,t) => s+t.value, 0)))}
             delta="−4,1% vs abril" deltaDir="up" />
        <KPI label="Resultado" value={fmtBRL(total)} delta="+ R$ 70.7k" deltaDir="up" accent="blue" />
      </div>

      <div className="tbl-wrap">
        <div className="tbl-wrap__head" style={{ flexWrap: 'wrap', gap: 14 }}>
          <SectionHeader title="Todos os lançamentos" hint="Imutáveis — correções acontecem por estorno, nunca por edição" />
          <div className="filterbar" style={{ width: '100%' }}>
            <div className="searchbar" style={{ minWidth: 240, flex: 1, maxWidth: 360 }}>
              <Icons.Search />
              <input placeholder="Buscar por descrição ou categoria…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'entradas', label: 'Entradas' },
              { id: 'saidas', label: 'Saídas' },
              { id: 'projetos', label: 'Vinculados a projetos' },
            ].map(c => (
              <button key={c.id}
                className={'chip ' + (filter === c.id ? 'is-active' : '')}
                onClick={() => setFilter(c.id)}>
                {c.label}
              </button>
            ))}
            <div className="select">
              <Icons.Calendar size={12} /> Maio 2026 <Icons.ChevDown />
            </div>
            <div className="select">
              <Icons.Wallet size={12} /> Todas as contas <Icons.ChevDown />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn--ghost btn--sm"><Icons.Download size={12} />Exportar</button>
              <button className="btn btn--primary btn--sm"><Icons.Plus size={12} />Novo lançamento</button>
            </div>
          </div>
        </div>

        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 86 }}>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Centro de custo</th>
                <th>Conta</th>
                <th style={{ width: 110 }}>Status</th>
                <th className="num" style={{ width: 140 }}>Valor</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const acc = MOCK.accounts.find(a => a.id === t.acct);
                return (
                  <tr key={t.id}>
                    <td className="muted">{fmtDate(t.date)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{t.desc}</span>
                        {t.attach && <Icons.Paperclip size={12} color="var(--fg-muted)" />}
                      </div>
                    </td>
                    <td className="muted">{t.cat}</td>
                    <td className="muted">{t.cc || '—'}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{acc ? acc.bank : '—'}</td>
                    <td><StatusPill status={t.status} /></td>
                    <td className={'num ' + (t.value > 0 ? 'num--in' : 'num--out')}>{fmtBRL(t.value, { sign: t.value > 0 })}</td>
                    <td><button className="icon-btn" style={{ width: 28, height: 28, border: 'none' }}><Icons.MoreHorizontal size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--fg-muted)' }}>
          <span>Exibindo {filtered.length} de {MOCK.transactions.length} lançamentos</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="chip">← Anterior</button>
            <button className="chip is-active">1</button>
            <button className="chip">2</button>
            <button className="chip">3</button>
            <button className="chip">Próxima →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ScreenLancamentos = ScreenLancamentos;
