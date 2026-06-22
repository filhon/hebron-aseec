"use client";

import { useState } from "react";
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

export interface VotePanelProps {
  projectTitle: string;
  voteSummary: VoteSummary;
  hasVoted?: boolean;
  onVote?: (inFavor: boolean) => void;
  className?: string;
}

export function VotePanel({
  projectTitle,
  voteSummary,
  hasVoted = false,
  onVote,
  className,
}: VotePanelProps) {
  const [localVote, setLocalVote] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const voted = hasVoted || localVote !== null;

  function handleVote(inFavor: boolean) {
    if (voted || loading) return;
    setLoading(true);
    setTimeout(() => {
      setLocalVote(inFavor);
      setLoading(false);
      onVote?.(inFavor);
    }, 600);
  }

  const displaySummary: VoteSummary =
    localVote !== null
      ? {
          ...voteSummary,
          totalVoted: voteSummary.totalVoted + 1,
          inFavor: localVote ? voteSummary.inFavor + 1 : voteSummary.inFavor,
          against: !localVote ? voteSummary.against + 1 : voteSummary.against,
          quorumMet:
            voteSummary.totalVoted + 1 >=
            Math.ceil(voteSummary.totalEligible / 2),
        }
      : voteSummary;

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
        {voted ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                backgroundColor:
                  localVote === true || (hasVoted && localVote === null)
                    ? "var(--hb-green-muted)"
                    : "var(--color-destructive-muted)",
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
                    localVote !== false
                      ? "var(--hb-green-fg)"
                      : "var(--color-destructive)"
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
        ) : (
          <div className="flex gap-4 w-full max-w-xs">
            <button
              type="button"
              onClick={() => handleVote(true)}
              disabled={loading}
              className="flex-1 flex flex-col items-center justify-center gap-2 rounded-md border-2 py-4 transition-all duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none"
              style={{
                borderColor: "var(--hb-green)",
                backgroundColor: "var(--hb-green-muted)",
                color: "var(--hb-green-fg)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hb-green)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hb-green-muted)";
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
              disabled={loading}
              className="flex-1 flex flex-col items-center justify-center gap-2 rounded-md border-2 py-4 transition-all duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none"
              style={{
                borderColor: "var(--color-destructive)",
                backgroundColor: "var(--color-destructive-muted)",
                color: "var(--color-destructive)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-destructive)";
                e.currentTarget.style.color = "#fff";
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
        )}

        {/* Quorum indicator */}
        <QuorumRing
          voted={displaySummary.totalVoted}
          eligible={displaySummary.totalEligible}
          quorumMet={displaySummary.quorumMet}
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
