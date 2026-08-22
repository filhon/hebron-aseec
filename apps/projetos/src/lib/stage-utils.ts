export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const STAGE_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  validacao: "Validação",
  votacao: "Votação",
  homologacao: "Homologação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  em_execucao: "Em Execução",
  concluido: "Concluído",
};

export type StageBadge = { bg: string; text: string };

export const STAGE_BADGES: Record<string, StageBadge> = {
  rascunho: { bg: "var(--hb-gray-50)", text: "var(--hb-gray-400)" },
  validacao: { bg: "var(--hb-cyan-muted)", text: "var(--hb-cyan-darker)" },
  votacao: { bg: "var(--brand-muted)", text: "var(--hb-blue)" },
  homologacao: { bg: "var(--hb-orange-muted)", text: "var(--hb-orange-deep)" },
  aprovado: { bg: "var(--hb-green-muted)", text: "var(--hb-green-fg)" },
  reprovado: {
    bg: "var(--color-destructive-muted)",
    text: "var(--color-destructive)",
  },
  em_execucao: { bg: "var(--hb-cyan-muted)", text: "var(--hb-cyan-fg)" },
  concluido: { bg: "var(--hb-green-muted)", text: "var(--hb-green-fg)" },
};

const FALLBACK_BADGE: StageBadge = {
  bg: "var(--hb-gray-50)",
  text: "var(--hb-gray-400)",
};

export function getStageBadge(stage: string): StageBadge {
  return STAGE_BADGES[stage] ?? FALLBACK_BADGE;
}

export const CATEGORY_LABELS: Record<string, string> = {
  evangelismo: "Evangelismo",
  missoes_transculturais: "Missões Transculturais",
  educacao_crista: "Educação Cristã",
  assistencia_social: "Assistência Social",
  saude: "Saúde",
  capacitacao_lideranca: "Capacitação de Liderança",
  infraestrutura_ministerial: "Infraestrutura Ministerial",
  plantacao_de_igrejas: "Plantação de Igrejas",
  discipulado: "Discipulado",
  outros: "Outros",
};
