import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────

const cpf = z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos numéricos");

const MAX_PERIOD_DAYS = 7;

const msPerDay = 24 * 60 * 60 * 1000;

// ─── preferredPeriodSchema ────────────────────────────────────────────────
// Máx. 7 dias consecutivos por período (BRAIN §6.8). A checagem de 7 dias
// por 12 meses por indivíduo depende do histórico de reservas e é feita na
// Server Action (Bloco B), não aqui.

const preferredPeriodSchema = z
  .object({
    start: z.coerce.date({ invalid_type_error: "Data inicial inválida" }),
    end: z.coerce.date({ invalid_type_error: "Data final inválida" }),
  })
  .refine((period) => period.end > period.start, {
    message: "Data final deve ser depois da data inicial",
    path: ["end"],
  })
  .refine(
    (period) =>
      (period.end.getTime() - period.start.getTime()) / msPerDay <=
      MAX_PERIOD_DAYS,
    {
      message: `Cada período de preferência pode ter no máximo ${MAX_PERIOD_DAYS} dias`,
      path: ["end"],
    },
  );

// ─── companionSchema ──────────────────────────────────────────────────────
// Nome completo, CPF e data de nascimento são obrigatórios (Respostas10 Q158).

const companionSchema = z.object({
  name: z.string().min(3, "Nome completo é obrigatório").max(200),
  cpf,
  birthDate: z.coerce.date({
    invalid_type_error: "Data de nascimento inválida",
  }),
  isUnder3: z.boolean(),
});

// ─── vehicleSchema ─────────────────────────────────────────────────────────

export const vehicleSchema = z.object({
  plate: z
    .string()
    .min(7, "Placa inválida")
    .max(8, "Placa inválida")
    .regex(/^[A-Z0-9-]+$/i, "Placa inválida"),
  color: z.string().min(2, "Informe a cor do veículo").max(50),
  model: z.string().min(1, "Informe o modelo do veículo").max(100),
  brand: z.string().min(1, "Informe a marca do veículo").max(100),
});

// ─── guestSchema ───────────────────────────────────────────────────────────
// Até 6 acompanhantes e até 2 crianças menores de 3 anos (P-7.1, critério de
// aceite).

export const guestSchema = z.object({
  responsibleName: z.string().min(3, "Nome completo é obrigatório").max(200),
  responsibleCpf: cpf,
  responsibleEmail: z.string().email("E-mail inválido"),
  responsiblePhone: z.string().min(10, "Telefone inválido").max(20),
  responsibleBirthDate: z.coerce.date({
    invalid_type_error: "Data de nascimento inválida",
  }),
  responsibleDocumentUrl: z
    .string()
    .url("Envie o documento do responsável")
    .nullable()
    .optional()
    .default(null),
  ministryType: z.enum([
    "pastor",
    "missionario",
    "conjuge_pastor",
    "conjuge_missionario",
  ]),
  ministryStartDate: z.coerce.date({
    invalid_type_error: "Data de início do ministério inválida",
  }),
  companions: z
    .array(companionSchema)
    .max(6, "Máximo de 6 acompanhantes")
    .optional()
    .default([]),
  youngChildren: z
    .array(companionSchema)
    .max(2, "Máximo de 2 crianças menores de 3 anos")
    .optional()
    .default([]),
});

// ─── scoringAnswersSchema ──────────────────────────────────────────────────
// Respostas brutas informadas pelo hóspede — a pontuação em si é calculada
// automaticamente pelo sistema (Respostas9 Q150), nunca digitada pelo usuário.

export const scoringAnswersSchema = z.object({
  usageFrequency: z.enum(["nunca", "mais_de_1_ano", "menos_de_12_meses"]),
  ministryLocation: z.enum(["remota", "periferia", "centro"]),
  healthDeclared: z.boolean(),
  specialFamilySituation: z
    .string()
    .max(1000, "Descrição deve ter no máximo 1000 caracteres")
    .nullable()
    .optional()
    .default(null),
  lastRestOutsideCity: z.enum([
    "mais_de_2_anos",
    "entre_1_e_2_anos",
    "menos_de_1_ano",
  ]),
  ministryIntensity: z.enum(["alta", "media", "baixa"]),
  hasRecommendationLetter: z.boolean(),
  supportType: z.enum(["dependente", "parcial", "autossustentado"]),
});

