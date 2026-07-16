import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { flatsSchema, users } from "./public";

// ---------------------------------------------------------------------------
// daterange — sem tipo nativo no drizzle-orm/pg-core; custom type mapeado
// para string ISO (YYYY-MM-DD) em cada ponta. Usado para preferred_periods,
// reservations.selected_period e usage_history.period (BRAIN §6.8 — períodos
// de data abertos, não blocos fixos de 7 dias).
//
// O EXCLUDE USING gist que impede double-booking (P-7.6, critério de aceite)
// não é representável no schema Drizzle — vive só na migration SQL, mesmo
// padrão da imutabilidade de financeiro.transactions (sem UPDATE/DELETE via
// constraint, não expressa em schema/financeiro.ts).
// ---------------------------------------------------------------------------
export interface DateRange {
  start: string;
  end: string;
}

export const daterange = customType<{ data: DateRange; driverData: string }>({
  dataType() {
    return "daterange";
  },
  toDriver(value) {
    return `[${value.start},${value.end}]`;
  },
  fromDriver(value) {
    const match = /^[[(]([^,]*),([^,)\]]*)[)\]]$/.exec(value);
    if (!match) {
      throw new Error(`Formato inesperado de daterange: ${value}`);
    }
    return { start: match[1] ?? "", end: match[2] ?? "" };
  },
});

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const reservationStatusEnum = flatsSchema.enum("reservation_status", [
  "solicitada",
  "aprovada",
  "rejeitada",
  "confirmada",
  "em_curso",
  "concluida",
  "cancelada",
]);

// Elegibilidade (BRAIN §6.8): pastores em exercício, missionários em
// contexto transcultural, cônjuges de pastores/missionários.
export const ministryTypeEnum = flatsSchema.enum("ministry_type", [
  "pastor",
  "missionario",
  "conjuge_pastor",
  "conjuge_missionario",
]);

// Os 10 critérios de scoring (a-j), pontuação determinística (BRAIN §6.8).
export const scoringCriterionEnum = flatsSchema.enum("scoring_criterion", [
  "a_tempo_ministerio",
  "b_frequencia_uso",
  "c_localizacao",
  "d_saude",
  "e_situacao_familiar",
  "f_ultimo_descanso",
  "g_intensidade_ministerial",
  "h_carta_recomendacao",
  "i_tipo_sustento",
  "j_participacao_projetos",
]);

export const transportModeEnum = flatsSchema.enum("transport_mode", [
  "aereo",
  "combustivel",
  "nenhum",
]);

export const aidRequestStatusEnum = flatsSchema.enum("aid_request_status", [
  "solicitado",
  "aprovado",
  "rejeitado",
]);

// ---------------------------------------------------------------------------
// flats.units — 2 fixas, gratuitas, seed na migration (BRAIN §6.8). Sem
// rota de criação na v1.
// ---------------------------------------------------------------------------
export const units = flatsSchema.table("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull().default(6),
  bedrooms: integer("bedrooms").notNull().default(2),
  hasSuite: boolean("has_suite").notNull().default(true),
  photos: jsonb("photos").$type<string[]>().notNull().default([]),
  amenities: jsonb("amenities").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// flats.reservations
// Double-booking: EXCLUDE USING gist (unit_id WITH =, selected_period WITH
// &&) WHERE status IN ('aprovada','confirmada','em_curso') — só migration
// SQL, não representável aqui (ver nota do customType `daterange` acima).
// score_total é uma cópia denormalizada de sum(scoring_responses.points)
// para ordenação/filtro rápidos na fila de aprovação; a fonte de verdade
// continua scoring_responses.
// ---------------------------------------------------------------------------
export const reservations = flatsSchema.table(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    unitId: uuid("unit_id").references(() => units.id, {
      onDelete: "restrict",
    }),
    status: reservationStatusEnum("status").notNull().default("solicitada"),
    selectedPeriod: daterange("selected_period"),
    purpose: text("purpose").notNull(),
    arrivesByCar: boolean("arrives_by_car").notNull().default(false),
    scoreTotal: integer("score_total"),
    managerNotes: text("manager_notes"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reservations_requested_by_idx").on(table.requestedBy),
    index("reservations_status_idx").on(table.status),
    index("reservations_unit_id_idx").on(table.unitId),
  ],
);

// ---------------------------------------------------------------------------
// flats.preferred_periods — exatamente 3 por reserva (hóspede submete 3
// faixas de data abertas, BRAIN §6.8). `rank` (1-3) + UNIQUE garante no
// máximo 3 por reserva; exigir as 3 é responsabilidade do formulário
// (P-7.4, já implementado) e da Server Action (P-7.9).
// ---------------------------------------------------------------------------
export const preferredPeriods = flatsSchema.table(
  "preferred_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    period: daterange("period").notNull(),
    rank: integer("rank").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("preferred_periods_reservation_rank_uniq").on(
      table.reservationId,
      table.rank,
    ),
    index("preferred_periods_reservation_id_idx").on(table.reservationId),
    check("preferred_periods_rank_check", sql`${table.rank} IN (1, 2, 3)`),
  ],
);

