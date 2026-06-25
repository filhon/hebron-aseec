"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  Plus,
  MoreHorizontal,
  TrendingUp,
  Building2,
  Heart,
  FileText,
  Download,
  Link,
  BarChart3,
} from "lucide-react";
import type { AccountCategory } from "@hebron/types/financeiro";

interface CategoryTreeProps {
  categories: AccountCategory[];
  onAddChild?: (parentId: string) => void;
  onAddRoot?: () => void;
  onEdit?: (id: string) => void;
  onExport?: () => void;
}

interface TreeNode extends AccountCategory {
  children: TreeNode[];
}

function clsx(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function buildTree(categories: AccountCategory[]): TreeNode[] {
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
  receita: {
    icon: "text-(--hb-green-deep)",
    bg: "bg-(--hb-green-muted)",
  },
  despesa: {
    icon: "text-(--hb-blue)",
    bg: "bg-[rgba(32,44,133,0.10)]",
  },
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
          "flex items-center gap-2 py-2.5 pr-3 rounded-lg transition-colors cursor-pointer",
          paddingLeft,
          hovered ? "bg-(--surface-alt)" : "",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => hasChildren && onToggle(node.id)}
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
                : "bg-[rgba(32,44,133,0.10)] text-(--hb-blue)",
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

export function CategoryTree({
  categories,
  onAddChild,
  onAddRoot,
  onEdit,
  onExport,
}: CategoryTreeProps) {
  const tree = useMemo(() => buildTree(categories), [categories]);

  // Start with all root nodes expanded
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(categories.filter((c) => c.level === 1).map((c) => c.id)),
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      {/* Tree panel */}
      <div className="rounded-xl border border-(--border) bg-(--surface) overflow-hidden">
        {/* Header */}
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
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--border) text-xs font-semibold text-(--fg-muted) hover:border-(--border-strong) hover:text-(--fg) transition-colors"
            >
              <Download className="h-3 w-3" />
              Exportar
            </button>
            {onAddRoot && (
              <button
                onClick={onAddRoot}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--hb-blue) text-(--fg-invert) text-xs font-semibold hover:bg-(--hb-blue-soft) transition-colors"
              >
                <Plus className="h-3 w-3" />
                Nova categoria
              </button>
            )}
          </div>
        </div>

        {/* Expand / Collapse controls */}
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

        {/* Tree */}
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
                onAddChild={onAddChild}
                onEdit={onEdit}
              />
            ))
          )}
        </div>
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-4">
        {/* Stats card */}
        <div className="rounded-xl border border-(--border) bg-(--surface) px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted) mb-3">
            Estrutura atual
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-(--hb-green-muted) text-(--hb-green-deep)">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {rootCount} categorias-raiz
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[rgba(32,44,133,0.10)] text-(--hb-blue)">
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

        {/* Quick actions */}
        <div className="rounded-xl border border-(--border) bg-(--surface) px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted) mb-3">
            Operações comuns
          </p>
          <div className="flex flex-col gap-2">
            {[
              {
                label: "Importar plano padrão CFC",
                icon: <Download className="h-3.5 w-3.5" />,
              },
              {
                label: "Vincular a centros de custo",
                icon: <Link className="h-3.5 w-3.5" />,
              },
              {
                label: "Gerar DRE preliminar",
                icon: <BarChart3 className="h-3.5 w-3.5" />,
              },
              {
                label: "Exportar para contabilidade",
                icon: <FileText className="h-3.5 w-3.5" />,
              },
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-(--border) bg-(--bg) text-sm font-medium text-(--fg) text-left hover:border-(--border-strong) hover:bg-(--bg-alt) transition-colors"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-(--surface-alt) text-(--hb-blue) shrink-0">
                  {action.icon}
                </span>
                <span className="flex-1">{action.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-(--fg-muted)" />
              </button>
            ))}
          </div>
        </div>

        {/* Tip card */}
        <div className="rounded-xl bg-(--hb-blue) text-(--fg-invert) px-5 py-4">
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
  );
}
