// Orçamento — planejado vs executado por categoria e centro de custo
function ScreenOrcamento() {
  const [view, setView] = useState('categorias');

  const totalPlanned = MOCK.budget2026.reduce((s, b) => s + b.planned, 0);
  const totalExecuted = MOCK.budget2026.reduce((s, b) => s + b.executed, 0);
  const overallPct = Math.round((totalExecuted / totalPlanned) * 100);

  const barFillClass = (pct) => {
    if (pct >= 95) return 'over';
    if (pct >= 80) return 'warn';
    return '';
  };

  return (
    <div className="page">
      {/* Summary */}
      <div className="kpi-grid">
        <KPI label="Orçamento 2026" value={fmtBRL(totalPlanned)} delta="Ano-calendário · jan a dez" deltaDir="up" accent="blue" />
        <KPI label="Executado" value={fmtBRL(totalExecuted)} delta={`${overallPct}% do anual`} deltaDir="up" />
        <KPI label="Disponível" value={fmtBRL(totalPlanned - totalExecuted)} delta={`${100 - overallPct}% restantes`} deltaDir="up" />
        <KPI label="Meses até dez/2026" value="7" delta={fmtBRL((totalPlanned - totalExecuted) / 7) + ' / mês'} deltaDir="up" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', background: 'var(--surface)', padding: 6, borderRadius: 12, border: '1px solid var(--border)' }}>
          {[
            { id: 'categorias', label: 'Por categoria' },
            { id: 'projetos', label: 'Por projeto / CC' },
            { id: 'matriz', label: 'Matriz mensal' },
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: view === t.id ? 'var(--hb-blue)' : 'transparent',
                color: view === t.id ? 'white' : 'var(--fg-muted)',
                transition: 'all 140ms',
              }}>{t.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div className="select"><Icons.Calendar size={12} /> Ano 2026 <Icons.ChevDown /></div>
          <button className="btn btn--ghost btn--sm"><Icons.Download size={12} />Exportar</button>
          <button className="btn btn--primary btn--sm"><Icons.Plus size={12} />Novo orçamento</button>
        </div>
      </div>

      {view === 'categorias' && (
        <div className="card">
          <div className="budget-row" style={{ background: 'var(--bg-alt)', margin: '-22px -22px 0', padding: '12px 22px', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', border: 'none' }}>
            <div className="eyebrow">Categoria</div>
            <div className="eyebrow" style={{ textAlign: 'right' }}>Planejado</div>
            <div className="eyebrow" style={{ textAlign: 'right' }}>Executado</div>
            <div className="eyebrow" style={{ textAlign: 'right' }}>% exec.</div>
            <div className="eyebrow">Andamento</div>
          </div>
          {MOCK.budget2026.map((b, idx) => (
            <div key={idx} className="budget-row">
              <div style={{ fontWeight: 600 }}>{b.cat}</div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtBRL(b.planned)}</div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--fg-muted)' }}>{fmtBRL(b.executed)}</div>
              <div style={{ textAlign: 'right', fontWeight: 700, color: b.pct >= 95 ? 'var(--hb-orange-deep)' : b.pct >= 80 ? 'var(--hb-orange)' : 'var(--hb-blue)' }}>
                {b.pct}%
              </div>
              <div>
                <div className="budget-bar">
                  <div className={'budget-bar__fill ' + barFillClass(b.pct)} style={{ width: Math.min(b.pct, 100) + '%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'projetos' && (
        <div className="card">
          <SectionHeader eyebrow="Centros de custo" title="Orçamento por projeto"
            hint="Orçamento por instituição × ano-calendário. Sistema bloqueia submissões que excedam o teto." />
          <div style={{ marginTop: 18 }}>
            {MOCK.costCenters.map(cc => {
              const pct = Math.round((cc.executed / cc.budget) * 100);
              return (
                <div key={cc.id} style={{ padding: '18px 0', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>{cc.code}</div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{cc.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{cc.org}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{fmtBRL(cc.executed)} <span style={{ color: 'var(--fg-muted)', fontSize: 13, fontWeight: 400 }}>/ {fmtBRL(cc.budget)}</span></div>
                      <div style={{ fontSize: 12, color: pct >= 95 ? 'var(--hb-orange-deep)' : 'var(--fg-muted)', fontWeight: 600 }}>
                        {pct}% executado · disponível {fmtBRL(cc.budget - cc.executed)}
                      </div>
                    </div>
                  </div>
                  <div className="budget-bar" style={{ height: 8 }}>
                    <div className={'budget-bar__fill ' + barFillClass(pct)} style={{ width: Math.min(pct, 100) + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'matriz' && (
        <div className="card" style={{ overflow: 'auto' }}>
          <SectionHeader eyebrow="Visão mensal" title="Categoria × mês"
            hint="Distribuição planejada por mês. Edite células para ajustar a curva." />
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table className="tbl" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Categoria</th>
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map(m => (
                    <th key={m} className="num" style={{ width: 76 }}>{m}</th>
                  ))}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {MOCK.budget2026.slice(0, 6).map((b, i) => {
                  const monthlyPlan = b.planned / 12;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{b.cat}</td>
                      {[0,1,2,3,4,5,6,7,8,9,10,11].map(mIdx => {
                        const isPast = mIdx < 5;
                        const cellVal = monthlyPlan * (0.8 + Math.random() * 0.4);
                        return (
                          <td key={mIdx} className="num muted" style={{ background: isPast ? 'rgba(32,44,133,0.04)' : 'transparent', fontSize: 12 }}>
                            {fmtBRLshort(cellVal).replace('R$ ', '')}
                          </td>
                        );
                      })}
                      <td className="num">{fmtBRLshort(b.planned).replace('R$ ', '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

window.ScreenOrcamento = ScreenOrcamento;
