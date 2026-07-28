"use client";

import type { VoteSummary } from "@hebron/types";

interface QuorumRingProps {
  voted: number;
  eligible: number;
  quorumMet: boolean;
}

function QuorumRing({ voted, eligible, quorumMet }: QuorumRingProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const percent = eligible === 0 ? 0 : voted / eligible;
  const offset = circumference * (1 - percent);
  const strokeColor = quorumMet ? "var(--hb-green)" : "var(--hb-orange)";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="96"
        height="96"
        aria-label={`${voted} de ${eligible} votos registrados`}
      >
        {/* Track */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="var(--hb-gray-100)"
          strokeWidth="7"
        />
        {/* Progress */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
          style={{
            transition: "stroke-dashoffset var(--dur-slow) var(--ease-out)",
          }}
        />
        {/* Count */}
        <text
          x="48"
          y="44"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill="var(--fg)"
          fontFamily="var(--font-display)"
        >
          {voted}
        </text>
        <text
          x="48"
          y="60"
          textAnchor="middle"
          fontSize="12"
          fill="var(--fg-muted)"
          fontFamily="var(--font-body)"
        >
          de {eligible}
        </text>
      </svg>
      <p className="text-xs text-center text-(--fg-muted)">
        {quorumMet ? (
          <span
            className="font-semibold"
            style={{ color: "var(--hb-green-fg)" }}
          >
            Quórum atingido
          </span>
        ) : (
          <>
            Quórum:{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--hb-orange-deep)" }}
            >
              {Math.ceil(eligible / 2)} votos necessários
            </span>
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Estado da chamada de `castVote` — a UI nunca declara "registrado" por
 * conta própria; ela só reflete o que `VotePanelWrapper` já recebeu do
 * servidor (BRAIN §6.2: um voto secreto que falha em silêncio é
 * indistinguível de um voto computado).
 */
export type VoteStatus = "idle" | "pending" | "error";

export interface VotePanelProps {
  projectTitle: string;
  voteSummary: VoteSummary;
  hasVoted?: boolean;
  status?: VoteStatus;
  errorMessage?: string | null;
  /** Sentido do voto confirmado nesta sessão (só para colorir o próprio ícone de confirmação — nunca exposto a terceiros). */
  confirmedValue?: boolean | null;
  onVote?: (inFavor: boolean) => void;
  onRetry?: () => void;
  className?: string;
}

export function VotePanel({
  projectTitle,
  voteSummary,
  hasVoted = false,
  status = "idle",
  errorMessage = null,
  confirmedValue = null,
  onVote,
  onRetry,
  className,
}: VotePanelProps) {
  const pending = status === "pending";

  function handleVote(inFavor: boolean) {
    if (hasVoted || pending) return;
    onVote?.(inFavor);
  }

  return (
    <div
      className={`rounded-lg border border-(--border) bg-(--surface) shadow-(--shadow-md) overflow-hidden ${className ?? ""}`}
    >
      {/* Question bubble */}
      <div
        className="px-6 pt-8 pb-10 text-center relative"
        style={{ backgroundColor: "var(--hb-blue)" }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest text-(--hb-cyan-muted) mb-3"
          aria-hidden
        >
          Votação Secreta
        </p>
        <p
          className="text-xl font-bold text-white leading-snug"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Você sente paz em investir neste projeto?
        </p>
        <p className="text-sm text-(--hb-gray-200) mt-2 line-clamp-1">
          {projectTitle}
        </p>

        {/* Bubble tail */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full"
          aria-hidden
          style={{
            width: 0,
            height: 0,
            borderLeft: "16px solid transparent",
            borderRight: "16px solid transparent",
            borderTop: "16px solid var(--hb-blue)",
          }}
        />
      </div>

      {/* Vote buttons */}
      <div className="px-6 pt-10 pb-6 flex flex-col items-center gap-6">
        {hasVoted ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                backgroundColor:
                  confirmedValue === false
                    ? "var(--color-destructive-muted)"
                    : "var(--hb-green-muted)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M5 12l5 5L20 7"
                  stroke={
                    confirmedValue === false
                      ? "var(--color-destructive)"
                      : "var(--hb-green-fg)"
                  }
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-(--fg)">Voto registrado</p>
            <p className="text-xs text-(--fg-muted)">
              Seu voto é secreto e não será revelado.
            </p>
          </div>
        ) : status === "error" ? (
          <div
            className="flex flex-col items-center gap-3 py-2 w-full max-w-xs"
            role="alert"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--color-destructive-muted)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M7 7l10 10M17 7L7 17"
                  stroke="var(--color-destructive)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-(--color-destructive) text-center">
              {errorMessage ?? "Não foi possível registrar o voto."}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md border-2 px-5 py-2 text-sm font-bold transition-colors duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ borderColor: "var(--hb-blue)", color: "var(--hb-blue)" }}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <div className="flex gap-4 w-full">
              <button
                type="button"
                onClick={() => handleVote(true)}
                disabled={pending}
                className="flex-1 flex flex-col items-center justify-center gap-2 rounded-md border-2 py-4 transition-all duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none"
                style={{
                  borderColor: "var(--hb-green)",
                  backgroundColor: "var(--hb-green-muted)",
                  color: "var(--hb-green-fg)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--hb-green)";
                  e.currentTarget.style.color = "var(--fg-invert)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--hb-green-muted)";
                  e.currentTarget.style.color = "var(--hb-green-fg)";
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M4 14l8 8L24 6"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-bold text-base">Sim</span>
              </button>

              <button
                type="button"
                onClick={() => handleVote(false)}
                disabled={pending}
                className="flex-1 flex flex-col items-center justify-center gap-2 rounded-md border-2 py-4 transition-all duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none"
                style={{
                  borderColor: "var(--color-destructive)",
                  backgroundColor: "var(--color-destructive-muted)",
                  color: "var(--color-destructive)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-destructive)";
                  e.currentTarget.style.color = "var(--fg-invert)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-destructive-muted)";
                  e.currentTarget.style.color = "var(--color-destructive)";
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M6 6l16 16M22 6L6 22"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="font-bold text-base">Não</span>
              </button>
            </div>
            {pending && (
              <p className="text-xs text-(--fg-muted)" role="status">
                Registrando…
              </p>
            )}
          </div>
        )}

        {/* Quorum indicator — vem sempre do servidor, nunca de um incremento local */}
        <QuorumRing
          voted={voteSummary.totalVoted}
          eligible={voteSummary.totalEligible}
          quorumMet={voteSummary.quorumMet}
        />

        {/* Secret ballot notice */}
        <p className="text-xs text-center text-(--fg-muted) max-w-xs">
          A identidade dos votantes não é revelada. Apenas a contagem total é
          exibida.
        </p>
      </div>
    </div>
  );
}
