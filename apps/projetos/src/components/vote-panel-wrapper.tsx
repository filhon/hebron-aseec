"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { VotePanel, type VoteStatus } from "./vote-panel";
import { castVote } from "../actions/voting";
import type { VoteSummary } from "@hebron/types";

interface VotePanelWrapperProps {
  projectId: string;
  projectTitle: string;
  voteSummary: VoteSummary;
  hasVoted: boolean;
}

const DEFAULT_ERROR = "Não foi possível registrar o voto. Tente novamente.";

/**
 * Deriva o estado exibido a partir do que a action realmente retornou —
 * extraída como função pura para que o caminho de falha (nunca "Voto
 * registrado" sem o servidor confirmar) tenha um teste de regressão sem
 * precisar montar o componente (P-2.2b).
 */
export function deriveVoteState(params: {
  isPending: boolean;
  errorMessage: string | null;
  confirmedValue: boolean | null;
  hasVoted: boolean;
}): { status: VoteStatus; hasVoted: boolean } {
  return {
    status: params.isPending
      ? "pending"
      : params.errorMessage
        ? "error"
        : "idle",
    hasVoted: params.hasVoted || params.confirmedValue !== null,
  };
}

export function VotePanelWrapper({
  projectId,
  projectTitle,
  voteSummary,
  hasVoted,
}: VotePanelWrapperProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedValue, setConfirmedValue] = useState<boolean | null>(null);
  const [isChangingVote, setIsChangingVote] = useState(false);

  const { execute, isPending } = useAction(castVote, {
    onSuccess({ input }) {
      setErrorMessage(null);
      setConfirmedValue(input.value);
      setIsChangingVote(false);
      // Quórum e contagem exibidos vêm do servidor — nunca de um incremento
      // otimista no cliente.
      router.refresh();
    },
    onError({ error }) {
      setErrorMessage(error.serverError ?? DEFAULT_ERROR);
    },
  });

  const { status, hasVoted: resolvedHasVoted } = deriveVoteState({
    isPending,
    errorMessage,
    confirmedValue,
    hasVoted,
  });

  return (
    <VotePanel
      projectTitle={projectTitle}
      voteSummary={voteSummary}
      hasVoted={resolvedHasVoted}
      confirmedValue={confirmedValue}
      status={status}
      errorMessage={errorMessage}
      isChangingVote={isChangingVote}
      onVote={(inFavor) => {
        setErrorMessage(null);
        execute({ projectId, value: inFavor });
      }}
      onRetry={() => setErrorMessage(null)}
      onRequestChangeVote={() => setIsChangingVote(true)}
      onCancelChangeVote={() => {
        setErrorMessage(null);
        setIsChangingVote(false);
      }}
    />
  );
}
