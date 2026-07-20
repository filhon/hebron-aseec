import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validação de env em runtime (decisão S-1, implementada em P-0.1c).
 * `server` nunca alcança o bundle de cliente; `client` só aceita vars
 * `NEXT_PUBLIC_*` (exigidas pelo webpack para inline estático — ver
 * packages/auth/src/client.ts). As 7 `NEXT_PUBLIC_<APP>_URL` são opcionais:
 * nenhum dos 9 apps é obrigado a declarar a URL de um app que não consome.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    NEXT_PUBLIC_PLATAFORMA_URL: z.string().url().optional(),
    NEXT_PUBLIC_RADIO_URL: z.string().url().optional(),
    NEXT_PUBLIC_FINANCEIRO_URL: z.string().url().optional(),
    NEXT_PUBLIC_DOCUMENTOS_URL: z.string().url().optional(),
    NEXT_PUBLIC_FLATS_URL: z.string().url().optional(),
    NEXT_PUBLIC_TAREFAS_URL: z.string().url().optional(),
    NEXT_PUBLIC_PROJETOS_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_PLATAFORMA_URL: process.env.NEXT_PUBLIC_PLATAFORMA_URL,
    NEXT_PUBLIC_RADIO_URL: process.env.NEXT_PUBLIC_RADIO_URL,
    NEXT_PUBLIC_FINANCEIRO_URL: process.env.NEXT_PUBLIC_FINANCEIRO_URL,
    NEXT_PUBLIC_DOCUMENTOS_URL: process.env.NEXT_PUBLIC_DOCUMENTOS_URL,
    NEXT_PUBLIC_FLATS_URL: process.env.NEXT_PUBLIC_FLATS_URL,
    NEXT_PUBLIC_TAREFAS_URL: process.env.NEXT_PUBLIC_TAREFAS_URL,
    NEXT_PUBLIC_PROJETOS_URL: process.env.NEXT_PUBLIC_PROJETOS_URL,
  },
  emptyStringAsUndefined: true,
});
