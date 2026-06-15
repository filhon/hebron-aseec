// Mock data for Documentos module — exposed on window for cross-script use.

const CATEGORIES = [
  {
    id: "editais",
    name: "Editais",
    icon: "scroll",
    children: [
      { id: "editais-anuais", name: "Anuais" },
      { id: "editais-pontuais", name: "Pontuais" },
      { id: "editais-flats", name: "Reserva de flats" },
    ],
  },
  {
    id: "juridico",
    name: "Jurídico",
    icon: "scale",
    children: [
      { id: "juridico-estatuto", name: "Estatuto e atas" },
      { id: "juridico-contratos", name: "Contratos modelo" },
      { id: "juridico-politicas", name: "Políticas internas" },
    ],
  },
  {
    id: "certidoes",
    name: "Certidões",
    icon: "stamp",
    children: [
      { id: "certidoes-federais", name: "Federais" },
      { id: "certidoes-estaduais", name: "Estaduais" },
      { id: "certidoes-municipais", name: "Municipais" },
    ],
  },
  {
    id: "cargos",
    name: "Descrições de cargo",
    icon: "id-card",
    children: [],
  },
  {
    id: "sops",
    name: "Procedimentos operacionais",
    icon: "list-checks",
    children: [
      { id: "sops-financeiro", name: "Financeiro" },
      { id: "sops-projetos", name: "Projetos" },
      { id: "sops-flats", name: "Flats e hospedagem" },
    ],
  },
  {
    id: "fiscal",
    name: "Fiscal e contábil",
    icon: "calculator",
    children: [],
  },
  {
    id: "governanca",
    name: "Governança",
    icon: "landmark",
    children: [],
  },
];

const ROLES = {
  anon: {
    id: "anon",
    label: "Visitante",
    shortLabel: "Visitante",
    visibilities: ["public"],
  },
  submissor: {
    id: "submissor",
    label: "Submissor",
    shortLabel: "Submissor",
    visibilities: ["public", "internal"],
  },
  diretor: {
    id: "diretor",
    label: "Diretor",
    shortLabel: "Diretor",
    visibilities: ["public", "internal", "restricted"],
  },
  super_admin: {
    id: "super_admin",
    label: "Super admin",
    shortLabel: "Super admin",
    visibilities: ["public", "internal", "restricted"],
    editor: true,
  },
};

const VISIBILITY = {
  public: {
    label: "Público",
    description: "Visível para qualquer pessoa, sem cadastro.",
    color: "var(--hb-green)",
    ink: "var(--hb-blue)",
  },
  internal: {
    label: "Interno",
    description: "Requer cadastro aprovado.",
    color: "var(--hb-cyan)",
    ink: "var(--hb-blue)",
  },
  restricted: {
    label: "Restrito",
    description: "Apenas papéis autorizados.",
    color: "var(--hb-orange)",
    ink: "var(--hb-white)",
  },
};

