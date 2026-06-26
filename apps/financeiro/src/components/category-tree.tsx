"use client";

import { useState, useMemo, useCallback } from "react";
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
  GripVertical,
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

interface DragState {
  id: string;
  parentId: string | null;
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

function buildOrderMap(
  nodes: TreeNode[],
  parentId: string | null,
  map: Map<string | null, string[]>,
) {
  map.set(
    parentId,
    nodes.map((n) => n.id),
  );
  for (const n of nodes) {
    if (n.children.length > 0) buildOrderMap(n.children, n.id, map);
  }
}

function reorder<T>(arr: T[], fromIdx: number, toIdx: number): T[] {
  const result = [...arr];
  const item = result.splice(fromIdx, 1)[0];
  if (item === undefined) return result;
  result.splice(toIdx, 0, item);
  return result;
}

const ROOT_ICONS: Record<string, React.ReactNode> = {
  "1": <TrendingUp className="h-3.5 w-3.5" />,
  "2": <Building2 className="h-3.5 w-3.5" />,
  "3": <Heart className="h-3.5 w-3.5" />,
  "4": <FileText className="h-3.5 w-3.5" />,
};

const ROOT_COLORS: Record<string, { icon: string; bg: string } | undefined> = {
  receita: { icon: "text-(--hb-green-deep)", bg: "bg-(--hb-green-muted)" },
  despesa: { icon: "text-(--hb-blue)", bg: "bg-[rgba(32,44,133,0.10)]" },
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
  onReorder,
  dragState,
  setDragState,
  dropTargetId,
  setDropTargetId,
}: {
  node: TreeNode;
  depth: NodeDepth;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAddChild?: (parentId: string) => void;
  onEdit?: (id: string) => void;
  onReorder: (parentId: string | null, fromId: string, toId: string) => void;
  dragState: DragState | null;
  setDragState: (s: DragState | null) => void;
  dropTargetId: string | null;
  setDropTargetId: (id: string | null) => void;
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

  const isDragging = dragState?.id === node.id;
  // Can only drop onto same-level siblings
  const canReceiveDrop =
    dragState !== null &&
    dragState.parentId === node.parentId &&
    dragState.id !== node.id;
  const isDropTarget = dropTargetId === node.id && canReceiveDrop;

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", node.id);
    setDragState({ id: node.id, parentId: node.parentId });
  }

  function handleDragOver(e: React.DragEvent) {
    if (!canReceiveDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetId(node.id);
  }

  function handleDragLeave() {
    if (dropTargetId === node.id) setDropTargetId(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!canReceiveDrop || !dragState) return;
    onReorder(node.parentId, dragState.id, node.id);
    setDragState(null);
    setDropTargetId(null);
  }

  function handleDragEnd() {
    setDragState(null);
    setDropTargetId(null);
  }

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        className={clsx(
          "flex items-center gap-2 py-2.5 pr-3 rounded-lg transition-colors select-none",
          paddingLeft,
          isDragging ? "opacity-40" : "cursor-pointer",
          !isDragging && hovered ? "bg-(--surface-alt)" : "",
        )}
        style={{
          borderTop: isDropTarget
            ? "2px solid var(--hb-blue)"
            : "2px solid transparent",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (!dragState && hasChildren) onToggle(node.id);
        }}
      >
        {/* Drag handle — visible on hover */}
        <span
          className={clsx(
            "shrink-0 transition-opacity",
            hovered && !isDragging ? "opacity-100 cursor-grab" : "opacity-0",
          )}
          style={{ width: 12 }}
        >
          <GripVertical className="h-3 w-3 text-(--fg-muted)" />
        </span>

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
        {hovered && !isDragging && (
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
              onReorder={onReorder}
              dragState={dragState}
              setDragState={setDragState}
              dropTargetId={dropTargetId}
              setDropTargetId={setDropTargetId}
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
  const baseTree = useMemo(() => buildTree(categories), [categories]);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(categories.filter((c) => c.level === 1).map((c) => c.id)),
  );

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Tracks user-defined order per parent (null = roots)
  const [orderMap, setOrderMap] = useState<Map<string | null, string[]>>(() => {
    const map = new Map<string | null, string[]>();
    buildOrderMap(baseTree, null, map);
    return map;
  });

  // Apply orderMap on top of baseTree
  const orderedTree = useMemo(() => {
    function applyOrder(
      nodes: TreeNode[],
      parentId: string | null,
    ): TreeNode[] {
      const order = orderMap.get(parentId);
      const sorted = order
        ? order
            .map((id) => nodes.find((n) => n.id === id))
            .filter((n): n is TreeNode => n !== undefined)
        : nodes;
      return sorted.map((n) => ({
        ...n,
        children: applyOrder(n.children, n.id),
      }));
    }
    return applyOrder(baseTree, null);
  }, [baseTree, orderMap]);

  const handleReorder = useCallback(
    (parentId: string | null, fromId: string, toId: string) => {
      setOrderMap((prev) => {
        const current = prev.get(parentId) ?? [];
        const fromIdx = current.indexOf(fromId);
        const toIdx = current.indexOf(toId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
        const next = new Map(prev);
        next.set(parentId, reorder(current, fromIdx, toIdx));
        return next;
      });
    },
    [],
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
  const rootCount = orderedTree.length;

  return (
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
          <span className="ml-auto flex items-center gap-1 text-[10px] text-(--fg-muted) font-medium">
            <GripVertical className="h-3 w-3" />
            Arraste para reordenar
          </span>
        </div>

        <div
          className="px-2 py-2"
          style={{ maxHeight: 520, overflowY: "auto" }}
        >
          {orderedTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-(--fg-muted)">
              <FileText className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma categoria cadastrada.</p>
            </div>
          ) : (
            orderedTree.map((root) => (
              <TreeNodeRow
                key={root.id}
                node={root}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onReorder={handleReorder}
                dragState={dragState}
                setDragState={setDragState}
                dropTargetId={dropTargetId}
                setDropTargetId={setDropTargetId}
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

        <div className="rounded-(--radius) border border-(--border) bg-(--surface) px-5 py-4">
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
                className="flex items-center gap-3 px-4 py-3 rounded-(--radius) border border-(--border) bg-(--bg) text-sm font-medium text-(--fg) text-left hover:border-(--border-strong) hover:bg-(--bg-alt) transition-colors"
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
  );
}