// ---------------------------------------------------------------------------
// flats.guests — uma linha por pessoa (responsável, acompanhante ou criança
// menor de 3 anos) vinculada à reserva. PII: name, cpf, birth_date, email,
// phone — acesso restrito a gestor/super_admin via RLS (P-7.7).
// email/phone/ministry_type/ministry_start_date só se aplicam ao
// responsável (is_responsible = true); is_under_3 só a acompanhantes.
// ---------------------------------------------------------------------------
export const guests = flatsSchema.table(
  "guests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    // Vinculado a public.users quando o responsável já tem conta no ecossistema.
    userId: uuid("user_id").references(() => users.id),
    name: text("name").notNull(),
    cpf: text("cpf").notNull(),
    birthDate: date("birth_date").notNull(),
    isResponsible: boolean("is_responsible").notNull().default(false),
    // Não conta na capacidade de 6 pessoas da unidade (BRAIN §6.8).
    isUnder3: boolean("is_under_3").notNull().default(false),
    email: text("email"),
    phone: text("phone"),
    ministryType: ministryTypeEnum("ministry_type"),
    // Usado no critério de scoring (a) — tempo de ministério, 1pt/ano.
    ministryStartDate: date("ministry_start_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("guests_reservation_id_idx").on(table.reservationId),
    // No máximo 1 responsável por reserva — índice único parcial, não uma
    // constraint de tabela comum (is_responsible=false se repete entre
    // acompanhantes da mesma reserva).
    uniqueIndex("guests_reservation_responsible_uniq")
      .on(table.reservationId)
      .where(sql`${table.isResponsible} = true`),
  ],
);

// ---------------------------------------------------------------------------
// flats.vehicles — obrigatório apenas quando reservations.arrives_by_car é
// true (Respostas10 Q158); no máximo 1 por reserva.
// ---------------------------------------------------------------------------
export const vehicles = flatsSchema.table("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id")
    .notNull()
    .unique()
    .references(() => reservations.id, { onDelete: "cascade" }),
  plate: text("plate").notNull(),
  color: text("color").notNull(),
  model: text("model").notNull(),
  brand: text("brand").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// flats.scoring_responses — uma linha por critério (a-j) por reserva.
