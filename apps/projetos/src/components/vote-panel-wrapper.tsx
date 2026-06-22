"use client";

import { useAction } from "next-safe-action/hooks";
import { VotePanel } from "./vote-panel";
import { castVote } from "../actions/voting";
import type { VoteSummary } from "@hebron/types";

interface VotePanelWrapperProps {
  projectId: string;
  projectTitle: string;
  voteSummary: VoteSummary;
  hasVoted: boolean;
}

export function VotePanelWrapper({
  projectId,
  projectTitle,
  voteSummary,
  hasVoted,
}: VotePanelWrapperProps) {
  const { execute, isPending } = useAction(castVote);

  return (
    <VotePanel
      projectTitle={projectTitle}
      voteSummary={voteSummary}
      hasVoted={hasVoted || isPending}
      onVote={(inFavor) => execute({ projectId, value: inFavor })}
    />
  );
}
