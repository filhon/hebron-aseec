// vote-result.ts — lógica pura de apuração de votação (P-2.12b)
//
// Única definição de computeVoteResult no repositório: `actions/voting.ts`
// busca os números no banco (countEligibleVoters + votes) e delega o
// cálculo aqui; os testes importam esta função em vez de reimplementá-la
// (achado do corretivo P-2.12b — 11 dos 26 testes de `voting.test.ts`
// exercitavam uma cópia local da fórmula, não a de produção).

export interface VoteResult {
  totalEligible: number;
  totalVoted: number;
  inFavor: number;
  against: number;
  quorumMet: boolean;
  approved: boolean | null;
}

/**
 * Quórum: ≥ 50% dos elegíveis votou (ceil(totalEligible / 2)). Maioria
 * simples entre os votos lançados decide `approved`; `null` enquanto o
 * quórum não é atingido.
 */
export function computeVoteResult(
  totalEligible: number,
  totalVoted: number,
  inFavor: number,
): VoteResult {
  const against = totalVoted - inFavor;
  const quorumMet = totalVoted >= Math.ceil(totalEligible / 2);
  const approved = quorumMet ? computeMajority(inFavor, against) : null;
  return { totalEligible, totalVoted, inFavor, against, quorumMet, approved };
}

/**
 * Maioria entre votos existentes, ignorando quórum — usada tanto por
 * computeVoteResult (approved) quanto por triggerPanicButton (decisão
 * forçada). Empate resolve para `false` (reprovado, padrão conservador).
 */
export function computeMajority(inFavor: number, against: number): boolean {
  return inFavor > against;
}
