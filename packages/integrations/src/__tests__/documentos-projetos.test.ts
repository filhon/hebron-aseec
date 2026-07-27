/**
 * documentos-projetos.test.ts — contrato de URL do botão "Submeter projeto"
 * (P-1.23b).
 *
 * F2-P3/P-1.23b: o botão emitia `edital_id` e o wizard lia `editalId` — o
 * link nunca funcionava. Este teste monta a URL com buildProjetoNovoUrl e a
 * devolve com parseProjetoNovoParams, checando que os valores originais
 * sobrevivem à ida e volta — o teste que teria pego a divergência de nome.
 * Não toca o banco (funções puras), por isso não usa setup-env/withAuthenticatedContext.
 */
import { describe, it, expect } from "vitest";
import {
  buildProjetoNovoUrl,
  parseProjetoNovoParams,
  EDITAL_ID_PARAM,
  EDITAL_ID_PARAM_ALIAS,
  PROJECT_CATEGORY_OPTIONS,
  projectCategoryLabel,
} from "../documentos-projetos";

describe("buildProjetoNovoUrl / parseProjetoNovoParams — round-trip", () => {
  it("preserva editalId, tipo, ciclo e categoria na ida e volta", () => {
    const url = buildProjetoNovoUrl({
      editalId: "a1b2c3d4-0000-0000-0000-000000000001",
      tipo: "missionario",
      ciclo: "anual",
      categoria: "evangelismo",
    });

    const parsed = parseProjetoNovoParams(new URL(url).searchParams);

    expect(parsed).toEqual({
      editalId: "a1b2c3d4-0000-0000-0000-000000000001",
      tipo: "missionario",
      ciclo: "anual",
      categoria: "evangelismo",
    });
  });

  it("usa a chave canônica edital_id, não o alias legado editalId", () => {
    const url = buildProjetoNovoUrl({ editalId: "edital-1" });
    const search = new URL(url).searchParams;

    expect(search.get(EDITAL_ID_PARAM)).toBe("edital-1");
    expect(search.has(EDITAL_ID_PARAM_ALIAS)).toBe(false);
  });

  it("aceita o alias legado editalId na leitura (compat com links antigos)", () => {
    const legacySearch = new URLSearchParams({ editalId: "edital-legado" });
    const parsed = parseProjetoNovoParams(legacySearch);
    expect(parsed.editalId).toBe("edital-legado");
  });

  it("prioriza edital_id sobre o alias quando ambos estão presentes", () => {
    const search = new URLSearchParams({
      edital_id: "canonico",
      editalId: "legado",
    });
    expect(parseProjetoNovoParams(search).editalId).toBe("canonico");
  });

  it("ignora valores de ciclo fora de anual|pontual", () => {
    const search = new URLSearchParams({
      edital_id: "x",
      ciclo: "trimestral",
    });
    expect(parseProjetoNovoParams(search).ciclo).toBeNull();
  });

  it("retorna null para parâmetros ausentes", () => {
    const parsed = parseProjetoNovoParams(
      new URLSearchParams({ edital_id: "x" }),
    );
    expect(parsed.tipo).toBeNull();
    expect(parsed.ciclo).toBeNull();
    expect(parsed.categoria).toBeNull();
  });
});

describe("PROJECT_CATEGORY_OPTIONS — fonte única de categoria de projeto", () => {
  it("não contém slugs inventados fora do vocabulário de projetos.categories", () => {
    const values = PROJECT_CATEGORY_OPTIONS.map((o) => o.value);
    expect(values).toEqual([
      "evangelismo",
      "missoes_transculturais",
      "educacao_crista",
      "assistencia_social",
      "saude",
      "capacitacao_lideranca",
      "infraestrutura_ministerial",
      "plantacao_de_igrejas",
      "discipulado",
      "outros",
    ]);
  });

  it("resolve o rótulo de um slug conhecido e devolve o próprio slug para um desconhecido", () => {
    expect(projectCategoryLabel("saude")).toBe("Saúde");
    expect(projectCategoryLabel("slug-desconhecido")).toBe("slug-desconhecido");
    expect(projectCategoryLabel(null)).toBeNull();
  });
});
