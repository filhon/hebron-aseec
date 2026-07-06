"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { X, Building2, AlertCircle, Info, ChevronDown } from "lucide-react";
import { createBankAccountSchema } from "@hebron/validators";
import type { CreateBankAccountInput } from "@hebron/validators";
import { createBankAccount } from "../actions/accounts";

interface BankAccountFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="flex items-center gap-1 text-xs font-medium mt-1"
      style={{ color: "var(--hb-orange-deep)" }}
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
      style={{ color: "var(--fg-muted)" }}
    >
      {children}
      {required && (
        <span className="ml-0.5" style={{ color: "var(--hb-orange-deep)" }}>
          *
        </span>
      )}
    </label>
  );
}

const inputCls = [
  "w-full px-3 py-2.5 rounded-(--radius) border text-sm transition-colors outline-none",
  "border-(--border) bg-(--bg) text-(--fg)",
  "placeholder:text-(--fg-muted)",
  "focus:border-(--hb-blue) focus:ring-2 focus:ring-(--hb-blue)/10",
].join(" ");

const selectCls = inputCls + " appearance-none cursor-pointer pr-8";

const ACCOUNT_TYPES = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "investimento", label: "Investimento / Reserva" },
] as const;

export function BankAccountForm({ onClose, onSuccess }: BankAccountFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateBankAccountInput>({
    resolver: zodResolver(createBankAccountSchema),
    defaultValues: {
      type: "corrente",
    },
  });

  const { execute, isPending, result } = useAction(createBankAccount, {
    onSuccess() {
      router.refresh();
      onSuccess?.();
      onClose();
    },
  });

  function onSubmit(data: CreateBankAccountInput) {
    execute(data);
  }

  return (
    <div
      className="fixed inset-0 z-(--z-overlay) flex justify-end"
      style={{ background: "rgba(19,23,55,0.42)" }}
      onClick={onClose}
    >
      <div
        className="w-120 max-w-full flex flex-col h-full"
        style={{
          background: "var(--bg)",
          animation: "slide-in 220ms var(--ease-out)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-(--radius) shrink-0"
            style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
          >
            <Building2 className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--hb-blue)" }}
            >
              Nova conta bancária
            </p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Cadastrar conta
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-(--radius) transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="bank-account-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            {/* Nome/apelido */}
            <div>
              <Label required>Nome / apelido da conta</Label>
              <input
                {...register("name")}
                className={inputCls}
                placeholder="Ex: Bradesco — Conta Principal"
              />
              <FieldError message={errors.name?.message} />
            </div>

            {/* Banco */}
            <div>
              <Label required>Banco</Label>
              <input
                {...register("bank")}
                className={inputCls}
                placeholder="Ex: Bradesco, Caixa Econômica Federal, Sicoob"
              />
              <FieldError message={errors.bank?.message} />
            </div>

            {/* Agência + Conta em grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Agência</Label>
                <input
                  {...register("agency")}
                  className={inputCls}
                  placeholder="1234"
                  maxLength={20}
                />
                <FieldError message={errors.agency?.message} />
              </div>
              <div>
                <Label required>Número da conta</Label>
                <input
                  {...register("accountNumber")}
                  className={inputCls}
                  placeholder="56789-0"
                  maxLength={30}
                />
                <FieldError message={errors.accountNumber?.message} />
              </div>
            </div>

            {/* Tipo */}
            <div className="relative">
              <Label required>Tipo de conta</Label>
              <select {...register("type")} className={selectCls}>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-9.5 h-3.5 w-3.5 pointer-events-none"
                style={{ color: "var(--fg-muted)" }}
              />
              <FieldError message={errors.type?.message} />
            </div>

            {/* Info card */}
            <div
              className="flex items-start gap-3 rounded-(--radius) border px-4 py-3.5"
              style={{
                background: "var(--bg-alt)",
                borderColor: "var(--border)",
              }}
            >
              <Info
                className="h-4 w-4 shrink-0 mt-0.5"
                style={{ color: "var(--hb-blue)" }}
              />
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--fg-muted)" }}
              >
                O saldo inicial será zerado ao cadastrar. Importe um extrato OFX
                ou registre transações manualmente para refletir o saldo real.
              </p>
            </div>

            {result.serverError && (
              <p
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--hb-orange-deep)" }}
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                {result.serverError}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="bank-account-form"
            disabled={isSubmitting || isPending}
            className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60"
            style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
          >
            {isSubmitting || isPending ? "Salvando…" : "Cadastrar conta"}
          </button>
        </div>
      </div>
    </div>
  );
}
