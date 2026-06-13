import type {
  Category,
  Document,
  DocumentVersion,
  Edital,
  Tag,
} from "@hebron/types/documentos";

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tag2024: Tag = {
  id: "tag-1",
  name: "2024",
  slug: "2024",
  color: "#6B7280",
};
export const tag2025: Tag = {
  id: "tag-2",
  name: "2025",
  slug: "2025",
  color: "#6B7280",
};
export const tag2026: Tag = {
  id: "tag-3",
  name: "2026",
  slug: "2026",
  color: "#6B7280",
};
export const tagUrgente: Tag = {
  id: "tag-4",
  name: "Urgente",
  slug: "urgente",
  color: "#EF4444",
};
export const tagRH: Tag = {
  id: "tag-5",
  name: "RH",
  slug: "rh",
  color: "#8B5CF6",
};
export const tagProjetosSociais: Tag = {
  id: "tag-6",
  name: "Projetos Sociais",
  slug: "projetos-sociais",
  color: "#10B981",
};
export const tagMissionario: Tag = {
  id: "tag-7",
  name: "Missionário",
  slug: "missionario",
  color: "#EA5A06",
};

export const mockTags: Tag[] = [
  tag2024,
  tag2025,
  tag2026,
  tagUrgente,
  tagRH,
  tagProjetosSociais,
  tagMissionario,
];

// ─── Categories ───────────────────────────────────────────────────────────────

const catJuridico: Category = {
  id: "cat-1",
  name: "Jurídico e Legal",
  slug: "juridico-legal",
  description: "Documentos estatutários, atas e certidões institucionais",
  parentId: null,
  children: [],
  documentCount: 4,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
};

const catFiscal: Category = {
  id: "cat-2",
  name: "Fiscal e Contábil",
  slug: "fiscal-contabil",
  description: "Notas fiscais, balanços e relatórios financeiros",
  parentId: null,
  children: [],
  documentCount: 3,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
};

const catRH: Category = {
  id: "cat-3",
  name: "Recursos Humanos",
  slug: "recursos-humanos",
  description:
    "Descrições de cargo, políticas de pessoal e manuais de colaboradores",
  parentId: null,
  children: [],
  documentCount: 4,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
};

const catEditais: Category = {
  id: "cat-4",
  name: "Editais e Chamadas",
  slug: "editais-chamadas",
  description: "Editais de projetos, chamadas de auxílio e oportunidades",
  parentId: null,
  children: [],
  documentCount: 4,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
};

const catProcedimentos: Category = {
  id: "cat-5",
  name: "Procedimentos Internos",
  slug: "procedimentos-internos",
  description: "SOPs, fluxos de trabalho e manuais operacionais",
  parentId: null,
  children: [],
  documentCount: 3,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
};

const catComunicacao: Category = {
  id: "cat-6",
  name: "Comunicações e Relatórios",
  slug: "comunicacoes-relatorios",
  description:
    "Relatórios de atividades, impacto social e comunicados oficiais",
  parentId: null,
  children: [],
  documentCount: 3,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
};

