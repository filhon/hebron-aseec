import {
  index,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { financeiroSchema } from "./public";
import { projects } from "./projetos";

// ---------------------------------------------------------------------------
// financeiro.cost_centers — stub criado automaticamente na aprovação de projetos
//
// Módulo completo será implementado na Fase 4 (P-4.x).
// Quando financeiro for construído, esta tabela será expandida com:
//   - budget_lines (linhas orçamentárias detalhadas)
//   - transactions (lançamentos contábeis)
//   - organization_budgets (limite por org/ano configurado no Admin)
//
// Regra: 1 centro de custo por projeto; criado com status "ativo" na aprovação.
// Código gerado automaticamente: PROJ-{ano}-{suffix do UUID do projeto}.
// ---------------------------------------------------------------------------
export const costCenters = financeiroSchema.table(
  "cost_centers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .unique()
      .references(() => projects.id, { onDelete: "restrict" }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    budgetTotal: numeric("budget_total", { precision: 12, scale: 2 }).notNull(),
    status: text("status", { enum: ["ativo", "suspenso", "encerrado"] })
      .notNull()
      .default("ativo"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cost_centers_project_id_idx").on(table.projectId),
    index("cost_centers_status_idx").on(table.status),
    unique("cost_centers_code_uniq").on(table.code),
  ],
);

export type CostCenter = typeof costCenters.$inferSelect;
export type NewCostCenter = typeof costCenters.$inferInsert;
