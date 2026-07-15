"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Label } from "@hebron/ui";
import type { ReservationWizardValues } from "../reservation-wizard";

const MAX_COMPANIONS = 6;
const MAX_YOUNG_CHILDREN = 2;

export function StepCompanions() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ReservationWizardValues>();

  const today = new Date().toISOString().slice(0, 10);

  const companions = useFieldArray({ control, name: "companions" });
  const youngChildren = useFieldArray({ control, name: "youngChildren" });

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
          Acompanhantes
        </h2>
        <p className="mt-1 text-sm text-(--fg-muted)">
          Até {MAX_COMPANIONS} acompanhantes. Nome completo, CPF e data de
          nascimento são exigidos pela portaria do condomínio.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {companions.fields.length === 0 && (
          <p className="rounded-(--radius) border border-dashed border-(--border) px-4 py-6 text-center text-sm text-(--fg-muted)">
            Nenhum acompanhante adicionado.
          </p>
        )}

        {companions.fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-1 gap-3 rounded-(--radius) border border-(--border) p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Nome completo</Label>
              <Input
                hasError={!!errors.companions?.[index]?.name}
                {...register(`companions.${index}.name`)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>CPF</Label>
              <Input
                maxLength={11}
                hasError={!!errors.companions?.[index]?.cpf}
                {...register(`companions.${index}.cpf`)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nascimento</Label>
              <Input
                type="date"
                max={today}
                hasError={!!errors.companions?.[index]?.birthDate}
                {...register(`companions.${index}.birthDate`)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remover acompanhante"
                onClick={() => companions.remove(index)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={companions.fields.length >= MAX_COMPANIONS}
          onClick={() =>
            companions.append({ name: "", cpf: "", birthDate: "" })
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar acompanhante
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-t border-(--divider) pt-6">
        <div>
          <h3 className="text-sm font-semibold text-(--fg)">
            Crianças menores de 3 anos
          </h3>
          <p className="mt-1 text-sm text-(--fg-muted)">
            Até {MAX_YOUNG_CHILDREN} crianças menores de 3 anos. Não contam na
            capacidade de 6 pessoas da unidade.
          </p>
        </div>

        {youngChildren.fields.length > 0 && (
          <div className="flex flex-col gap-3">
            {youngChildren.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-3 rounded-(--radius) border border-(--border) p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <div className="flex flex-col gap-1.5">
                  <Label>Nome completo</Label>
                  <Input
                    hasError={!!errors.youngChildren?.[index]?.name}
                    {...register(`youngChildren.${index}.name`)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>CPF</Label>
                  <Input
                    maxLength={11}
                    hasError={!!errors.youngChildren?.[index]?.cpf}
                    {...register(`youngChildren.${index}.cpf`)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Nascimento</Label>
                  <Input
                    type="date"
                    max={today}
                    hasError={!!errors.youngChildren?.[index]?.birthDate}
                    {...register(`youngChildren.${index}.birthDate`)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover criança"
                    onClick={() => youngChildren.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={youngChildren.fields.length >= MAX_YOUNG_CHILDREN}
          onClick={() =>
            youngChildren.append({ name: "", cpf: "", birthDate: "" })
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar criança
        </Button>
      </div>
    </section>
  );
}
