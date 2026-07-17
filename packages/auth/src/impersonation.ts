/**
 * Impersonation utilities — server-only (uses node:crypto for signing).
 *
 * The impersonation state is stored in a cookie as `<payload>.<signature>`,
 * where `payload` is a base64url-encoded JSON blob and `signature` is an
 * HMAC-SHA256 of that payload keyed by IMPERSONATION_COOKIE_SECRET. The cookie
 * stays non-httpOnly so the banner can read the payload across apps, but the
 * signature makes it **unforgeable** without the server secret (F3-13).
 *
 * The admin Server Actions set/clear the cookie via next/headers; this module
 * only handles serialization + verification + types.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const IMPERSONATION_COOKIE_NAME = "hb-impersonation";

/** 8 hours max — force re-initiation for long support sessions */
export const IMPERSONATION_COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

// Dev/test fallback so tests and local runs work without extra setup. In
// production the secret MUST come from the environment (fail closed), otherwise
// the signature would be predictable from source.
const DEV_FALLBACK_SECRET =
  "hb-dev-impersonation-secret-change-me-in-production";

function getSecret(): string {
  const secret = process.env["IMPERSONATION_COOKIE_SECRET"];
  if (secret && secret.length > 0) return secret;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "IMPERSONATION_COOKIE_SECRET is required in production to sign the impersonation cookie.",
    );
  }
  return DEV_FALLBACK_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export interface ImpersonationState {
  actorId: string;
  actorName: string;
  impersonatedId: string;
  impersonatedName: string;
  /** ISO-8601 timestamp of when impersonation began */
  startedAt: string;
}

export function serializeImpersonationState(state: ImpersonationState): string {
  const payload = Buffer.from(JSON.stringify(state), "utf-8").toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

export function parseImpersonationState(
  raw: string,
): ImpersonationState | null {
  try {
    // Expected format: "<payload>.<signature>". Anything else (e.g. a legacy
    // unsigned base64url blob or a hand-crafted cookie) is rejected.
    const dot = raw.lastIndexOf(".");
    if (dot <= 0 || dot === raw.length - 1) return null;

    const payload = raw.slice(0, dot);
    const signature = raw.slice(dot + 1);

    if (!verifySignature(payload, signature)) return null;

    const json = Buffer.from(payload, "base64url").toString("utf-8");
    const parsed: unknown = JSON.parse(json);
    if (!isImpersonationState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function verifySignature(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload), "base64url");
  const provided = Buffer.from(signature, "base64url");
  // Length check first — timingSafeEqual throws on length mismatch.
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

function isImpersonationState(v: unknown): v is ImpersonationState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s["actorId"] === "string" &&
    typeof s["actorName"] === "string" &&
    typeof s["impersonatedId"] === "string" &&
    typeof s["impersonatedName"] === "string" &&
    typeof s["startedAt"] === "string"
  );
}
