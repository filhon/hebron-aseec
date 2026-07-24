import type { CSSProperties } from "react";
import {
  MODULE_BRANDS,
  type ModuleBrand,
  type ModuleId,
} from "./module-brands";

/**
 * Sistema de logotipos dos módulos.
 *
 * Quatro lockups, uma geometria só: tudo deriva de `size` (o lado do tile),
 * então um `ModuleLogo` de 32px e um de 52px são a mesma marca, não dois
 * desenhos parecidos. As proporções vêm do manual dos módulos — tile com
 * raio 0.27, glifo 0.54 e a "cauda" do balão em 0.27 × 0.19.
 *
 * `mark` é o que entra no slot `logo` do `AppShell`: o `AppShell` já escreve
 * "Hebron Aseec / <módulo>" ao lado, então repetir a assinatura ali seria
 * dizer a mesma coisa duas vezes.
 */

export type ModuleLogoVariant =
  /** Só o tile com o glifo. Sidebars, cabeçalhos compactos, avatares de app. */
  | "mark"
  /** Tile + "hebron / módulo" em duas linhas. Navbars públicas. */
  | "horizontal"
  /** Assinatura canônica, com eyebrow. Capas, splash, materiais impressos. */
  | "vertical"
  /** Uma linha só. Rodapés, e-mails, exportações em PDF. */
  | "inline";

export interface ModuleLogoProps {
  module: ModuleId;
  variant?: ModuleLogoVariant;
  /** Lado do tile em px (variantes `mark` e `horizontal`). */
  size?: number;
  /** Inverte o texto para uso sobre azul Hebron ou fundos escuros. */
  dark?: boolean;
  className?: string;
  style?: CSSProperties;
}

// Proporções do tile, relativas a `size`.
const TILE = {
  radius: 0.27,
  glyph: 0.54,
  tailW: 0.27,
  tailH: 0.19,
  tailLeft: 0.27,
  tailDrop: 0.115,
} as const;

interface GlyphProps {
  brand: ModuleBrand;
  size: number;
  color?: string;
  strokeWidth?: number;
}

/** Glifo do módulo, sem tile. Traço consistente em qualquer tamanho. */
export function ModuleGlyph({
  brand,
  size,
  color = "currentColor",
  strokeWidth = 2.2,
}: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none" }}
    >
      {brand.glyph}
    </svg>
  );
}

/** Tile de acento com o glifo e a cauda do balão. */
function Tile({ brand, size }: { brand: ModuleBrand; size: number }) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        flex: "none",
        width: size,
        height: size,
      }}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * TILE.radius),
          background: brand.accentVar,
          color: "var(--hb-white)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ModuleGlyph brand={brand} size={Math.round(size * TILE.glyph)} />
      </span>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -Math.round(size * TILE.tailDrop),
          left: Math.round(size * TILE.tailLeft),
          width: Math.round(size * TILE.tailW),
          height: Math.round(size * TILE.tailH),
          background: brand.accentVar,
          clipPath: "polygon(0 0, 100% 0, 30% 100%)",
        }}
      />
    </span>
  );
}

function ink(dark: boolean) {
  return dark ? "var(--hb-white)" : "var(--hb-blue)";
}

export function ModuleLogo({
  module,
  variant = "mark",
  size = 32,
  dark = false,
  className,
  style,
}: ModuleLogoProps) {
  const brand = MODULE_BRANDS[module];
  const label = `hebron ${brand.word}`;

  if (variant === "mark") {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", ...style }}
        role="img"
        aria-label={label}
      >
        <Tile brand={brand} size={size} />
      </span>
    );
  }

  if (variant === "horizontal") {
    return (
      <span
        className={className}
        role="img"
        aria-label={label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: Math.round(size * 0.32),
          fontFamily: "var(--font-display)",
          ...style,
        }}
      >
        <Tile brand={brand} size={size} />
        <span
          style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}
        >
          <span
            style={{
              fontSize: Math.round(size * 0.46),
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: ink(dark),
            }}
          >
            hebron
          </span>
          <span
            style={{
              fontSize: Math.round(size * 0.36),
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: brand.accentVar,
              marginTop: Math.round(size * 0.09),
            }}
          >
            {brand.word}
          </span>
        </span>
      </span>
    );
  }

  if (variant === "vertical") {
    return (
      <span
        className={className}
        role="img"
        aria-label={label}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 6,
          fontFamily: "var(--font-display)",
          ...style,
        }}
      >
        <span
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 0.9,
            color: ink(dark),
          }}
        >
          hebron
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 2,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 28,
              height: 4,
              flex: "none",
              borderRadius: 2,
              background: brand.accentVar,
            }}
          />
          <span
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              lineHeight: 1,
              color: brand.accentVar,
            }}
          >
            {brand.word}
          </span>
        </span>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: dark ? "var(--fg-invert-muted)" : "var(--fg-muted)",
            marginTop: 8,
            marginLeft: 40,
          }}
        >
          {brand.subtitle}
        </span>
      </span>
    );
  }

  return (
    <span
      className={className}
      role="img"
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 10,
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          color: ink(dark),
        }}
      >
        hebron
      </span>
      <span
        aria-hidden="true"
        style={{
          fontSize: 22,
          fontWeight: 400,
          color: dark ? "var(--fg-invert-muted)" : "var(--hb-gray-200)",
        }}
      >
        /
      </span>
      <span
        style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: brand.accentVar,
        }}
      >
        {brand.word}
      </span>
    </span>
  );
}
