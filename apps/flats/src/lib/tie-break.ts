import type { LastRestOutsideCity } from "@hebron/types/flats";

// ---------------------------------------------------------------------------
// breakTie — desempate (BRAIN §6.8), nesta ordem: 1) idade (mais velho
// prioriza) 2) mais tempo sem descanso fora da cidade (critério f do
// scoring) 3) nunca usou o flat 4) sorteio.
//
// Função pura — não acessa o banco. Movida de actions/approval.ts (P-7.8)
// para cá em P-7.9: um módulo "use server" só pode exportar Server Actions
// (funções async) quando importado, ainda que transitivamente, por um
// Client Component — approval-form.tsx passou a importar
// actions/approval.ts#reviewReservation diretamente (G1: infra óbvia faltando,
// build quebrava com "Server Actions must be async functions" por causa
// desta função síncrona no mesmo arquivo). Nada mais no repositório importa
// breakTie hoje (a fila de aprovação, components/approval-queue.tsx,
// reimplementa a mesma ordem de desempate para exibição) — mantida como
// utilitário pronto para o dia em que a decisão de desempate precisar ser
// aplicada no servidor, não só mostrada na UI.
// ---------------------------------------------------------------------------

export interface TieBreakCandidate {
  reservationId: string;
  birthDate: Date;
  lastRestOutsideCity: LastRestOutsideCity;
  neverUsedFlat: boolean;
}

const REST_RANK: Record<LastRestOutsideCity, number> = {
  mais_de_2_anos: 2,
  entre_1_e_2_anos: 1,
  menos_de_1_ano: 0,
};

export function breakTie(
  candidates: TieBreakCandidate[],
): TieBreakCandidate | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;

  // 1) Idade — mais velho (menor birthDate) prioriza.
  const oldestBirthTime = Math.min(
    ...candidates.map((c) => c.birthDate.getTime()),
  );
  let pool = candidates.filter(
    (c) => c.birthDate.getTime() === oldestBirthTime,
  );
  if (pool.length === 1) return pool[0] ?? null;

  // 2) Mais tempo sem descanso fora da cidade.
  const maxRest = Math.max(
    ...pool.map((c) => REST_RANK[c.lastRestOutsideCity]),
  );
  pool = pool.filter((c) => REST_RANK[c.lastRestOutsideCity] === maxRest);
  if (pool.length === 1) return pool[0] ?? null;

  // 3) Nunca usou o flat.
  const neverUsed = pool.filter((c) => c.neverUsedFlat);
  if (neverUsed.length === 1) return neverUsed[0] ?? null;
  if (neverUsed.length > 1) pool = neverUsed;

  // 4) Sorteio.
  const winnerIndex = Math.floor(Math.random() * pool.length);
  return pool[winnerIndex] ?? null;
}
