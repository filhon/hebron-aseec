import { Input } from "@hebron/ui";

interface TotpCodeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** 6-digit TOTP code input with the "123 456" grouping used across MFA steps. */
export function TotpCodeInput({
  id,
  value,
  onChange,
  disabled,
}: TotpCodeInputProps) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus
      placeholder="000 000"
      maxLength={7}
      value={value}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 6);
        onChange(raw.length > 3 ? `${raw.slice(0, 3)} ${raw.slice(3)}` : raw);
      }}
      disabled={disabled}
      className="text-center tracking-[0.3em] text-lg font-mono"
    />
  );
}
