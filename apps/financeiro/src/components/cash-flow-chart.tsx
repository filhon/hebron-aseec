"use client";

import { useState, useMemo } from "react";

export interface CashFlowDataPoint {
  day: number;
  projectedBalance: number;
  label?: string;
}

export interface CashFlowEvent {
  day: number;
  label: string;
  type: "income" | "expense";
}

interface CashFlowChartProps {
  currentBalance: number;
  dataPoints: CashFlowDataPoint[];
  events?: CashFlowEvent[];
  className?: string;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtBRLFull(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

type Horizon = 30 | 60 | 90;

export function CashFlowChart({
  currentBalance,
  dataPoints,
  events = [],
  className = "",
}: CashFlowChartProps) {
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const pts = dataPoints.filter((p) => p.day <= horizon);
    if (pts.length === 0) return [{ day: 0, projectedBalance: currentBalance }];
    return pts;
  }, [dataPoints, horizon, currentBalance]);

  const filteredEvents = useMemo(
    () => events.filter((e) => e.day <= horizon),
    [events, horizon],
  );

  // SVG dimensions
  const PAD_L = 64;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 30;
  const W = 660;
  const H = 200;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const vals = filtered.map((p) => p.projectedBalance);
  const rawMax = Math.max(...vals);
  const rawMin = Math.min(...vals, 0);
  const range = rawMax - rawMin || 1;
  const vMax = rawMax + range * 0.08;
  const vMin = rawMin - range * 0.06;
  const vRange = vMax - vMin;

  const xOf = (day: number) => PAD_L + (day / horizon) * chartW;
  const yOf = (v: number) => PAD_T + chartH - ((v - vMin) / vRange) * chartH;

