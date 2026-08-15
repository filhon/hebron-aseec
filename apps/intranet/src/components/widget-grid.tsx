"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { GripVertical, MoveDiagonal } from "lucide-react";

// Grid de 3 colunas × linhas de 60px (patterns.css, .hb-widget-grid). O
// widget nunca tem medida livre: largura de 1 a 3 colunas, altura de 2 a 12
// linhas, sempre encaixada. As guias do grid aparecem enquanto o usuário
// arrasta ou redimensiona — a personalização é discreta, não contínua.
export const WIDGET_MIN_WIDTH = 1;
export const WIDGET_MAX_WIDTH = 3;
export const WIDGET_MIN_HEIGHT = 2;
export const WIDGET_MAX_HEIGHT = 12;

const FALLBACK_ROW_HEIGHT = 60;

export interface WidgetSize {
  /** Colunas ocupadas (1–3). */
  w: number;
  /** Linhas ocupadas (2–12). */
  h: number;
}

export interface WidgetGridItem extends WidgetSize {
  id: string;
  label: string;
  content: ReactNode;
}

export interface WidgetGridProps {
  items: WidgetGridItem[];
  onReorder?: (orderedIds: string[]) => void;
  onResize?: (id: string, size: WidgetSize) => void;
  className?: string;
}

interface GridMetrics {
  cols: number;
  rows: number;
  colWidth: number;
  rowHeight: number;
  gap: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Lê as pistas reais do grid (colunas, altura de linha, gap) do CSS em vez de
 * repetir os breakpoints em JS — patterns.css é a única fonte da verdade do
 * layout, aqui só medimos o que ele resolveu.
 */
function readMetrics(grid: HTMLElement): GridMetrics {
  const styles = getComputedStyle(grid);
  const tracks = styles.gridTemplateColumns.split(" ").filter(Boolean);
  const rect = grid.getBoundingClientRect();
  const cols = Math.max(1, tracks.length);
  const gap = Number.parseFloat(styles.rowGap) || 0;
  const rowHeight =
    Number.parseFloat(styles.gridAutoRows) || FALLBACK_ROW_HEIGHT;
  const colWidth =
    Number.parseFloat(tracks[0] ?? "") ||
    (rect.width - gap * (cols - 1)) / cols;
  const rows = Math.max(1, Math.round((rect.height + gap) / (rowHeight + gap)));
  return { cols, rows, colWidth, rowHeight, gap };
}

function sameMetrics(a: GridMetrics, b: GridMetrics): boolean {
  return (
    a.cols === b.cols &&
    a.rows === b.rows &&
    a.colWidth === b.colWidth &&
    a.rowHeight === b.rowHeight &&
    a.gap === b.gap
  );
}

function sizeDescription(size: WidgetSize): string {
  const columns = size.w === 1 ? "1 coluna" : `${size.w} colunas`;
  const rows = size.h === 1 ? "1 linha" : `${size.h} linhas`;
  return `${columns} por ${rows}`;
}

export function WidgetGrid({
  items,
  onReorder,
  onResize,
  className,
}: WidgetGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<GridMetrics | null>(null);
  const [preview, setPreview] = useState<(WidgetSize & { id: string }) | null>(
    null,
  );
  const dragStart = useRef<
    (WidgetSize & { id: string; x: number; y: number }) | null
  >(null);
  const metricsRef = useRef<GridMetrics | null>(null);

  const editing = draggingId !== null || preview !== null;

  const captureMetrics = useCallback((): GridMetrics | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const next = readMetrics(grid);
    metricsRef.current = next;
    setMetrics((current) =>
      current && sameMetrics(current, next) ? current : next,
    );
    return next;
  }, []);

  // Enquanto as guias estão visíveis o grid muda de altura a cada passo do
  // redimensionamento — o observer mantém a malha cobrindo a área inteira.
  useEffect(() => {
    const grid = gridRef.current;
    if (!editing || !grid || typeof ResizeObserver === "undefined") return;
    captureMetrics();
    const observer = new ResizeObserver(() => captureMetrics());
    observer.observe(grid);
    return () => observer.disconnect();
  }, [editing, captureMetrics]);

  function moveTo(id: string, targetIndex: number) {
    const currentIds = items.map((item) => item.id);
    const from = currentIds.indexOf(id);
    if (
      from === -1 ||
      targetIndex < 0 ||
      targetIndex >= currentIds.length ||
      from === targetIndex
    ) {
      return;
    }
    const next = [...currentIds];
    next.splice(from, 1);
    next.splice(targetIndex, 0, id);
    onReorder?.(next);
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const targetIndex = items.findIndex((item) => item.id === targetId);
    moveTo(draggingId, targetIndex);
    setDraggingId(null);
  }

  function maxWidth(): number {
    return Math.min(
      WIDGET_MAX_WIDTH,
      metricsRef.current?.cols ?? WIDGET_MAX_WIDTH,
    );
  }

  function commitResize(id: string, size: WidgetSize) {
    const item = items.find((candidate) => candidate.id === id);
    if (item && item.w === size.w && item.h === size.h) return;
    onResize?.(id, size);
  }

