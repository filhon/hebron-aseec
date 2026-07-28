"use client";

// ─── Controles de campo do wizard de projetos ─────────────────────────────────
// Todo controle aceita `error?: string` e o renderiza junto ao campo (P-2.4b:
// "erro aparece no campo", não só num banner genérico no fim do formulário).

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
});

export function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold text-(--fg) mb-1.5"
    >
      {children}
      {required && (
        <span className="text-(--color-destructive) ml-0.5" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p
      id={id}
      role="alert"
      className="text-xs text-(--color-destructive) mt-1.5"
    >
      {error}
    </p>
  );
}

function fieldClassName(hasError?: boolean): string {
  return [
    "w-full rounded-(--radius) border bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg)",
    "placeholder:text-(--fg-subtle) focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-(--brand) focus-visible:border-transparent transition-colors",
    hasError ? "border-(--color-destructive)" : "border-(--border)",
  ].join(" ");
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={fieldClassName(Boolean(error))}
      />
      <FieldError id={errorId} error={error} />
    </>
  );
}

export function Textarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`${fieldClassName(Boolean(error))} resize-none`}
      />
      <FieldError id={errorId} error={error} />
    </>
  );
}

export function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={fieldClassName(Boolean(error))}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={errorId} error={error} />
    </>
  );
}
