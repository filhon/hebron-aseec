"use client";

import { useFormContext } from "react-hook-form";
import type { ReservationWizardValues } from "../reservation-wizard";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

interface ConsentToggleProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  highlighted?: boolean;
  error?: string;
}

function ConsentToggle({
  id,
  title,
  description,
  checked,
  onChange,
  required,
  highlighted,
  error,
}: ConsentToggleProps) {
  return (
    <div
      className={cn(
        "rounded-(--radius) border p-4",
        highlighted
          ? "border-(--hb-orange-deep) bg-(--hb-orange-muted)"
          : "border-(--border) bg-(--surface)",
      )}
    >
      <label htmlFor={id} className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-(--border) accent-(--brand)"
        />
        <span className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-(--fg)">
            {title}
            {required && (
              <span
                className="ml-0.5 text-(--color-destructive)"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </span>
          <span className="text-sm text-(--fg-muted)">{description}</span>
        </span>
      </label>
      {error && (
        <p
          className="mt-2 pl-7 text-xs text-(--color-destructive)"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function StepConsent() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ReservationWizardValues>();

  const consent = watch("consent");

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
          Consentimento para uso dos dados
        </h2>
        <p className="mt-1 text-sm text-(--fg-muted)">
          Antes de iniciar sua solicitação, precisamos do seu consentimento para
          tratar os dados desta reserva, conforme a LGPD. Cada finalidade abaixo
          pode ser revogada por você a qualquer momento, entrando em contato com
          a secretaria.
        </p>
      </div>

      <ConsentToggle
        id="consent-dados-reserva"
        title="Processamento dos dados da reserva"
        description="Nome, CPF, contato e demais dados deste formulário serão usados para avaliar e administrar sua solicitação de reserva no flat. Obrigatório para prosseguir."
        checked={consent.dadosReserva}
        onChange={(checked) =>
          setValue("consent.dadosReserva", checked, { shouldValidate: true })
        }
        required
        error={errors.consent?.dadosReserva?.message}
      />

      <ConsentToggle
        id="consent-dado-saude"
        title="Dado de saúde autodeclarado"
        description={
          'Autorizo o uso da informação "possuo condição de saúde a declarar" (sim/não, sem laudos ou detalhes clínicos) como um dos critérios de pontuação da reserva. Sem este consentimento específico, este campo não será exibido nem considerado.'
        }
        checked={consent.dadoSaude}
        onChange={(checked) =>
          setValue("consent.dadoSaude", checked, { shouldValidate: true })
        }
        highlighted
      />

      <ConsentToggle
        id="consent-comunicacao"
        title="Comunicação sobre a reserva"
        description="Autorizo o envio de e-mails transacionais e informativos sobre o andamento desta reserva (confirmação, aprovação, lembretes)."
        checked={consent.comunicacao}
        onChange={(checked) =>
          setValue("consent.comunicacao", checked, { shouldValidate: true })
        }
      />
    </section>
  );
}
