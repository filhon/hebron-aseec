import { serve } from "inngest/next";
import { inngest, functions } from "@hebron/jobs";

/**
 * Rota de serve única do monorepo (P-0.14) — hospedada na intranet por ser
 * o "app host" mais próximo do que os jobs tocam hoje (admin/documentos/
 * projetos). A lógica de cada job vive em `packages/jobs`, não aqui; esta
 * rota só expõe o protocolo HTTP que o Inngest (Cloud ou dev server) usa
 * para descobrir e invocar as funções registradas em `functions`.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