// Mock documents
const DOCUMENTS = [
  {
    id: "d-01",
    slug: "edital-projetos-anuais-2026",
    title: "Edital de Projetos Anuais 2026",
    summary:
      "Diretrizes para submissão de projetos anuais com vigência em janeiro a dezembro de 2026. Inclui janela de submissão, critérios de avaliação e formulário estruturado.",
    category: "editais-anuais",
    visibility: "public",
    type: "edital",
    format: "pdf",
    pages: 18,
    fileSize: "1.2 MB",
    publishedAt: "2025-11-04",
    updatedAt: "2026-01-12",
    version: 3,
    author: "Diretoria Hebron ASEEC",
    downloads: 1248,
    views: 4302,
    tags: ["projetos", "anuais", "2026", "submissão"],
    edital: {
      opensAt: "2026-02-01",
      closesAt: "2026-03-15",
      projectType: "anual",
      projectCategory: "missoes-internacionais",
      status: "open",
    },
    featured: true,
  },
  {
    id: "d-02",
    slug: "edital-projetos-pontuais-permanente",
    title: "Edital de Projetos Pontuais",
    summary:
      "Submissão contínua para projetos pontuais e emergenciais. Avaliação mensal pela diretoria; sem janela fixa.",
    category: "editais-pontuais",
    visibility: "public",
    type: "edital",
    format: "pdf",
    pages: 8,
    fileSize: "612 KB",
    publishedAt: "2024-05-20",
    updatedAt: "2025-08-03",
    version: 5,
    author: "Diretoria Hebron ASEEC",
    downloads: 894,
    views: 2911,
    tags: ["projetos", "pontuais", "emergencial"],
    edital: {
      opensAt: null,
      closesAt: null,
      projectType: "pontual",
      projectCategory: "geral",
      status: "permanent",
    },
    featured: true,
  },
  {
    id: "d-03",
    slug: "edital-reserva-flats-2026-s1",
    title: "Edital de Reserva de Flats — 1º semestre 2026",
    summary:
      "Critérios de elegibilidade, scoring e janela de submissão para reserva nos flats institucionais da Hebron ASEEC.",
    category: "editais-flats",
    visibility: "public",
    type: "edital",
    format: "pdf",
    pages: 6,
    fileSize: "488 KB",
    publishedAt: "2025-12-01",
    updatedAt: "2025-12-01",
    version: 1,
    author: "Diretoria Hebron ASEEC",
    downloads: 312,
    views: 1186,
    tags: ["flats", "hospedagem", "missionários"],
    edital: {
      opensAt: "2025-12-15",
      closesAt: "2026-05-28",
      projectType: null,
      projectCategory: null,
      status: "closing-soon",
    },
    featured: true,
  },
  {
    id: "d-04",
    slug: "estatuto-social-2024",
    title: "Estatuto Social — Hebron ASEEC",
    summary:
      "Documento estatutário aprovado em assembleia geral. Define finalidades, governança e estrutura organizacional.",
    category: "juridico-estatuto",
    visibility: "public",
    type: "document",
    format: "pdf",
    pages: 24,
    fileSize: "1.8 MB",
    publishedAt: "2024-03-12",
    updatedAt: "2024-03-12",
    version: 1,
    author: "Conselho Diretor",
    downloads: 432,
    views: 1820,
    tags: ["estatuto", "governança", "fundacional"],
  },
  {
    id: "d-05",
    slug: "ata-reuniao-mensal-2026-04",
    title: "Ata da reunião mensal — abril/2026",
    summary:
      "Decisões da reunião ordinária da diretoria de 02 de abril de 2026. Inclui homologação de projetos pontuais e revisão orçamentária do trimestre.",
    category: "juridico-estatuto",
    visibility: "internal",
    type: "document",
    format: "markdown",
    pages: null,
    fileSize: "—",
    publishedAt: "2026-04-09",
    updatedAt: "2026-04-09",
    version: 1,
    author: "Filipe Honório (secretário ad hoc)",
    downloads: 18,
    views: 47,
    tags: ["ata", "reunião", "abril-2026"],
    content: "atas",
  },
  {
    id: "d-06",
    slug: "politica-conflito-interesses",
    title: "Política de conflito de interesses",
    summary:
      "Procedimentos para identificação, declaração e tratamento de conflitos de interesse entre diretores, conselheiros e colaboradores.",
    category: "juridico-politicas",
    visibility: "internal",
    type: "document",
    format: "pdf",
    pages: 6,
    fileSize: "412 KB",
    publishedAt: "2024-09-18",
    updatedAt: "2025-06-22",
    version: 2,
    author: "Conselho Diretor",
    downloads: 64,
    views: 188,
    tags: ["governança", "conflito-interesses", "compliance"],
  },
  {
    id: "d-07",
    slug: "politica-protecao-dados-lgpd",
    title: "Política de proteção de dados (LGPD)",
    summary:
      "Compromissos da Hebron ASEEC com a Lei Geral de Proteção de Dados, incluindo bases legais, retenção e direitos do titular.",
    category: "juridico-politicas",
    visibility: "public",
    type: "document",
    format: "markdown",
    pages: null,
    fileSize: "—",
    publishedAt: "2024-08-01",
    updatedAt: "2026-01-30",
    version: 4,
    author: "Departamento Jurídico",
    downloads: 198,
    views: 1422,
    tags: ["lgpd", "privacidade", "dados"],
    content: "lgpd",
  },
  {
    id: "d-08",
    slug: "cnd-receita-federal-2026-04",
    title: "Certidão Negativa de Débitos — Receita Federal",
    summary:
      "Certidão de regularidade fiscal junto à Receita Federal do Brasil. Validade de 180 dias a partir da data de emissão.",
    category: "certidoes-federais",
    visibility: "public",
    type: "document",
    format: "pdf",
    pages: 2,
    fileSize: "182 KB",
    publishedAt: "2026-04-15",
    updatedAt: "2026-04-15",
    version: 1,
    author: "Filipe Honório",
    downloads: 28,
    views: 96,
    tags: ["certidão", "federal", "fiscal", "vigente"],
    validUntil: "2026-10-12",
  },
  {
    id: "d-09",
    slug: "cnd-fgts-2026-03",
    title: "Certidão de regularidade do FGTS",
    summary:
      "Certidão de regularidade junto ao FGTS, emitida pela Caixa Econômica Federal.",
    category: "certidoes-federais",
    visibility: "public",
    type: "document",
    format: "pdf",
    pages: 1,
    fileSize: "96 KB",
    publishedAt: "2026-03-22",
    updatedAt: "2026-03-22",
    version: 1,
    author: "Filipe Honório",
    downloads: 22,
    views: 78,
    tags: ["certidão", "fgts", "vigente"],
    validUntil: "2026-05-21",
  },
  {
    id: "d-10",
    slug: "cargo-diretor-gestor",
    title: "Descrição de cargo — Diretor Gestor",
    summary:
      "Atribuições, designações especiais e fluxo de aprovações do diretor gestor. Inclui rotinas mensais e responsabilidades de governança.",
    category: "cargos",
    visibility: "internal",
    type: "document",
    format: "markdown",
    pages: null,
    fileSize: "—",
    publishedAt: "2025-02-10",
    updatedAt: "2026-02-04",
    version: 3,
    author: "Conselho Diretor",
    downloads: 12,
    views: 88,
    tags: ["cargos", "diretor", "governança"],
    content: "diretor-gestor",
  },
  {
    id: "d-11",
    slug: "cargo-colaborador-financeiro",
    title: "Descrição de cargo — Colaborador Financeiro",
    summary:
      "Responsabilidades operacionais no módulo Financeiro, incluindo conciliação bancária, registro de despesas e suporte ao diretor gestor.",
    category: "cargos",
    visibility: "internal",
    type: "document",
    format: "pdf",
    pages: 4,
    fileSize: "286 KB",
    publishedAt: "2025-07-19",
    updatedAt: "2025-07-19",
    version: 1,
    author: "Departamento de Pessoas",
    downloads: 8,
    views: 41,
    tags: ["cargos", "colaborador", "financeiro"],
  },
  {
    id: "d-12",
    slug: "sop-aprovacao-pagamentos",
    title: "SOP — Aprovação e autorização de pagamentos",
    summary:
      "Procedimento operacional padrão para o fluxo de governança dual: aprovação pelo diretor gestor e autorização pelo diretor autorizador no banco.",
    category: "sops-financeiro",
    visibility: "internal",
    type: "document",
    format: "markdown",
    pages: null,
    fileSize: "—",
    publishedAt: "2025-10-02",
    updatedAt: "2026-03-15",
    version: 4,
    author: "Diretor Gestor",
    downloads: 36,
    views: 192,
    tags: ["sop", "financeiro", "pagamentos", "governança-dual"],
    content: "pagamentos",
  },
  {
    id: "d-13",
    slug: "sop-prestacao-contas-projetos",
    title: "SOP — Prestação de contas de projetos",
    summary:
      "Modelo e cadência de prestação de contas para projetos aprovados. Inclui orientações sobre anexos (notas fiscais, recibos, registros fotográficos).",
    category: "sops-projetos",
    visibility: "public",
    type: "document",
    format: "pdf",
    pages: 10,
    fileSize: "742 KB",
    publishedAt: "2025-08-30",
    updatedAt: "2025-08-30",
    version: 2,
    author: "Diretoria Hebron ASEEC",
    downloads: 312,
    views: 1066,
    tags: ["sop", "projetos", "prestação-de-contas"],
  },
  {
    id: "d-14",
    slug: "sop-checkin-flats",
    title: "SOP — Check-in nos flats institucionais",
    summary:
      "Orientações para hóspedes aprovados sobre check-in presencial, regras de convivência e contato com o porteiro.",
    category: "sops-flats",
    visibility: "public",
    type: "document",
    format: "pdf",
    pages: 5,
    fileSize: "324 KB",
    publishedAt: "2025-11-12",
    updatedAt: "2025-11-12",
    version: 1,
    author: "Equipe de hospitalidade",
    downloads: 84,
    views: 248,
    tags: ["sop", "flats", "hospedagem"],
  },
  {
    id: "d-15",
    slug: "balanco-patrimonial-2025",
    title: "Balanço patrimonial — exercício 2025",
    summary:
      "Demonstrações contábeis do exercício de 2025, com parecer do conselho fiscal e relatório de auditoria independente.",
    category: "fiscal",
    visibility: "public",
    type: "document",
    format: "pdf",
    pages: 32,
    fileSize: "2.4 MB",
    publishedAt: "2026-03-30",
    updatedAt: "2026-03-30",
    version: 1,
    author: "Contabilidade terceirizada",
    downloads: 96,
    views: 432,
    tags: ["balanço", "2025", "contábil", "auditoria"],
  },
  {
    id: "d-16",
    slug: "matriz-decisoes-confidenciais-2026",
    title: "Matriz de decisões confidenciais — 2026",
    summary:
      "Registro restrito das decisões estratégicas da diretoria que envolvem dados sensíveis de parceiros e instituições beneficiárias.",
    category: "governanca",
    visibility: "restricted",
    type: "document",
    format: "markdown",
    pages: null,
    fileSize: "—",
    publishedAt: "2026-01-05",
    updatedAt: "2026-04-22",
    version: 7,
    author: "Diretor Gestor",
    downloads: 4,
    views: 28,
    tags: ["governança", "confidencial", "estratégia"],
    content: "matriz",
  },
];