export const mockCategories: Category[] = [
  catJuridico,
  catFiscal,
  catRH,
  catEditais,
  catProcedimentos,
  catComunicacao,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeVersion(
  id: string,
  documentId: string,
  version: number,
  fileSizeBytes: number,
  publishedAt: Date,
): DocumentVersion {
  return {
    id,
    documentId,
    version,
    storageKey: `documents/${documentId}/v${version}.pdf`,
    fileSizeBytes,
    mimeType: "application/pdf",
    notes: version === 1 ? "Versão inicial" : `Revisão ${version}`,
    publishedBy: "user-admin-1",
    publishedAt,
  };
}

type PartialDoc = Omit<
  Document,
  | "currentVersion"
  | "deletedAt"
  | "publishedBy"
  | "publishedAt"
  | "currentVersionId"
> & {
  publishedAt?: Date;
  fileSizeBytes?: number;
};

function makeDoc(partial: PartialDoc): Document {
  const version = makeVersion(
    `${partial.id}-v1`,
    partial.id,
    1,
    partial.fileSizeBytes ?? 1_200_000,
    partial.createdAt,
  );
  return {
    ...partial,
    currentVersionId: version.id,
    currentVersion: version,
    publishedBy: "user-admin-1",
    publishedAt: partial.publishedAt ?? partial.createdAt,
    deletedAt: null,
  };
}

// ─── Documents ────────────────────────────────────────────────────────────────

export const mockDocuments: Document[] = [
  makeDoc({
    id: "doc-1",
    title: "Estatuto Social da Hebron Aseec",
    slug: "estatuto-social-hebron-aseec",
    description:
      "Documento constitutivo da associação, com fins, objetivos e estrutura de governança.",
    type: "legal",
    visibility: "internal",
    status: "published",
    categoryId: "cat-1",
    category: catJuridico,
    tags: [tag2024],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2025-03-10"),
    fileSizeBytes: 870_000,
  }),
  makeDoc({
    id: "doc-2",
    title: "Ata da Assembleia Geral 2025",
    slug: "ata-assembleia-geral-2025",
    description:
      "Registro das deliberações e votações da Assembleia Geral Ordinária de 2025.",
    type: "legal",
    visibility: "internal",
    status: "published",
    categoryId: "cat-1",
    category: catJuridico,
    tags: [tag2025],
    createdBy: "user-admin-1",
    createdAt: new Date("2025-04-20"),
    updatedAt: new Date("2025-04-20"),
    fileSizeBytes: 420_000,
  }),
  makeDoc({
    id: "doc-3",
    title: "CNPJ e Certidões Negativas",
    slug: "cnpj-certidoes-negativas",
    description:
      "Comprovante de CNPJ, certidão de regularidade fiscal e certidões negativas atualizadas.",
    type: "legal",
    visibility: "restricted",
    status: "published",
    categoryId: "cat-1",
    category: catJuridico,
    tags: [tag2026],
    createdBy: "user-admin-1",
    createdAt: new Date("2026-01-05"),
    updatedAt: new Date("2026-01-05"),
    fileSizeBytes: 310_000,
  }),
  makeDoc({
    id: "doc-4",
    title: "Declaração de Utilidade Pública Municipal",
    slug: "declaracao-utilidade-publica-municipal",
    description:
      "Declaração emitida pela Prefeitura reconhecendo a utilidade pública da Hebron Aseec.",
    type: "legal",
    visibility: "public",
    status: "published",
    categoryId: "cat-1",
    category: catJuridico,
    tags: [],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2024-06-01"),
    fileSizeBytes: 250_000,
  }),
  makeDoc({
    id: "doc-5",
    title: "Balanço Patrimonial 2024",
    slug: "balanco-patrimonial-2024",
    description:
      "Demonstrativo contábil completo do exercício financeiro de 2024.",
    type: "fiscal",
    visibility: "restricted",
    status: "published",
    categoryId: "cat-2",
    category: catFiscal,
    tags: [tag2024],
    createdBy: "user-admin-1",
    createdAt: new Date("2025-02-28"),
    updatedAt: new Date("2025-02-28"),
    fileSizeBytes: 1_450_000,
  }),
  makeDoc({
    id: "doc-6",
    title: "DRE — Demonstração de Resultado 2024",
    slug: "dre-demonstracao-resultado-2024",
    description:
      "Demonstração do resultado do exercício de 2024, com receitas e despesas detalhadas.",
    type: "fiscal",
    visibility: "restricted",
    status: "published",
    categoryId: "cat-2",
    category: catFiscal,
    tags: [tag2024],
    createdBy: "user-admin-1",
    createdAt: new Date("2025-02-28"),
    updatedAt: new Date("2025-02-28"),
    fileSizeBytes: 980_000,
  }),
  makeDoc({
    id: "doc-7",
    title: "Declaração de Isenção de IR 2025",
    slug: "declaracao-isencao-ir-2025",
    description:
      "Declaração anual de isenção do Imposto de Renda para entidades sem fins lucrativos.",
    type: "fiscal",
    visibility: "internal",
    status: "published",
    categoryId: "cat-2",
    category: catFiscal,
    tags: [tag2025],
    createdBy: "user-admin-1",
    createdAt: new Date("2025-06-30"),
    updatedAt: new Date("2025-06-30"),
    fileSizeBytes: 560_000,
  }),
  makeDoc({
    id: "doc-8",
    title: "Manual do Colaborador",
    slug: "manual-do-colaborador",
    description:
      "Guia completo de integração, cultura organizacional, benefícios e políticas internas.",
    type: "sop",
    visibility: "internal",
    status: "published",
    categoryId: "cat-3",
    category: catRH,
    tags: [tagRH],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2025-01-15"),
    fileSizeBytes: 3_200_000,
  }),
  makeDoc({
    id: "doc-9",
    title: "Descrição de Cargo: Coordenador de Projetos",
    slug: "descricao-cargo-coordenador-projetos",
    description:
      "Responsabilidades, requisitos e perfil desejado para o cargo de Coordenador de Projetos.",
    type: "cargo_description",
    visibility: "internal",
    status: "published",
    categoryId: "cat-3",
    category: catRH,
    tags: [tagRH],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-05-10"),
    updatedAt: new Date("2024-05-10"),
    fileSizeBytes: 190_000,
  }),
  makeDoc({
    id: "doc-10",
    title: "Descrição de Cargo: Gestor Financeiro",
    slug: "descricao-cargo-gestor-financeiro",
    description:
      "Responsabilidades, requisitos e perfil desejado para o cargo de Gestor Financeiro.",
    type: "cargo_description",
    visibility: "restricted",
    status: "published",
    categoryId: "cat-3",
    category: catRH,
    tags: [tagRH],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-05-10"),
    updatedAt: new Date("2024-05-10"),
    fileSizeBytes: 185_000,
  }),
  makeDoc({
    id: "doc-11",
    title: "Política de Privacidade e Proteção de Dados",
    slug: "politica-privacidade-protecao-dados",
    description: "Política de tratamento de dados pessoais conforme a LGPD.",
    type: "policy",
    visibility: "public",
    status: "published",
    categoryId: "cat-3",
    category: catRH,
    tags: [],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-08-01"),
    updatedAt: new Date("2025-08-01"),
    fileSizeBytes: 340_000,
  }),
  makeDoc({
    id: "doc-12",
    title: "Procedimento de Admissão de Colaboradores",
    slug: "procedimento-admissao-colaboradores",
    description:
      "Fluxo detalhado do processo seletivo, documentação e onboarding de novos colaboradores.",
    type: "sop",
    visibility: "internal",
    status: "published",
    categoryId: "cat-5",
    category: catProcedimentos,
    tags: [tagRH],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-04-15"),
    updatedAt: new Date("2024-04-15"),
    fileSizeBytes: 720_000,
  }),
  makeDoc({
    id: "doc-13",
    title: "Fluxo de Aprovação de Despesas",
    slug: "fluxo-aprovacao-despesas",
    description:
      "Procedimento padrão para solicitação, aprovação e registro de despesas.",
    type: "sop",
    visibility: "internal",
    status: "published",
    categoryId: "cat-5",
    category: catProcedimentos,
    tags: [],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-07-20"),
    updatedAt: new Date("2025-02-10"),
    fileSizeBytes: 480_000,
  }),
  makeDoc({
    id: "doc-14",
    title: "Manual de Identidade Visual",
    slug: "manual-identidade-visual",
    description:
      "Guia de uso da marca Hebron Aseec: cores, tipografia, logotipos e aplicações.",
    type: "sop",
    visibility: "internal",
    status: "published",
    categoryId: "cat-5",
    category: catProcedimentos,
    tags: [],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
    fileSizeBytes: 8_500_000,
  }),
  makeDoc({
    id: "doc-15",
    title: "Relatório de Atividades 2024",
    slug: "relatorio-atividades-2024",
    description:
      "Prestação de contas das iniciativas, projetos e impacto gerado pela Hebron Aseec em 2024.",
    type: "report",
    visibility: "public",
    status: "published",
    categoryId: "cat-6",
    category: catComunicacao,
    tags: [tag2024],
    createdBy: "user-admin-1",
    createdAt: new Date("2025-03-15"),
    updatedAt: new Date("2025-03-15"),
    fileSizeBytes: 4_100_000,
  }),
  makeDoc({
    id: "doc-16",
    title: "Relatório de Impacto Social 2024",
    slug: "relatorio-impacto-social-2024",
    description:
      "Métricas e histórias de transformação geradas pelos projetos sociais da associação em 2024.",
    type: "report",
    visibility: "public",
    status: "published",
    categoryId: "cat-6",
    category: catComunicacao,
    tags: [tag2024, tagProjetosSociais],
    createdBy: "user-admin-1",
    createdAt: new Date("2025-04-01"),
    updatedAt: new Date("2025-04-01"),
    fileSizeBytes: 6_300_000,
  }),
  makeDoc({
    id: "doc-17",
    title: "Regimento Interno do Conselho Diretor",
    slug: "regimento-interno-conselho-diretor",
    description:
      "Normas de funcionamento, competências e deliberações do Conselho Diretor.",
    type: "legal",
    visibility: "restricted",
    status: "published",
    categoryId: "cat-1",
    category: catJuridico,
    tags: [],
    createdBy: "user-admin-1",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2025-01-10"),
    fileSizeBytes: 920_000,
  }),
];

// ─── Editais ──────────────────────────────────────────────────────────────────

type PartialEdital = Omit<
  Edital,
  | "currentVersion"
  | "deletedAt"
  | "publishedBy"
  | "publishedAt"
  | "currentVersionId"
> & {
  publishedAt?: Date;
  fileSizeBytes?: number;
};

function makeEdital(partial: PartialEdital): Edital {
  const version = makeVersion(
    `${partial.id}-v1`,
    partial.id,
    1,
    partial.fileSizeBytes ?? 900_000,
    partial.createdAt,
  );
  return {
    ...partial,
    currentVersionId: version.id,
    currentVersion: version,
    publishedBy: "user-admin-1",
    publishedAt: partial.publishedAt ?? partial.createdAt,
    deletedAt: null,
  };
}

// Edital aberto (anual, opensAt < hoje < closesAt)
export const editalAberto: Edital = makeEdital({
  id: "edital-1",
  title: "Edital de Projetos Missionários 2026",
  slug: "edital-projetos-missionarios-2026",
  description:
    "Chamada aberta para submissão de projetos missionários e de evangelização a serem apoiados pela Hebron Aseec no segundo semestre de 2026.",
  type: "edital",
  visibility: "public",
  status: "published",
  categoryId: "cat-4",
  category: catEditais,
  tags: [tag2026, tagMissionario],
  cycleType: "anual",
  opensAt: new Date("2026-05-01"),
  closesAt: new Date("2026-08-31"),
  projectType: "missionario",
  projectCategory: "evangelizacao",
  createdBy: "user-admin-1",
  createdAt: new Date("2026-04-15"),
  updatedAt: new Date("2026-04-15"),
});

// Edital fechado (anual, closesAt < hoje)
export const editalFechado: Edital = makeEdital({
  id: "edital-2",
  title: "Edital de Auxílio Educacional 2025",
  slug: "edital-auxilio-educacional-2025",
  description:
    "Chamada para projetos de educação e capacitação de líderes em comunidades carentes. Encerrado.",
  type: "edital",
  visibility: "public",
  status: "published",
  categoryId: "cat-4",
  category: catEditais,
  tags: [tag2025, tagProjetosSociais],
  cycleType: "anual",
  opensAt: new Date("2025-03-01"),
  closesAt: new Date("2025-06-30"),
  projectType: "educacional",
  projectCategory: "capacitacao-lideranca",
  createdBy: "user-admin-1",
  createdAt: new Date("2025-02-15"),
  updatedAt: new Date("2025-02-15"),
});

// Edital permanente (pontual, sem datas)
export const editalPermanente: Edital = makeEdital({
  id: "edital-3",
  title: "Edital de Apoio a Comunidades em Vulnerabilidade",
  slug: "edital-apoio-comunidades-vulnerabilidade",
  description:
    "Chamada permanente para projetos de assistência social, saúde e dignidade humana em comunidades em situação de vulnerabilidade.",
  type: "edital",
  visibility: "public",
  status: "published",
  categoryId: "cat-4",
  category: catEditais,
  tags: [tagProjetosSociais],
  cycleType: "pontual",
  opensAt: null,
  closesAt: null,
  projectType: "assistencia_social",
  projectCategory: "vulnerabilidade",
  createdBy: "user-admin-1",
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
});

// Edital interno adicional (anual, vigente)
export const editalInterno: Edital = makeEdital({
  id: "edital-4",
  title: "Edital de Auxílio a Pastores em Contexto Transcultural 2026",
  slug: "edital-auxilio-pastores-transcultural-2026",
  description:
    "Processo seletivo interno para pastores e missionários elegíveis à hospedagem nas unidades Flat da Hebron Aseec.",
  type: "edital",
  visibility: "internal",
  status: "published",
  categoryId: "cat-4",
  category: catEditais,
  tags: [tag2026, tagMissionario],
  cycleType: "anual",
  opensAt: new Date("2026-04-01"),
  closesAt: new Date("2026-12-31"),
  projectType: null,
  projectCategory: null,
  createdBy: "user-admin-1",
  createdAt: new Date("2026-03-15"),
  updatedAt: new Date("2026-03-15"),
});

export const mockEditais: Edital[] = [
  editalAberto,
  editalFechado,
  editalPermanente,
  editalInterno,
];

// ─── Combined list ────────────────────────────────────────────────────────────

export const mockAllDocuments: Document[] = [...mockDocuments, ...mockEditais];
