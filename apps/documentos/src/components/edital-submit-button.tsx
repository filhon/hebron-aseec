import { ExternalLink } from "lucide-react";
import { buildProjetoNovoUrl } from "@hebron/integrations/documentos-projetos";
import type { EditalCycleType } from "@hebron/types/documentos";
import type { EditalStatus } from "./edital-status-pill";

interface EditalSubmitButtonProps {
  editalId: string;
  cycleType: EditalCycleType;
  projectType: string | null;
  projectCategory: string | null;
  status: EditalStatus;
}

export function EditalSubmitButton({
  editalId,
  cycleType,
  projectType,
  projectCategory,
  status,
}: EditalSubmitButtonProps) {
  if (status !== "open" && status !== "closing_soon" && status !== "permanent")
    return null;

  const href = buildProjetoNovoUrl({
    editalId,
    ciclo: cycleType,
    tipo: projectType,
    categoria: projectCategory,
  });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hb-btn hb-btn-accent"
      style={{ fontSize: 14, padding: "10px 20px" }}
    >
      <ExternalLink size={15} aria-hidden="true" />
      Submeter projeto neste edital
    </a>
  );
}
