"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import {
  Button,
  FormField,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { getSession, getSupabaseBrowserClient } from "@hebron/auth/client";
import {
  aidRequestSchema,
  createReservationRequestSchema,
  guestSchema,
  scoringAnswersSchema,
  vehicleSchema,
} from "@hebron/validators/flats";
import type {
  LastRestOutsideCity,
  MinistryIntensity,
  MinistryLocation,
  MinistryType,
  SupportType,
  TransportMode,
  UsageFrequency,
} from "@hebron/types/flats";
import { StepConsent } from "./reservation-wizard-steps/step-consent";
import { StepGuest } from "./reservation-wizard-steps/step-guest";
import { StepCompanions } from "./reservation-wizard-steps/step-companions";
import { StepVehicle } from "./reservation-wizard-steps/step-vehicle";
import { StepPeriods } from "./reservation-wizard-steps/step-periods";
import { StepScoring } from "./reservation-wizard-steps/step-scoring";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

// ─── Form value shape ─────────────────────────────────────────────────────
// Datas ficam como string (yyyy-mm-dd) enquanto no formulário — a coerção
// para Date acontece só na validação contra os schemas canônicos de
// @hebron/validators/flats, evitando conflito de tipo entrada/saída do
// z.coerce.date() com o resolver do react-hook-form.

export interface CompanionFormRow {
  name: string;
  cpf: string;
  birthDate: string;
}

export interface PeriodFormValue {
  start: string;
  end: string;
}

export interface ReservationWizardValues {
  consent: {
    dadosReserva: boolean;
    dadoSaude: boolean;
    comunicacao: boolean;
  };
  guest: {
    responsibleName: string;
    responsibleCpf: string;
    responsibleEmail: string;
    responsiblePhone: string;
    responsibleBirthDate: string;
    responsibleDocumentUrl: string | null;
    ministryType: MinistryType | "";
    ministryStartDate: string;
  };
  companions: CompanionFormRow[];
  youngChildren: CompanionFormRow[];
  arrivesByCar: boolean;
  vehicle: {
    plate: string;
    color: string;
    model: string;
    brand: string;
  };
  preferredPeriods: [PeriodFormValue, PeriodFormValue, PeriodFormValue];
  purpose: string;
  scoringAnswers: {
    usageFrequency: UsageFrequency | "";
    ministryLocation: MinistryLocation | "";
    healthDeclared: "sim" | "nao" | "";
    specialFamilySituation: string;
    lastRestOutsideCity: LastRestOutsideCity | "";
    ministryIntensity: MinistryIntensity | "";
    hasRecommendationLetter: "sim" | "nao" | "";
    supportType: SupportType | "";
  };
  aidRequest: {
    wantsAid: boolean;
    requestsDailyAllowance: boolean;
    transportMode: TransportMode;
    transportPassengerCount: string;
  };
}

const defaultValues: ReservationWizardValues = {
  consent: { dadosReserva: false, dadoSaude: false, comunicacao: false },
  guest: {
    responsibleName: "",
    responsibleCpf: "",
    responsibleEmail: "",
    responsiblePhone: "",
    responsibleBirthDate: "",
    responsibleDocumentUrl: null,
    ministryType: "",
    ministryStartDate: "",
  },
  companions: [],
  youngChildren: [],
  arrivesByCar: false,
  vehicle: { plate: "", color: "", model: "", brand: "" },
  preferredPeriods: [
    { start: "", end: "" },
    { start: "", end: "" },
    { start: "", end: "" },
  ],
  purpose: "",
  scoringAnswers: {
    usageFrequency: "",
    ministryLocation: "",
    healthDeclared: "",
    specialFamilySituation: "",
    lastRestOutsideCity: "",
    ministryIntensity: "",
    hasRecommendationLetter: "",
    supportType: "",
  },
  aidRequest: {
    wantsAid: false,
    requestsDailyAllowance: false,
    transportMode: "nenhum",
    transportPassengerCount: "",
  },
};

// ─── Steps ────────────────────────────────────────────────────────────────

const STEP = {
  consent: 0,
  guest: 1,
  companions: 2,
  vehicle: 3,
  periods: 4,
  scoring: 5,
  aid: 6,
  review: 7,
} as const;

