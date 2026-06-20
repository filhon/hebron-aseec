"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { mockCompactProjects } from "../../lib/mock-data";
import { ProjectKanban } from "../../components/project-kanban";
import type { ProjectStage } from "@hebron/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas as categorias" },
  { value: "evangelismo", label: "Evangelismo" },
  { value: "missoes_transculturais", label: "Missões Transculturais" },
  { value: "educacao_crista", label: "Educação Cristã" },
  { value: "assistencia_social", label: "Assistência Social" },
  { value: "saude", label: "Saúde" },
  { value: "capacitacao_lideranca", label: "Capacitação de Liderança" },
  { value: "infraestrutura_ministerial", label: "Infraestrutura Ministerial" },
  { value: "plantacao_de_igrejas", label: "Plantação de Igrejas" },
  { value: "discipulado", label: "Discipulado" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "anual", label: "Anual" },
  { value: "pontual", label: "Pontual" },
];

const YEAR_OPTIONS = [
  { value: "", label: "Todos os anos" },
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
];

export default function DiretoriaPipelinePage() {
  const router = useRouter();
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [ano, setAno] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  const filtered = mockCompactProjects.filter((p) => {
    if (categoria && p.categoria !== categoria) return false;
    if (tipo && p.type !== tipo) return false;
    if (ano && p.anoReferencia !== null && String(p.anoReferencia) !== ano)
      return false;
    return true;
  });

  const activeCount = filtered.filter(
    (p) => !["cancelado", "reprovado", "concluido"].includes(p.stage),
  ).length;

  const totalValue = filtered
    .filter((p) => !["cancelado", "reprovado"].includes(p.stage))
    .reduce((sum, p) => sum + p.valorTotal, 0);

  const pendingVotes = filtered.filter((p) => p.stage === "votacao").length;

  function handleMove(projectId: string, targetStage: ProjectStage) {
    // In production, this would call a server action
    console.log("Move", projectId, "→", targetStage);
  }

  function handleCardClick(projectId: string) {
    router.push(`/${projectId}`);
  }

  return (
    <div className="px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="hb-eyebrow mb-1">Diretoria</p>
          <h1
            className="text-2xl font-bold text-[--fg]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Pipeline de Projetos
          </h1>
          <p className="text-sm text-[--fg-muted] mt-1">
            {mockCompactProjects.length} projetos no portfólio · {activeCount}{" "}
            ativos
          </p>
        </div>

        {/* Summary chips */}
        <div className="hidden sm:flex items-center gap-2">
          {pendingVotes > 0 && (
            <div className="rounded-full px-3 py-1 text-xs font-semibold bg-[--brand-muted] text-[--brand]">
              {pendingVotes} em votação
            </div>
          )}
          <div className="rounded-full px-3 py-1 text-xs font-semibold bg-[--surface-alt] text-[--fg-muted] border border-[--border]">
            {BRL.format(totalValue)} alocado
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-[--fg-muted] shrink-0">
          <Filter className="w-4 h-4" aria-hidden />
          Filtrar:
        </div>

        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-[--radius] border border-[--border] bg-[--surface] px-3 py-1.5 text-sm text-[--fg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand]"
          aria-label="Categoria"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded-[--radius] border border-[--border] bg-[--surface] px-3 py-1.5 text-sm text-[--fg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand]"
          aria-label="Tipo"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={ano}
          onChange={(e) => setAno(e.target.value)}
          className="rounded-[--radius] border border-[--border] bg-[--surface] px-3 py-1.5 text-sm text-[--fg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand]"
          aria-label="Ano"
        >
          {YEAR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-[--fg-muted] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="rounded border-[--border] text-[--brand] focus:ring-[--brand]"
          />
          Exibir encerrados
        </label>

        {(categoria || tipo || ano) && (
          <button
            type="button"
            onClick={() => {
              setCategoria("");
              setTipo("");
              setAno("");
            }}
            className="text-xs text-[--fg-muted] hover:text-[--color-destructive] transition-colors underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Kanban */}
      <ProjectKanban
        projects={filtered}
        canDrag
        showClosed={showClosed}
        onMove={handleMove}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
