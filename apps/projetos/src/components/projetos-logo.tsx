import { FolderOpen } from "lucide-react";

export function ProjetosLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--hb-orange)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FolderOpen
          width={20}
          height={20}
          color="white"
          strokeWidth={2}
          aria-hidden
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          hebron
        </div>
        <div
          style={{
            fontSize: 16,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          projetos
        </div>
      </div>
    </div>
  );
}
