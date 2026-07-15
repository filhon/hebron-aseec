"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Car } from "lucide-react";
import {
  PageHeader,
  Button,
  Input,
  Label,
  FormField,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@hebron/ui";
import {
  PeriodPicker,
  type PeriodPickerValue,
} from "../../../components/period-picker";
import { createReservationRequestSchema } from "@hebron/validators/flats";
import type {
  MinistryType,
  UsageFrequency,
  MinistryLocation,
  LastRestOutsideCity,
  MinistryIntensity,
  SupportType,
  TransportMode,
} from "@hebron/types/flats";

const MINISTRY_TYPE_OPTIONS: { value: MinistryType; label: string }[] = [
  { value: "pastor", label: "Pastor" },
  { value: "missionario", label: "Missionário" },
  { value: "conjuge_pastor", label: "Cônjuge de pastor" },
  { value: "conjuge_missionario", label: "Cônjuge de missionário" },
];

const USAGE_FREQUENCY_OPTIONS: { value: UsageFrequency; label: string }[] = [
  { value: "nunca", label: "Nunca usei o flat" },
  { value: "mais_de_1_ano", label: "Última vez há mais de 1 ano" },
  { value: "menos_de_12_meses", label: "Última vez há menos de 12 meses" },
];

const MINISTRY_LOCATION_OPTIONS: { value: MinistryLocation; label: string }[] =
  [
    { value: "remota", label: "Área remota" },
    { value: "periferia", label: "Periferia" },
    { value: "centro", label: "Centro urbano" },
  ];

const LAST_REST_OPTIONS: { value: LastRestOutsideCity; label: string }[] = [
  { value: "mais_de_2_anos", label: "Mais de 2 anos sem descansar fora" },
  { value: "entre_1_e_2_anos", label: "Entre 1 e 2 anos sem descansar fora" },
  { value: "menos_de_1_ano", label: "Menos de 1 ano sem descansar fora" },
];

const MINISTRY_INTENSITY_OPTIONS: {
  value: MinistryIntensity;
  label: string;
}[] = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

const SUPPORT_TYPE_OPTIONS: { value: SupportType; label: string }[] = [
  { value: "dependente", label: "Dependente de sustento" },
  { value: "parcial", label: "Sustento parcial" },
  { value: "autossustentado", label: "Autossustentado" },
];

interface CompanionRow {
  name: string;
  cpf: string;
  birthDate: string;
}

const emptyCompanion = (): CompanionRow => ({
  name: "",
  cpf: "",
  birthDate: "",
});

const emptyPeriods: PeriodPickerValue = [
  { start: "", end: "" },
  { start: "", end: "" },
  { start: "", end: "" },
];

export default function ReservarPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleCpf, setResponsibleCpf] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [responsibleBirthDate, setResponsibleBirthDate] = useState("");
  const [ministryType, setMinistryType] = useState<MinistryType | "">("");
  const [ministryStartDate, setMinistryStartDate] = useState("");

  const [companions, setCompanions] = useState<CompanionRow[]>([]);
  const [youngChildren, setYoungChildren] = useState<CompanionRow[]>([]);

  const [preferredPeriods, setPreferredPeriods] =
    useState<PeriodPickerValue>(emptyPeriods);
  const [purpose, setPurpose] = useState("");

  const [arrivesByCar, setArrivesByCar] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState("");

  const [usageFrequency, setUsageFrequency] = useState<UsageFrequency | "">("");
  const [ministryLocation, setMinistryLocation] = useState<
    MinistryLocation | ""
  >("");
  const [healthDeclared, setHealthDeclared] = useState<"sim" | "nao" | "">("");
  const [specialFamilySituation, setSpecialFamilySituation] = useState("");
  const [lastRestOutsideCity, setLastRestOutsideCity] = useState<
    LastRestOutsideCity | ""
  >("");
  const [ministryIntensity, setMinistryIntensity] = useState<
    MinistryIntensity | ""
  >("");
  const [hasRecommendationLetter, setHasRecommendationLetter] = useState<
    "sim" | "nao" | ""
  >("");
  const [supportType, setSupportType] = useState<SupportType | "">("");

  const [wantsAid, setWantsAid] = useState(false);
  const [requestsDailyAllowance, setRequestsDailyAllowance] = useState(false);
  const [transportMode, setTransportMode] = useState<TransportMode>("nenhum");
  const [transportPassengerCount, setTransportPassengerCount] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function addCompanion() {
    if (companions.length >= 6) return;
    setCompanions((prev) => [...prev, emptyCompanion()]);
  }

  function addChild() {
    if (youngChildren.length >= 2) return;
    setYoungChildren((prev) => [...prev, emptyCompanion()]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      guest: {
        responsibleName,
        responsibleCpf,
        responsibleEmail,
        responsiblePhone,
        responsibleBirthDate,
        responsibleDocumentUrl: null,
        ministryType: ministryType || undefined,
        ministryStartDate,
        companions: companions.map((c) => ({ ...c, isUnder3: false })),
        youngChildren: youngChildren.map((c) => ({ ...c, isUnder3: true })),
      },
      preferredPeriods: preferredPeriods.map((p) => ({
        start: p.start,
        end: p.end,
      })),
      purpose,
      arrivesByCar,
      vehicle: arrivesByCar
        ? {
            plate: vehiclePlate,
            color: vehicleColor,
            model: vehicleModel,
            brand: vehicleBrand,
          }
        : null,
      scoringAnswers: {
        usageFrequency: usageFrequency || undefined,
        ministryLocation: ministryLocation || undefined,
        healthDeclared: healthDeclared === "sim",
        specialFamilySituation: specialFamilySituation || null,
        lastRestOutsideCity: lastRestOutsideCity || undefined,
        ministryIntensity: ministryIntensity || undefined,
        hasRecommendationLetter: hasRecommendationLetter === "sim",
        supportType: supportType || undefined,
      },
      aidRequest: wantsAid
        ? {
            requestsDailyAllowance,
            transportMode,
            transportPassengerCount:
              transportMode === "aereo" && transportPassengerCount
                ? Number(transportPassengerCount)
                : null,
          }
        : null,
    };

    const result = createReservationRequestSchema.safeParse(payload);

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!nextErrors[path]) nextErrors[path] = issue.message;
      }
      setErrors(nextErrors);
      setSubmitted(false);
      return;
    }

    setErrors({});
    setSubmitted(true);
    router.push("/minhas-reservas");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        title="Solicitar reserva"
        description="Preencha os dados abaixo. Sua solicitação será avaliada pela gestão dos flats considerando o critério de pontuação (BRAIN §6.8) e a disponibilidade de calendário."
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">
        {/* Dados do responsável */}
        <section className="flex flex-col gap-4">
          <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
            Dados do responsável
          </h2>

          <FormField
            id="responsibleName"
            label="Nome completo"
            required
            error={errors["guest.responsibleName"]}
          >
            <Input
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              hasError={!!errors["guest.responsibleName"]}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              id="responsibleCpf"
              label="CPF"
              required
              hint="Somente números"
              error={errors["guest.responsibleCpf"]}
            >
              <Input
                value={responsibleCpf}
                onChange={(e) => setResponsibleCpf(e.target.value)}
                hasError={!!errors["guest.responsibleCpf"]}
                maxLength={11}
              />
            </FormField>

            <FormField
              id="responsibleBirthDate"
              label="Data de nascimento"
              required
              error={errors["guest.responsibleBirthDate"]}
            >
              <Input
                type="date"
                max={today}
                value={responsibleBirthDate}
                onChange={(e) => setResponsibleBirthDate(e.target.value)}
                hasError={!!errors["guest.responsibleBirthDate"]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              id="responsibleEmail"
              label="E-mail"
              required
              error={errors["guest.responsibleEmail"]}
            >
              <Input
                type="email"
                value={responsibleEmail}
                onChange={(e) => setResponsibleEmail(e.target.value)}
                hasError={!!errors["guest.responsibleEmail"]}
              />
            </FormField>

            <FormField
              id="responsiblePhone"
              label="Telefone"
              required
              error={errors["guest.responsiblePhone"]}
            >
              <Input
                type="tel"
                value={responsiblePhone}
                onChange={(e) => setResponsiblePhone(e.target.value)}
                hasError={!!errors["guest.responsiblePhone"]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              id="ministryType"
              label="Tipo de ministério"
              required
              error={errors["guest.ministryType"]}
            >
              <Select
                value={ministryType}
                onValueChange={(v) => setMinistryType(v as MinistryType)}
              >
                <SelectTrigger
                  id="ministryType"
                  hasError={!!errors["guest.ministryType"]}
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MINISTRY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id="ministryStartDate"
              label="Início do ministério"
              required
              hint="Usado no cálculo de tempo de ministério (critério a)"
              error={errors["guest.ministryStartDate"]}
            >
              <Input
                type="date"
                max={today}
                value={ministryStartDate}
                onChange={(e) => setMinistryStartDate(e.target.value)}
                hasError={!!errors["guest.ministryStartDate"]}
              />
            </FormField>
          </div>
        </section>

        {/* Acompanhantes */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
              Acompanhantes
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCompanion}
              disabled={companions.length >= 6}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar
            </Button>
          </div>
          <p className="text-sm text-(--fg-muted)">
            Até 6 acompanhantes. Nome completo, CPF e data de nascimento são
            exigidos pela portaria do condomínio.
          </p>

          {companions.length === 0 ? (
            <p className="rounded-(--radius) border border-dashed border-(--border) px-4 py-6 text-center text-sm text-(--fg-muted)">
              Nenhum acompanhante adicionado.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {companions.map((companion, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-(--radius) border border-(--border) p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
                >
                  <div className="flex flex-col gap-1.5">
                    <Label>Nome completo</Label>
                    <Input
                      value={companion.name}
                      onChange={(e) =>
                        setCompanions((prev) =>
                          prev.map((c, i) =>
                            i === index ? { ...c, name: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>CPF</Label>
                    <Input
                      value={companion.cpf}
                      maxLength={11}
                      onChange={(e) =>
                        setCompanions((prev) =>
                          prev.map((c, i) =>
                            i === index ? { ...c, cpf: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Nascimento</Label>
                    <Input
                      type="date"
                      max={today}
                      value={companion.birthDate}
                      onChange={(e) =>
                        setCompanions((prev) =>
                          prev.map((c, i) =>
                            i === index
                              ? { ...c, birthDate: e.target.value }
                              : c,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover acompanhante"
                      onClick={() =>
                        setCompanions((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-semibold text-(--fg)">
              Crianças menores de 3 anos
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addChild}
              disabled={youngChildren.length >= 2}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar
            </Button>
          </div>
          <p className="text-sm text-(--fg-muted)">
            Até 2 crianças menores de 3 anos. Não contam na capacidade de 6
            pessoas da unidade.
          </p>

          {youngChildren.length > 0 && (
            <div className="flex flex-col gap-3">
              {youngChildren.map((child, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-(--radius) border border-(--border) p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
                >
                  <div className="flex flex-col gap-1.5">
                    <Label>Nome completo</Label>
                    <Input
                      value={child.name}
                      onChange={(e) =>
                        setYoungChildren((prev) =>
                          prev.map((c, i) =>
                            i === index ? { ...c, name: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>CPF</Label>
                    <Input
                      value={child.cpf}
                      maxLength={11}
                      onChange={(e) =>
                        setYoungChildren((prev) =>
                          prev.map((c, i) =>
                            i === index ? { ...c, cpf: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Nascimento</Label>
                    <Input
                      type="date"
                      max={today}
                      value={child.birthDate}
                      onChange={(e) =>
                        setYoungChildren((prev) =>
                          prev.map((c, i) =>
                            i === index
                              ? { ...c, birthDate: e.target.value }
                              : c,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover criança"
                      onClick={() =>
                        setYoungChildren((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Veículo */}
        <section className="flex flex-col gap-4">
          <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
            Veículo
          </h2>
          <label className="flex items-center gap-2 text-sm text-(--fg)">
            <input
              type="checkbox"
              checked={arrivesByCar}
              onChange={(e) => setArrivesByCar(e.target.checked)}
              className="h-4 w-4 rounded border-(--border) accent-(--brand)"
            />
            <Car className="h-4 w-4" aria-hidden="true" />
            Chegarei de carro
          </label>

          {arrivesByCar && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                id="vehiclePlate"
                label="Placa"
                required
                error={errors["vehicle.plate"]}
              >
                <Input
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  hasError={!!errors["vehicle.plate"]}
                />
              </FormField>
              <FormField
                id="vehicleColor"
                label="Cor"
                required
                error={errors["vehicle.color"]}
              >
                <Input
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  hasError={!!errors["vehicle.color"]}
                />
              </FormField>
              <FormField
                id="vehicleBrand"
                label="Marca"
                required
                error={errors["vehicle.brand"]}
              >
                <Input
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                  hasError={!!errors["vehicle.brand"]}
                />
              </FormField>
              <FormField
                id="vehicleModel"
                label="Modelo"
                required
                error={errors["vehicle.model"]}
              >
                <Input
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  hasError={!!errors["vehicle.model"]}
                />
              </FormField>
            </div>
          )}
        </section>

        {/* Períodos de preferência */}
        <section className="flex flex-col gap-4">
          <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
            Períodos de preferência
          </h2>
          <p className="text-sm text-(--fg-muted)">
            Informe 3 períodos, em ordem de preferência. Cada período pode ter
            no máximo 7 dias consecutivos.
          </p>
          <PeriodPicker
            value={preferredPeriods}
            onChange={setPreferredPeriods}
            minDate={today}
          />

          <FormField
            id="purpose"
            label="Finalidade da estadia"
            required
            hint="Descreva brevemente o motivo do pedido de descanso"
            error={errors.purpose}
          >
            <textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              className="flex w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
            />
          </FormField>
        </section>

        {/* Critérios de scoring */}
        <section className="flex flex-col gap-4">
          <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
            Critérios de avaliação
          </h2>
          <p className="text-sm text-(--fg-muted)">
            Estas respostas alimentam a pontuação automática e determinística
            usada pela gestão para priorizar solicitações (BRAIN §6.8). A
            pontuação em si nunca é digitada por você.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              id="usageFrequency"
              label="Frequência de uso do flat"
              required
              error={errors["scoringAnswers.usageFrequency"]}
            >
              <Select
                value={usageFrequency}
                onValueChange={(v) => setUsageFrequency(v as UsageFrequency)}
              >
                <SelectTrigger id="usageFrequency">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {USAGE_FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id="ministryLocation"
              label="Local/contexto de atuação"
              required
              error={errors["scoringAnswers.ministryLocation"]}
            >
              <Select
                value={ministryLocation}
                onValueChange={(v) =>
                  setMinistryLocation(v as MinistryLocation)
                }
              >
                <SelectTrigger id="ministryLocation">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MINISTRY_LOCATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id="lastRestOutsideCity"
              label="Último descanso fora da cidade"
              required
              error={errors["scoringAnswers.lastRestOutsideCity"]}
            >
              <Select
                value={lastRestOutsideCity}
                onValueChange={(v) =>
                  setLastRestOutsideCity(v as LastRestOutsideCity)
                }
              >
                <SelectTrigger id="lastRestOutsideCity">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {LAST_REST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id="ministryIntensity"
              label="Intensidade ministerial atual"
              required
              error={errors["scoringAnswers.ministryIntensity"]}
            >
              <Select
                value={ministryIntensity}
                onValueChange={(v) =>
                  setMinistryIntensity(v as MinistryIntensity)
                }
              >
                <SelectTrigger id="ministryIntensity">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MINISTRY_INTENSITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id="supportType"
              label="Tipo de sustento"
              required
              error={errors["scoringAnswers.supportType"]}
            >
              <Select
                value={supportType}
                onValueChange={(v) => setSupportType(v as SupportType)}
              >
                <SelectTrigger id="supportType">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id="hasRecommendationLetter"
              label="Possui carta de recomendação"
              required
              error={errors["scoringAnswers.hasRecommendationLetter"]}
            >
              <Select
                value={hasRecommendationLetter}
                onValueChange={(v) =>
                  setHasRecommendationLetter(v as "sim" | "nao")
                }
              >
                <SelectTrigger id="hasRecommendationLetter">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              id="healthDeclared"
              label="Possui condição de saúde a declarar"
              required
              hint="Apenas sim/não — sem laudos ou detalhes clínicos (BRAIN §6.8)"
              error={errors["scoringAnswers.healthDeclared"]}
            >
              <Select
                value={healthDeclared}
                onValueChange={(v) => setHealthDeclared(v as "sim" | "nao")}
              >
                <SelectTrigger id="healthDeclared">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField
            id="specialFamilySituation"
            label="Situação familiar especial"
            hint="Opcional — luto recente, saúde de dependentes etc."
            error={errors["scoringAnswers.specialFamilySituation"]}
          >
            <textarea
              id="specialFamilySituation"
              value={specialFamilySituation}
              onChange={(e) => setSpecialFamilySituation(e.target.value)}
              rows={2}
              className="flex w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:outline-none focus-visible:border-(--brand) focus-visible:ring-2 focus-visible:ring-(--brand)/20"
            />
          </FormField>
        </section>

        {/* Auxílio opcional */}
        <section className="flex flex-col gap-4">
          <h2 className="font-(--font-display) text-lg font-semibold text-(--fg)">
            Auxílio opcional
          </h2>
          <label className="flex items-center gap-2 text-sm text-(--fg)">
            <input
              type="checkbox"
              checked={wantsAid}
              onChange={(e) => setWantsAid(e.target.checked)}
              className="h-4 w-4 rounded border-(--border) accent-(--brand)"
            />
            Solicitar diária e/ou ajuda de transporte
          </label>

          {wantsAid && (
            <div className="flex flex-col gap-4 rounded-(--radius) border border-(--border) p-4">
              <label className="flex items-center gap-2 text-sm text-(--fg)">
                <input
                  type="checkbox"
                  checked={requestsDailyAllowance}
                  onChange={(e) => setRequestsDailyAllowance(e.target.checked)}
                  className="h-4 w-4 rounded border-(--border) accent-(--brand)"
                />
                Solicitar diária fixa
              </label>

              <FormField id="transportMode" label="Transporte">
                <Select
                  value={transportMode}
                  onValueChange={(v) => setTransportMode(v as TransportMode)}
                >
                  <SelectTrigger id="transportMode">
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

              {transportMode === "aereo" && (
                <FormField
                  id="transportPassengerCount"
                  label="Número de passageiros"
                  required
                  error={errors["aidRequest.transportPassengerCount"]}
                >
                  <Input
                    type="number"
                    min={1}
                    value={transportPassengerCount}
                    onChange={(e) => setTransportPassengerCount(e.target.value)}
                    hasError={!!errors["aidRequest.transportPassengerCount"]}
                  />
                </FormField>
              )}
            </div>
          )}
        </section>

        {submitted && (
          <p className="rounded-(--radius) bg-(--hb-green-muted) px-4 py-3 text-sm text-(--hb-green-deep)">
            Solicitação enviada com sucesso.
          </p>
        )}

        {Object.keys(errors).length > 0 && (
          <p className="rounded-(--radius) bg-(--color-destructive-muted) px-4 py-3 text-sm text-(--color-destructive)">
            Revise os campos destacados acima antes de enviar.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="lg">
            Enviar solicitação
          </Button>
        </div>
      </form>
    </div>
  );
}