// ─── aidRequestSchema ───────────────────────────────────────────────────────
// Diária fixa + transporte (aéreo R$1.000/pessoa ou combustível), aprovados
// caso a caso (BRAIN §6.8).

export const aidRequestSchema = z
  .object({
    requestsDailyAllowance: z.boolean(),
    transportMode: z.enum(["aereo", "combustivel", "nenhum"]),
    transportPassengerCount: z
      .number()
      .int()
      .positive("Informe o número de passageiros")
      .nullable()
      .optional()
      .default(null),
  })
  .refine(
    (aid) =>
      aid.transportMode !== "aereo" || (aid.transportPassengerCount ?? 0) > 0,
    {
      message: "Informe o número de passageiros para transporte aéreo",
      path: ["transportPassengerCount"],
    },
  );

// ─── createReservationRequestSchema ────────────────────────────────────────
// Formulário completo de solicitação de reserva: responsável + acompanhantes
// + 3 períodos de preferência + veículo (se aplicável) + respostas de
// scoring + auxílio opcional.

export const createReservationRequestSchema = z
  .object({
    guest: guestSchema,
    preferredPeriods: z.tuple([
      preferredPeriodSchema,
      preferredPeriodSchema,
      preferredPeriodSchema,
    ]),
    purpose: z
      .string()
      .min(10, "Descreva a finalidade da estadia (mínimo 10 caracteres)")
      .max(1000),
    arrivesByCar: z.boolean(),
    vehicle: vehicleSchema.nullable().optional().default(null),
    scoringAnswers: scoringAnswersSchema,
    aidRequest: aidRequestSchema.nullable().optional().default(null),
  })
  .refine((input) => !input.arrivesByCar || input.vehicle !== null, {
    message: "Informe os dados do veículo quando chegar de carro",
    path: ["vehicle"],
  });

export type CreateReservationRequestInput = z.infer<
  typeof createReservationRequestSchema
>;

// ─── reviewReservationSchema ───────────────────────────────────────────────
// Ação do diretor gestor: aprova (com unidade escolhida) ou rejeita.

export const reviewReservationSchema = z
  .object({
    reservationId: z.string().uuid(),
    decision: z.enum(["aprovada", "rejeitada"]),
    unitId: z.string().uuid().nullable().optional().default(null),
    confirmedPeriod: preferredPeriodSchema.nullable().optional().default(null),
    managerNotes: z.string().max(1000).nullable().optional().default(null),
  })
  .refine((input) => input.decision !== "aprovada" || input.unitId !== null, {
    message: "Selecione a unidade ao aprovar a reserva",
    path: ["unitId"],
  })
  .refine(
    (input) => input.decision !== "aprovada" || input.confirmedPeriod !== null,
    {
      message: "Confirme o período ao aprovar a reserva",
      path: ["confirmedPeriod"],
    },
  );

export type ReviewReservationInput = z.infer<typeof reviewReservationSchema>;

// ─── confirmScoringSchema ───────────────────────────────────────────────────
// O gestor confirma ou ajusta as sugestões de IA para os critérios
// subjetivos d (saúde) e g (intensidade ministerial) — a IA nunca decide
// sozinha (P-7.13, PATCH-012).

export const confirmScoringSchema = z.object({
  reservationId: z.string().uuid(),
  healthDeclaredPoints: z.union([z.literal(0), z.literal(5)]),
  ministryIntensityPoints: z.union([z.literal(0), z.literal(5), z.literal(10)]),
  specialFamilySituationPoints: z.number().int().min(0).max(5),
});

export type ConfirmScoringInput = z.infer<typeof confirmScoringSchema>;

// ─── reviewAidRequestSchema ──────────────────────────────────────────────────

export const reviewAidRequestSchema = z.object({
  aidRequestId: z.string().uuid(),
  decision: z.enum(["aprovado", "rejeitado"]),
  dailyAllowanceAmount: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .default(null),
  transportAmount: z.number().nonnegative().nullable().optional().default(null),
});

export type ReviewAidRequestInput = z.infer<typeof reviewAidRequestSchema>;

// ─── createUnitSchema ────────────────────────────────────────────────────────

export const createUnitSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório").max(200),
  description: z.string().max(2000).nullable().optional().default(null),
  capacity: z.number().int().positive().default(6),
  bedrooms: z.number().int().positive().default(2),
  hasSuite: z.boolean().default(true),
  photos: z.array(z.string().url()).optional().default([]),
  amenities: z.array(z.string().min(1)).optional().default([]),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
