"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, LayoutGrid, X } from "lucide-react";
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

function EmptyPipelineNoFilters() {
  return (
    <div
      className="rounded-[--radius-lg] border border-dashed px-8 py-16 flex flex-col items-center text-center gap-5"
      style={{
        borderColor: "var(--hb-gray-200)",
        backgroundColor: "var(--bg-alt)",
      }}
    >
      <div className="relative w-16 h-16 shrink-0">
        <div
          className="absolute inset-0 rounded-2xl -rotate-6"
          style={{ backgroundColor: "var(--brand-muted)" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "var(--hb-blue)" }}
          aria-hidden
        >
          <LayoutGrid className="w-7 h-7 text-white" aria-hidden />
        </div>
      </div>

      <div>
        <h3
          className="text-lg font-bold mb-1.5"
          style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
        >
          Nenhum projeto no portfólio ainda
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--fg-muted)" }}
        >
          Quando submissores enviarem projetos, eles aparecerão aqui
          <br className="hidden sm:block" />
          para análise, votação e acompanhamento da diretoria.
        </p>
        <p
          className="text-xs mt-4 italic leading-relaxed"
          style={{ color: "var(--fg-subtle)" }}
        >
          "Sem visão o povo perece."
          <br />— Provérbios 29:18
        </p>
      </div>
    </div>
  );
}

function EmptyPipelineFiltered({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="rounded-[--radius-lg] border px-8 py-14 flex flex-col items-center text-center gap-4"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-alt)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "var(--hb-gray-100)" }}
      >
        <Filter
          className="w-5 h-5"
          style={{ color: "var(--fg-muted)" }}
          aria-hidden
        />
      </div>
      <div>
        <h3
          className="text-base font-bold mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
        >
          Nenhum projeto encontrado
        </h3>
        <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
          Os filtros aplicados não retornaram resultados.
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-[--radius-md] border px-4 py-2 text-sm font-semibold transition-colors hover:border-[--brand] hover:text-[--brand]"
        style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
      >
        <X className="w-3.5 h-3.5" aria-hidden />
        Limpar filtros
      </button>
    </div>
  );
}

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

  const hasActiveFilters = Boolean(categoria || tipo || ano);

  function clearFilters() {
    setCategoria("");
    setTipo("");
    setAno("");
  }

  function handleMove(projectId: string, targetStage: ProjectStage) {
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

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-[--fg-muted] hover:text-[--color-destructive] transition-colors underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Kanban / empty states */}
      {filtered.length === 0 ? (
        hasActiveFilters ? (
          <EmptyPipelineFiltered onClear={clearFilters} />
        ) : (
          <EmptyPipelineNoFilters />
        )
      ) : (
        <ProjectKanban
          projects={filtered}
          canDrag
          showClosed={showClosed}
          onMove={handleMove}
          onCardClick={handleCardClick}
        />
      )}
    </div>
  );
}
