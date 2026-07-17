import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Client S3-compatible para Cloudflare R2 (BRAIN §6.4, escolha registrada em
// SESSIONS.md conforme pedido do escopo de P-8.8). Server-only: nunca deve
// ser importado por um Client Component (critério de aceite "R2 keys usadas
// apenas server-side").
//
// R2_ENDPOINT (obrigatório, ex.: https://<account_id>.r2.cloudflarestorage.com)
// não estava na lista de env vars do prompt (que lista só
// R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET) — sem ele não há como
// montar o client S3, então é infraestrutura óbvia faltante (G1), registrada
// em SESSIONS.md.
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

let cachedClient: S3Client | null = null;

function getR2Client(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: requireEnv("R2_ENDPOINT"),
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return cachedClient;
}

function getBucket(): string {
  return requireEnv("R2_BUCKET");
}

const UPLOAD_URL_EXPIRES_IN_SECONDS = 15 * 60;

/**
 * Gera uma URL assinada de PUT para o client fazer upload direto ao bucket
 * (arquivos de até 200MB — audio .mp3 — não devem passar pelo body da
 * Server Action). Retorna também a `key` a ser gravada em `tracks.fileUrl` /
 * `exclusive_materials.fileUrl` após a confirmação do upload.
 */
export async function getR2UploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getR2Client(), command, {
    expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS,
  });
}

/**
 * Gera uma URL assinada de GET para download de material exclusivo.
 * Expira em 1h (critério de aceite de P-8.8).
 */
export async function getR2DownloadUrl(
  key: string,
  expiresInSeconds: number,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(getR2Client(), command, {
    expiresIn: expiresInSeconds,
  });
}

export interface R2Object {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | undefined;
}

/**
 * Lê um objeto do bucket para proxy pela rota do Auto DJ (BRAIN §6.4: rota
 * server-side serve o áudio, não redireciona para uma URL pública) —
 * `route.ts` repassa `body` como Response stream sem bufferizar o arquivo
 * inteiro em memória.
 */
export async function getR2Object(key: string): Promise<R2Object> {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  const result = await getR2Client().send(command);
  if (!result.Body) throw new Error(`Objeto não encontrado no R2: ${key}`);
  return {
    body: await result.Body.transformToWebStream(),
    contentType: result.ContentType ?? "audio/mpeg",
    contentLength: result.ContentLength,
  };
}
