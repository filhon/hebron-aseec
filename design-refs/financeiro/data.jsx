// Mock data — Financeiro module
// All currency in BRL; dates as ISO strings.

const accounts = [
  { id: 'acc-1', name: 'Itaú • Conta Principal', bank: 'Itaú', short: 'IT', color: '#EC7000', balance: 487_320.45, last: 'há 12 minutos' },
  { id: 'acc-2', name: 'Santander • Reserva', bank: 'Santander', short: 'ST', color: '#EC0000', balance: 152_904.12, last: 'há 2 horas' },
  { id: 'acc-3', name: 'Caixa Econômica • Projetos', bank: 'Caixa', short: 'CX', color: '#0E5099', balance: 38_672.80, last: 'há 1 dia' },
];

const costCenters = [
  { id: 'cc-1', code: 'CC-2025-001', name: 'Missão Sertão Vivo', org: 'Igreja Presbiteriana de Caruaru', budget: 96000, executed: 64200 },
  { id: 'cc-2', code: 'CC-2025-002', name: 'Capacitação Pastoral Norte', org: 'Seminário Teológico Manaus', budget: 48000, executed: 12000 },
  { id: 'cc-3', code: 'CC-2025-003', name: 'Aldeia Yanomami — Saúde', org: 'Missão UPA', budget: 72000, executed: 60000 },
  { id: 'cc-4', code: 'CC-2025-004', name: 'Apoio à Capelania Carcerária', org: 'Pastoral Carcerária RJ', budget: 24000, executed: 22800 },
  { id: 'cc-5', code: 'CC-2025-005', name: 'Reforma — Sede Joinville', org: 'Igreja Hebron Joinville', budget: 35000, executed: 8500 },
];

// Plano de contas hierárquico
const categories = [
  { code: '1', name: 'Receitas', children: [
    { code: '1.1', name: 'Hebron Farmacêutica — Repasse mensal' },
    { code: '1.2', name: 'Aluguel de imóveis', children: [
      { code: '1.2.1', name: 'Sala comercial Boa Viagem' },
      { code: '1.2.2', name: 'Apartamento Itamaracá' },
    ] },
    { code: '1.3', name: 'Doações pessoais — diretoria/conselho' },
    { code: '1.4', name: 'Rendimentos financeiros' },
  ] },
  { code: '2', name: 'Despesas Operacionais', children: [
    { code: '2.1', name: 'Folha de pagamento', children: [
      { code: '2.1.1', name: 'Salários' },
      { code: '2.1.2', name: 'Encargos sociais' },
      { code: '2.1.3', name: 'Benefícios' },
    ] },
    { code: '2.2', name: 'Contas de consumo', children: [
      { code: '2.2.1', name: 'Energia elétrica' },
      { code: '2.2.2', name: 'Água e esgoto' },
      { code: '2.2.3', name: 'Internet e telefonia' },
    ] },
    { code: '2.3', name: 'Serviços terceirizados', children: [
      { code: '2.3.1', name: 'Contabilidade' },
      { code: '2.3.2', name: 'Jurídico' },
      { code: '2.3.3', name: 'TI e licenças de software' },
    ] },
    { code: '2.4', name: 'Despesas administrativas' },
  ] },
  { code: '3', name: 'Despesas Missionárias', children: [
    { code: '3.1', name: 'Repasses a projetos aprovados' },
    { code: '3.2', name: 'Apoio a missionários' },
    { code: '3.3', name: 'Capacitação e materiais' },
    { code: '3.4', name: 'Hospedagem nos flats' },
    { code: '3.5', name: 'Auxílio transporte (flat)' },
  ] },
  { code: '4', name: 'Tributos e taxas', children: [
    { code: '4.1', name: 'IPTU' },
    { code: '4.2', name: 'Taxas bancárias' },
  ] },
];

