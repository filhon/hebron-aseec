import { Inngest } from "inngest";

/**
 * Client único do monorepo (P-0.14) — registrado uma vez aqui, consumido
 * pela rota de serve (hoje só em apps/intranet) e por todas as funções em
 * `src/crons/*`. Um segundo client em outro app criaria dois "apps" Inngest
 * distintos e quebraria o dashboard unificado de execuções.
 */
export const inngest = new Inngest({ id: "hebron-aseec" });
