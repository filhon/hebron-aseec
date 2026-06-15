// Importação de extrato (OFX / CSV)
function ScreenImportacao() {
  const [step, setStep] = useState(2); // 1=upload, 2=preview, 3=done
  const [account, setAccount] = useState("acc-1");

  return (
    <div className="page">
      {/* Progress stepper */}
      <div className="card" style={{ marginBottom: 16, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[
            { id: 1, label: "Upload", sub: "OFX ou CSV" },
            { id: 2, label: "Mapeamento", sub: "Validar colunas e contas" },
            { id: 3, label: "Confirmar", sub: "Importar e conciliar" },
          ].map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background:
                      step >= s.id ? "var(--hb-blue)" : "var(--hb-gray-50)",
                    color: step >= s.id ? "white" : "var(--fg-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {step > s.id ? <Icons.Check size={14} /> : s.id}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: step >= s.id ? "var(--fg)" : "var(--fg-muted)",
                    }}
                  >
                    {s.label}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {s.sub}
                  </div>
                </div>
              </div>
              {i < 2 && (
                <div
                  style={{
                    height: 2,
                    flex: 1,
                    background:
                      step > s.id ? "var(--hb-blue)" : "var(--hb-gray-50)",
                    maxWidth: 60,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="card">
          <SectionHeader
            eyebrow="Passo 1"
            title="Selecione o arquivo do extrato"
          />
          <div
            className="dropzone"
            onClick={() => setStep(2)}
            style={{ cursor: "pointer" }}
          >
            <div className="dropzone__icon">
              <Icons.Upload />
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Arraste o arquivo OFX ou CSV aqui
            </div>
            <p
              style={{
                color: "var(--fg-muted)",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              ou clique para selecionar do computador · até 10 MB
            </p>
            <button className="btn btn--primary">Selecionar arquivo</button>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                gap: 24,
                justifyContent: "center",
                fontSize: 12,
                color: "var(--fg-muted)",
              }}
            >
              <span>✓ OFX (Open Financial Exchange)</span>
              <span>✓ CSV (com cabeçalho)</span>
              <span>✓ Excel (.xlsx)</span>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 18,
                gap: 16,
              }}
            >
              <div>
                <div className="eyebrow">Passo 2</div>
                <div className="section-title" style={{ marginTop: 2 }}>
                  Pré-visualização do extrato
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Arquivo: <strong>extrato_itau_2026-05-22.ofx</strong> · 11
                  transações de 14 a 22 de maio
                </div>
              </div>
              <div
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                <div>
                  <label
                    className="eyebrow"
                    style={{ display: "block", marginBottom: 6 }}
                  >
                    Conta de destino
                  </label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--bg)",
                      fontSize: 13,
                      minWidth: 200,
                    }}
                  >
                    {MOCK.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="eyebrow"
                    style={{ display: "block", marginBottom: 6 }}
                  >
                    Conciliação automática
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 18,
                        background: "var(--hb-green)",
                        borderRadius: 999,
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          right: 2,
                          top: 2,
                          width: 14,
                          height: 14,
                          background: "white",
                          borderRadius: "50%",
                        }}
                      />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      Ativada
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  padding: 12,
                  background: "var(--bg-alt)",
                  borderRadius: 10,
                }}
              >
                <div className="eyebrow">Total de linhas</div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  11
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  background: "rgba(161,197,32,0.10)",
                  borderRadius: 10,
                }}
              >
                <div
                  className="eyebrow"
                  style={{ color: "var(--hb-green-deep)" }}
                >
                  Casamento sugerido
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--hb-green-deep)",
                  }}
                >
                  9
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  background: "rgba(234,90,6,0.08)",
                  borderRadius: 10,
                }}
              >
                <div
                  className="eyebrow"
                  style={{ color: "var(--hb-orange-deep)" }}
                >
                  Novos lançamentos
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--hb-orange-deep)",
                  }}
                >
                  2
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  background: "rgba(7,180,231,0.10)",
                  borderRadius: 10,
                }}
              >
                <div
                  className="eyebrow"
                  style={{ color: "var(--hb-cyan-deep)" }}
                >
                  Saldo final
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--hb-cyan-deep)",
                  }}
                >
                  {fmtBRL(487320.45)}
                </div>
              </div>
            </div>

            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Data</th>
                  <th>Descrição</th>
                  <th>Categoria sugerida</th>
                  <th className="num" style={{ width: 130 }}>
                    Valor
                  </th>
                  <th style={{ width: 140 }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {MOCK.bankRows.slice(0, 8).map((b) => {
                  const isNew = !b.matched;
                  return (
                    <tr key={b.id}>
                      <td className="muted">{fmtDate(b.date)}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {b.desc}
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>
                        {b.value > 0
                          ? "1.1 Repasse mensal"
                          : "2.4 Despesas administrativas"}
                        <Icons.Sparkles
                          size={11}
                          color="var(--hb-cyan-deep)"
                          style={{ marginLeft: 4 }}
                        />
                      </td>
                      <td
                        className={
                          "num " + (b.value > 0 ? "num--in" : "num--out")
                        }
                      >
                        {fmtBRL(b.value, { sign: b.value > 0 })}
                      </td>
                      <td>
                        {isNew ? (
                          <span className="pill pill--orange">
                            <span className="pill__dot" />
                            Criar novo
                          </span>
                        ) : (
                          <span className="pill pill--green">
                            <span className="pill__dot" />
                            Casar com #{b.matched}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
          >
            <button className="btn btn--ghost" onClick={() => setStep(1)}>
              ← Voltar
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn--ghost">Salvar como rascunho</button>
              <button className="btn btn--primary" onClick={() => setStep(3)}>
                Importar 11 transações
                <Icons.ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <EmptyState
            icon="Check"
            quote="Onde está o tesouro de cada um, aí estará também o seu coração."
            ref="Mateus 6:21"
            hint="11 transações importadas. 9 conciliações automáticas aplicadas, 2 aguardando revisão manual."
          />
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            <button className="btn btn--ghost" onClick={() => setStep(1)}>
              Importar outro extrato
            </button>
            <button className="btn btn--primary">
              Ir para conciliação
              <Icons.ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

window.ScreenImportacao = ScreenImportacao;
