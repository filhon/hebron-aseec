"use client";

import { useState, useMemo } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Plus,
  MoreHorizontal,
  TrendingUp,
  Building2,
  Heart,
  FileText,
  Download,
  X,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "../actions/categories";
import type { AccountCategory } from "@hebron/types/financeiro";

interface CategoryTreeProps {
  categories: AccountCategory[];
}

interface TreeNode extends AccountCategory {
  children: TreeNode[];
}

function clsx(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export function buildTree(categories: AccountCategory[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const cat of categories) {
    nodeMap.set(cat.id, { ...cat, children: [] });
  }
  for (const node of nodeMap.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(node.parentId);
      parent?.children.push(node);
    }
  }

  roots.sort((a, b) => a.code.localeCompare(b.code));
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code));
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

const ROOT_ICONS: Record<string, React.ReactNode> = {
  "1": <TrendingUp className="h-3.5 w-3.5" />,
  "2": <Building2 className="h-3.5 w-3.5" />,
  "3": <Heart className="h-3.5 w-3.5" />,
  "4": <FileText className="h-3.5 w-3.5" />,
};

const ROOT_COLORS: Record<string, { icon: string; bg: string } | undefined> = {
  receita: { icon: "text-(--hb-green-deep)", bg: "bg-(--hb-green-muted)" },
  despesa: { icon: "text-(--hb-blue)", bg: "bg-(--brand-tint-strong)" },
};

const ROOT_COLOR_DEFAULT = {
  icon: "text-(--fg-muted)",
  bg: "bg-(--surface-alt)",
};

type NodeDepth = 0 | 1 | 2;

function TreeNodeRow({
  node,
  depth,
  expanded,
  onToggle,
  onAddChild,
  onEdit,
}: {
  node: TreeNode;
  depth: NodeDepth;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAddChild?: (parentId: string) => void;
  onEdit?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const rootColor = ROOT_COLORS[node.type] ?? ROOT_COLOR_DEFAULT;

  const paddingLeft = depth === 0 ? "pl-3" : depth === 1 ? "pl-9" : "pl-[52px]";
  const weightClass =
    depth === 0 ? "font-bold" : depth === 1 ? "font-semibold" : "font-medium";
  const textColor =
    depth === 0
      ? "text-(--fg)"
      : depth === 1
        ? "text-(--fg)"
        : "text-(--fg-muted)";
  const fontSize = depth === 2 ? "text-xs" : "text-sm";

  return (
    <>
      <div
        className={clsx(
          "flex items-center gap-2 py-2.5 pr-3 rounded-lg transition-colors select-none cursor-pointer",
          paddingLeft,
          hovered ? "bg-(--surface-alt)" : "",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (hasChildren) onToggle(node.id);
        }}
      >
        {/* Chevron */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {hasChildren ? (
            <ChevronRight
              className={clsx(
                "h-3.5 w-3.5 text-(--fg-muted) transition-transform",
                isOpen && "rotate-90",
              )}
            />
          ) : null}
        </span>

        {/* Root icon */}
        {depth === 0 && (
          <span
            className={clsx(
              "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
              rootColor.bg,
              rootColor.icon,
            )}
          >
            {ROOT_ICONS[node.code] ?? <FileText className="h-3.5 w-3.5" />}
          </span>
        )}

        {/* Code badge */}
        <span className="text-[10px] font-bold tabular-nums text-(--fg-muted) shrink-0">
          {node.code}
        </span>

        {/* Name */}
        <span
          className={clsx(
            weightClass,
            textColor,
            fontSize,
            "flex-1 min-w-0 truncate",
          )}
        >
          {node.name}
        </span>

        {/* Type pill for root */}
        {depth === 0 && (
          <span
            className={clsx(
              "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
              node.type === "receita"
                ? "bg-(--hb-green-muted) text-(--hb-green-deep)"
                : "bg-(--brand-tint-strong) text-(--hb-blue)",
            )}
          >
            {node.type}
          </span>
        )}

        {/* Hover actions */}
        {hovered && (
          <span className="flex items-center gap-1 shrink-0">
            {onAddChild && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(node.id);
                }}
                className="h-6 w-6 flex items-center justify-center rounded text-(--fg-muted) hover:text-(--hb-blue) hover:bg-(--bg-alt) transition-colors"
                title="Adicionar subcategoria"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(node.id);
              }}
              className="h-6 w-6 flex items-center justify-center rounded text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-alt) transition-colors"
              title="Opções"
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isOpen && (
        <>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={Math.min(depth + 1, 2) as NodeDepth}
              expanded={expanded}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
            />
          ))}
        </>
      )}
    </>
  );
}

