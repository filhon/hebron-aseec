import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variáveis Supabase não configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Expiração curta (BRAIN §5) — o link é gerado sob demanda no clique de
// "Ver comprovante" ou no preenchimento por OCR (P-3.8c), não persistido em
// lugar nenhum.
const READ_URL_EXPIRES_IN_SECONDS = 300;

// Módulo SEM "use server" (D1-002, PACOTE 2, AUDIT/04-BACKLOG-CORRECAO.md) —
// antes vivia em actions/attachments.ts, um arquivo "use server": toda
// função async exportada dali é registrada como Server Action invocável
// (Next.js App Router), o que tornava esta função assinável direto pelo
// cliente, sem sessão nem papel, indo direto ao service role. Agora só é
// alcançável através das actions que já fazem o gate (getAttachmentUrl,
// extractNfFromAttachment).
export async function createReceiptSignedUrl(path: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("financeiro-recibos")
    .createSignedUrl(path, READ_URL_EXPIRES_IN_SECONDS);

  if (error || !data) {
    throw new Error("Não foi possível gerar o link do comprovante");
  }

  return data.signedUrl;
}
