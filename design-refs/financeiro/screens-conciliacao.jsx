// Conciliação bancária — split view: extrato bancário × lançamentos do sistema
function ScreenConciliacao() {
  const [selectedBank, setSelectedBank] = useState(null); // banco row id
  const [matches, setMatches] = useState(() => {
    // initial matches from mock
    const m = {};
    MOCK.bankRows.forEach((b) => {
      if (b.matched) m[b.id] = b.matched;
    });
    return m;
  });

  const matchedCount = Object.keys(matches).length;
  const total = MOCK.bankRows.length;
  const unmatched = MOCK.bankRows.filter((b) => !matches[b.id]);
  const pct = Math.round((matchedCount / total) * 100);

  // Lançamentos do sistema for matching (un-matched transactions + already matched)
  const sysRows = MOCK.transactions;
  const matchedSysIds = new Set(Object.values(matches));

  // Suggestions for selected bank row
  const selectedBankRow = MOCK.bankRows.find((b) => b.id === selectedBank);
  const suggestion = selectedBankRow
    ? (() => {
        if (selectedBankRow.matched) return null;
        // try to find a system tx with same value
        return sysRows.find(
          (t) =>
            !matchedSysIds.has(t.id) &&
            Math.abs(t.value - selectedBankRow.value) < 0.01,
        );
      })()
    : null;

  const acceptMatch = (bankId, sysId) => {
    setMatches((prev) => ({ ...prev, [bankId]: sysId }));
    setSelectedBank(null);
  };

  return (
    <div className="page">
      {/* Header strip */}
      <div className="card" style={{ marginBottom: 16, padding: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#EC7000",
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              IT
            </span>
            <div>
              <div className="eyebrow">Conta · Itaú</div>
              <div className="section-title">
                Conta Principal · ag 0024 / cc 31784-0
              </div>
            </div>
          </div>
          <div style={{ height: 36, width: 1, background: "var(--border)" }} />
          <div>
            <div className="eyebrow">Período do extrato</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              14 a 22 de maio · 2026
            </div>
          </div>
          <div style={{ height: 36, width: 1, background: "var(--border)" }} />
          <div>
            <div className="eyebrow">Importado</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              22/05 às 14:32 · OFX
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div className="eyebrow">Progresso</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--hb-blue)",
                }}
              >
                {matchedCount}/{total}{" "}
                <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                  conciliados
                </span>
              </div>
            </div>
            <div style={{ position: "relative", width: 60, height: 60 }}>
              <svg width="60" height="60">
                <circle
                  cx="30"
                  cy="30"
                  r="24"
                  fill="none"
                  stroke="var(--hb-gray-50)"
                  strokeWidth="6"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="24"
                  fill="none"
                  stroke="var(--hb-green)"
                  strokeWidth="6"
                  strokeDasharray={`${(pct / 100) * 150.8} 150.8`}
                  strokeLinecap="round"
                  transform="rotate(-90 30 30)"
                />
                <text
                  x="30"
                  y="35"
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="var(--fg)"
                  fontFamily="var(--font-display)"
                >
                  {pct}%
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Mini explainer */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 14,
          padding: 12,
          background: "rgba(7,180,231,0.08)",
          borderRadius: 10,
          border: "1px solid rgba(7,180,231,0.2)",
        }}
      >
        <Icons.Sparkles size={16} color="var(--hb-cyan-deep)" />
        <div style={{ fontSize: 13, color: "var(--fg)" }}>
          <strong>Sugestões automáticas</strong> · {unmatched.length} linhas
          pendentes. O sistema casa valor + data + descrição com lançamentos já
          registrados.
        </div>
        <button
          className="btn btn--ghost btn--sm"
          style={{ marginLeft: "auto" }}
        >
          Aceitar todas as sugestões
        </button>
      </div>

      {/* Split view */}
      <div className="recon-grid">
        {/* Extrato bancário */}
        <div className="card" style={{ padding: 0 }}>
          <div className="recon-col__header">
            <div>
              <div className="eyebrow">Extrato bancário</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {total} linhas importadas
              </div>
            </div>
            <button className="btn btn--ghost btn--sm">
              <Icons.Upload size={12} />
              Re-importar OFX
            </button>
          </div>
          <div style={{ maxHeight: 520, overflow: "auto" }}>
            {MOCK.bankRows.map((b) => {
              const isMatched = !!matches[b.id];
              const isSelected = selectedBank === b.id;
              return (
                <div
                  key={b.id}
                  className={
                    "recon-row " +
                    (isMatched ? "is-matched" : "") +
                    (isSelected ? " is-selected" : "")
                  }
                  onClick={() => setSelectedBank(b.id)}
                >
                  <span className="date">{fmtDate(b.date)}</span>
                  <div className="desc">
                    <div className="t">{b.desc}</div>
                    <div className="s">
                      {isMatched ? (
                        <span
                          style={{
                            color: "var(--hb-green-deep)",
                            fontWeight: 600,
                          }}
                        >
                          <Icons.Check size={10} /> casado
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "var(--hb-orange-deep)",
                            fontWeight: 600,
                          }}
                        >
                          ● pendente
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={"val " + (b.value > 0 ? "in" : "out")}>
                    {fmtBRL(b.value, { sign: b.value > 0 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lançamentos do sistema */}
        <div className="card" style={{ padding: 0 }}>
          <div className="recon-col__header">
            <div>
              <div className="eyebrow">Lançamentos do sistema</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {sysRows.length} no período
              </div>
            </div>
            <button className="btn btn--ghost btn--sm">
              <Icons.Plus size={12} />
              Criar lançamento
            </button>
          </div>

          {selectedBank &&
            selectedBankRow &&
            !matches[selectedBank] &&
            suggestion && (
              <div
                style={{
                  padding: 14,
                  background: "rgba(161,197,32,0.12)",
                  borderBottom: "1px solid var(--divider)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      className="eyebrow"
                      style={{ color: "var(--hb-green-deep)", marginBottom: 4 }}
                    >
                      <Icons.Sparkles size={11} /> Sugestão para "
                      {selectedBankRow.desc}"
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {suggestion.desc}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {suggestion.cat} · {fmtDate(suggestion.date)} ·{" "}
                      {fmtBRL(suggestion.value)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn--ghost btn--sm">
                      <Icons.X size={12} />
                    </button>
                    <button
                      className="btn btn--green btn--sm"
                      onClick={() => acceptMatch(selectedBank, suggestion.id)}
                    >
                      <Icons.Check size={12} />
                      Casar
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                  Confiança: valor idêntico, data próxima, descrição compatível
                </div>
              </div>
            )}

          <div style={{ maxHeight: 520, overflow: "auto" }}>
            {sysRows.map((t) => {
              const isMatched = matchedSysIds.has(t.id);
              return (
                <div
                  key={t.id}
                  className={"recon-row " + (isMatched ? "is-matched" : "")}
                >
                  <span className="date">{fmtDate(t.date)}</span>
                  <div className="desc">
                    <div className="t">{t.desc}</div>
                    <div className="s">{t.cat}</div>
                  </div>
                  <span className={"val " + (t.value > 0 ? "in" : "out")}>
                    {fmtBRL(t.value, { sign: t.value > 0 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {unmatched.length === 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <EmptyState
            icon="Check"
            quote="Tudo o que fizerdes, fazei-o de coração, como ao Senhor, e não aos homens."
            ref="Colossenses 3:23"
            hint="Conciliação completa para o período. Bom trabalho!"
          />
        </div>
      )}
    </div>
  );
}

window.ScreenConciliacao = ScreenConciliacao;
