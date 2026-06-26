import { FolderOpen } from "lucide-react";

/** Icon mark only — AppShell renders the brand text (org + module name). */
export function ProjetosLogo() {
  return (
    <span
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "var(--hb-orange)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <FolderOpen width={17} height={17} color="white" strokeWidth={2} />
    </span>
  );
}
