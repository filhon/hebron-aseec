// ---------------------------------------------------------------------------
// Bunny.net Stream — client (P-6.20, BRAIN.md §2 "Vídeos (Plataforma): Bunny.
// net Stream", PATCH-027). Server-only: a API key da library nunca deve
// chegar a um Client Component.
//
// Fluxo: (1) createBunnyVideo cria o objeto de vídeo na library e devolve o
// `guid` (persistido em lessons.video_id); (2) createBunnyTusUploadCredentials
// gera as credenciais do upload resumível TUS (recomendado pela Bunny para
// arquivos grandes — evita timeout/limite de payload da Server Function); o
// client sobe direto para a Bunny com `tus-js-client` usando essas
// credenciais como headers TUS. (3) signBunnyPlaybackUrl assina a URL HLS de
// reprodução (Token Authentication da CDN da library), expira em poucas
// horas — nunca reproduz a partir do guid cru.
//
// BUNNY_STREAM_LIBRARY_ID/BUNNY_STREAM_API_KEY estavam na lista de env vars
// do prompt; BUNNY_STREAM_CDN_HOSTNAME/BUNNY_STREAM_TOKEN_AUTH_KEY não —
// sem eles não há como assinar a URL de reprodução (infra óbvia faltante,
// G1, registrada em SESSIONS.md). Ambos ficam disponíveis no painel Bunny:
// Stream → sua library → Security (hostname da pull zone embutida + chave de
// autenticação por token).
// ---------------------------------------------------------------------------

import crypto from "node:crypto";

const BUNNY_STREAM_API_BASE = "https://video.bunnycdn.com";
const BUNNY_TUS_UPLOAD_ENDPOINT = "https://video.bunnycdn.com/tusupload";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function getLibraryId(): string {
  return requireEnv("BUNNY_STREAM_LIBRARY_ID");
}

function getApiKey(): string {
  return requireEnv("BUNNY_STREAM_API_KEY");
}

interface CreateBunnyVideoResult {
  videoId: string;
}

/**
 * Cria o objeto de vídeo na library Bunny Stream (POST /library/{id}/videos)
 * — precisa existir antes de gerar as credenciais de upload TUS, que
 * referenciam o `guid` retornado aqui.
 */
export async function createBunnyVideo(
  title: string,
): Promise<CreateBunnyVideoResult> {
  const res = await fetch(
    `${BUNNY_STREAM_API_BASE}/library/${getLibraryId()}/videos`,
    {
      method: "POST",
      headers: {
        AccessKey: getApiKey(),
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ title }),
    },
  );

  if (!res.ok) {
    throw new Error(`Falha ao criar vídeo na Bunny Stream: ${res.status}`);
  }

  const data = (await res.json()) as { guid: string };
  return { videoId: data.guid };
}

const TUS_UPLOAD_EXPIRES_IN_SECONDS = 60 * 60;

export interface BunnyTusUploadCredentials {
  endpoint: string;
  videoId: string;
  libraryId: string;
  authorizationSignature: string;
  authorizationExpire: number;
}

/**
 * Credenciais do upload resumível TUS — o client usa estes valores como
 * headers TUS (`VideoId`, `LibraryId`, `AuthorizationSignature`,
 * `AuthorizationExpire`) ao subir direto para `endpoint`, sem passar pela
 * Server Function. Assinatura: sha256(libraryId + apiKey + expire + videoId),
 * conforme upload resumível documentado pela Bunny Stream.
 */
export function createBunnyTusUploadCredentials(
  videoId: string,
): BunnyTusUploadCredentials {
  const libraryId = getLibraryId();
  const authorizationExpire =
    Math.floor(Date.now() / 1000) + TUS_UPLOAD_EXPIRES_IN_SECONDS;
  const authorizationSignature = crypto
    .createHash("sha256")
    .update(`${libraryId}${getApiKey()}${authorizationExpire}${videoId}`)
    .digest("hex");

  return {
    endpoint: BUNNY_TUS_UPLOAD_ENDPOINT,
    videoId,
    libraryId,
    authorizationSignature,
    authorizationExpire,
  };
}

const PLAYBACK_URL_EXPIRES_IN_SECONDS = 60 * 60 * 4;

/**
 * Assina a URL HLS de reprodução (Token Authentication da pull zone
 * embutida da library — mesmo esquema de qualquer pull zone Bunny CDN):
 * token = base64url(sha256_raw(securityKey + path + expires)). Expira em
 * poucas horas (BRAIN.md/escopo do prompt) — nunca uma URL de longa duração
 * persistida (mesma cautela de S-05 nos demais uploads da Plataforma).
 */
export function signBunnyPlaybackUrl(videoId: string): string {
  const hostname = requireEnv("BUNNY_STREAM_CDN_HOSTNAME");
  const securityKey = requireEnv("BUNNY_STREAM_TOKEN_AUTH_KEY");
  const path = `/${videoId}/playlist.m3u8`;
  const expires =
    Math.floor(Date.now() / 1000) + PLAYBACK_URL_EXPIRES_IN_SECONDS;

  const token = crypto
    .createHash("sha256")
    .update(`${securityKey}${path}${expires}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `https://${hostname}${path}?token=${token}&expires=${expires}`;
}