type ModalState =
  | { mode: "create-root" }
  | { mode: "create-child"; parentId: string; type: "receita" | "despesa" }
  | { mode: "edit"; category: AccountCategory }
  | null;

function suggestNextCode(
  categories: AccountCategory[],
  parentId: string | null,
): string {
  const siblings = categories.filter((c) => c.parentId === parentId);
  if (siblings.length === 0) {
    if (parentId === null) return "1";
    const parent = categories.find((c) => c.id === parentId);
    return parent ? `${parent.code}.1` : "1";
  }
  const lastSegments = siblings.map((c) => {
    const parts = c.code.split(".");
    return parseInt(parts[parts.length - 1] ?? "0", 10) || 0;
  });
  const next = Math.max(...lastSegments) + 1;
  if (parentId === null) return String(next);
  const parent = categories.find((c) => c.id === parentId);
  return parent ? `${parent.code}.${next}` : String(next);
}

function exportCategoriesCsv(categories: AccountCategory[]) {
  const header = "Código,Nome,Tipo,Nível";
  const body = [...categories]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(
      (c) => `${c.code},"${c.name.replace(/"/g, '""')}",${c.type},${c.level}`,
    )
    .join("\n");
  const blob = new Blob(["﻿" + header + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plano-de-contas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function CategoryTree({ categories }: CategoryTreeProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"receita" | "despesa">("despesa");

  const {
    execute: create,
    isPending: isCreating,
    result: createResult,
  } = useAction(createCategory, {
    onSuccess() {
      if (modal?.mode === "create-child") {
        const parentId = modal.parentId;
        setExpanded((prev) => new Set(prev).add(parentId));
      }
      router.refresh();
      setModal(null);
    },
  });
  const {
    execute: update,
    isPending: isUpdating,
    result: updateResult,
  } = useAction(updateCategory, {
    onSuccess() {
      router.refresh();
      setModal(null);
    },
  });
  const {
    execute: destroy,
    isPending: isDeleting,
    result: deleteResult,
  } = useAction(deleteCategory, {
    onSuccess() {
      router.refresh();
      setModal(null);
    },
  });

  function openCreateRoot() {
    setCode(suggestNextCode(categories, null));
    setName("");
    setType("despesa");
    setModal({ mode: "create-root" });
  }

  function openCreateChild(parentId: string) {
    const parent = categories.find((c) => c.id === parentId);
    setCode(suggestNextCode(categories, parentId));
    setName("");
    setType(parent?.type ?? "despesa");
    setModal({
      mode: "create-child",
      parentId,
      type: parent?.type ?? "despesa",
    });
  }

  function openEdit(id: string) {
    const category = categories.find((c) => c.id === id);
    if (!category) return;
    setName(category.name);
    setModal({ mode: "edit", category });
  }

  const tree = useMemo(() => buildTree(categories), [categories]);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(categories.filter((c) => c.level === 1).map((c) => c.id)),
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(categories.map((c) => c.id)));
  const collapseAll = () =>
    setExpanded(
      new Set(categories.filter((c) => c.level === 1).map((c) => c.id)),
    );

  const leafCount = categories.filter((c) => c.level === 3).length;
  const groupCount = categories.filter((c) => c.level === 2).length;
  const rootCount = tree.length;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Tree panel */}
        <div className="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--border)">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted)">
                Plano de contas · {new Date().getFullYear()}
              </p>
              <p className="font-semibold text-(--fg) text-sm mt-0.5">
                Estrutura hierárquica
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCategoriesCsv(categories)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--border) text-xs font-semibold text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg) transition-colors"
              >
                <Download className="h-3 w-3" />
                Exportar
              </button>
              <button
                onClick={openCreateRoot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--hb-blue) text-(--fg-invert) text-xs font-semibold hover:bg-(--hb-blue-soft) transition-colors"
              >
                <Plus className="h-3 w-3" />
                Nova categoria
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 border-b border-(--divider) bg-(--bg-alt)">
            <button
              onClick={expandAll}
              className="text-xs text-(--hb-blue) font-semibold hover:underline"
            >
              Expandir tudo
            </button>
            <span className="text-(--divider)">·</span>
            <button
              onClick={collapseAll}
              className="text-xs text-(--fg-muted) font-semibold hover:underline"
            >
              Recolher
            </button>
          </div>

          <div
            className="px-2 py-2"
            style={{ maxHeight: 520, overflowY: "auto" }}
          >
            {tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-(--fg-muted)">
                <FileText className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhuma categoria cadastrada.</p>
              </div>
            ) : (
              tree.map((root) => (
                <TreeNodeRow
                  key={root.id}
                  node={root}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  onAddChild={openCreateChild}
                  onEdit={openEdit}
                />
              ))
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          <div className="rounded-(--radius) border border-(--border) bg-(--surface) px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted) mb-3">
              Estrutura atual
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-(--hb-green-muted) text-(--hb-green-deep)">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {rootCount} categorias-raiz
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-(--brand-tint-strong) text-(--hb-blue)">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {groupCount} grupos
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-(--surface-alt) text-(--fg-muted)">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {leafCount} contas folha
              </span>
            </div>
            <p className="text-sm text-(--fg-muted) leading-relaxed mt-3">
              O plano começa com a estrutura sugerida — quatro grupos: receitas,
              despesas operacionais, missionárias e tributos. Tudo pode ser
              editado e expandido conforme a operação cresce.
            </p>
          </div>

          <div className="rounded-(--radius) bg-(--hb-blue) text-(--fg-invert) px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--hb-cyan) mb-2">
              Boa prática
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Use níveis de detalhe apenas onde houver decisão a ser tomada.
              Categoria demais cria ruído na DRE.
            </p>
          </div>
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-(--z-overlay) flex justify-end"
          style={{ background: "var(--overlay)" }}
          onClick={() => setModal(null)}
        >
          <div
            className="w-120 max-w-full flex flex-col h-full"
            style={{
              background: "var(--bg)",
              animation: "slide-in 220ms var(--ease-out)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-3 px-6 py-5 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <p
                className="text-xl font-bold flex-1"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--fg)",
                }}
              >
                {modal.mode === "edit" ? "Editar categoria" : "Nova categoria"}
              </p>
              <button
                onClick={() => setModal(null)}
                className="flex items-center justify-center w-9 h-9 rounded-(--radius)"
                style={{ color: "var(--fg-muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {modal.mode !== "edit" && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5 text-(--fg-muted)">
                      Código
                    </label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-(--radius) border text-sm outline-none border-(--border) bg-(--bg) text-(--fg)"
                      placeholder="Ex: 1.1.4"
                    />
                  </div>
                  {modal.mode === "create-root" && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5 text-(--fg-muted)">
                        Tipo
                      </label>
                      <select
                        value={type}
                        onChange={(e) =>
                          setType(e.target.value as "receita" | "despesa")
                        }
                        className="w-full px-3 py-2.5 rounded-(--radius) border text-sm outline-none border-(--border) bg-(--bg) text-(--fg)"
                      >
                        <option value="despesa">Despesa</option>
                        <option value="receita">Receita</option>
                      </select>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5 text-(--fg-muted)">
                  Nome
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-(--radius) border text-sm outline-none border-(--border) bg-(--bg) text-(--fg)"
                  placeholder="Nome da categoria"
                />
              </div>

              {(createResult.serverError ||
                updateResult.serverError ||
                deleteResult.serverError) && (
                <p className="flex items-center gap-1 text-xs font-medium text-(--hb-orange-deep)">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {createResult.serverError ??
                    updateResult.serverError ??
                    deleteResult.serverError}
                </p>
              )}
            </div>

            <div
              className="flex items-center justify-between gap-3 px-6 py-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              {modal.mode === "edit" && !modal.category.isSystem ? (
                <button
                  onClick={() => destroy({ categoryId: modal.category.id })}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 text-xs font-semibold text-(--color-destructive) disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold border-(--border) text-(--fg)"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (modal.mode === "edit") {
                      update({ categoryId: modal.category.id, name });
                    } else if (modal.mode === "create-child") {
                      create({
                        code,
                        name,
                        type: modal.type,
                        parentId: modal.parentId,
                      });
                    } else {
                      create({ code, name, type, parentId: null });
                    }
                  }}
                  disabled={isCreating || isUpdating || !name}
                  className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold disabled:opacity-60"
                  style={{
                    background: "var(--hb-blue)",
                    color: "var(--fg-invert)",
                  }}
                >
                  {isCreating || isUpdating ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
