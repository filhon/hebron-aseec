"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Plus, X, AlertCircle } from "lucide-react";
import {
  createCostCenterSchema,
  type CreateCostCenterInput,
} from "@hebron/validators";
import { createCostCenter } from "../actions/cost-centers";

interface CostCenterFormProps {
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

export function CostCenterForm({ onClose, onSuccess }: CostCenterFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCostCenterSchema),
    defaultValues: {
      code: "",
      name: "",
      budgetTotal: 0,
    },
  });

  const { execute, isPending, result } = useAction(createCostCenter, {
    onSuccess() {
      router.refresh();
      onSuccess?.();
      onClose();
    },
  });

  function onSubmit(data: CreateCostCenterInput) {
    execute(data);
  }

  return (
    <div
      className="fixed inset-0 z-(--z-overlay) flex justify-end"
      style={{ background: "var(--overlay)" }}
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
          <div className="flex-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--hb-blue)" }}
            >
              Centro de custo administrativo
            </p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Novo centro de custo
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
            Para despesas que não pertencem a um projeto — aluguel, folha,
            energia, manutenção. Centros de projeto continuam sendo criados
            automaticamente na aprovação.
          </p>

          <form
            id="cost-center-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {/* Código + Nome */}
            <div className="grid grid-cols-[100px_1fr] gap-4">
              <div>
                <Label required>Código</Label>
                <input
                  {...register("code")}
                  className={inputCls}
                  placeholder="ADM-01"
                />
                <FieldError message={errors.code?.message} />
              </div>
              <div>
                <Label required>Nome</Label>
                <input
                  {...register("name")}
                  className={inputCls}
                  placeholder="Ex: Aluguel e manutenção predial"
                />
                <FieldError message={errors.name?.message} />
              </div>
            </div>

            {/* Orçamento total */}
            <div className="mt-4">
              <Label>Orçamento total (opcional)</Label>
              <input
                {...register("budgetTotal", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                placeholder="0,00"
              />
              <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
                O orçamento anual detalhado por categoria é lançado depois em
                Orçamento.
              </p>
              <FieldError message={errors.budgetTotal?.message} />
            </div>

            {result.serverError && (
              <p
                className="flex items-center gap-1 text-xs font-medium mt-4"
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
            form="cost-center-form"
            disabled={isSubmitting || isPending}
            className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60"
            style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
          >
            {isSubmitting || isPending ? "Salvando…" : "Criar centro de custo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewCostCenterButton — entrada da tela /centros-custo (Server Component).
// Isolado num Client Component para não converter a página inteira.
// ---------------------------------------------------------------------------

export function NewCostCenterButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-(--radius) text-xs font-semibold transition-colors"
        style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
      >
        <Plus className="h-3.5 w-3.5" />
        Novo centro de custo
      </button>
      {open && <CostCenterForm onClose={() => setOpen(false)} />}
    </>
  );
}
