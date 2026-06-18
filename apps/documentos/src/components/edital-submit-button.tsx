import { ExternalLink } from "lucide-react";

const PROJETOS_NOVO = "https://projetos.hebronaseec.com.br/novo";

interface EditalSubmitButtonProps {
  editalId: string;
  projectType: string | null;
  projectCategory: string | null;
  status: "open" | "closed" | "permanent" | "upcoming";
}

export function EditalSubmitButton({
  editalId,
  projectType,
  projectCategory,
  status,
}: EditalSubmitButtonProps) {
  if (status !== "open" && status !== "permanent") return null;

  const params = new URLSearchParams({ edital_id: editalId });
  if (projectType) params.set("tipo", projectType);
  if (projectCategory) params.set("categoria", projectCategory);

  return (
    <a
      href={`${PROJETOS_NOVO}?${params.toString()}`}
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
