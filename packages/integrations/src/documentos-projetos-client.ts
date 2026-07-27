import { projectCategoryEnum } from "@hebron/validators/projetos";

// ---------------------------------------------------------------------------
// Contrato de URL — Documentos → Projetos (P-1.23b)
//
// Único lugar onde os nomes de parâmetro da URL "submeter projeto neste
// edital" são definidos. Nem apps/documentos (que monta o link) nem
// apps/projetos (que lê o link no wizard) devem usar literais soltos — ambos
// consomem buildProjetoNovoUrl / parseProjetoNovoParams daqui.
//
// Este arquivo não importa `@hebron/db` — é consumido também por componentes
// "use client" (EditalForm, o wizard de projetos). `getEditalPrefill` (que
// precisa do banco) vive em documentos-projetos.ts, que reexporta tudo daqui.
// ---------------------------------------------------------------------------

export const PROJETOS_NOVO_URL = "https://projetos.hebronaseec.com.br/novo";

/** Chave canônica do id do edital. */
export const EDITAL_ID_PARAM = "edital_id";
/**
 * Alias legado de leitura — versão anterior do wizard (F2-P3) lia
 * `editalId`. Aceito só para não quebrar links já publicados; nenhum lugar
 * novo deve emitir esta chave. Remover quando não houver mais link antigo em
 * circulação (nenhum prazo automático — decisão de produto).
 */
export const EDITAL_ID_PARAM_ALIAS = "editalId";
/** Tipo de projeto do edital (missionário, educacional, ...) — só exibição. */
export const TIPO_PARAM = "tipo";
/**
 * Ciclo do edital (anual|pontual) — pré-seleciona o toggle "Tipo de Projeto"
 * do wizard (rascunho anual vs. pontual). Renomeado de `tipo` (P-1.23b): o
 * botão já usava `tipo` para o tipo de projeto do edital, e o wizard usava o
 * mesmo nome para o ciclo — mesma chave, domínios diferentes (F2-P3/P-1.23b).
 */
export const CICLO_PARAM = "ciclo";
/** Slug da categoria de projeto (vocabulário de projetos.categories). */
export const CATEGORIA_PARAM = "categoria";

export type ProjetoNovoParams = {
  editalId: string;
  /** Tipo de projeto do edital (missionário, educacional...) — texto livre do edital, só para exibição. */
  tipo?: string | null;
  /** Ciclo do edital — pré-seleciona o toggle anual/pontual do wizard. */
  ciclo?: "anual" | "pontual" | null;
  /** Slug da categoria de projeto (vocabulário de projetos.categories). */
  categoria?: string | null;
};

export function buildProjetoNovoUrl(
  params: ProjetoNovoParams,
  baseUrl: string = PROJETOS_NOVO_URL,
): string {
  const search = new URLSearchParams({ [EDITAL_ID_PARAM]: params.editalId });
  if (params.tipo) search.set(TIPO_PARAM, params.tipo);
  if (params.ciclo) search.set(CICLO_PARAM, params.ciclo);
  if (params.categoria) search.set(CATEGORIA_PARAM, params.categoria);
  return `${baseUrl}?${search.toString()}`;
}

export type ParsedProjetoNovoParams = {
  editalId: string | null;
  tipo: string | null;
  ciclo: "anual" | "pontual" | null;
  categoria: string | null;
};

/** Aceita `URLSearchParams` ou o `ReadonlyURLSearchParams` do next/navigation (mesma interface de leitura). */
export function parseProjetoNovoParams(
  searchParams: Pick<URLSearchParams, "get">,
): ParsedProjetoNovoParams {
  const editalId =
    searchParams.get(EDITAL_ID_PARAM) ??
    searchParams.get(EDITAL_ID_PARAM_ALIAS);
  const cicloRaw = searchParams.get(CICLO_PARAM);
  const ciclo =
    cicloRaw === "anual" || cicloRaw === "pontual" ? cicloRaw : null;

  return {
    editalId,
    tipo: searchParams.get(TIPO_PARAM),
    ciclo,
    categoria: searchParams.get(CATEGORIA_PARAM),
  };
}

// ---------------------------------------------------------------------------
// Categorias de projeto — fonte única
//
// Os valores vêm do enum canônico de packages/validators (usado pela action
// de criação de projeto); os rótulos vivem aqui porque só este módulo é
// consumido tanto por apps/documentos (select "Categoria de projeto" do
// EditalForm) quanto por apps/projetos (select "Categoria" do wizard).
// Antes de P-1.23b cada app tinha sua própria lista hardcoded e elas
// divergiam (edital-form.tsx usava slugs com hífen que não existem em
// projetos.categories).
// ---------------------------------------------------------------------------

const PROJECT_CATEGORY_LABELS: Record<
  (typeof projectCategoryEnum.options)[number],
  string
> = {
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

export const PROJECT_CATEGORY_OPTIONS: { value: string; label: string }[] =
  projectCategoryEnum.options.map((value) => ({
    value,
    label: PROJECT_CATEGORY_LABELS[value],
  }));

export function projectCategoryLabel(slug: string | null): string | null {
  if (!slug) return null;
  return (
    PROJECT_CATEGORY_LABELS[
      slug as (typeof projectCategoryEnum.options)[number]
    ] ?? slug
  );
}
