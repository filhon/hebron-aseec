/**
 * Erro de negócio: a mensagem é escrita para o usuário final e deve chegar
 * intacta à UI via `result.serverError`. Qualquer outro erro lançado numa
 * Server Action (bug, falha de infraestrutura, exceção de biblioteca) é
 * mascarado por `handleServerError` e só aparece no log estruturado — nunca
 * na tela.
 */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

const GENERIC_MESSAGE =
  "Não foi possível concluir esta operação. Tente novamente ou contate o suporte.";

/**
 * Passar como `handleServerError` em todo `createSafeActionClient()` do
 * ecossistema. Sem isso, next-safe-action substitui qualquer erro pela
 * mensagem genérica em inglês do pacote (`DEFAULT_SERVER_ERROR_MESSAGE`).
 */
export function handleServerError(error: Error): string {
  if (error instanceof BusinessError) {
    return error.message;
  }

  console.error(
    JSON.stringify({
      event: "safe_action_unexpected_error",
      message: error.message,
      stack: error.stack,
    }),
  );

  return GENERIC_MESSAGE;
}