// Lançamentos (transações já efetivadas)
const transactions = [
  { id: 't-1', date: '2026-05-22', desc: 'Repasse — Missão Sertão Vivo (Parcela 5/12)', cat: '3.1 Repasses a projetos', cc: 'CC-2025-001', acct: 'acc-1', value: -8000, status: 'pago', attach: true },
  { id: 't-2', date: '2026-05-22', desc: 'Hebron Farmacêutica — Repasse mensal', cat: '1.1 Repasse mensal', cc: null, acct: 'acc-1', value: 145000, status: 'conciliado', attach: true },
  { id: 't-3', date: '2026-05-21', desc: 'Folha — Maio/2026', cat: '2.1.1 Salários', cc: null, acct: 'acc-1', value: -42830.50, status: 'pago', attach: true },
  { id: 't-4', date: '2026-05-21', desc: 'Encargos — INSS Maio', cat: '2.1.2 Encargos sociais', cc: null, acct: 'acc-1', value: -11920.16, status: 'pago', attach: false },
  { id: 't-5', date: '2026-05-20', desc: 'Capelania Carcerária — Parcela 11/12', cat: '3.1 Repasses a projetos', cc: 'CC-2025-004', acct: 'acc-3', value: -2000, status: 'pago', attach: true },
  { id: 't-6', date: '2026-05-19', desc: 'Aluguel — Sala comercial Boa Viagem', cat: '1.2.1 Sala comercial', cc: null, acct: 'acc-2', value: 4200, status: 'conciliado', attach: false },
  { id: 't-7', date: '2026-05-18', desc: 'Reembolso — Pst. Edilson (viagem Manaus)', cat: '3.2 Apoio a missionários', cc: 'CC-2025-002', acct: 'acc-1', value: -1840.25, status: 'pago', attach: true },
  { id: 't-8', date: '2026-05-17', desc: 'Energia elétrica — sede', cat: '2.2.1 Energia elétrica', cc: null, acct: 'acc-1', value: -1342.80, status: 'pago', attach: true },
  { id: 't-9', date: '2026-05-15', desc: 'Contabilidade — Maio', cat: '2.3.1 Contabilidade', cc: null, acct: 'acc-1', value: -3500, status: 'pago', attach: true },
  { id: 't-10', date: '2026-05-15', desc: 'Aldeia Yanomami — Parcela 5/6', cat: '3.1 Repasses a projetos', cc: 'CC-2025-003', acct: 'acc-3', value: -10000, status: 'pago', attach: true },
  { id: 't-11', date: '2026-05-14', desc: 'Doação — Pba. Giseli Henrique', cat: '1.3 Doações diretoria', cc: null, acct: 'acc-1', value: 2500, status: 'conciliado', attach: false },
  { id: 't-12', date: '2026-05-12', desc: 'Internet — fibra Vivo', cat: '2.2.3 Internet/telefonia', cc: null, acct: 'acc-1', value: -480, status: 'pago', attach: true },
];

// Contas a pagar (payables) — fluxo de governança dual
const payables = [
  { id: 'p-1', desc: 'Repasse — Missão Sertão Vivo (6/12)', cat: '3.1 Repasses a projetos', cc: 'CC-2025-001', value: 8000, due: '2026-05-31', status: 'pendente', batch: 'L-2026-22', source: 'projeto' },
  { id: 'p-2', desc: 'Repasse — Capacitação Pastoral Norte (3/12)', cat: '3.1 Repasses a projetos', cc: 'CC-2025-002', value: 4000, due: '2026-05-31', status: 'pendente', batch: 'L-2026-22', source: 'projeto' },
  { id: 'p-3', desc: 'Repasse — Reforma Sede Joinville (1/4)', cat: '3.1 Repasses a projetos', cc: 'CC-2025-005', value: 8750, due: '2026-05-31', status: 'pendente', batch: 'L-2026-22', source: 'projeto' },
  { id: 'p-4', desc: 'Folha — Junho/2026 (parcial)', cat: '2.1.1 Salários', cc: null, value: 42830.50, due: '2026-06-05', status: 'pendente', batch: 'L-2026-22', source: 'recorrente' },
  { id: 'p-5', desc: 'Aluguel — Apartamento Itamaracá', cat: '4.1 IPTU', cc: null, value: 1480, due: '2026-05-28', status: 'aprovado', batch: 'L-2026-21', source: 'recorrente', approvedBy: 'Pr. Cláudio Brito', approvedAt: '2026-05-20' },
  { id: 'p-6', desc: 'Apoio Capelania Carcerária (12/12)', cat: '3.1 Repasses a projetos', cc: 'CC-2025-004', value: 2000, due: '2026-05-31', status: 'aprovado', batch: 'L-2026-21', source: 'projeto', approvedBy: 'Pr. Cláudio Brito', approvedAt: '2026-05-20' },
  { id: 'p-7', desc: 'Contabilidade — Junho', cat: '2.3.1 Contabilidade', cc: null, value: 3500, due: '2026-06-10', status: 'autorizado', batch: 'L-2026-20', source: 'recorrente', approvedBy: 'Pr. Cláudio Brito', approvedAt: '2026-05-13', authorizedBy: 'Dr. Reginaldo Tavares', authorizedAt: '2026-05-15' },
  { id: 'p-8', desc: 'Licença Microsoft 365', cat: '2.3.3 TI e software', cc: null, value: 1230.80, due: '2026-06-02', status: 'autorizado', batch: 'L-2026-20', source: 'recorrente', approvedBy: 'Pr. Cláudio Brito', approvedAt: '2026-05-13', authorizedBy: 'Dr. Reginaldo Tavares', authorizedAt: '2026-05-15' },
  { id: 'p-9', desc: 'IPTU — Sede Recife', cat: '4.1 IPTU', cc: null, value: 6420, due: '2026-06-15', status: 'pendente', batch: 'L-2026-22', source: 'recorrente' },
];