// O critério d (saúde) é dado sensível (BRAIN §6.8/LGPD): a resposta vive na
// coluna própria `health_self_declared`, nunca em `value`, para permitir
// GRANT/RLS restrito só a essa coluna (P-7.7) — coleta condicionada a
// consentimento `dado_saude` em public.consents (P-7.4). Sugestão de IA
// (aiSuggestedPoints) e confirmação do gestor (confirmedBy) ficam para
// P-7.13 (BRAIN §6.8 "Assistência de IA no scoring", PATCH-012) — fora do
// escopo deste prompt.
// ---------------------------------------------------------------------------
export const scoringResponses = flatsSchema.table(
  "scoring_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    criterion: scoringCriterionEnum("criterion").notNull(),
    // Resposta bruta para os 9 critérios não sensíveis (anos, enum, texto
    // livre etc.). NULL quando criterion = 'd_saude'.
    value: text("value"),
    // Dado sensível (BRAIN §6.8, critério d) — coluna própria, acesso
    // restrito via RLS/GRANT em P-7.7. NULL para os demais critérios.
    healthSelfDeclared: boolean("health_self_declared"),
    points: integer("points").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("scoring_responses_reservation_criterion_uniq").on(
      table.reservationId,
      table.criterion,
    ),
    index("scoring_responses_reservation_id_idx").on(table.reservationId),
    check(
      "scoring_responses_health_column_check",
      sql`(${table.criterion} = 'd_saude' AND ${table.value} IS NULL) OR (${table.criterion} <> 'd_saude' AND ${table.healthSelfDeclared} IS NULL)`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// flats.aid_requests — auxílio opcional (diária fixa + transporte),
// aprovado caso a caso (BRAIN §6.8); no máximo 1 por reserva.
// financeiro_expense_id: referência leve (sem FK) à despesa criada em
// financeiro.payables quando aprovado — integração Flats → Financeiro fica
// para P-7.10.
// ---------------------------------------------------------------------------
export const aidRequests = flatsSchema.table("aid_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id")
    .notNull()
    .unique()
    .references(() => reservations.id, { onDelete: "cascade" }),
  requestsDailyAllowance: boolean("requests_daily_allowance")
    .notNull()
    .default(false),
  dailyAllowanceAmount: numeric("daily_allowance_amount", {
    precision: 10,
    scale: 2,
  }),
  transportMode: transportModeEnum("transport_mode")
    .notNull()
    .default("nenhum"),
  // Obrigatório quando transportMode = 'aereo' — usado no cálculo R$1.000/pessoa.
  transportPassengerCount: integer("transport_passenger_count"),
  transportAmount: numeric("transport_amount", { precision: 10, scale: 2 }),
  status: aidRequestStatusEnum("status").notNull().default("solicitado"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  financeiroExpenseId: uuid("financeiro_expense_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// flats.usage_history — regra de 7 dias consecutivos por período de 12
// meses, por INDIVÍDUO (BRAIN §6.8). Uma linha por estadia concluída.
// ---------------------------------------------------------------------------
export const usageHistory = flatsSchema.table(
  "usage_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    daysUsed: integer("days_used").notNull(),
    period: daterange("period").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("usage_history_user_id_idx").on(table.userId),
    index("usage_history_reservation_id_idx").on(table.reservationId),
  ],
);

// ---------------------------------------------------------------------------
// flats.document_files — referência ao bucket `flats-documentos`
// (0020_storage_buckets.sql), convenção de path `{uploaded_by}/{uuid}.{ext}`.
// guest_id nulo = documento a nível de reserva; preenchido = documento de
// uma pessoa específica (ex.: identidade do responsável).
// ---------------------------------------------------------------------------
export const documentFiles = flatsSchema.table(
  "document_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id").references(() => guests.id, {
      onDelete: "cascade",
    }),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("document_files_reservation_id_idx").on(table.reservationId),
    index("document_files_guest_id_idx").on(table.guestId),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type PreferredPeriod = typeof preferredPeriods.$inferSelect;
export type NewPreferredPeriod = typeof preferredPeriods.$inferInsert;
export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type ScoringResponse = typeof scoringResponses.$inferSelect;
export type NewScoringResponse = typeof scoringResponses.$inferInsert;
export type AidRequest = typeof aidRequests.$inferSelect;
export type NewAidRequest = typeof aidRequests.$inferInsert;
export type UsageHistory = typeof usageHistory.$inferSelect;
export type NewUsageHistory = typeof usageHistory.$inferInsert;
export type DocumentFile = typeof documentFiles.$inferSelect;
export type NewDocumentFile = typeof documentFiles.$inferInsert;