  const linePath = filtered
    .map((p, i) => {
      const x = xOf(p.day);
      const y = yOf(p.projectedBalance);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastPoint = filtered[filtered.length - 1];
  const firstPoint = filtered[0];
  const areaPath =
    filtered.length > 0 && lastPoint && firstPoint
      ? `${linePath} L${xOf(lastPoint.day).toFixed(1)},${(PAD_T + chartH).toFixed(1)} L${xOf(firstPoint.day).toFixed(1)},${(PAD_T + chartH).toFixed(1)} Z`
      : "";

  // Y grid ticks
  const TICK_COUNT = 4;
  const yTicks = Array.from(
    { length: TICK_COUNT + 1 },
    (_, i) => vMin + (vRange * i) / TICK_COUNT,
  );

  // X axis labels
  const xLabels = [
    0,
    Math.round(horizon / 4),
    Math.round(horizon / 2),
    Math.round((3 * horizon) / 4),
    horizon,
  ];

  const hoveredPoint = hoveredIdx !== null ? filtered[hoveredIdx] : null;

  return (
    <div
      className={`rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--fg-muted) mb-1">
            Fluxo de caixa projetado
          </p>
          <p
            className="text-xl font-bold text-(--fg)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {fmtBRLFull(currentBalance)}
          </p>
          <p className="text-xs text-(--fg-muted)">Saldo atual</p>
        </div>

        {/* Horizon selector */}
        <div className="flex gap-1 bg-(--bg-alt) p-1 rounded-lg border border-(--border)">
          {([30, 60, 90] as Horizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={[
                "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                horizon === h
                  ? "bg-(--hb-blue) text-(--fg-invert)"
                  : "text-(--fg-muted) hover:text-(--fg)",
              ].join(" ")}
            >
              D+{h}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 py-4 relative">
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ display: "block" }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--hb-blue)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--hb-blue)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cfGradRed" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-destructive)"
                stopOpacity="0.15"
              />
              <stop
                offset="100%"
                stopColor="var(--color-destructive)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {/* Zero line */}
          {vMin < 0 && vMax > 0 && (
            <line
              x1={PAD_L}
              y1={yOf(0)}
              x2={W - PAD_R}
              y2={yOf(0)}
              stroke="var(--color-destructive)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.5"
            />
          )}

          {/* Y grid + labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={yOf(t)}
                x2={W - PAD_R}
                y2={yOf(t)}
                stroke="var(--divider)"
                strokeDasharray="2 4"
              />
              <text
                x={PAD_L - 8}
                y={yOf(t) + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--fg-muted)"
                fontFamily="var(--font-body, 'Titillium Web', sans-serif)"
              >
                {fmtBRL(t)}
              </text>
            </g>
          ))}

          {/* X axis labels */}
          {xLabels.map((d) => (
            <text
              key={d}
              x={xOf(d)}
              y={H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="var(--fg-muted)"
              fontFamily="var(--font-body, 'Titillium Web', sans-serif)"
            >
              D+{d}
            </text>
          ))}

          {/* Area */}
          {areaPath && (
            <path
              d={areaPath}
              fill={
                vals.some((v) => v < 0) ? "url(#cfGradRed)" : "url(#cfGrad)"
              }
            />
          )}

          {/* Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--hb-blue)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Event markers */}
          {filteredEvents.map((ev, i) => {
            const closestPoint = filtered.reduce<CashFlowDataPoint | null>(
              (closest, p) =>
                closest === null ||
                Math.abs(p.day - ev.day) < Math.abs(closest.day - ev.day)
                  ? p
                  : closest,
              null,
            );
            return (
              <g key={i}>
                <line
                  x1={xOf(ev.day)}
                  y1={PAD_T}
                  x2={xOf(ev.day)}
                  y2={PAD_T + chartH}
                  stroke={
                    ev.type === "income"
                      ? "var(--hb-green)"
                      : "var(--hb-orange)"
                  }
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.7"
                />
                {closestPoint && (
                  <circle
                    cx={xOf(ev.day)}
                    cy={yOf(closestPoint.projectedBalance)}
                    r="4"
                    fill="var(--surface)"
                    stroke={
                      ev.type === "income"
                        ? "var(--hb-green)"
                        : "var(--hb-orange)"
                    }
                    strokeWidth="2"
                  />
                )}
              </g>
            );
          })}

          {/* Data points for hover */}
          {filtered.map((p, i) => (
            <rect
              key={i}
              x={xOf(p.day) - chartW / (filtered.length * 2)}
              y={PAD_T}
              width={chartW / filtered.length}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          ))}

          {/* Hover indicator */}
          {hoveredIdx !== null && filtered[hoveredIdx] && (
            <g>
              <line
                x1={xOf(filtered[hoveredIdx].day)}
                y1={PAD_T}
                x2={xOf(filtered[hoveredIdx].day)}
                y2={PAD_T + chartH}
                stroke="var(--hb-blue)"
                strokeWidth="1"
                opacity="0.4"
              />
              <circle
                cx={xOf(filtered[hoveredIdx].day)}
                cy={yOf(filtered[hoveredIdx].projectedBalance)}
                r="5"
                fill="var(--hb-blue)"
              />
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute top-4 left-16 bg-(--surface) border border-(--border) rounded-lg px-3 py-2 shadow-sm pointer-events-none"
            style={{ minWidth: 140 }}
          >
            <p className="text-[10px] text-(--fg-muted) uppercase tracking-widest font-bold">
              D+{hoveredPoint.day}
            </p>
            <p
              className="text-sm font-bold tabular-nums text-(--fg)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {fmtBRLFull(hoveredPoint.projectedBalance)}
            </p>
            {hoveredPoint.label && (
              <p className="text-xs text-(--fg-muted)">{hoveredPoint.label}</p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {filteredEvents.length > 0 && (
        <div className="flex flex-wrap gap-3 px-5 py-3 border-t border-(--border) bg-(--bg-alt)">
          {filteredEvents.map((ev, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 text-xs text-(--fg-muted)"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  background:
                    ev.type === "income"
                      ? "var(--hb-green)"
                      : "var(--hb-orange)",
                }}
              />
              D+{ev.day} · {ev.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
