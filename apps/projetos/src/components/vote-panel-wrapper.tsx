"use client";

import { VotePanel } from "./vote-panel";
import type { VoteSummary } from "@hebron/types";

interface VotePanelWrapperProps {
  projectTitle: string;
  voteSummary: VoteSummary;
  hasVoted: boolean;
}

export function VotePanelWrapper({
  projectTitle,
  voteSummary,
  hasVoted,
}: VotePanelWrapperProps) {
  return (
    <VotePanel
      projectTitle={projectTitle}
      voteSummary={voteSummary}
      hasVoted={hasVoted}
      onVote={(inFavor) => {
        console.log("Vote:", inFavor ? "Sim" : "Não");
      }}
    />
  );
}
