"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Filter, LayoutGrid, X, AlertTriangle } from "lucide-react";
import { getKanbanProjects } from "../../../lib/queries";
import { transitionProjectStage } from "../../../actions/projects";
import { ProjectKanban } from "../../../components/project-kanban";
import { KanbanSkeleton } from "../../../components/kanban-skeleton";
import { BRL } from "../../../lib/stage-utils";
import type { CompactProjectView, ProjectStage } from "@hebron/types";

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

/** Opções do filtro de ano (P-2.4c). Antes era uma lista literal de 2024–2026,
 * que congelava a cada virada de ano e deixava fora do filtro justamente os
 * projetos novos — o wizard sugere `ano de referência = ano atual + 1`. Aqui os
 * anos vêm dos projetos que de fato existem (o kanban já traz todos os não
 * soft-deleted visíveis pela RLS), unidos ao ano corrente e ao seguinte para
 * que ambos constem mesmo sem projeto algum naquele ano. */
function buildYearOptions(
  projects: CompactProjectView[],
): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear, currentYear + 1]);
  for (const p of projects) {
    if (p.anoReferencia !== null) years.add(p.anoReferencia);
  }

  return [
    { value: "", label: "Todos os anos" },
    ...[...years]
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) })),
  ];
}

function EmptyPipelineNoFilters() {
  return (
    <div
      className="rounded-lg border border-dashed px-8 py-16 flex flex-col items-center text-center gap-5"
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
      className="rounded-lg border px-8 py-14 flex flex-col items-center text-center gap-4"
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
        className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-semibold transition-colors hover:border-(--brand) hover:text-(--brand)"
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
  const [allProjects, setAllProjects] = useState<CompactProjectView[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [ano, setAno] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    void getKanbanProjects().then((ps) => {
      setAllProjects(ps);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { execute: moveProject } = useAction(transitionProjectStage, {
    onSuccess() {
      setMoveError(null);
      refetch();
    },
    onError({ error }) {
      setMoveError(
        error.serverError ??
          "Não foi possível mover o projeto para este estágio.",
      );
      refetch();
    },
  });

  const filtered = allProjects.filter((p) => {
    if (categoria && p.categoria !== categoria) return false;
    if (tipo && p.type !== tipo) return false;
    if (ano && p.anoReferencia !== null && String(p.anoReferencia) !== ano)
      return false;
    return true;
  });

  const activeCount = filtered.filter(
    (p) => !["reprovado", "concluido"].includes(p.stage),
  ).length;

  const totalValue = filtered
    .filter((p) => p.stage !== "reprovado")
    .reduce((sum, p) => sum + p.valorTotal, 0);

  const pendingVotes = filtered.filter((p) => p.stage === "votacao").length;

  const hasActiveFilters = Boolean(categoria || tipo || ano);

  const yearOptions = buildYearOptions(allProjects);

  function clearFilters() {
    setCategoria("");
    setTipo("");
    setAno("");
  }

  function handleMove(projectId: string, targetStage: ProjectStage) {
    moveProject({ projectId, toStage: targetStage });
  }

  function handleCardClick(projectId: string) {
    router.push(`/pipeline/${projectId}`);
  }

  if (loading) {
    return <KanbanSkeleton />;
  }

  return (
    <div className="px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="hb-eyebrow mb-1">Diretoria</p>
          <h1
            className="text-2xl font-bold text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Pipeline de Projetos
          </h1>
          <p className="text-sm text-(--fg-muted) mt-1">
            {allProjects.length} projetos no portfólio · {activeCount} ativos
          </p>
        </div>

        {/* Summary chips */}
        <div className="hidden sm:flex items-center gap-2">
          {pendingVotes > 0 && (
            <div className="rounded-full px-3 py-1 text-xs font-semibold bg-(--brand-muted) text-(--brand)">
              {pendingVotes} em votação
            </div>
          )}
          <div className="rounded-full px-3 py-1 text-xs font-semibold bg-(--surface-alt) text-(--fg-muted) border border-(--border)">
            {BRL.format(totalValue)} alocado
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-(--fg-muted) shrink-0">
          <Filter className="w-4 h-4" aria-hidden />
          Filtrar:
        </div>

        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
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
          className="rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
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
          className="rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
          aria-label="Ano"
        >
          {yearOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-(--fg-muted) cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="rounded border-(--border) text-(--brand) focus:ring-(--brand)"
          />
          Exibir encerrados
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-(--fg-muted) hover:text-(--color-destructive) transition-colors underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Move error */}
      {moveError && (
        <div className="rounded-md border border-(--color-destructive) bg-(--color-destructive-muted) px-4 py-3 flex items-center gap-2.5">
          <AlertTriangle
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--color-destructive)" }}
            aria-hidden
          />
          <p className="text-sm text-(--color-destructive)">{moveError}</p>
        </div>
      )}

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