const STEP_LABELS = [
  "Consentimento",
  "Responsável",
  "Acompanhantes",
  "Veículo",
  "Períodos",
  "Avaliação",
  "Auxílio",
  "Revisão",
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_PERIOD_DAYS = 7;

// ─── Issue → form-path mapping helpers ─────────────────────────────────────
// As schemas canônicos validam objetos "soltos" (ex.: guestSchema não tem um
// campo "guest" — os próprios campos do responsável estão na raiz). O
// formulário do wizard, porém, agrupa tudo sob "guest.*". Estas funções
// traduzem o path de um ZodIssue para o path correspondente no formulário.

function guestIssuePathToFormPath(
  path: (string | number)[],
): FieldPath<ReservationWizardValues> {
  const [head, ...rest] = path;
  if (head === "companions" || head === "youngChildren") {
    return [head, ...rest].join(".") as FieldPath<ReservationWizardValues>;
  }
  return ["guest", head, ...rest].join(
    ".",
  ) as FieldPath<ReservationWizardValues>;
}

function vehicleIssuePathToFormPath(
  path: (string | number)[],
): FieldPath<ReservationWizardValues> {
  return ["vehicle", ...path].join(".") as FieldPath<ReservationWizardValues>;
}

function scoringIssuePathToFormPath(
  path: (string | number)[],
): FieldPath<ReservationWizardValues> {
  return ["scoringAnswers", ...path].join(
    ".",
  ) as FieldPath<ReservationWizardValues>;
}

function aidIssuePathToFormPath(
  path: (string | number)[],
): FieldPath<ReservationWizardValues> {
  return ["aidRequest", ...path].join(
    ".",
  ) as FieldPath<ReservationWizardValues>;
}

function finalIssuePathToFormPath(
  path: (string | number)[],
): FieldPath<ReservationWizardValues> {
  const [head, ...rest] = path;
  if (head === "guest") return guestIssuePathToFormPath(rest);
  return path.join(".") as FieldPath<ReservationWizardValues>;
}

function stepIndexForIssuePath(path: (string | number)[]): number {
  const head = path[0];
  if (head === "guest") {
    return path[1] === "companions" || path[1] === "youngChildren"
      ? STEP.companions
      : STEP.guest;
  }
  if (head === "vehicle") return STEP.vehicle;
  if (head === "preferredPeriods" || head === "purpose") return STEP.periods;
  if (head === "scoringAnswers") return STEP.scoring;
  if (head === "aidRequest") return STEP.aid;
  return STEP.consent;
}

interface SchemaIssue {
  path: (string | number)[];
  message: string;
}

interface SchemaResult {
  success: boolean;
  error?: { issues: SchemaIssue[] };
}

function toScoringAnswersPayload(values: ReservationWizardValues) {
  const { scoringAnswers, consent } = values;
  return {
    usageFrequency: scoringAnswers.usageFrequency || undefined,
    ministryLocation: scoringAnswers.ministryLocation || undefined,
    healthDeclared: consent.dadoSaude
      ? scoringAnswers.healthDeclared === "sim"
      : false,
    specialFamilySituation: scoringAnswers.specialFamilySituation || null,
    lastRestOutsideCity: scoringAnswers.lastRestOutsideCity || undefined,
    ministryIntensity: scoringAnswers.ministryIntensity || undefined,
    hasRecommendationLetter: scoringAnswers.hasRecommendationLetter === "sim",
    supportType: scoringAnswers.supportType || undefined,
  };
}

// Grava os 3 consentimentos da reserva diretamente via client autorizado por
// RLS (consents_insert_own/consents_update_own — P-0.13). O helper rico
// packages/db/src/consents.ts#setConsent é server-only (usa `db` do
// Drizzle); como P-7.4 não inclui uma Server Action na lista de arquivos
// permitidos, o wizard grava via upsert direto, mais simples, mantendo o
// histórico de auditoria administrativa (setConsent) para o backoffice.
async function saveReservationConsents(
  userId: string,
  consent: ReservationWizardValues["consent"],
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const rows = (
    [
      { purpose: "dados_reserva", granted: consent.dadosReserva },
      { purpose: "dado_saude", granted: consent.dadoSaude },
      { purpose: "comunicacao", granted: consent.comunicacao },
    ] as const
  ).map((row) => ({
    user_id: userId,
    purpose: row.purpose,
    granted: row.granted,
    granted_at: row.granted ? now : null,
    revoked_at: row.granted ? null : now,
    source: "flats-reserva-wizard",
  }));

  const { error } = await supabase
    .from("consents")
    .upsert(rows, { onConflict: "user_id,purpose" });
  if (error) throw new Error(error.message);
}

// ─── Step indicator ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const total = STEP_LABELS.length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {STEP_LABELS.map((label, index) => (
          <div
            key={label}
            className={cn(
              "h-1.5 flex-1 rounded-(--radius-pill) transition-colors duration-(--transition-fast)",
              index <= current ? "bg-(--brand)" : "bg-(--surface-alt)",
            )}
          />
        ))}
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-(--fg-muted)">
        Passo {current + 1} de {total} · {STEP_LABELS[current]}
      </p>
    </div>
  );
}

