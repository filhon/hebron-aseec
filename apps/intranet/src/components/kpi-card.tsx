import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { KPI } from "@hebron/types/intranet";

export interface KPICardProps {
  kpi: KPI;
  /** Pontos do sparkline. Se omitido, é derivado deterministicamente do trend. */
  sparkline?: number[];
}

const MODULE_DOT_COLOR: Record<string, string> = {
  admin: "var(--hb-blue)",
  projetos: "var(--hb-orange)",
  plataforma: "var(--hb-cyan)",
  financeiro: "var(--hb-green)",
  radio: "var(--hb-purple)",
  documentos: "var(--hb-gold)",
  tarefas: "var(--hb-teal)",
  flats: "var(--hb-red)",
};

function moduleColor(sourceModule: string | null): string {
  if (!sourceModule) return "var(--hb-blue)";
  return MODULE_DOT_COLOR[sourceModule] ?? "var(--hb-blue)";
}

function formatValue(kpi: KPI): string {
  if (kpi.unit === "R$") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(kpi.value);
  }
  return `${new Intl.NumberFormat("pt-BR").format(kpi.value)} ${kpi.unit}`;
}

// Sequência determinística a partir do id — dá sentido visual ao trend sem
// exigir série histórica real (a série real chega em P-5.9).
function defaultSparkline(kpi: KPI): number[] {
  let seed = 0;
  for (const ch of kpi.id) seed = (seed * 31 + ch.charCodeAt(0)) % 997;
  const direction = kpi.trend === "up" ? 1 : kpi.trend === "down" ? -1 : 0;
  const points: number[] = [];
  let value = 50;
  for (let i = 0; i < 8; i++) {
    seed = (seed * 137 + 89) % 997;
    const noise = (seed / 997 - 0.5) * 18;
    value += direction * 4 + noise;
    points.push(value);
  }
  return points;
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 72;
  const h = 26;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - ((v - min) / range) * (h - 4) - 2).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="absolute bottom-4 right-5 opacity-70"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KPICard({ kpi, sparkline }: KPICardProps) {
  const points = sparkline ?? defaultSparkline(kpi);
  const color = moduleColor(kpi.sourceModule);
  const trendUp = kpi.trend === "up";
  const trendDown = kpi.trend === "down";

  return (
    <div className="hb-stat">
      <div className="hb-stat-dot" style={{ background: color }} />
      <div className="hb-stat-label">{kpi.name}</div>
      <div className="hb-stat-value">{formatValue(kpi)}</div>
      <div
        className={`hb-stat-trend${trendUp ? " up" : ""}${trendDown ? " flag" : ""}`}
      >
        {trendUp && <ArrowUp className="inline h-3 w-3" aria-hidden="true" />}
        {trendDown && (
          <ArrowDown className="inline h-3 w-3" aria-hidden="true" />
        )}
        {!trendUp && !trendDown && (
          <Minus className="inline h-3 w-3" aria-hidden="true" />
        )}{" "}
        {kpi.period}
      </div>
      <Sparkline points={points} color={color} />
    </div>
  );
}
