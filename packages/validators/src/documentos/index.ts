import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

const visibilityEnum = z.enum(["public", "internal", "restricted"]);

const documentTypeEnum = z.enum([
  "edital",
  "legal",
  "fiscal",
  "sop",
  "cargo_description",
  "policy",
  "report",
  "other",
]);

const documentStatusEnum = z.enum(["draft", "published", "archived"]);

// ─── createDocumentSchema ─────────────────────────────────────────────────────

export const createDocumentSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres").max(200),
  description: z
    .string()
    .max(1000, "Descrição deve ter no máximo 1000 caracteres")
    .optional(),
  type: documentTypeEnum,
  visibility: visibilityEnum,
  categoryId: z.string().uuid("Selecione uma categoria válida"),
  tagIds: z.array(z.string().uuid()).optional(),
  storageKey: z.string().min(1, "Selecione um arquivo"),
  fileSizeBytes: z.number().int().positive("Tamanho do arquivo inválido"),
  mimeType: z.string().min(1, "Tipo de arquivo inválido"),
  versionNotes: z
    .string()
    .max(500, "Notas devem ter no máximo 500 caracteres")
    .optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// ─── updateDocumentSchema ─────────────────────────────────────────────────────

export const updateDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .min(3, "Título deve ter pelo menos 3 caracteres")
    .max(200)
    .optional(),
  description: z.string().max(1000).nullable().optional(),
  visibility: visibilityEnum.optional(),
  status: documentStatusEnum.optional(),
  categoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// ─── createEditalSchema ───────────────────────────────────────────────────────

export const createEditalSchema = createDocumentSchema
  .extend({
    type: z.literal("edital"),
    cycleType: z.enum(["pontual", "anual"]),
    opensAt: z
      .string()
      .datetime({ message: "Data de abertura inválida" })
      .nullable()
      .optional(),
    closesAt: z
      .string()
      .datetime({ message: "Data de fechamento inválida" })
      .nullable()
      .optional(),
    projectType: z.string().max(100).nullable().optional(),
    projectCategory: z.string().max(100).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.cycleType === "anual") {
      if (!data.opensAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["opensAt"],
          message: "Data de abertura obrigatória para editais anuais",
        });
      }
      if (!data.closesAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["closesAt"],
          message: "Data de fechamento obrigatória para editais anuais",
        });
      }
      if (data.opensAt && data.closesAt && data.opensAt >= data.closesAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["closesAt"],
          message: "Data de fechamento deve ser posterior à data de abertura",
        });
      }
    }
  });

export type CreateEditalInput = z.infer<typeof createEditalSchema>;
