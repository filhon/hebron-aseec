import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

const projectStageEnum = z.enum([
  "rascunho",
  "validacao",
  "votacao",
  "homologacao",
  "aprovado",
  "reprovado",
  "em_execucao",
  "concluido",
  "cancelado",
]);

const projectCategoryEnum = z.enum([
  "evangelismo",
  "missoes_transculturais",
  "educacao_crista",
  "assistencia_social",
  "saude",
  "capacitacao_lideranca",
  "infraestrutura_ministerial",
  "plantacao_de_igrejas",
  "discipulado",
  "outros",
]);

// ─── createAnnualProjectSchema ────────────────────────────────────────────────
// 10+ required fields per BRAIN.md 6.2 formulário estruturado.

export const createAnnualProjectSchema = z
  .object({
    titulo: z
      .string()
      .min(5, "Título deve ter pelo menos 5 caracteres")
      .max(200),
    categoria: projectCategoryEnum,
    organizacaoId: z.string().uuid("Selecione uma instituição válida"),
    anoReferencia: z
      .number()
      .int()
      .min(2020, "Ano inválido")
      .max(2100, "Ano inválido"),
    objetivos: z
      .string()
      .min(50, "Objetivos devem ter pelo menos 50 caracteres")
      .max(5000),
    justificativa: z
      .string()
      .min(50, "Justificativa deve ter pelo menos 50 caracteres")
      .max(5000),
    metodologia: z
      .string()
      .min(50, "Metodologia deve ter pelo menos 50 caracteres")
      .max(5000),
    contextoMinisterial: z
      .string()
      .min(30, "Descreva o contexto ministerial")
      .max(3000),
    tempoMinisterioAnos: z
      .number()
      .int()
      .min(0, "Tempo inválido")
      .max(70, "Tempo inválido"),
    regiao: z.string().min(2, "Informe a região de atuação").max(200),
    pais: z.string().min(2, "Informe o país").max(100),
    beneficiariosQuantidade: z
      .number()
      .int()
      .min(1, "Informe o número de beneficiários"),
    beneficiariosDescricao: z
      .string()
      .min(20, "Descreva os beneficiários")
      .max(2000),
    resultadosEsperados: z
      .string()
      .min(50, "Descreva os resultados esperados")
      .max(5000),
    cartaRecomendacao: z.boolean(),
    valorTotal: z.number().positive("Valor deve ser positivo"),
    numeroParcelas: z
      .number()
      .int()
      .min(1, "Mínimo 1 parcela")
      .max(12, "Máximo 12 parcelas"),
    mesesPagamento: z
      .array(z.number().int().min(1).max(12))
      .min(1, "Selecione pelo menos um mês de pagamento"),
    // Optional
    editalId: z.string().uuid().nullable().optional(),
    parentProjectId: z.string().uuid().nullable().optional(),
    cofinancimento: z.string().max(2000).nullable().optional(),
    parcerias: z.string().max(2000).nullable().optional(),
    riscos: z.string().max(2000).nullable().optional(),
    indicadoresExito: z.string().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mesesPagamento.length !== data.numeroParcelas) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mesesPagamento"],
        message: `Selecione exatamente ${data.numeroParcelas} mês(es) de pagamento`,
      });
    }
    const uniqueMonths = new Set(data.mesesPagamento);
    if (uniqueMonths.size !== data.mesesPagamento.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mesesPagamento"],
        message: "Cada mês pode ser selecionado apenas uma vez",
      });
    }
  });

export type CreateAnnualProjectInput = z.infer<typeof createAnnualProjectSchema>;

// ─── createPunctualProjectSchema ─────────────────────────────────────────────
// 6 required fields per BRAIN.md 6.2 — emergencial, avaliado mensalmente.

export const createPunctualProjectSchema = z.object({
  titulo: z
    .string()
    .min(5, "Título deve ter pelo menos 5 caracteres")
    .max(200),
  categoria: projectCategoryEnum,
  organizacaoId: z.string().uuid("Selecione uma instituição válida"),
  valorTotal: z.number().positive("Valor deve ser positivo"),
  motivoEmergencial: z
    .string()
    .min(30, "Descreva o motivo emergencial")
    .max(3000),
  prazoNecessidade: z
    .string()
    .datetime({ message: "Data de necessidade inválida" }),
  // Optional (not part of the 6 required)
  descricao: z.string().max(5000).optional(),
  beneficiariosQuantidade: z
    .number()
    .int()
    .min(1)
    .optional(),
  regiao: z.string().max(200).optional(),
  pais: z.string().max(100).optional(),
  editalId: z.string().uuid().nullable().optional(),
  parentProjectId: z.string().uuid().nullable().optional(),
});

export type CreatePunctualProjectInput = z.infer<typeof createPunctualProjectSchema>;

// ─── createReportSchema ───────────────────────────────────────────────────────

export const createReportSchema = z.object({
  projectId: z.string().uuid("Projeto inválido"),
  period: z
    .string()
    .regex(/^\d{4}-Q[1-4]$/, "Período deve estar no formato AAAA-Q1"),
  periodStart: z.string().datetime({ message: "Data de início inválida" }),
  periodEnd: z.string().datetime({ message: "Data de fim inválida" }),
  narrativa: z
    .string()
    .min(100, "Narrativa deve ter pelo menos 100 caracteres")
    .max(10000),
  resultadosAlcancados: z
    .string()
    .min(50, "Descreva os resultados alcançados")
    .max(5000),
  dificuldades: z.string().max(3000).nullable().optional(),
  proximosPassos: z.string().max(3000).nullable().optional(),
  beneficiariosAtingidos: z
    .number()
    .int()
    .min(0, "Número de beneficiários inválido"),
  attachmentKeys: z
    .array(
      z.object({
        storageKey: z.string().min(1),
        fileName: z.string().min(1),
        fileSizeBytes: z.number().int().positive(),
        mimeType: z.string().min(1),
      })
    )
    .optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

// ─── createEvaluationSchema ───────────────────────────────────────────────────

export const createEvaluationSchema = z.object({
  projectId: z.string().uuid("Projeto inválido"),
  recommendation: z.enum(["sim", "nao"], {
    required_error: "Selecione uma recomendação",
  }),
  notes: z
    .string()
    .min(20, "Fundamentação deve ter pelo menos 20 caracteres")
    .max(3000),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;

// ─── createContestationSchema ─────────────────────────────────────────────────

export const createContestationSchema = z.object({
  projectId: z.string().uuid("Projeto inválido"),
  reason: z
    .string()
    .min(30, "Descreva o motivo da contestação")
    .max(2000),
});

export type CreateContestationInput = z.infer<typeof createContestationSchema>;

// ─── deleteProjectSchema ──────────────────────────────────────────────────────
// Soft-delete with mandatory justification at any stage (BRAIN.md §6.2).

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid("Projeto inválido"),
  reason: z
    .string()
    .min(20, "Justificativa obrigatória para exclusão")
    .max(1000),
});

export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;

// ─── Re-export stage enum for runtime use ─────────────────────────────────────

export { projectStageEnum, projectCategoryEnum };