// Version history for the featured edital (d-01)
const VERSION_HISTORY = {
  "d-01": [
    {
      version: 3,
      date: "2026-01-12",
      author: "Diretoria Hebron ASEEC",
      summary:
        "Atualização do cronograma e inclusão de novo critério de avaliação (impacto regional).",
      changes: [
        {
          type: "edit",
          section: "Cronograma de submissão",
          note: "Janela ajustada para 01/fev–15/mar.",
        },
        {
          type: "add",
          section: "Critérios de avaliação",
          note: "Novo critério: impacto regional (peso 10%).",
        },
        {
          type: "edit",
          section: "Anexos obrigatórios",
          note: "Carta de recomendação passou a ser opcional.",
        },
      ],
      current: true,
    },
    {
      version: 2,
      date: "2025-12-08",
      author: "Filipe Honório",
      summary:
        "Revisão ortográfica e ajustes de formatação após retorno da diretoria.",
      changes: [
        {
          type: "edit",
          section: "Geral",
          note: "Correções tipográficas e padronização de capitalização.",
        },
      ],
    },
    {
      version: 1,
      date: "2025-11-04",
      author: "Diretoria Hebron ASEEC",
      summary: "Publicação inicial do edital para o ciclo 2026.",
      changes: [
        {
          type: "add",
          section: "Documento",
          note: "Versão inicial publicada.",
        },
      ],
    },
  ],
};

