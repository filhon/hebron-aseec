import type { CSSProperties } from "react";

type LogoVariant = "vertical" | "horizontal" | "inline" | "icon";

interface DocumentosLogoProps {
  variant?: LogoVariant;
  dark?: boolean;
  /** Used only for icon variant — tile size in px */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

function FileTextIcon({
  size = 28,
  strokeWidth = 2.2,
}: {
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

/** Horizontal lockup — tile com ícone + "hebron / documentos". Uso: navbars, cabeçalhos. */
function HorizontalLockup({ dark }: { dark: boolean }) {
  const ink = dark ? "var(--hb-white)" : "var(--hb-blue)";
  const accent = "var(--hb-cyan-deep)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: "var(--font-display)",
      }}
    >
      <div
        style={{
          position: "relative",
          flex: "none",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: accent,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FileTextIcon size={24} strokeWidth={2.2} />
        </div>
        {/* cauda "balão" */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -5,
            left: 12,
            width: 12,
            height: 8,
            background: accent,
            clipPath: "polygon(0 0, 100% 0, 30% 100%)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: ink,
          }}
        >
          hebron
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: accent,
            marginTop: 4,
          }}
        >
          documentos
        </span>
      </div>
    </div>
  );
}

/** Vertical lockup — canônico. Uso: capas, slides, materiais institucionais. */
function VerticalLockup({ dark }: { dark: boolean }) {
  const ink = dark ? "var(--hb-white)" : "var(--hb-blue)";
  const accent = "var(--hb-cyan-deep)";
  const muted = dark ? "rgba(255,255,255,0.62)" : "var(--hb-gray-400)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        fontFamily: "var(--font-display)",
      }}
    >
      <div
        style={{
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 0.9,
          color: ink,
        }}
      >
        hebron
      </div>
      <div
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
            background: accent,
            borderRadius: 2,
            display: "inline-block",
            flex: "none",
          }}
        />
        <span
          style={{
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: accent,
            lineHeight: 1,
          }}
        >
          documentos
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: muted,
          marginTop: 8,
          marginLeft: 40,
        }}
      >
        editais &amp; institucional
      </div>
    </div>
  );
}

/** Inline lockup — uma linha. Uso: rodapés, e-mails, assinaturas PDF. */
function InlineLockup({ dark }: { dark: boolean }) {
  const ink = dark ? "var(--hb-white)" : "var(--hb-blue)";
  const accent = "var(--hb-cyan-deep)";
  const sep = dark ? "rgba(255,255,255,0.35)" : "var(--hb-gray-200)";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 10,
        fontFamily: "var(--font-display)",
      }}
    >
      <span
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          color: ink,
        }}
      >
        hebron
      </span>
      <span
        aria-hidden="true"
        style={{ fontSize: 22, color: sep, fontWeight: 400 }}
      >
        /
      </span>
      <span
        style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: accent,
        }}
      >
        documentos
      </span>
    </div>
  );
}

/** App icon tile — quadrado. Uso: favicon, launcher iOS/Android, atalho PWA. */
function AppIconTile({ size = 160 }: { size?: number }) {
  const radius = Math.round(size * 0.225);
  const accent = "var(--hb-cyan-deep)";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: accent,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 10px 28px rgba(19,23,55,0.18)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-start",
      }}
    >
      {/* círculo decorativo "balão" */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -size * 0.35,
          right: -size * 0.3,
          width: size * 0.95,
          height: size * 0.95,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: size * 0.16,
          right: size * 0.18,
          width: size * 0.18,
          height: size * 0.18,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
        }}
      />
      {/* glifo */}
      <div
        style={{
          position: "absolute",
          top: size * 0.18,
          left: size * 0.18,
          color: "white",
        }}
      >
        <FileTextIcon size={size * 0.36} strokeWidth={2.1} />
      </div>
      {/* monograma h.d */}
      <div
        style={{
          position: "absolute",
          bottom: size * 0.12,
          left: size * 0.18,
          color: "white",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: size * 0.26,
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
        }}
      >
        h.
        <span style={{ fontWeight: 500, opacity: 0.85 }}>d</span>
      </div>
    </div>
  );
}

export function DocumentosLogo({
  variant = "horizontal",
  dark = false,
  size = 160,
  className,
  style,
}: DocumentosLogoProps) {
  return (
    <div
      className={className}
      style={{ display: "inline-flex", ...style }}
      aria-label="hebron documentos"
    >
      {variant === "horizontal" && <HorizontalLockup dark={dark} />}
      {variant === "vertical" && <VerticalLockup dark={dark} />}
      {variant === "inline" && <InlineLockup dark={dark} />}
      {variant === "icon" && <AppIconTile size={size} />}
    </div>
  );
}
