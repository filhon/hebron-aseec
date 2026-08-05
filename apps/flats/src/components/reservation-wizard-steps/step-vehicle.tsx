"use client";

import { useFormContext } from "react-hook-form";
import { Car } from "lucide-react";
import { FormField, Input } from "@hebron/ui";
import type { ReservationWizardValues } from "../reservation-wizard";

export function StepVehicle() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ReservationWizardValues>();

  const arrivesByCar = watch("arrivesByCar");
  const vehicleErrors = errors.vehicle;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-(family-name:--font-display) text-lg font-semibold text-(--fg)">
        Veículo
      </h2>

      <label className="flex items-center gap-2 text-sm text-(--fg)">
        <input
          type="checkbox"
          checked={arrivesByCar}
          onChange={(event) =>
            setValue("arrivesByCar", event.target.checked, {
              shouldValidate: true,
            })
          }
          className="h-4 w-4 rounded border-(--border) accent-(--brand)"
        />
        <Car className="h-4 w-4" aria-hidden="true" />
        Chegarei de carro
      </label>

      {arrivesByCar && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="vehicle.plate"
            label="Placa"
            required
            error={vehicleErrors?.plate?.message}
          >
            <Input
              hasError={!!vehicleErrors?.plate}
              {...register("vehicle.plate")}
            />
          </FormField>
          <FormField
            id="vehicle.color"
            label="Cor"
            required
            error={vehicleErrors?.color?.message}
          >
            <Input
              hasError={!!vehicleErrors?.color}
              {...register("vehicle.color")}
            />
          </FormField>
          <FormField
            id="vehicle.brand"
            label="Marca"
            required
            error={vehicleErrors?.brand?.message}
          >
            <Input
              hasError={!!vehicleErrors?.brand}
              {...register("vehicle.brand")}
            />
          </FormField>
          <FormField
            id="vehicle.model"
            label="Modelo"
            required
            error={vehicleErrors?.model?.message}
          >
            <Input
              hasError={!!vehicleErrors?.model}
              {...register("vehicle.model")}
            />
          </FormField>
        </div>
      )}
    </section>
  );
}