// ─── Aid step (inline — sem arquivo próprio na lista permitida do P-7.4) ───

function StepAid() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ReservationWizardValues>();

  const aid = watch("aidRequest");
  const aidErrors = errors.aidRequest;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
        Auxílio opcional
      </h2>
      <label className="flex items-center gap-2 text-sm text-(--fg)">
        <input
          type="checkbox"
          checked={aid.wantsAid}
          onChange={(event) =>
            setValue("aidRequest.wantsAid", event.target.checked, {
              shouldValidate: true,
            })
          }
          className="h-4 w-4 rounded border-(--border) accent-(--brand)"
        />
        Solicitar diária e/ou ajuda de transporte
      </label>

      {aid.wantsAid && (
        <div className="flex flex-col gap-4 rounded-(--radius) border border-(--border) p-4">
          <label className="flex items-center gap-2 text-sm text-(--fg)">
            <input
              type="checkbox"
              {...register("aidRequest.requestsDailyAllowance")}
              className="h-4 w-4 rounded border-(--border) accent-(--brand)"
            />
            Solicitar diária fixa
          </label>

          <FormField id="aidRequest.transportMode" label="Transporte">
            <Select
              value={aid.transportMode}
              onValueChange={(v) =>
                setValue("aidRequest.transportMode", v as TransportMode, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="aidRequest.transportMode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                <SelectItem value="aereo">
                  Aéreo (R$ 1.000/passageiro)
                </SelectItem>
                <SelectItem value="combustivel">Combustível</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {aid.transportMode === "aereo" && (
            <FormField
              id="aidRequest.transportPassengerCount"
              label="Número de passageiros"
              required
              error={aidErrors?.transportPassengerCount?.message}
            >
              <input
                type="number"
                min={1}
                className="flex h-10 w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
                {...register("aidRequest.transportPassengerCount")}
              />
            </FormField>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Review step (inline) ──────────────────────────────────────────────────

function StepReview() {
  const { watch } = useFormContext<ReservationWizardValues>();
  const values = watch();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
        Revisão
      </h2>
      <p className="text-sm text-(--fg-muted)">
        Confira os dados antes de enviar. Você pode voltar a qualquer passo para
        corrigir.
      </p>

      <dl className="flex flex-col gap-3 rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-(--fg-muted)">Responsável</dt>
          <dd className="text-right font-medium text-(--fg)">
            {values.guest.responsibleName || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-(--fg-muted)">Acompanhantes</dt>
          <dd className="text-right font-medium text-(--fg)">
            {values.companions.length} adulto(s) · {values.youngChildren.length}{" "}
            criança(s)
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-(--fg-muted)">Veículo</dt>
          <dd className="text-right font-medium text-(--fg)">
            {values.arrivesByCar
              ? `${values.vehicle.brand} ${values.vehicle.model} · ${values.vehicle.plate}`
              : "Não vai de carro"}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-(--fg-muted)">Períodos de preferência</dt>
          {values.preferredPeriods.map((period, index) => (
            <dd key={index} className="font-medium text-(--fg)">
              {index + 1}ª: {period.start || "—"} a {period.end || "—"}
            </dd>
          ))}
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-(--fg-muted)">Auxílio solicitado</dt>
          <dd className="text-right font-medium text-(--fg)">
            {values.aidRequest.wantsAid ? "Sim" : "Não"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

// ─── Wizard ─────────────────────────────────────────────────────────────────

export function ReservationWizard() {
  const router = useRouter();
  const form = useForm<ReservationWizardValues>({ defaultValues });
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function applySchemaResult(
    result: SchemaResult,
    clearPaths: FieldPath<ReservationWizardValues>[],
    toFormPath: (
      path: (string | number)[],
    ) => FieldPath<ReservationWizardValues>,
  ): boolean {
    form.clearErrors(clearPaths);
    if (result.success) return true;
    for (const issue of result.error?.issues ?? []) {
      form.setError(toFormPath(issue.path), {
        type: "manual",
        message: issue.message,
      });
    }
    return false;
  }

  function validateConsentStep(): boolean {
    const { consent } = form.getValues();
    if (!consent.dadosReserva) {
      form.setError("consent.dadosReserva", {
        type: "manual",
        message:
          "É necessário consentir com o processamento dos dados da reserva para continuar.",
      });
      return false;
    }
    form.clearErrors("consent.dadosReserva");
    return true;
  }

  function validateGuestStep(): boolean {
    const { guest } = form.getValues();
    const result = guestSchema.safeParse({
      ...guest,
      ministryType: guest.ministryType || undefined,
      companions: [],
      youngChildren: [],
    });
    return applySchemaResult(
      result,
      [
        "guest.responsibleName",
        "guest.responsibleCpf",
        "guest.responsibleEmail",
        "guest.responsiblePhone",
        "guest.responsibleBirthDate",
        "guest.responsibleDocumentUrl",
        "guest.ministryType",
        "guest.ministryStartDate",
      ],
      guestIssuePathToFormPath,
    );
  }

  function validateCompanionsStep(): boolean {
    const { guest, companions, youngChildren } = form.getValues();
    const result = guestSchema.safeParse({
      ...guest,
      ministryType: guest.ministryType || undefined,
      companions: companions.map((c) => ({ ...c, isUnder3: false })),
      youngChildren: youngChildren.map((c) => ({ ...c, isUnder3: true })),
    });
    return applySchemaResult(
      result,
      ["companions", "youngChildren"],
      guestIssuePathToFormPath,
    );
  }

  function validateVehicleStep(): boolean {
    const { arrivesByCar, vehicle } = form.getValues();
    form.clearErrors("vehicle");
    if (!arrivesByCar) return true;
    const result = vehicleSchema.safeParse(vehicle);
    return applySchemaResult(result, ["vehicle"], vehicleIssuePathToFormPath);
  }

  function validatePeriodsStep(): boolean {
    const { preferredPeriods, purpose } = form.getValues();
    form.clearErrors(["preferredPeriods", "purpose"]);
    let ok = true;

    preferredPeriods.forEach((period, index) => {
      if (!period.start || !period.end) {
        form.setError(
          `preferredPeriods.${index}.start` as FieldPath<ReservationWizardValues>,
          { type: "manual", message: "Informe o período completo" },
        );
        ok = false;
        return;
      }
      const start = new Date(`${period.start}T00:00:00`);
      const end = new Date(`${period.end}T00:00:00`);
      if (end <= start) {
        form.setError(
          `preferredPeriods.${index}.end` as FieldPath<ReservationWizardValues>,
          { type: "manual", message: "Data final deve ser depois da inicial" },
        );
        ok = false;
      } else if (
        (end.getTime() - start.getTime()) / MS_PER_DAY >
        MAX_PERIOD_DAYS
      ) {
        form.setError(
          `preferredPeriods.${index}.end` as FieldPath<ReservationWizardValues>,
          {
            type: "manual",
            message: `Máximo de ${MAX_PERIOD_DAYS} dias por período`,
          },
        );
        ok = false;
      }
    });

    if (!purpose || purpose.trim().length < 10) {
      form.setError("purpose", {
        type: "manual",
        message: "Descreva a finalidade da estadia (mínimo 10 caracteres)",
      });
      ok = false;
    }

    return ok;
  }

  function validateScoringStep(): boolean {
    const values = form.getValues();
    const result = scoringAnswersSchema.safeParse(
      toScoringAnswersPayload(values),
    );
    return applySchemaResult(
      result,
      ["scoringAnswers"],
      scoringIssuePathToFormPath,
    );
  }

  function validateAidStep(): boolean {
    const { aidRequest } = form.getValues();
    form.clearErrors("aidRequest");
    if (!aidRequest.wantsAid) return true;
    const result = aidRequestSchema.safeParse({
      requestsDailyAllowance: aidRequest.requestsDailyAllowance,
      transportMode: aidRequest.transportMode,
      transportPassengerCount:
        aidRequest.transportMode === "aereo" &&
        aidRequest.transportPassengerCount
          ? Number(aidRequest.transportPassengerCount)
          : null,
    });
    return applySchemaResult(result, ["aidRequest"], aidIssuePathToFormPath);
  }

  function validateCurrentStep(): boolean {
    switch (stepIndex) {
      case STEP.consent:
        return validateConsentStep();
      case STEP.guest:
        return validateGuestStep();
      case STEP.companions:
        return validateCompanionsStep();
      case STEP.vehicle:
        return validateVehicleStep();
      case STEP.periods:
        return validatePeriodsStep();
      case STEP.scoring:
        return validateScoringStep();
      case STEP.aid:
        return validateAidStep();
      default:
        return true;
    }
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStepIndex((index) => Math.min(index + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  async function handleFinalSubmit() {
    setSubmitError(null);
    const values = form.getValues();

    const payload = {
      guest: {
        responsibleName: values.guest.responsibleName,
        responsibleCpf: values.guest.responsibleCpf,
        responsibleEmail: values.guest.responsibleEmail,
        responsiblePhone: values.guest.responsiblePhone,
        responsibleBirthDate: values.guest.responsibleBirthDate,
        responsibleDocumentUrl: values.guest.responsibleDocumentUrl,
        ministryType: values.guest.ministryType || undefined,
        ministryStartDate: values.guest.ministryStartDate,
        companions: values.companions.map((c) => ({ ...c, isUnder3: false })),
        youngChildren: values.youngChildren.map((c) => ({
          ...c,
          isUnder3: true,
        })),
      },
      preferredPeriods: values.preferredPeriods.map((p) => ({
        start: p.start,
        end: p.end,
      })),
      purpose: values.purpose,
      arrivesByCar: values.arrivesByCar,
      vehicle: values.arrivesByCar
        ? {
            plate: values.vehicle.plate,
            color: values.vehicle.color,
            model: values.vehicle.model,
            brand: values.vehicle.brand,
          }
        : null,
      scoringAnswers: toScoringAnswersPayload(values),
      aidRequest: values.aidRequest.wantsAid
        ? {
            requestsDailyAllowance: values.aidRequest.requestsDailyAllowance,
            transportMode: values.aidRequest.transportMode,
            transportPassengerCount:
              values.aidRequest.transportMode === "aereo" &&
              values.aidRequest.transportPassengerCount
                ? Number(values.aidRequest.transportPassengerCount)
                : null,
          }
        : null,
    };

    const result = createReservationRequestSchema.safeParse(payload);
    if (!result.success) {
      applySchemaResult(result, [], finalIssuePathToFormPath);
      const firstIssue = result.error.issues[0];
      if (firstIssue) setStepIndex(stepIndexForIssuePath(firstIssue.path));
      return;
    }

    if (!values.consent.dadosReserva) {
      setStepIndex(STEP.consent);
      form.setError("consent.dadosReserva", {
        type: "manual",
        message:
          "É necessário consentir com o processamento dos dados da reserva para continuar.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { session, error: sessionError } = await getSession();
      if (sessionError || !session) {
        throw new Error(
          "Sessão expirada. Faça login novamente para enviar a solicitação.",
        );
      }
      await saveReservationConsents(session.user.id, values.consent);
      router.push("/minhas-reservas");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Falha ao enviar a solicitação.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isReview = stepIndex === STEP.review;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        title="Solicitar reserva"
        description="Preencha os passos abaixo. Sua solicitação será avaliada pela gestão dos flats considerando o critério de pontuação (BRAIN §6.8) e a disponibilidade de calendário."
      />

      <FormProvider {...form}>
        <StepIndicator current={stepIndex} />

        <form
          onSubmit={(event) => event.preventDefault()}
          noValidate
          className="flex flex-col gap-10"
        >
          {stepIndex === STEP.consent && <StepConsent />}
          {stepIndex === STEP.guest && <StepGuest />}
          {stepIndex === STEP.companions && <StepCompanions />}
          {stepIndex === STEP.vehicle && <StepVehicle />}
          {stepIndex === STEP.periods && <StepPeriods />}
          {stepIndex === STEP.scoring && <StepScoring />}
          {stepIndex === STEP.aid && <StepAid />}
          {isReview && <StepReview />}

          {submitError && (
            <p className="rounded-(--radius) bg-(--color-destructive-muted) px-4 py-3 text-sm text-(--color-destructive)">
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-(--divider) pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={stepIndex === STEP.consent || submitting}
            >
              Voltar
            </Button>

            {isReview ? (
              <Button
                type="button"
                size="lg"
                loading={submitting}
                onClick={handleFinalSubmit}
              >
                Enviar solicitação
              </Button>
            ) : (
              <Button type="button" size="lg" onClick={goNext}>
                Próximo
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
