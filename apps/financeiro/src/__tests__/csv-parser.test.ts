/**
 * csv-parser.test.ts
 *
 * F3-19: o parser CSV original quebrava com `;` (delimitador comum em
 * extratos de banco brasileiro) e com vírgula dentro de campos entre aspas.
 * Testes puros — sem dependência de banco.
 */

import { describe, it, expect } from "vitest";
import { parseCSV, splitDelimitedLine } from "../actions/import";

describe("splitDelimitedLine", () => {
  it("separa por vírgula fora de aspas", () => {
    expect(splitDelimitedLine("a,b,c", ",")).toEqual(["a", "b", "c"]);
  });

  it("não separa vírgula dentro de aspas", () => {
    expect(
      splitDelimitedLine('01/01/2026,"PAGTO FORNECEDOR, REF 123",100,00', ","),
    ).toEqual(["01/01/2026", "PAGTO FORNECEDOR, REF 123", "100", "00"]);
  });

  it("separa por ponto-e-vírgula quando esse é o delimitador", () => {
    expect(splitDelimitedLine("a;b;c", ";")).toEqual(["a", "b", "c"]);
  });

  it("remove aspas envolventes de um campo", () => {
    expect(splitDelimitedLine('"a","b"', ",")).toEqual(["a", "b"]);
  });
});

describe("parseCSV", () => {
  it("parseia CSV separado por vírgula (formato já suportado)", () => {
    const content = ["data,valor,descricao", "01/06/2026,100,Doação"].join(
      "\n",
    );
    const rows = parseCSV(content);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      date: "2026-06-01",
      amount: 100,
      description: "Doação",
    });
  });

  it("detecta e parseia CSV separado por ponto-e-vírgula (F3-19)", () => {
    const content = [
      "Data;Historico;Valor",
      "05/06/2026;PAGTO FORNECEDOR;1.234,56",
      "06/06/2026;RECEBIMENTO CLIENTE;500,00",
    ].join("\n");

    const rows = parseCSV(content);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      date: "2026-06-05",
      amount: 1234.56,
      description: "PAGTO FORNECEDOR",
    });
    expect(rows[1]?.amount).toBe(500);
  });

  it("mantém a descrição intacta quando há vírgula dentro de aspas em CSV com vírgula como delimitador", () => {
    const content = [
      "data,descricao,valor",
      '10/06/2026,"PAGTO FORNECEDOR, REF 123",250,00',
    ].join("\n");

    const rows = parseCSV(content);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.description).toBe("PAGTO FORNECEDOR, REF 123");
  });
});