// Extrato bancário (importado, ainda não totalmente conciliado)
const bankRows = [
  { id: 'b-1', date: '2026-05-22', desc: 'TED REC HEBRON FARMACEUTICA LTDA', value: 145000, matched: 't-2' },
  { id: 'b-2', date: '2026-05-22', desc: 'PIX ENV IGREJA PRESB CARUARU', value: -8000, matched: 't-1' },
  { id: 'b-3', date: '2026-05-21', desc: 'FOLHA PAG FUNCIONARIOS REC 005', value: -42830.50, matched: 't-3' },
  { id: 'b-4', date: '2026-05-21', desc: 'GPS INSS RECOLHIMENTO', value: -11920.16, matched: 't-4' },
  { id: 'b-5', date: '2026-05-19', desc: 'TED REC ALUGUEL IMOVEL BV', value: 4200, matched: 't-6' },
  { id: 'b-6', date: '2026-05-18', desc: 'PIX ENV EDILSON FERREIRA', value: -1840.25, matched: 't-7' },
  { id: 'b-7', date: '2026-05-17', desc: 'CELPE ENERGIA SA — DEB AUT', value: -1342.80, matched: 't-8' },
  { id: 'b-8', date: '2026-05-16', desc: 'TARIFA MENSAL CONTA CORRENTE', value: -89.90, matched: null, suggest: null },
  { id: 'b-9', date: '2026-05-15', desc: 'PIX REC GISELI A HENRIQUE', value: 2500, matched: 't-11' },
  { id: 'b-10', date: '2026-05-15', desc: 'PIX ENV CONT CARNEIRO MOREIRA', value: -3500, matched: 't-9', suggested: true },
  { id: 'b-11', date: '2026-05-14', desc: 'PIX REC ANONIMO', value: 350, matched: null, suggest: null },
];

// Orçamento — visão por categoria, ano 2026
const budget2026 = [
  { cat: '3.1 Repasses a projetos', planned: 720000, executed: 312500, pct: 43 },
  { cat: '2.1 Folha de pagamento', planned: 660000, executed: 268504, pct: 41 },
  { cat: '2.3 Serviços terceirizados', planned: 96000, executed: 38500, pct: 40 },
  { cat: '2.2 Contas de consumo', planned: 42000, executed: 18900, pct: 45 },
  { cat: '3.2 Apoio a missionários', planned: 84000, executed: 41200, pct: 49 },
  { cat: '3.4 Hospedagem nos flats', planned: 18000, executed: 14200, pct: 79 },
  { cat: '4.1 IPTU e taxas', planned: 22000, executed: 22000, pct: 100 },
  { cat: '2.4 Despesas administrativas', planned: 36000, executed: 9420, pct: 26 },
];

// Cash flow (data points por dia) — projeção para os próximos 30 dias
const cashFlow30 = (() => {
  const base = 487320;
  const pts = [];
  let v = base;
  for (let i = 0; i < 31; i++) {
    // semi-realistic walk with monthly inflow on day 5
    const noise = (Math.sin(i * 0.4) * 4200) + (Math.random() * 1800 - 900);
    v += noise - 3200;
    if (i === 5) v += 145000;
    if (i === 10) v -= 42830;
    if (i === 14) v -= 28000;
    pts.push({ i, v: Math.max(0, v) });
  }
  return pts;
})();

window.MOCK = {
  accounts, costCenters, categories, transactions, payables, bankRows, budget2026, cashFlow30,
  user: { name: 'Filipe Honório', role: 'super_admin', initials: 'FH' },
  director: { name: 'Pr. Cláudio Brito', role: 'Diretor Gestor' },
  authorizer: { name: 'Dr. Reginaldo Tavares', role: 'Diretor Autorizador' },
};

// helpers
window.fmtBRL = (n, opts = {}) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : (opts.sign ? '+' : '');
  return sign + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
window.fmtBRLshort = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n < 0 ? '−' : '') + 'R$ ' + (abs/1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k';
  return window.fmtBRL(n);
};
window.fmtDate = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
};
window.fmtDateLong = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};
