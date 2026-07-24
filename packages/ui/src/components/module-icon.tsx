import type { ReactElement } from "react";
import { MODULE_BRANDS, type ModuleId } from "./module-brands";

/**
 * Ícone de aplicativo (favicon, PWA, atalho) de um módulo.
 *
 * Devolve o elemento pronto para `new ImageResponse(...)` do `next/og` — o
 * `ImageResponse` mora em cada app porque depende do runtime do Next, mas o
 * desenho mora aqui para que os nove favicons não divirjam.
 *
 * Satori (motor do `next/og`) não resolve variáveis CSS nem herda `display`,
 * daí `accentHex` e os estilos literais. Em 32px o monograma "h.x" do manual
 * some, então o ícone fica no essencial: tile de acento + glifo branco.
 */
export function moduleIconElement(module: ModuleId, size = 32): ReactElement {
  const brand = MODULE_BRANDS[module];
  const glyph = Math.round(size * 0.56);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: brand.accentHex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {brand.glyph}
      </svg>
    </div>
  );
}

/** Tamanho e MIME canônicos do favicon — reexportar em cada `icon.tsx`. */
export const MODULE_ICON_SIZE = { width: 32, height: 32 } as const;
export const MODULE_ICON_CONTENT_TYPE = "image/png";

/** Reexport por conveniência para os `icon.tsx`. */
export type { ModuleId };
