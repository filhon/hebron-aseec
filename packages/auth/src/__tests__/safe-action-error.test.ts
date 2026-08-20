/**
 * safe-action-error.test.ts — PACOTE 4 (correção P1).
 *
 * next-safe-action@7.10.8 substitui QUALQUER erro pela mensagem genérica em
 * inglês do pacote quando `handleServerError` não é definido (verificado no
 * código-fonte instalado). Este teste cobre a peça que resolve isso: uma
 * action que lança `BusinessError` deve devolver a mensagem em português
 * intacta; qualquer outro erro deve ser mascarado pela genérica e nunca
 * vazar detalhes internos.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { BusinessError, handleServerError } from "../safe-action-error";

describe("BusinessError + handleServerError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("repassa a mensagem de um BusinessError intacta", () => {
    const result = handleServerError(
      new BusinessError(
        "O autorizador deve ser uma pessoa diferente do aprovador (governança dual)",
      ),
    );
    expect(result).toBe(
      "O autorizador deve ser uma pessoa diferente do aprovador (governança dual)",
    );
  });

  it("mascara um erro comum com a mensagem genérica em português", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = handleServerError(
      new TypeError("Cannot read properties of undefined (reading 'foo')"),
    );
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("Something went wrong");
    expect(result).toBe(
      "Não foi possível concluir esta operação. Tente novamente ou contate o suporte.",
    );
  });

  it("nunca vaza a mensagem crua de um erro inesperado", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = handleServerError(
      new Error("duplicate key value violates unique constraint"),
    );
    expect(result).not.toContain("duplicate key");
    expect(result).not.toContain("constraint");
  });

  it("registra o erro inesperado em log estruturado (JSON, evento identificável)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    handleServerError(new Error("falha de infraestrutura"));

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0]?.[0] as string) as {
      event: string;
      message: string;
    };
    expect(logged.event).toBe("safe_action_unexpected_error");
    expect(logged.message).toBe("falha de infraestrutura");
  });

  it("não loga nada quando o erro já é um BusinessError esperado", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    handleServerError(new BusinessError("Projeto não encontrado"));
    expect(spy).not.toHaveBeenCalled();
  });
});
