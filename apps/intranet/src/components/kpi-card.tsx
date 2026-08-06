import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { KPI } from "@hebron/types/intranet";

export interface KPICardProps {
  kpi: KPI;
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

function formatNumber(value: number, unit: string): string {
  if (unit === "R$") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return `${new Intl.NumberFormat("pt-BR").format(value)} ${unit}`;
}

function formatValue(kpi: KPI): string {
  return formatNumber(kpi.value, kpi.unit);
}

function sparklineAriaLabel(kpi: KPI): string {
  const { history } = kpi;
  const first = history[0];
  const last = history[history.length - 1];
  if (first === undefined || last === undefined) {
    return `${history.length} leituras`;
  }
  return `${history.length} leituras, de ${formatNumber(first, kpi.unit)} para ${formatNumber(last, kpi.unit)}`;
}

function Sparkline({
  points,
  color,
  label,
}: {
  points: number[];
  color: string;
  label: string;
}) {
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
      role="img"
      aria-label={label}
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

export function KPICard({ kpi }: KPICardProps) {
  const color = moduleColor(kpi.sourceModule);
  const trendUp = kpi.trend === "up";
  const trendDown = kpi.trend === "down";
  const trendStable = kpi.trend === "stable";
  const hasHistory = kpi.history.length >= 2;

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
        {trendStable && <Minus className="inline h-3 w-3" aria-hidden="true" />}
        {kpi.trend !== null && " "}
        {kpi.period}
      </div>
      {hasHistory && (
        <Sparkline
          points={kpi.history}
          color={color}
          label={sparklineAriaLabel(kpi)}
        />
      )}
    </div>
  );
}