  function handleResizeStart(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: WidgetGridItem,
  ) {
    if (event.button !== 0 || !onResize) return;
    event.preventDefault();
    event.stopPropagation();
    captureMetrics();
    dragStart.current = {
      id: item.id,
      x: event.clientX,
      y: event.clientY,
      w: item.w,
      h: item.h,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreview({ id: item.id, w: item.w, h: item.h });
  }

  function handleResizeMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = dragStart.current;
    const grid = metricsRef.current;
    if (!start || !grid) return;
    const deltaCols = Math.round(
      (event.clientX - start.x) / (grid.colWidth + grid.gap),
    );
    const deltaRows = Math.round(
      (event.clientY - start.y) / (grid.rowHeight + grid.gap),
    );
    const w = clamp(start.w + deltaCols, WIDGET_MIN_WIDTH, maxWidth());
    const h = clamp(start.h + deltaRows, WIDGET_MIN_HEIGHT, WIDGET_MAX_HEIGHT);
    setPreview((current) =>
      current && current.w === w && current.h === h
        ? current
        : { id: start.id, w, h },
    );
  }

  function handleResizeEnd() {
    const start = dragStart.current;
    if (start && preview && preview.id === start.id) {
      commitResize(start.id, { w: preview.w, h: preview.h });
    }
    dragStart.current = null;
    setPreview(null);
  }

  // Alternativa de teclado ao arraste do canto: setas ajustam largura e
  // altura em passos de uma célula.
  function handleResizeKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    item: WidgetGridItem,
  ) {
    const steps: Record<string, WidgetSize> = {
      ArrowRight: { w: 1, h: 0 },
      ArrowLeft: { w: -1, h: 0 },
      ArrowDown: { w: 0, h: 1 },
      ArrowUp: { w: 0, h: -1 },
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    captureMetrics();
    commitResize(item.id, {
      w: clamp(item.w + step.w, WIDGET_MIN_WIDTH, maxWidth()),
      h: clamp(item.h + step.h, WIDGET_MIN_HEIGHT, WIDGET_MAX_HEIGHT),
    });
  }

  const guideCells = editing && metrics ? metrics.cols * (metrics.rows + 1) : 0;

  return (
    <div
      ref={gridRef}
      data-resizing={preview !== null ? "true" : undefined}
      className={`hb-widget-grid ${className ?? ""}`}
    >
      {guideCells > 0 && metrics && (
        <div
          aria-hidden="true"
          className="hb-widget-guides"
          style={{
            gridTemplateColumns: `repeat(${metrics.cols}, minmax(0, 1fr))`,
            gridAutoRows: `${metrics.rowHeight}px`,
            gap: `${metrics.gap}px`,
          }}
        >
          {Array.from({ length: guideCells }).map((_, index) => (
            <div key={index} className="hb-widget-guide-cell" />
          ))}
        </div>
      )}

      {items.map((item, index) => {
        const selectId = `widget-position-${item.id}`;
        const size =
          preview && preview.id === item.id
            ? { w: preview.w, h: preview.h }
            : { w: item.w, h: item.h };
        const resizing = preview?.id === item.id;

        return (
          <div
            key={item.id}
            draggable={preview === null}
            onDragStart={() => {
              captureMetrics();
              setDraggingId(item.id);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(item.id)}
            onDragEnd={() => setDraggingId(null)}
            data-w={size.w}
            style={{ "--hb-widget-h": size.h } as CSSProperties}
            className={`hb-widget-cell group transition-opacity duration-(--transition-fast) ${
              draggingId === item.id ? "opacity-40" : ""
            }`}
          >
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
              <div
                className="hidden cursor-grab text-(--fg-muted) group-hover:block active:cursor-grabbing"
                aria-hidden="true"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <label htmlFor={selectId} className="sr-only">
                Mover &quot;{item.label}&quot; para outra posição
              </label>
              <select
                id={selectId}
                value={String(index + 1)}
                onChange={(event) =>
                  moveTo(item.id, Number(event.target.value) - 1)
                }
                className="h-7 rounded-sm border border-(--border) bg-(--surface) px-1.5 text-xs text-(--fg-muted) shadow-(--shadow-sm) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
              >
                {items.map((_, position) => (
                  <option key={position} value={position + 1}>
                    Posição {position + 1}
                  </option>
                ))}
              </select>
            </div>

            {item.content}

            {onResize && (
              <>
                {resizing && (
                  <span className="pointer-events-none absolute bottom-8 right-2 z-20 rounded-sm bg-(--brand) px-1.5 py-0.5 text-xs font-semibold text-(--brand-fg) shadow-(--shadow-sm)">
                    {size.w} × {size.h}
                  </span>
                )}
                <button
                  type="button"
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  onPointerDown={(event) => handleResizeStart(event, item)}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  onPointerCancel={handleResizeEnd}
                  onKeyDown={(event) => handleResizeKeyDown(event, item)}
                  aria-label={`Redimensionar "${item.label}" — ${sizeDescription(size)}. Use as setas do teclado.`}
                  // Nunca `display: none`: um botão escondido assim não recebe
                  // foco, e o caminho de teclado (setas) morre junto.
                  className={[
                    "absolute bottom-1 right-1 z-20 flex h-6 w-6 items-center justify-center rounded-sm",
                    "cursor-nwse-resize transition-opacity duration-(--transition-fast)",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)",
                    resizing
                      ? "pointer-events-auto bg-(--surface-alt) text-(--brand) opacity-100"
                      : "pointer-events-none text-(--fg-muted) opacity-0 hover:bg-(--surface-alt) hover:text-(--fg) focus-visible:pointer-events-auto focus-visible:opacity-100 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100",
                  ].join(" ")}
                >
                  <MoveDiagonal className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        );
      })}

      <span aria-live="polite" className="sr-only">
        {preview ? `${preview.w} colunas por ${preview.h} linhas` : ""}
      </span>
    </div>
  );
}