// Long-form Markdown bodies (rendered as HTML)
const DOC_CONTENT = {
  atas: `
    <h2>Reunião mensal da diretoria — abril/2026</h2>
    <p class="meta">Data: 02 de abril de 2026 · Local: sede Hebron ASEEC · Presidência: Pres. Josimar Henrique</p>
    <h3>Presentes</h3>
    <p>Diretores: Josimar Henrique, Giseli Henrique, Filipe Honório, Marcos Andrade, Letícia Pires, Ronaldo Lima, Tatiana Souza. Conselheiros: Pr. Eduardo Tavares, Sra. Helena Castro.</p>
    <h3>Pauta</h3>
    <ol>
      <li>Homologação de projetos pontuais aprovados em março</li>
      <li>Revisão orçamentária do 1º trimestre</li>
      <li>Designações para o ciclo de avaliação de projetos anuais 2026</li>
      <li>Comunicações da presidência</li>
    </ol>
    <h3>Decisões registradas</h3>
    <p><strong>1. Homologação:</strong> Aprovados, sem contestação, os projetos pontuais nº 2026.014, 2026.015 e 2026.017. O projeto 2026.016 retornou para nova votação na reunião extraordinária de 16/abr.</p>
    <p><strong>2. Orçamento:</strong> Execução do trimestre em <strong>R$ 1.842.310</strong>, equivalente a 24,8% do orçamento anual aprovado. Saldo disponível compatível com a projeção de pagamentos do 2º trimestre.</p>
    <p><strong>3. Designações:</strong> O conselho consultivo designou os diretores Marcos Andrade, Letícia Pires e Tatiana Souza como avaliadores principais para o ciclo 2026. A sugestão automática do sistema foi aceita integralmente.</p>
    <h3>Encaminhamentos</h3>
    <ul>
      <li>Filipe Honório registrará as decisões no módulo Projetos até 04/abr.</li>
      <li>Reunião extraordinária convocada para 16/abr para tratar o projeto 2026.016.</li>
      <li>Próxima reunião ordinária: 07 de maio de 2026.</li>
    </ul>
  `,
  lgpd: `
    <h2>Política de proteção de dados pessoais</h2>
    <p class="meta">Vigência a partir de 01 de agosto de 2024 · Última revisão: 30 de janeiro de 2026</p>
    <p>A Hebron ASEEC tem o compromisso de tratar dados pessoais com responsabilidade, transparência e fundamento em base legal adequada. Esta política descreve como coletamos, usamos, armazenamos e protegemos os dados que nos são confiados por submissores, beneficiários, colaboradores e parceiros.</p>

    <h3>1. Princípios</h3>
    <p>Atuamos em conformidade com a Lei nº 13.709/2018 (LGPD) e adotamos os princípios de finalidade, adequação, necessidade, livre acesso, qualidade dos dados, transparência, segurança, prevenção, não discriminação, responsabilização e prestação de contas.</p>

    <h3>2. Dados que tratamos</h3>
    <ul>
      <li><strong>Dados de identificação:</strong> nome, CPF, e-mail, telefone, endereço.</li>
      <li><strong>Dados ministeriais:</strong> instituição, função, tempo de ministério, localização de atuação.</li>
      <li><strong>Dados financeiros:</strong> conta bancária para repasse, quando aplicável.</li>
      <li><strong>Dados sensíveis:</strong> apenas com consentimento expresso e finalidade específica.</li>
    </ul>

    <h3>3. Direitos do titular</h3>
    <p>Você pode, a qualquer momento, acessar, corrigir, anonimizar, bloquear ou eliminar seus dados pessoais, bem como portá-los a outro fornecedor. As solicitações devem ser feitas pelo canal <em>privacidade@hebronaseec.com.br</em> e serão respondidas em até 15 dias.</p>

    <h3>4. Retenção</h3>
    <p>Os dados de submissores são mantidos pelo prazo necessário ao cumprimento das obrigações legais e da relação institucional. Após esse período, os registros são anonimizados ou eliminados de forma segura.</p>

    <h3>5. Encarregado de dados (DPO)</h3>
    <p>O encarregado pelo tratamento dos dados pessoais na Hebron ASEEC pode ser contatado pelo e-mail <em>dpo@hebronaseec.com.br</em>.</p>
  `,
  "diretor-gestor": `
    <h2>Descrição de cargo — Diretor Gestor</h2>
    <p class="meta">Atualizado em 04 de fevereiro de 2026 · Versão 3</p>
    <p>O diretor gestor é a figura central da governança operacional da Hebron ASEEC. Não se trata de um papel hierárquico distinto, mas de uma <strong>designação</strong> atribuída a um dos membros do conselho diretor para conduzir o ciclo mensal de aprovações, presidir reuniões ordinárias e registrar decisões pontuais.</p>

    <h3>Atribuições mensais</h3>
    <ul>
      <li>Aprovar a primeira camada de pagamentos lote a lote (aprovação ≠ autorização).</li>
      <li>Presidir a reunião mensal ordinária da diretoria.</li>
      <li>Registrar, no módulo Projetos, as decisões consensuais sobre projetos pontuais.</li>
      <li>Aprovar reservas de flats com base no scoring automático e nos conflitos de calendário.</li>
    </ul>

    <h3>Atribuições eventuais</h3>
    <ul>
      <li>Convocar reuniões extraordinárias quando necessário.</li>
      <li>Acionar o "botão de pânico" em situações de impasse em votação estendida (maioria + 1 dos votos existentes).</li>
      <li>Mediar contestações no período de homologação de projetos anuais.</li>
    </ul>

    <h3>Princípio inviolável</h3>
    <p>O diretor gestor <strong>nunca</strong> autoriza pagamentos no banco — essa responsabilidade é, por desenho, do diretor autorizador. Esta separação é a primeira linha da governança dual da Hebron ASEEC.</p>
  `,
  pagamentos: `
    <h2>Aprovação e autorização de pagamentos</h2>
    <p class="meta">Procedimento operacional padrão · v4 · revisado em 15/mar/2026</p>
    <p>Este SOP descreve o fluxo dual de governança financeira da Hebron ASEEC. A regra é inviolável: a pessoa que <strong>aprova</strong> nunca pode ser a mesma que <strong>autoriza</strong> no banco. Duas pessoas, duas camadas — sempre.</p>

    <h3>Etapas</h3>
    <ol>
      <li>Sistema agrupa pagamentos automaticamente por semana, gerando lotes.</li>
      <li>Email de lote enviado para o diretor gestor (com cópia para o diretor autorizador).</li>
      <li>Diretor gestor <strong>aprova</strong> o lote no módulo Financeiro (1ª camada).</li>
      <li>Super_admin inclui os pagamentos aprovados no banco.</li>
      <li>Super_admin avisa o diretor autorizador via WhatsApp (fora do sistema).</li>
      <li>Diretor autorizador <strong>autoriza</strong> os pagamentos no banco (2ª camada).</li>
      <li>Super_admin marca os pagamentos como "pago" no sistema, fechando o ciclo.</li>
    </ol>

    <h3>Designações</h3>
    <p>As designações de diretor gestor e diretor autorizador são configuradas no Admin e podem ser rotacionadas. O conflito de funções é checado pelo sistema: nenhum diretor pode acumular as duas designações simultaneamente.</p>

    <h3>Exceções</h3>
    <p>Pagamentos urgentes (acima de R$ 50.000 ou com prazo inferior a 48h) seguem o mesmo fluxo, porém com priorização e notificação imediata por SMS interno aos envolvidos.</p>
  `,
  matriz: `
    <h2>Matriz de decisões confidenciais — 2026</h2>
    <p class="meta">Restrito · Versão 7 · revisado em 22/abr/2026</p>
    <p>Este documento consolida decisões estratégicas que envolvem partes externas, parcerias em negociação ou dados sensíveis. O acesso é restrito a super_admins, diretores e conselheiros mediante registro no audit log.</p>
    <p class="meta">⤺ Os blocos abaixo são tarjados intencionalmente nesta visualização de prototipagem.</p>

    <h3>Bloco I — Parcerias em negociação</h3>
    <p class="redacted">▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒</p>

    <h3>Bloco II — Instituições em revisão de elegibilidade</h3>
    <p class="redacted">▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒</p>
  `,
};

// Bible verses for empty states (BRAIN.md insists)
const VERSES = {
  empty: {
    ref: "Provérbios 25:11",
    text: "Como maçãs de ouro em salvas de prata, assim é a palavra dita a seu tempo.",
  },
  search: {
    ref: "Mateus 7:7",
    text: "Pedi, e dar-se-vos-á; buscai, e encontrareis.",
  },
  archive: {
    ref: "Lucas 12:34",
    text: "Onde estiver o vosso tesouro, aí estará também o vosso coração.",
  },
};

// Expose
Object.assign(window, {
  CATEGORIES,
  ROLES,
  VISIBILITY,
  DOCUMENTS,
  VERSION_HISTORY,
  DOC_CONTENT,
  VERSES,
});
