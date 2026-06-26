/** Icon mark only — AppShell renders the brand text (org + module name). */
export function FinanceiroLogo() {
  return (
    <span
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "var(--hb-green-deep)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <svg
        width={17}
        height={17}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 3 3 6-7" />
        <path d="M14 8h6v6" />
      </svg>
    </span>
  );
}
