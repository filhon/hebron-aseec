"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { X, AlertCircle, ShieldAlert } from "lucide-react";
import { overrideBlock } from "../actions/payables";
import type { Payable } from "@hebron/types/financeiro";

interface PayableBlockOverrideFormProps {
  payable: Payable;
  onClose: () => void;
  onSuccess?: () => void;
}

const overrideFormSchema = z.object({
  justification: z
    .string()
    .min(20, "Descreva o motivo da liberação (mín. 20 caracteres)")
    .max(1000),
});

type OverrideFormInput = z.infer<typeof overrideFormSchema>;

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs font-medium mt-1 text-(--hb-orange-deep)">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

export function PayableBlockOverrideForm({
  payable,
  onClose,
  onSuccess,
}: PayableBlockOverrideFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OverrideFormInput>({
    resolver: zodResolver(overrideFormSchema),
    defaultValues: { justification: "" },
  });

  const { execute, isPending, result } = useAction(overrideBlock, {
    onSuccess() {
      router.refresh();
      onSuccess?.();
      onClose();
    },
  });

  function onSubmit(data: OverrideFormInput) {
    execute({ payableId: payable.id, justification: data.justification });
  }

  return (
    <div
      className="fixed inset-0 z-(--z-overlay) flex justify-end"
      style={{ background: "var(--overlay)" }}
      onClick={onClose}
    >
      <div
        className="w-140 max-w-full flex flex-col h-full"
        style={{
          background: "var(--bg)",
          animation: "slide-in 220ms var(--ease-out)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-(--border)">
          <span className="flex items-center justify-center w-10 h-10 rounded-(--radius) bg-(--color-destructive-muted) text-(--color-destructive)">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--color-destructive)">
              Liberar bloqueio
            </p>
            <p
              className="text-xl font-bold mt-0.5 text-(--fg)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {payable.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-(--radius) text-(--fg-muted) transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Motivo do bloqueio */}
        <div className="mx-6 mt-5 rounded-(--radius) px-4 py-3 bg-(--color-destructive-muted)">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--color-destructive) mb-1">
            Bloqueado por inadimplência de relatório
          </p>
          <p className="text-sm text-(--fg)">
            {payable.blockReason ?? "Relatório de projeto vencido."}
          </p>
          {payable.blockedAt && (
            <p className="text-xs text-(--fg-muted) mt-1">
              Desde {fmtDate(payable.blockedAt)}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="override-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <p className="text-xs text-(--fg-muted) mb-4 leading-relaxed">
              Exclusivo de <strong className="text-(--fg)">super_admin</strong>.
              A liberação devolve o pagamento a &quot;pendente&quot;, de onde
              retoma o fluxo normal de aprovação e autorização. A justificativa
              é obrigatória e fica registrada no audit trail.
            </p>

            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5 text-(--fg-muted)">
              Justificativa da liberação
              <span className="ml-0.5 text-(--hb-orange-deep)">*</span>
            </label>
            <textarea
              {...register("justification")}
              rows={5}
              className="w-full px-3 py-2.5 rounded-(--radius) border text-sm transition-colors outline-none border-(--border) bg-(--bg) text-(--fg) placeholder:text-(--fg-muted) focus:border-(--hb-blue) focus:ring-2 focus:ring-(--hb-blue)/10 resize-none"
              placeholder="Ex: Relatório entregue fisicamente ao diretor gestor em 12/06, aguardando registro no sistema."
            />
            <FieldError message={errors.justification?.message} />
            <p className="text-xs mt-1 text-(--fg-muted)">
              Obrigatório · mínimo 20 caracteres · registrado no audit trail.
            </p>

            {result.serverError && (
              <p className="flex items-center gap-1 text-xs font-medium mt-4 text-(--hb-orange-deep)">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {result.serverError}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-(--border)">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold transition-colors border-(--border) text-(--fg)"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="override-form"
            disabled={isSubmitting || isPending}
            className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60 bg-(--hb-orange) text-(--fg-invert)"
          >
            {isSubmitting || isPending ? "Liberando…" : "Liberar bloqueio"}
          </button>
        </div>
      </div>
    </div>
  );
}
